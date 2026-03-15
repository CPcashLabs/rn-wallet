import React, { useEffect, useMemo, useState } from "react"

import { Pressable, StyleSheet, Text } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { AuthButton } from "@/features/auth/components/AuthButton"
import { AuthScaffold } from "@/features/auth/components/AuthScaffold"
import { AuthTextField } from "@/features/auth/components/AuthTextField"
import { bindInviteCode, getPasswordRules, signInWithPassword, validateAddressExists } from "@/features/auth/services/authApi"
import { persistAuthenticatedSession } from "@/features/auth/services/authSessionOrchestrator"
import { appendApiDebugSuffix, getAuthErrorMessage, getInviteBindingMessage } from "@/features/auth/utils/authMessages"
import { resetToMainTabs } from "@/app/navigation/navigationRef"
import type { AuthStackParamList } from "@/app/navigation/types"
import { useErrorPresenter } from "@/shared/errors/useErrorPresenter"
import { useWalletStore } from "@/shared/store/useWalletStore"
import { useAppTheme } from "@/shared/theme/useAppTheme"

type Props = NativeStackScreenProps<AuthStackParamList, "PasswordLoginScreen">

export function PasswordLoginScreen({ navigation, route }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const { presentMessage } = useErrorPresenter()
  const walletState = useWalletStore()
  const inviteCode = route.params?.inviteCode
  const defaultAddress = route.params?.address ?? walletState.address ?? ""
  const [address, setAddress] = useState(defaultAddress)
  const [password, setPassword] = useState("")
  const [minLength, setMinLength] = useState(6)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let mounted = true

    const bootstrap = async () => {
      try {
        const rules = await getPasswordRules()
        if (mounted) {
          setMinLength(rules.passwordMinLength)
        }
      } catch {
        // 规则获取失败时保留默认值，不阻断输入。
      }
    }

    void bootstrap()

    return () => {
      mounted = false
    }
  }, [])

  const disabled = useMemo(() => {
    return !address.trim() || password.trim().length < minLength
  }, [address, minLength, password])

  const submit = async () => {
    if (!address.trim()) {
      presentMessage(t("auth.errors.addressRequired"))
      return
    }

    setSubmitting(true)
    setPasswordError(null)

    try {
      const validation = await validateAddressExists(address)

      if (!validation.accountExists) {
        const message = t("auth.errors.addressNotFound")
        setPasswordError(message)
        presentMessage(message)
        return
      }

      if (!validation.passwordSet) {
        const message = t("auth.errors.passwordNotSet")
        setPasswordError(message)
        presentMessage(message)
        return
      }

      const tokens = await signInWithPassword(address.trim(), password)
      const loginType = walletState.status === "connected" && walletState.address?.toLowerCase() === address.trim().toLowerCase() ? "wallet" : "password"

      await persistAuthenticatedSession({
        ...tokens,
        address: address.trim(),
        loginType,
      })

      if (inviteCode) {
        try {
          await bindInviteCode(inviteCode)
        } catch (error) {
          presentMessage(getInviteBindingMessage(error), {
            titleKey: "common.infoTitle",
          })
        }
      }

      resetToMainTabs()
    } catch (error) {
      const message = appendApiDebugSuffix(getAuthErrorMessage(error, "auth.errors.passwordLoginFailed"), error)
      setPasswordError(message)
      presentMessage(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthScaffold
      canGoBack
      onBack={navigation.goBack}
      title={t("auth.passwordLogin.title")}
      subtitle={t("auth.passwordLogin.subtitle")}
    >
      <AuthTextField
        label={t("auth.passwordLogin.addressLabel")}
        onChangeText={setAddress}
        placeholder={t("auth.passwordLogin.addressPlaceholder")}
        value={address}
      />
      <AuthTextField
        error={passwordError}
        label={t("auth.passwordLogin.passwordLabel")}
        onChangeText={value => {
          setPassword(value)
          setPasswordError(null)
        }}
        placeholder={t("auth.passwordLogin.passwordPlaceholder")}
        secureTextEntry
        value={password}
      />
      <Text style={[styles.helper, { color: theme.colors.mutedText }]}>
        {t("auth.passwordLogin.passwordRuleHint", { min: minLength })}
      </Text>
      <AuthButton disabled={disabled} label={t("common.confirm")} loading={submitting} onPress={() => void submit()} />
      <Pressable
        onPress={() =>
          navigation.navigate("ForgotPasswordAddressScreen", {
            address,
          })
        }
      >
        <Text style={[styles.link, { color: theme.colors.primary }]}>
          {t("auth.passwordLogin.forgotPassword")}
        </Text>
      </Pressable>
    </AuthScaffold>
  )
}

const styles = StyleSheet.create({
  helper: {
    fontSize: 12,
    lineHeight: 18,
  },
  link: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "700",
  },
})
