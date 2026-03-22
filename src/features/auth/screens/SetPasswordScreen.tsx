import React, { useEffect, useState } from "react"

import { Text } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { AuthButton } from "@/features/auth/components/AuthButton"
import { AuthScaffold } from "@/features/auth/components/AuthScaffold"
import { AuthTextField } from "@/features/auth/components/AuthTextField"
import { getPasswordRules, registerPassword, resetPasswordByAddress, signInWithPassword } from "@/features/auth/services/authApi"
import { persistAuthenticatedSession } from "@/features/auth/services/authSessionOrchestrator"
import { getAuthErrorMessage } from "@/features/auth/utils/authMessages"
import { encryptByPublicKey } from "@/features/auth/utils/passwordCrypto"
import { validatePasswordAgainstRules } from "@/features/auth/utils/passwordValidation"
import { resetToMainTabs } from "@/app/navigation/navigationRef"
import type { AuthStackParamList } from "@/app/navigation/types"
import type { PasswordRules } from "@/features/auth/types"
import { useErrorPresenter } from "@/shared/errors/useErrorPresenter"

type SetPasswordProps = NativeStackScreenProps<AuthStackParamList, "SetPasswordScreen">
type FirstSetPasswordProps = NativeStackScreenProps<AuthStackParamList, "FirstSetPasswordScreen">

type PasswordSetupMode = "reset" | "firstSet"

type PasswordSetupScreenProps = {
  navigation: SetPasswordProps["navigation"] | FirstSetPasswordProps["navigation"]
  route: {
    params?: {
      address?: string
      randomString?: string
    }
  }
  mode: PasswordSetupMode
}

function PasswordSetupScreen(props: PasswordSetupScreenProps) {
  const { t } = useTranslation()
  const { presentMessage } = useErrorPresenter()
  const address = props.route.params?.address?.trim() ?? ""
  const randomString = props.route.params?.randomString
  const isResetMode = props.mode === "reset"
  const [rules, setRules] = useState<PasswordRules | null>(null)
  const [password, setPassword] = useState("")
  const [passwordAgain, setPasswordAgain] = useState("")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let mounted = true

    const bootstrap = async () => {
      try {
        const nextRules = await getPasswordRules()
        if (mounted) {
          setRules(nextRules)
        }
      } catch (error) {
        if (mounted) {
          setErrorMessage(getAuthErrorMessage(error, "auth.errors.loadPasswordRulesFailed"))
        }
      }
    }

    void bootstrap()

    return () => {
      mounted = false
    }
  }, [])

  const submit = async () => {
    if (!address) {
      presentMessage(t("auth.errors.addressRequired"))
      return
    }

    if (!rules) {
      presentMessage(t("auth.errors.loadPasswordRulesFailed"))
      return
    }

    const validationMessage = validatePasswordAgainstRules(password, rules)
    if (validationMessage) {
      setErrorMessage(validationMessage)
      return
    }

    if (password !== passwordAgain) {
      setErrorMessage(t("auth.errors.passwordMismatch"))
      return
    }

    if (isResetMode && !randomString) {
      setErrorMessage(t("auth.errors.missingResetToken"))
      return
    }

    setSubmitting(true)
    setErrorMessage(null)

    try {
      const encryptedPassword = encryptByPublicKey(rules.rsaPublicKey, password)

      if (isResetMode) {
        await resetPasswordByAddress({
          address,
          passwordEncrypted: encryptedPassword,
          randomString,
        })
      } else {
        await registerPassword({
          address,
          passwordEncrypted: encryptedPassword,
        })
      }

      const tokens = await signInWithPassword(address, password)
      await persistAuthenticatedSession({
        ...tokens,
        address,
        loginType: isResetMode ? "password" : "wallet",
      })

      resetToMainTabs()
    } catch (error) {
      const message = getAuthErrorMessage(
        error,
        isResetMode ? "auth.errors.resetPasswordFailed" : "auth.errors.firstSetPasswordFailed",
      )
      setErrorMessage(message)
      presentMessage(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthScaffold
      canGoBack
      onBack={props.navigation.goBack}
      title={t(isResetMode ? "auth.setPassword.title" : "auth.firstSetPassword.title")}
      subtitle={t(isResetMode ? "auth.setPassword.subtitle" : "auth.firstSetPassword.subtitle", { address })}
    >
      <Text>{t("auth.setPassword.ruleHint", { min: rules?.passwordMinLength ?? 6 })}</Text>
      <AuthTextField
        error={errorMessage}
        label={t("auth.setPassword.passwordLabel")}
        onChangeText={value => {
          setPassword(value)
          setErrorMessage(null)
        }}
        placeholder={t("auth.setPassword.passwordPlaceholder")}
        secureTextEntry
        value={password}
      />
      <AuthTextField
        label={t("auth.setPassword.confirmLabel")}
        onChangeText={value => {
          setPasswordAgain(value)
          setErrorMessage(null)
        }}
        placeholder={t("auth.setPassword.confirmPlaceholder")}
        secureTextEntry
        value={passwordAgain}
      />
      <AuthButton label={t("common.confirm")} loading={submitting} onPress={() => void submit()} />
    </AuthScaffold>
  )
}

export function SetPasswordScreen(props: SetPasswordProps) {
  return <PasswordSetupScreen {...props} mode="reset" />
}

export function FirstSetPasswordScreen(props: FirstSetPasswordProps) {
  return <PasswordSetupScreen {...props} mode="firstSet" />
}
