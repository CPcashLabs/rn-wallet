import React, { useEffect, useMemo, useState } from "react"

import { Pressable, Text } from "react-native"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { AuthButton } from "@/features/auth/components/AuthButton"
import { AuthScaffold } from "@/features/auth/components/AuthScaffold"
import { AuthTextField } from "@/features/auth/components/AuthTextField"
import { usePersistentCountdown } from "@/shared/hooks/usePersistentCountdown"
import { getEmailByAddress, sendPasswordResetEmail, validatePasswordResetCaptcha } from "@/features/auth/services/authApi"
import { createVerificationCodeSchema } from "@/features/auth/utils/authEntryFormSchemas"
import type { AuthStackParamList } from "@/app/navigation/types"
import { useErrorPresenter } from "@/shared/errors/useErrorPresenter"
import { KvStorageKeys } from "@/shared/storage/sessionKeys"

type Props = NativeStackScreenProps<AuthStackParamList, "ForgotPasswordEmailScreen">

type ForgotPasswordEmailFormValues = {
  code: string
}

export function ForgotPasswordEmailScreen({ navigation, route }: Props) {
  const { t } = useTranslation()
  const { presentError, presentMessage } = useErrorPresenter()
  const [email, setEmail] = useState(route.params?.email ?? "")
  const [submitting, setSubmitting] = useState(false)
  const [sending, setSending] = useState(false)
  const address = route.params?.address?.trim() ?? ""
  const countdown = usePersistentCountdown(KvStorageKeys.VerificationCodeCountdownEndAt, 60_000)
  const codeSchema = useMemo(
    () =>
      createVerificationCodeSchema({
        codeInvalid: t("auth.errors.invalidEmailCaptcha"),
        codeRequired: t("auth.errors.invalidEmailCaptcha"),
      }),
    [t],
  )
  const {
    control,
    formState: { isValid },
    handleSubmit,
  } = useForm<ForgotPasswordEmailFormValues>({
    defaultValues: {
      code: "",
    },
    mode: "onChange",
    resolver: zodResolver(codeSchema),
  })

  useEffect(() => {
    let mounted = true

    const loadEmail = async () => {
      if (!address || email) {
        return
      }

      try {
        const nextEmail = await getEmailByAddress(address)
        if (mounted) {
          setEmail(nextEmail)
        }
      } catch {
        // 地址校验页已处理这里的主错误语义；此处保留静默降级。
      }
    }

    void loadEmail()

    return () => {
      mounted = false
    }
  }, [address, email])

  const sendCaptcha = async () => {
    if (!address) {
      presentMessage(t("auth.errors.addressRequired"))
      return
    }

    setSending(true)

    try {
      await sendPasswordResetEmail(address)
      countdown.start()
    } catch (error) {
      presentError(error, {
        fallbackKey: "auth.errors.sendCaptchaFailed",
      })
    } finally {
      setSending(false)
    }
  }

  const verifyCode = handleSubmit(async values => {
    if (!address) {
      presentMessage(t("auth.errors.addressRequired"))
      return
    }

    setSubmitting(true)

    try {
      const randomString = await validatePasswordResetCaptcha({
        address,
        emailCaptcha: values.code.trim(),
      })

      navigation.navigate("SetPasswordScreen", {
        address,
        mode: "email",
        randomString,
      })
    } catch (error) {
      presentError(error, {
        fallbackKey: "auth.errors.invalidEmailCaptcha",
      })
    } finally {
      setSubmitting(false)
    }
  })

  return (
    <AuthScaffold
      canGoBack
      onBack={navigation.goBack}
      title={t("auth.forgotPasswordEmail.title")}
      subtitle={t("auth.forgotPasswordEmail.subtitle")}
    >
      <Text>{email || t("auth.forgotPasswordEmail.emailMissing")}</Text>
      <Controller
        control={control}
        name="code"
        render={({ field: { onBlur, onChange, value }, fieldState }) => (
          <AuthTextField
            error={fieldState.error?.message ?? null}
            label={t("auth.forgotPasswordEmail.codeLabel")}
            onBlur={onBlur}
            onChangeText={onChange}
            placeholder={t("auth.forgotPasswordEmail.codePlaceholder")}
            rightSlot={
              countdown.isActive ? (
                <Text>{countdown.secondsLeft}s</Text>
              ) : (
                <Pressable disabled={sending} onPress={() => void sendCaptcha()}>
                  <Text>{sending ? t("common.loading") : t("auth.forgotPasswordEmail.sendCode")}</Text>
                </Pressable>
              )
            }
            value={value}
          />
        )}
      />
      <AuthButton disabled={!isValid || submitting} label={t("common.confirm")} loading={submitting} onPress={() => void verifyCode()} />
    </AuthScaffold>
  )
}
