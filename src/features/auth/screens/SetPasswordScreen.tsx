import React, { useEffect, useMemo, useState } from "react"

import { Text } from "react-native"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { AuthButton } from "@/features/auth/components/AuthButton"
import { AuthScaffold } from "@/features/auth/components/AuthScaffold"
import { AuthTextField } from "@/features/auth/components/AuthTextField"
import { getPasswordRules, registerPassword, resetPasswordByAddress, signInWithPassword } from "@/features/auth/services/authApi"
import { persistAuthenticatedSession } from "@/features/auth/services/authSessionOrchestrator"
import { getAuthErrorMessage } from "@/features/auth/utils/authMessages"
import { createPasswordSetupSchema } from "@/features/auth/utils/passwordFormSchema"
import { encryptByPublicKey } from "@/features/auth/utils/passwordCrypto"
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

type PasswordSetupFormValues = {
  password: string
  passwordAgain: string
}

function PasswordSetupScreen(props: PasswordSetupScreenProps) {
  const { t } = useTranslation()
  const { presentMessage } = useErrorPresenter()
  const address = props.route.params?.address?.trim() ?? ""
  const randomString = props.route.params?.randomString
  const isResetMode = props.mode === "reset"
  const [rules, setRules] = useState<PasswordRules | null>(null)
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
  const passwordSchema = useMemo(() => createPasswordSetupSchema(rules, passwordMessages), [passwordMessages, rules])
  const {
    control,
    formState: { errors, isValid },
    handleSubmit,
    trigger,
  } = useForm<PasswordSetupFormValues>({
    defaultValues: {
      password: "",
      passwordAgain: "",
    },
    mode: "onChange",
    resolver: zodResolver(passwordSchema),
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

    void trigger()
  }, [rules, trigger])

  const submit = handleSubmit(async values => {
    if (!address) {
      presentMessage(t("auth.errors.addressRequired"))
      return
    }

    if (!rules) {
      presentMessage(t("auth.errors.loadPasswordRulesFailed"))
      return
    }

    if (isResetMode && !randomString) {
      setErrorMessage(t("auth.errors.missingResetToken"))
      return
    }

    setSubmitting(true)
    setErrorMessage(null)

    try {
      const encryptedPassword = encryptByPublicKey(rules.rsaPublicKey, values.password)

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

      const tokens = await signInWithPassword(address, values.password)
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
  })

  return (
    <AuthScaffold
      canGoBack
      onBack={props.navigation.goBack}
      title={t(isResetMode ? "auth.setPassword.title" : "auth.firstSetPassword.title")}
      subtitle={t(isResetMode ? "auth.setPassword.subtitle" : "auth.firstSetPassword.subtitle", { address })}
    >
      <Text>{t("auth.setPassword.ruleHint", { min: rules?.passwordMinLength ?? 6 })}</Text>
      <Controller
        control={control}
        name="password"
        render={({ field: { onBlur, onChange, value } }) => (
          <AuthTextField
            error={errors.password?.message ?? errorMessage}
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
        control={control}
        name="passwordAgain"
        render={({ field: { onBlur, onChange, value } }) => (
          <AuthTextField
            error={errors.passwordAgain?.message}
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
      <AuthButton disabled={!rules || !isValid || submitting} label={t("common.confirm")} loading={submitting} onPress={() => void submit()} />
    </AuthScaffold>
  )
}

export function SetPasswordScreen(props: SetPasswordProps) {
  return <PasswordSetupScreen {...props} mode="reset" />
}

export function FirstSetPasswordScreen(props: FirstSetPasswordProps) {
  return <PasswordSetupScreen {...props} mode="firstSet" />
}
