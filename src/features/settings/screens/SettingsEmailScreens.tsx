import React, { useState } from "react"

import { Pressable, Switch, Text } from "react-native"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useTranslation } from "react-i18next"

import { usePersistentCountdown } from "@/shared/hooks/usePersistentCountdown"
import { HomeScaffold } from "@/features/home/components/HomeScaffold"
import {
  bindEmail,
  sendBindEmailCaptcha,
  sendUnbindEmailCaptcha,
  unbindEmail,
  updateBackupWalletNotification,
  updateReceiptEmailNotification,
  updateRewardEmailNotification,
  updateTransferEmailNotification,
} from "@/features/settings/services/settingsApi"
import { useErrorPresenter } from "@/shared/errors/useErrorPresenter"
import { setNumber } from "@/shared/storage/kvStorage"
import { KvStorageKeys } from "@/shared/storage/sessionKeys"
import { useUserStore } from "@/shared/store/useUserStore"
import { useToast } from "@/shared/toast/useToast"
import { useAppTheme } from "@/shared/theme/useAppTheme"
import { AppTextField } from "@/shared/ui/AppTextField"

import { Card, PrimaryButton, Row, type StackProps, useStyles, useProfileRefresh } from "@/features/settings/screens/settingsShared"
import { createEmailCodeSchema, createEmailSchema } from "@/features/settings/utils/emailFormSchemas"

type EmailFormValues = {
  email: string
}

type EmailCodeFormValues = {
  code: string
}

export function EmailNotificationScreen({ navigation }: StackProps<"EmailNotificationScreen">) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const styles = useStyles()
  const { presentError } = useErrorPresenter()
  const profile = useUserStore(state => state.profile)
  const patchProfile = useUserStore(state => state.patchProfile)
  const refreshProfile = useProfileRefresh()

  const toggleActions = {
    transfer: updateTransferEmailNotification,
    receipt: updateReceiptEmailNotification,
    backup: updateBackupWalletNotification,
    reward: updateRewardEmailNotification,
  }

  const togglePatches = {
    transfer: (value: boolean) => ({ transferEmailNotifyEnable: value }),
    receipt: (value: boolean) => ({ receiptEmailNotifyEnable: value }),
    backup: (value: boolean) => ({ backupWalletNotifyEnable: value }),
    reward: (value: boolean) => ({ rewardEmailNotifyEnable: value }),
  }

  const handleToggle = async (field: keyof typeof toggleActions, nextValue: boolean) => {
    try {
      await toggleActions[field](nextValue)
      patchProfile(togglePatches[field](nextValue))
      await refreshProfile()
    } catch (error) {
      presentError(error, {
        fallbackKey: "settingsHub.common.saveFailed",
        mode: "toast",
      })
    }
  }

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("settingsHub.email.notificationTitle")}>
      <Card>
        <Row label={t("settingsHub.email.transferNotify")}>
          <Switch onValueChange={value => void handleToggle("transfer", value)} thumbColor={theme.colors.brandInverse} trackColor={{ false: theme.colors.border, true: theme.colors.primary }} value={Boolean(profile?.transferEmailNotifyEnable)} />
        </Row>
        <Row label={t("settingsHub.email.receiptNotify")}>
          <Switch onValueChange={value => void handleToggle("receipt", value)} thumbColor={theme.colors.brandInverse} trackColor={{ false: theme.colors.border, true: theme.colors.primary }} value={Boolean(profile?.receiptEmailNotifyEnable)} />
        </Row>
        <Row label={t("settingsHub.email.backupNotify")}>
          <Switch onValueChange={value => void handleToggle("backup", value)} thumbColor={theme.colors.brandInverse} trackColor={{ false: theme.colors.border, true: theme.colors.primary }} value={Boolean(profile?.backupWalletNotifyEnable)} />
        </Row>
        <Row label={t("settingsHub.email.rewardNotify")}>
          <Switch onValueChange={value => void handleToggle("reward", value)} thumbColor={theme.colors.brandInverse} trackColor={{ false: theme.colors.border, true: theme.colors.primary }} value={Boolean(profile?.rewardEmailNotifyEnable)} />
        </Row>
      </Card>
    </HomeScaffold>
  )
}

export function EmailHomeScreen({ navigation }: StackProps<"EmailHomeScreen">) {
  const { t } = useTranslation()
  const styles = useStyles()
  const { presentError } = useErrorPresenter()
  const { showToast } = useToast()
  const profile = useUserStore(state => state.profile)
  const [loading, setLoading] = useState(false)
  const emailSchema = createEmailSchema({
    codeInvalid: t("auth.errors.invalidEmailCaptcha"),
    codeRequired: t("auth.errors.invalidEmailCaptcha"),
    emailInvalid: t("settingsHub.email.invalid"),
    emailRequired: t("settingsHub.email.invalid"),
  })
  const {
    control,
    formState: { isValid },
    handleSubmit,
  } = useForm<EmailFormValues>({
    defaultValues: {
      email: profile?.email ?? "",
    },
    mode: "onChange",
    resolver: zodResolver(emailSchema),
  })

  if (profile?.email) {
    return (
      <HomeScaffold canGoBack onBack={navigation.goBack} title={t("settingsHub.email.title")}>
        <Card>
          <Text style={styles.centerMuted}>{t("settingsHub.email.currentBound")}</Text>
          <Text style={styles.emailValue}>{profile.email}</Text>
        </Card>
        <PrimaryButton label={t("settingsHub.email.unbindAction")} onPress={() => navigation.navigate("EmailUnbindScreen")} />
      </HomeScaffold>
    )
  }

  const handleNext = handleSubmit(async values => {
    try {
      setLoading(true)
      const email = values.email.trim()
      await sendBindEmailCaptcha(email)
      setNumber(KvStorageKeys.EmailBindCountdownEndAt, Date.now() + 60_000)
      showToast({ message: t("settingsHub.email.codeSent"), tone: "success" })
      navigation.navigate("VerifyEmailScreen", { email })
    } catch (error) {
      presentError(error, {
        fallbackKey: "settingsHub.email.sendCodeFailed",
        mode: "toast",
      })
    } finally {
      setLoading(false)
    }
  })

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("settingsHub.email.title")}>
      <Card>
        <Text style={styles.sectionLabel}>{t("settingsHub.email.inputLabel")}</Text>
        <Controller
          control={control}
          name="email"
          render={({ field: { onBlur, onChange, value }, fieldState }) => (
            <AppTextField
              autoCapitalize="none"
              error={fieldState.error?.message ?? null}
              keyboardType="email-address"
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder={t("settingsHub.email.placeholder")}
              value={value}
            />
          )}
        />
      </Card>
      <PrimaryButton disabled={!isValid || loading} label={t("common.next")} loading={loading} onPress={() => void handleNext()} />
    </HomeScaffold>
  )
}

export function EmailUnbindScreen({ navigation }: StackProps<"EmailUnbindScreen">) {
  const { t } = useTranslation()
  const styles = useStyles()
  const { presentError } = useErrorPresenter()
  const { showToast } = useToast()
  const profile = useUserStore(state => state.profile)
  const refreshProfile = useProfileRefresh()
  const [submitting, setSubmitting] = useState(false)
  const [sending, setSending] = useState(false)
  const countdown = usePersistentCountdown(KvStorageKeys.EmailUnbindCountdownEndAt, 60_000)
  const codeSchema = createEmailCodeSchema({
    codeInvalid: t("auth.errors.invalidEmailCaptcha"),
    codeRequired: t("auth.errors.invalidEmailCaptcha"),
    emailInvalid: t("settingsHub.email.invalid"),
    emailRequired: t("settingsHub.email.invalid"),
  })
  const {
    control,
    formState: { isValid },
    handleSubmit,
  } = useForm<EmailCodeFormValues>({
    defaultValues: {
      code: "",
    },
    mode: "onChange",
    resolver: zodResolver(codeSchema),
  })

  const handleSend = async () => {
    try {
      setSending(true)
      await sendUnbindEmailCaptcha(profile?.email ?? "")
      countdown.start()
      showToast({ message: t("settingsHub.email.codeSent"), tone: "success" })
    } catch (error) {
      presentError(error, {
        fallbackKey: "settingsHub.email.sendCodeFailed",
        mode: "toast",
      })
    } finally {
      setSending(false)
    }
  }

  const handleConfirm = handleSubmit(async values => {
    try {
      setSubmitting(true)
      await unbindEmail({ email: profile?.email ?? "", captcha: values.code.trim() })
      await refreshProfile()
      navigation.navigate("SettingsHomeScreen")
    } catch (error) {
      presentError(error, {
        fallbackKey: "settingsHub.email.unbindFailed",
        mode: "toast",
      })
    } finally {
      setSubmitting(false)
    }
  })

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("settingsHub.email.unbindTitle")}>
      <Card>
        <Text style={styles.centerMuted}>{t("settingsHub.email.currentBound")}</Text>
        <Text style={styles.emailValue}>{profile?.email}</Text>
        <Controller
          control={control}
          name="code"
          render={({ field: { onBlur, onChange, value }, fieldState }) => (
            <AppTextField
              error={fieldState.error?.message ?? null}
              keyboardType="number-pad"
              maxLength={6}
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder={t("settingsHub.email.codePlaceholder")}
              value={value}
            />
          )}
        />
        <Pressable disabled={countdown.isActive || sending} onPress={() => void handleSend()} style={styles.inlineTextButton}>
          <Text style={styles.inlineTextButtonLabel}>{countdown.isActive ? t("settingsHub.email.resendCountdown", { sec: countdown.secondsLeft }) : t("settingsHub.email.sendCode")}</Text>
        </Pressable>
      </Card>
      <PrimaryButton disabled={!isValid || submitting} label={t("common.confirm")} loading={submitting} onPress={() => void handleConfirm()} />
    </HomeScaffold>
  )
}

export function VerifyEmailScreen({ navigation, route }: StackProps<"VerifyEmailScreen">) {
  const { t } = useTranslation()
  const styles = useStyles()
  const { presentError } = useErrorPresenter()
  const { showToast } = useToast()
  const refreshProfile = useProfileRefresh()
  const [submitting, setSubmitting] = useState(false)
  const [sending, setSending] = useState(false)
  const countdown = usePersistentCountdown(KvStorageKeys.EmailBindCountdownEndAt, 60_000)
  const codeSchema = createEmailCodeSchema({
    codeInvalid: t("auth.errors.invalidEmailCaptcha"),
    codeRequired: t("auth.errors.invalidEmailCaptcha"),
    emailInvalid: t("settingsHub.email.invalid"),
    emailRequired: t("settingsHub.email.invalid"),
  })
  const {
    control,
    formState: { isValid },
    handleSubmit,
  } = useForm<EmailCodeFormValues>({
    defaultValues: {
      code: "",
    },
    mode: "onChange",
    resolver: zodResolver(codeSchema),
  })

  const submitVerification = handleSubmit(async values => {
    try {
      setSubmitting(true)
      await bindEmail({ email: route.params.email, captcha: values.code.trim() })
      await refreshProfile()
      navigation.navigate("SettingsHomeScreen")
    } catch (error) {
      presentError(error, {
        fallbackKey: "settingsHub.email.bindFailed",
        mode: "toast",
      })
    } finally {
      setSubmitting(false)
    }
  })

  const handleResend = async () => {
    try {
      setSending(true)
      await sendBindEmailCaptcha(route.params.email)
      countdown.start()
      showToast({ message: t("settingsHub.email.codeSent"), tone: "success" })
    } catch (error) {
      presentError(error, {
        fallbackKey: "settingsHub.email.sendCodeFailed",
        mode: "toast",
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("settingsHub.email.verifyTitle")}>
      <Card>
        <Text style={styles.sectionLabel}>{t("settingsHub.email.verifySentTo")}</Text>
        <Text style={styles.emailValue}>{route.params.email}</Text>
        <Controller
          control={control}
          name="code"
          render={({ field: { onBlur, onChange, value }, fieldState }) => (
            <AppTextField
              error={fieldState.error?.message ?? null}
              keyboardType="number-pad"
              maxLength={6}
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder={t("settingsHub.email.codePlaceholder")}
              value={value}
            />
          )}
        />
        <Pressable disabled={countdown.isActive || sending} onPress={() => void handleResend()} style={styles.inlineTextButton}>
          <Text style={styles.inlineTextButtonLabel}>{countdown.isActive ? t("settingsHub.email.resendCountdown", { sec: countdown.secondsLeft }) : t("settingsHub.email.resend")}</Text>
        </Pressable>
      </Card>
      <PrimaryButton disabled={!isValid || submitting} label={t("common.confirm")} loading={submitting} onPress={() => void submitVerification()} />
    </HomeScaffold>
  )
}
