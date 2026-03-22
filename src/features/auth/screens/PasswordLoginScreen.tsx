import React, { useEffect, useMemo, useState } from "react"

import { Pressable, StyleSheet, Text } from "react-native"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { AuthButton } from "@/features/auth/components/AuthButton"
import { AuthScaffold } from "@/features/auth/components/AuthScaffold"
import { AuthTextField } from "@/features/auth/components/AuthTextField"
import { bindInviteCode, getPasswordRules, signInWithPassword, validateAddressExists } from "@/features/auth/services/authApi"
import { persistAuthenticatedSession } from "@/features/auth/services/authSessionOrchestrator"
import { appendApiDebugSuffix, getAuthErrorMessage, getInviteBindingMessage } from "@/features/auth/utils/authMessages"
import { createPasswordLoginSchema } from "@/features/auth/utils/authEntryFormSchemas"
import { resetToMainTabs } from "@/app/navigation/navigationRef"
import type { AuthStackParamList } from "@/app/navigation/types"
import { useErrorPresenter } from "@/shared/errors/useErrorPresenter"
import { logErrorSafely } from "@/shared/logging/safeConsole"
import { useWalletStore } from "@/shared/store/useWalletStore"
import { useAppTheme } from "@/shared/theme/useAppTheme"

type Props = NativeStackScreenProps<AuthStackParamList, "PasswordLoginScreen">

type PasswordLoginFormValues = {
  address: string
  password: string
}

export function PasswordLoginScreen({ navigation, route }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const { presentMessage } = useErrorPresenter()
  const walletAddress = useWalletStore(state => state.address)
  const walletStatus = useWalletStore(state => state.status)
  const inviteCode = route.params?.inviteCode
  const defaultAddress = route.params?.address ?? walletAddress ?? ""
  const [minLength, setMinLength] = useState(6)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const passwordLoginMessages = useMemo(
    () => ({
      addressRequired: t("auth.errors.addressRequired"),
      passwordRequired: t("auth.errors.passwordRequired"),
      passwordTooShort: t("auth.errors.passwordTooShort", { min: minLength }),
    }),
    [minLength, t],
  )
  const passwordLoginSchema = useMemo(
    () => createPasswordLoginSchema(minLength, passwordLoginMessages),
    [minLength, passwordLoginMessages],
  )
  const {
    control,
    formState: { isValid },
    handleSubmit,
    trigger,
    watch,
  } = useForm<PasswordLoginFormValues>({
    defaultValues: {
      address: defaultAddress,
      password: "",
    },
    mode: "onChange",
    resolver: zodResolver(passwordLoginSchema),
  })
  const address = watch("address")

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

  useEffect(() => {
    void trigger()
  }, [minLength, trigger])

  const submit = handleSubmit(async values => {
    setSubmitting(true)
    setPasswordError(null)

    try {
      const normalizedAddress = values.address.trim()
      const validation = await validateAddressExists(normalizedAddress)

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

      const tokens = await signInWithPassword(normalizedAddress, values.password)
      const loginType = walletStatus === "connected" && walletAddress?.toLowerCase() === normalizedAddress.toLowerCase() ? "wallet" : "password"

      await persistAuthenticatedSession({
        ...tokens,
        address: normalizedAddress,
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
      logErrorSafely("[auth.passwordLogin]", error, {
        context: {
          address: values.address.trim(),
          resolvedMessage: message,
        },
        forwardToConsole: false,
      })
      setPasswordError(message)
      presentMessage(message)
    } finally {
      setSubmitting(false)
    }
  })

  return (
    <AuthScaffold
      canGoBack
      onBack={navigation.goBack}
      title={t("auth.passwordLogin.title")}
      subtitle={t("auth.passwordLogin.subtitle")}
    >
      <Controller
        control={control}
        name="address"
        render={({ field: { onBlur, onChange, value }, fieldState }) => (
          <AuthTextField
            error={fieldState.error?.message ?? null}
            label={t("auth.passwordLogin.addressLabel")}
            onBlur={onBlur}
            onChangeText={nextValue => {
              onChange(nextValue)
              setPasswordError(null)
            }}
            placeholder={t("auth.passwordLogin.addressPlaceholder")}
            value={value}
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field: { onBlur, onChange, value }, fieldState }) => (
          <AuthTextField
            error={fieldState.error?.message ?? passwordError}
            label={t("auth.passwordLogin.passwordLabel")}
            onBlur={onBlur}
            onChangeText={nextValue => {
              onChange(nextValue)
              setPasswordError(null)
            }}
            placeholder={t("auth.passwordLogin.passwordPlaceholder")}
            secureTextEntry
            value={value}
          />
        )}
      />
      <Text style={[styles.helper, { color: theme.colors.mutedText }]}>
        {t("auth.passwordLogin.passwordRuleHint", { min: minLength })}
      </Text>
      <AuthButton disabled={!isValid || submitting} label={t("common.confirm")} loading={submitting} onPress={() => void submit()} />
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
