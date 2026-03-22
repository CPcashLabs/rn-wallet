import React, { useEffect, useMemo, useState } from "react"

import { Text } from "react-native"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { AuthButton } from "@/features/auth/components/AuthButton"
import { AuthScaffold } from "@/features/auth/components/AuthScaffold"
import { AuthTextField } from "@/features/auth/components/AuthTextField"
import { getPasswordRules, resetPasswordLoggedIn, validateLoggedInPassword } from "@/features/auth/services/authApi"
import { getAuthErrorMessage } from "@/features/auth/utils/authMessages"
import { createCurrentPasswordSchema, createPasswordSetupSchema } from "@/features/auth/utils/passwordFormSchema"
import { encryptByPublicKey } from "@/features/auth/utils/passwordCrypto"
import type { AuthStackParamList } from "@/app/navigation/types"
import type { PasswordRules } from "@/features/auth/types"
import { useErrorPresenter } from "@/shared/errors/useErrorPresenter"

type Props = NativeStackScreenProps<AuthStackParamList, "LoggedInSetPasswordScreen">

type CurrentPasswordFormValues = {
  originPassword: string
}

type ResetPasswordFormValues = {
  password: string
  passwordAgain: string
}

export function LoggedInSetPasswordScreen({ navigation }: Props) {
  const { t } = useTranslation()
  const { presentError, presentMessage } = useErrorPresenter()
  const [rules, setRules] = useState<PasswordRules | null>(null)
  const [step, setStep] = useState<0 | 1>(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const passwordMessages = useMemo(
    () => ({
      confirmPasswordRequired: t("auth.errors.confirmPasswordRequired"),
      currentPasswordRequired: t("auth.errors.passwordRequired"),
      passwordMismatch: t("auth.errors.passwordMismatch"),
      passwordRequired: t("auth.errors.passwordRequired"),
    }),
    [t],
  )
  const currentPasswordSchema = useMemo(() => createCurrentPasswordSchema(passwordMessages), [passwordMessages])
  const resetPasswordSchema = useMemo(() => createPasswordSetupSchema(rules, passwordMessages), [passwordMessages, rules])
  const currentPasswordForm = useForm<CurrentPasswordFormValues>({
    defaultValues: {
      originPassword: "",
    },
    mode: "onChange",
    resolver: zodResolver(currentPasswordSchema),
  })
  const resetPasswordForm = useForm<ResetPasswordFormValues>({
    defaultValues: {
      password: "",
      passwordAgain: "",
    },
    mode: "onChange",
    resolver: zodResolver(resetPasswordSchema),
  })

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

  useEffect(() => {
    if (!rules) {
      return
    }

    void resetPasswordForm.trigger()
  }, [resetPasswordForm, rules])

  const verifyOriginPassword = currentPasswordForm.handleSubmit(async values => {
    if (!rules) {
      presentMessage(t("auth.errors.loadPasswordRulesFailed"))
      return
    }

    setSubmitting(true)
    setErrorMessage(null)

    try {
      await validateLoggedInPassword(encryptByPublicKey(rules.rsaPublicKey, values.originPassword))
      setStep(1)
    } catch (error) {
      const message = getAuthErrorMessage(error, "auth.errors.incorrectPassword")
      setErrorMessage(message)
      presentMessage(message, {
        mode: "toast",
      })
    } finally {
      setSubmitting(false)
    }
  })

  const submitNewPassword = resetPasswordForm.handleSubmit(async values => {
    if (!rules) {
      presentMessage(t("auth.errors.loadPasswordRulesFailed"))
      return
    }

    setSubmitting(true)
    setErrorMessage(null)

    try {
      const originPassword = currentPasswordForm.getValues("originPassword")
      await resetPasswordLoggedIn({
        oldPasswordEncrypted: encryptByPublicKey(rules.rsaPublicKey, originPassword),
        newPasswordEncrypted: encryptByPublicKey(rules.rsaPublicKey, values.password),
        confirmPasswordEncrypted: encryptByPublicKey(rules.rsaPublicKey, values.passwordAgain),
      })

      presentMessage(t("auth.loggedInSetPassword.success"), {
        mode: "toast",
        tone: "success",
      })
      navigation.goBack()
    } catch (error) {
      const message = presentError(error, {
        fallbackKey: "auth.errors.resetPasswordFailed",
        mode: "toast",
      })
      setErrorMessage(message)
    } finally {
      setSubmitting(false)
    }
  })

  return (
    <AuthScaffold
      canGoBack
      onBack={navigation.goBack}
      title={t("auth.loggedInSetPassword.title")}
      subtitle={step === 0 ? t("auth.loggedInSetPassword.subtitleVerify") : t("auth.loggedInSetPassword.subtitleReset")}
    >
      {step === 0 ? (
        <>
          <Controller
            control={currentPasswordForm.control}
            name="originPassword"
            render={({ field: { onBlur, onChange, value }, fieldState }) => (
              <AuthTextField
                error={fieldState.error?.message ?? errorMessage}
                label={t("auth.loggedInSetPassword.originPasswordLabel")}
                onBlur={onBlur}
                onChangeText={nextValue => {
                  onChange(nextValue)
                  setErrorMessage(null)
                }}
                placeholder={t("auth.setPassword.passwordPlaceholder")}
                secureTextEntry
                value={value}
              />
            )}
          />
          <AuthButton
            disabled={!rules || !currentPasswordForm.formState.isValid || submitting}
            label={t("common.next")}
            loading={submitting}
            onPress={() => void verifyOriginPassword()}
          />
        </>
      ) : (
        <>
          <Text>{t("auth.setPassword.ruleHint", { min: rules?.passwordMinLength ?? 6 })}</Text>
          <Controller
            control={resetPasswordForm.control}
            name="password"
            render={({ field: { onBlur, onChange, value }, fieldState }) => (
              <AuthTextField
                error={fieldState.error?.message ?? errorMessage}
                label={t("auth.setPassword.passwordLabel")}
                onBlur={onBlur}
                onChangeText={nextValue => {
                  onChange(nextValue)
                  setErrorMessage(null)
                }}
                placeholder={t("auth.setPassword.passwordPlaceholder")}
                secureTextEntry
                value={value}
              />
            )}
          />
          <Controller
            control={resetPasswordForm.control}
            name="passwordAgain"
            render={({ field: { onBlur, onChange, value }, fieldState }) => (
              <AuthTextField
                error={fieldState.error?.message}
                label={t("auth.setPassword.confirmLabel")}
                onBlur={onBlur}
                onChangeText={nextValue => {
                  onChange(nextValue)
                  setErrorMessage(null)
                }}
                placeholder={t("auth.setPassword.confirmPlaceholder")}
                secureTextEntry
                value={value}
              />
            )}
          />
          <AuthButton
            disabled={!rules || !resetPasswordForm.formState.isValid || submitting}
            label={t("common.confirm")}
            loading={submitting}
            onPress={() => void submitNewPassword()}
          />
        </>
      )}
    </AuthScaffold>
  )
}
