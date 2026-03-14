import React, { useEffect, useState } from "react"

import { Alert, Pressable, Text } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { AuthButton } from "@/features/auth/components/AuthButton"
import { AuthScaffold } from "@/features/auth/components/AuthScaffold"
import { AuthTextField } from "@/features/auth/components/AuthTextField"
import { usePersistentCountdown } from "@/shared/hooks/usePersistentCountdown"
import { getEmailByAddress, sendPasswordResetEmail, validatePasswordResetCaptcha } from "@/features/auth/services/authApi"
import { getAuthErrorMessage } from "@/features/auth/utils/authMessages"
import type { AuthStackParamList } from "@/app/navigation/types"
import { KvStorageKeys } from "@/shared/storage/sessionKeys"

type Props = NativeStackScreenProps<AuthStackParamList, "ForgotPasswordEmailScreen">

export function ForgotPasswordEmailScreen({ navigation, route }: Props) {
  const { t } = useTranslation()
  const [email, setEmail] = useState(route.params?.email ?? "")
  const [code, setCode] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [sending, setSending] = useState(false)
  const address = route.params?.address?.trim() ?? ""
  const countdown = usePersistentCountdown(KvStorageKeys.VerificationCodeCountdownEndAt, 60_000)

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
      Alert.alert(t("common.errorTitle"), t("auth.errors.addressRequired"))
      return
    }

    setSending(true)

    try {
      await sendPasswordResetEmail(address)
      countdown.start()
    } catch (error) {
      Alert.alert(t("common.errorTitle"), getAuthErrorMessage(error, "auth.errors.sendCaptchaFailed"))
    } finally {
      setSending(false)
    }
  }

  const verifyCode = async () => {
    if (!address) {
      Alert.alert(t("common.errorTitle"), t("auth.errors.addressRequired"))
      return
    }

    setSubmitting(true)

    try {
      const randomString = await validatePasswordResetCaptcha({
        address,
        emailCaptcha: code.trim(),
      })

      navigation.navigate("SetPasswordScreen", {
        address,
        mode: "email",
        randomString,
      })
    } catch (error) {
      Alert.alert(t("common.errorTitle"), getAuthErrorMessage(error, "auth.errors.invalidEmailCaptcha"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthScaffold
      canGoBack
      onBack={navigation.goBack}
      title={t("auth.forgotPasswordEmail.title")}
      subtitle={t("auth.forgotPasswordEmail.subtitle")}
    >
      <Text>{email || t("auth.forgotPasswordEmail.emailMissing")}</Text>
      <AuthTextField
        label={t("auth.forgotPasswordEmail.codeLabel")}
        onChangeText={setCode}
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
        value={code}
      />
      <AuthButton disabled={code.trim().length !== 6} label={t("common.confirm")} loading={submitting} onPress={() => void verifyCode()} />
    </AuthScaffold>
  )
}
