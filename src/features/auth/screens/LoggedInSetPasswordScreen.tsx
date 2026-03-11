import React, { useEffect, useState } from "react"

import { Alert, Text } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { AuthButton } from "@/features/auth/components/AuthButton"
import { AuthScaffold } from "@/features/auth/components/AuthScaffold"
import { AuthTextField } from "@/features/auth/components/AuthTextField"
import { getPasswordRules, resetPasswordLoggedIn, validateLoggedInPassword } from "@/features/auth/services/authApi"
import { getAuthErrorMessage } from "@/features/auth/utils/authMessages"
import { encryptByPublicKey } from "@/features/auth/utils/passwordCrypto"
import { validatePasswordAgainstRules } from "@/features/auth/utils/passwordValidation"
import type { AuthStackParamList } from "@/app/navigation/types"
import type { PasswordRules } from "@/features/auth/types"

type Props = NativeStackScreenProps<AuthStackParamList, "LoggedInSetPasswordScreen">

export function LoggedInSetPasswordScreen({ navigation }: Props) {
  const { t } = useTranslation()
  const [rules, setRules] = useState<PasswordRules | null>(null)
  const [step, setStep] = useState<0 | 1>(0)
  const [originPassword, setOriginPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
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

  const verifyOriginPassword = async () => {
    if (!originPassword || !rules) {
      return
    }

    setSubmitting(true)
    setErrorMessage(null)

    try {
      await validateLoggedInPassword(encryptByPublicKey(rules.rsaPublicKey, originPassword))
      setStep(1)
    } catch (error) {
      const message = getAuthErrorMessage(error, "auth.errors.incorrectPassword")
      setErrorMessage(message)
      Alert.alert(t("common.errorTitle"), message)
    } finally {
      setSubmitting(false)
    }
  }

  const submitNewPassword = async () => {
    if (!rules) {
      return
    }

    const validationMessage = validatePasswordAgainstRules(newPassword, rules)
    if (validationMessage) {
      setErrorMessage(validationMessage)
      return
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage(t("auth.errors.passwordMismatch"))
      return
    }

    setSubmitting(true)
    setErrorMessage(null)

    try {
      await resetPasswordLoggedIn({
        oldPasswordEncrypted: encryptByPublicKey(rules.rsaPublicKey, originPassword),
        newPasswordEncrypted: encryptByPublicKey(rules.rsaPublicKey, newPassword),
        confirmPasswordEncrypted: encryptByPublicKey(rules.rsaPublicKey, confirmPassword),
      })

      Alert.alert(t("common.infoTitle"), t("auth.loggedInSetPassword.success"))
      navigation.goBack()
    } catch (error) {
      const message = getAuthErrorMessage(error, "auth.errors.resetPasswordFailed")
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
      title={t("auth.loggedInSetPassword.title")}
      subtitle={step === 0 ? t("auth.loggedInSetPassword.subtitleVerify") : t("auth.loggedInSetPassword.subtitleReset")}
    >
      {step === 0 ? (
        <>
          <AuthTextField
            error={errorMessage}
            label={t("auth.loggedInSetPassword.originPasswordLabel")}
            onChangeText={value => {
              setOriginPassword(value)
              setErrorMessage(null)
            }}
            placeholder={t("auth.setPassword.passwordPlaceholder")}
            secureTextEntry
            value={originPassword}
          />
          <AuthButton disabled={!originPassword || submitting} label={t("common.next")} loading={submitting} onPress={() => void verifyOriginPassword()} />
        </>
      ) : (
        <>
          <Text>{t("auth.setPassword.ruleHint", { min: rules?.passwordMinLength ?? 6 })}</Text>
          <AuthTextField
            error={errorMessage}
            label={t("auth.setPassword.passwordLabel")}
            onChangeText={value => {
              setNewPassword(value)
              setErrorMessage(null)
            }}
            placeholder={t("auth.setPassword.passwordPlaceholder")}
            secureTextEntry
            value={newPassword}
          />
          <AuthTextField
            label={t("auth.setPassword.confirmLabel")}
            onChangeText={value => {
              setConfirmPassword(value)
              setErrorMessage(null)
            }}
            placeholder={t("auth.setPassword.confirmPlaceholder")}
            secureTextEntry
            value={confirmPassword}
          />
          <AuthButton label={t("common.confirm")} loading={submitting} onPress={() => void submitNewPassword()} />
        </>
      )}
    </AuthScaffold>
  )
}
