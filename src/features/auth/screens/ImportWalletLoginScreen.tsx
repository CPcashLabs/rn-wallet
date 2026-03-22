import React, { useMemo, useState } from "react"

import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { AuthButton } from "@/features/auth/components/AuthButton"
import { AuthScaffold } from "@/features/auth/components/AuthScaffold"
import { AuthTextField } from "@/features/auth/components/AuthTextField"
import { createWalletLoginMessage, finalizeWalletLogin } from "@/features/auth/services/walletLogin"
import { createImportSecretSchema } from "@/features/auth/utils/authEntryFormSchemas"
import type { AuthStackParamList } from "@/app/navigation/types"
import { useErrorPresenter } from "@/shared/errors/useErrorPresenter"
import { importLocalWallet } from "@/shared/native/localWalletVault"
import { signMessageWithWalletImport, tryParseWalletImportInput, WalletImportInputError } from "@/shared/native/walletImport"
import { useWalletStore } from "@/shared/store/useWalletStore"

type Props = NativeStackScreenProps<AuthStackParamList, "ImportWalletLoginScreen">

type ImportWalletLoginFormValues = {
  secret: string
}

export function ImportWalletLoginScreen({ navigation, route }: Props) {
  const { t } = useTranslation()
  const { presentError, presentMessage } = useErrorPresenter()
  const inviteCode = route.params?.inviteCode
  const setWalletState = useWalletStore(state => state.setWalletState)
  const [inputError, setInputError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const importSecretSchema = useMemo(
    () =>
      createImportSecretSchema({
        importSecretRequired: t("auth.errors.importSecretRequired"),
        invalidImportSecret: t("auth.errors.invalidImportSecret"),
      }),
    [t],
  )
  const {
    control,
    formState: { isValid },
    handleSubmit,
    watch,
  } = useForm<ImportWalletLoginFormValues>({
    defaultValues: {
      secret: "",
    },
    mode: "onChange",
    resolver: zodResolver(importSecretSchema),
  })
  const secret = watch("secret")
  const detectedImport = useMemo(() => tryParseWalletImportInput(secret), [secret])

  const helperText = useMemo(() => {
    if (!detectedImport) {
      return t("auth.importLogin.secretHint")
    }

    if (detectedImport.type === "mnemonic") {
      return t("auth.importLogin.detectedMnemonic", {
        address: detectedImport.address,
      })
    }

    return t("auth.importLogin.detectedPrivateKey", {
      address: detectedImport.address,
    })
  }, [detectedImport, t])

  const submit = handleSubmit(async values => {
    setSubmitting(true)
    setInputError(null)

    try {
      const normalizedSecret = values.secret.trim()
      const parsedImport = detectedImport ?? tryParseWalletImportInput(normalizedSecret)

      if (!parsedImport) {
        throw new WalletImportInputError("invalid")
      }

      const message = createWalletLoginMessage(parsedImport.address)
      const signedImport = await signMessageWithWalletImport(normalizedSecret, JSON.stringify(message))
      const persistedWallet = await importLocalWallet(normalizedSecret)

      setWalletState({
        status: "connected",
        address: persistedWallet.address,
        chainId: persistedWallet.chainId ?? null,
      })

      await finalizeWalletLogin({
        address: signedImport.address,
        signature: signedImport.signature,
        message,
        inviteCode,
        onInviteBindingMessage: messageText => {
          presentMessage(messageText, {
            titleKey: "common.infoTitle",
          })
        },
      })
    } catch (error) {
      if (error instanceof WalletImportInputError) {
        const message = error.reason === "empty" ? t("auth.errors.importSecretRequired") : t("auth.errors.invalidImportSecret")
        setInputError(message)
        presentMessage(message)
      } else {
        presentError(error, {
          fallbackKey: "auth.errors.importLoginFailed",
          statusMap: {
            401: "auth.errors.importLoginFailed",
          },
          preferApiMessage: false,
          preferErrorMessage: false,
          logTag: "[auth.importWallet]",
        })
      }
    } finally {
      setSubmitting(false)
    }
  })

  return (
    <AuthScaffold
      canGoBack
      onBack={navigation.goBack}
      title={t("auth.importLogin.title")}
      subtitle={t("auth.importLogin.subtitle")}
    >
      <Controller
        control={control}
        name="secret"
        render={({ field: { onBlur, onChange, value }, fieldState }) => (
          <AuthTextField
            autoCapitalize="none"
            autoCorrect={false}
            error={fieldState.error?.message ?? inputError}
            helperText={helperText}
            label={t("auth.importLogin.secretLabel")}
            multiline
            numberOfLines={6}
            onBlur={onBlur}
            onChangeText={nextValue => {
              onChange(nextValue)
              setInputError(null)
            }}
            placeholder={t("auth.importLogin.secretPlaceholder")}
            value={value}
          />
        )}
      />

      <AuthButton
        disabled={!isValid || submitting}
        label={t("auth.importLogin.submit")}
        loading={submitting}
        onPress={() => void submit()}
      />
    </AuthScaffold>
  )
}
