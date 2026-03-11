import React, { useEffect, useState } from "react"

import { Alert, Text } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { AuthButton } from "@/features/auth/components/AuthButton"
import { AuthScaffold } from "@/features/auth/components/AuthScaffold"
import { AuthTextField } from "@/features/auth/components/AuthTextField"
import { getPasswordRules, persistAuthenticatedSession, registerPassword, signInWithPassword } from "@/features/auth/services/authApi"
import { getAuthErrorMessage } from "@/features/auth/utils/authMessages"
import { encryptByPublicKey } from "@/features/auth/utils/passwordCrypto"
import { validatePasswordAgainstRules } from "@/features/auth/utils/passwordValidation"
import { resetToMainTabs } from "@/app/navigation/navigationRef"
import type { AuthStackParamList } from "@/app/navigation/types"
import type { PasswordRules } from "@/features/auth/types"

type Props = NativeStackScreenProps<AuthStackParamList, "FirstSetPasswordScreen">

export function FirstSetPasswordScreen({ navigation, route }: Props) {
  const { t } = useTranslation()
  const address = route.params?.address?.trim() ?? ""
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
      Alert.alert(t("common.errorTitle"), t("auth.errors.addressRequired"))
      return
    }

    if (!rules) {
      Alert.alert(t("common.errorTitle"), t("auth.errors.loadPasswordRulesFailed"))
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

    setSubmitting(true)
    setErrorMessage(null)

    try {
      const encryptedPassword = encryptByPublicKey(rules.rsaPublicKey, password)

      await registerPassword({
        address,
        passwordEncrypted: encryptedPassword,
      })

      const tokens = await signInWithPassword(address, password)
      await persistAuthenticatedSession({
        ...tokens,
        address,
        loginType: "wallet",
      })

      resetToMainTabs()
    } catch (error) {
      const message = getAuthErrorMessage(error, "auth.errors.firstSetPasswordFailed")
      setErrorMessage(message)
      Alert.alert(t("common.errorTitle"), message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthScaffold
      canGoBack
      onBack={navigation.goBack}
      title={t("auth.firstSetPassword.title")}
      subtitle={t("auth.firstSetPassword.subtitle", { address })}
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
