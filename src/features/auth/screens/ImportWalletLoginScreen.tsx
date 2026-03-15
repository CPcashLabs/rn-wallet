import React, { useMemo, useState } from "react"

import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { AuthButton } from "@/features/auth/components/AuthButton"
import { AuthScaffold } from "@/features/auth/components/AuthScaffold"
import { AuthTextField } from "@/features/auth/components/AuthTextField"
import { bindInviteCode, signInWithMessageSignature, validateAddressExists } from "@/features/auth/services/authApi"
import { persistAuthenticatedSession } from "@/features/auth/services/authSessionOrchestrator"
import { getInviteBindingMessage } from "@/features/auth/utils/authMessages"
import { resetToMainTabs } from "@/app/navigation/navigationRef"
import type { AuthStackParamList } from "@/app/navigation/types"
import { ApiError } from "@/shared/errors"
import { useErrorPresenter } from "@/shared/errors/useErrorPresenter"
import { walletAdapter } from "@/shared/native"
import { WalletImportInputError } from "@/shared/native/walletImport"
import { useWalletStore } from "@/shared/store/useWalletStore"

type Props = NativeStackScreenProps<AuthStackParamList, "ImportWalletLoginScreen">

export function ImportWalletLoginScreen({ navigation, route }: Props) {
  const { t } = useTranslation()
  const { presentError, presentMessage } = useErrorPresenter()
  const inviteCode = route.params?.inviteCode
  const setWalletState = useWalletStore(state => state.setWalletState)
  const [secret, setSecret] = useState("")
  const [inputError, setInputError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const disabled = useMemo(() => {
    return !secret.trim()
  }, [secret])

  const handleInviteCode = async () => {
    if (!inviteCode) {
      return
    }

    try {
      await bindInviteCode(inviteCode)
    } catch (error) {
      presentMessage(getInviteBindingMessage(error), {
        titleKey: "common.infoTitle",
      })
    }
  }

  const maybeFallbackToPasswordFlow = async (address: string, error: unknown) => {
    if (!(error instanceof ApiError) || error.status !== 401) {
      return false
    }

    const validation = await validateAddressExists(address)

    if (validation.passwordSet) {
      navigation.navigate("PasswordLoginScreen", {
        address,
        inviteCode,
      })
      return true
    }

    navigation.navigate("FirstSetPasswordScreen", {
      address,
    })
    return true
  }

  const submit = async () => {
    if (!secret.trim()) {
      const message = t("auth.errors.importSecretRequired")
      setInputError(message)
      presentMessage(message)
      return
    }

    setSubmitting(true)
    setInputError(null)

    try {
      const imported = await walletAdapter.importSecret(secret)

      if (!imported.ok) {
        throw imported.error
      }

      setWalletState({
        status: "connected",
        address: imported.data.address,
        chainId: imported.data.chainId ?? null,
      })

      const message = {
        address: imported.data.address,
        login_time: Date.now().toString(),
      }

      const signatureResult = await walletAdapter.signMessage(JSON.stringify(message))

      if (!signatureResult.ok) {
        throw signatureResult.error
      }

      try {
        const tokens = await signInWithMessageSignature({
          signature: signatureResult.data.signature,
          address: imported.data.address,
          message: JSON.stringify(message),
        })

        await persistAuthenticatedSession({
          ...tokens,
          address: imported.data.address,
          loginType: "wallet",
        })

        await handleInviteCode()
        resetToMainTabs()
      } catch (error) {
        const handled = await maybeFallbackToPasswordFlow(imported.data.address, error)

        if (!handled) {
          throw error
        }
      }
    } catch (error) {
      if (error instanceof WalletImportInputError) {
        const message = error.reason === "empty" ? t("auth.errors.importSecretRequired") : t("auth.errors.invalidImportSecret")
        setInputError(message)
        presentMessage(message)
      } else {
        presentError(error, {
          fallbackKey: "auth.errors.importLoginFailed",
        })
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthScaffold
      canGoBack
      onBack={navigation.goBack}
      title={t("auth.importLogin.title")}
      subtitle={t("auth.importLogin.subtitle")}
    >
      <AuthTextField
        autoCapitalize="none"
        autoCorrect={false}
        error={inputError}
        helperText={t("auth.importLogin.secretHint")}
        label={t("auth.importLogin.secretLabel")}
        multiline
        numberOfLines={6}
        onChangeText={value => {
          setSecret(value)
          setInputError(null)
        }}
        placeholder={t("auth.importLogin.secretPlaceholder")}
        value={secret}
      />

      <AuthButton
        disabled={disabled}
        label={t("auth.importLogin.submit")}
        loading={submitting}
        onPress={() => void submit()}
      />
    </AuthScaffold>
  )
}
