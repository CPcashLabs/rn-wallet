import React, { useState } from "react"

import { Pressable, Switch, Text, TextInput } from "react-native"
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
import { setNumber } from "@/shared/storage/kvStorage"
import { KvStorageKeys } from "@/shared/storage/sessionKeys"
import { useUserStore } from "@/shared/store/useUserStore"
import { useToast } from "@/shared/toast/useToast"
import { useAppTheme } from "@/shared/theme/useAppTheme"

import { Card, PrimaryButton, Row, type StackProps, styles, useProfileRefresh } from "@/features/settings/screens/settingsShared"

export function EmailNotificationScreen({ navigation }: StackProps<"EmailNotificationScreen">) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const { showToast } = useToast()
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
    } catch {
      showToast({ message: t("settingsHub.common.saveFailed"), tone: "error" })
    }
  }

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("settingsHub.email.notificationTitle")}>
      <Card>
        <Row label={t("settingsHub.email.transferNotify")}>
          <Switch onValueChange={value => void handleToggle("transfer", value)} thumbColor="#FFFFFF" trackColor={{ false: "#CBD5E1", true: theme.colors.primary }} value={Boolean(profile?.transferEmailNotifyEnable)} />
        </Row>
        <Row label={t("settingsHub.email.receiptNotify")}>
          <Switch onValueChange={value => void handleToggle("receipt", value)} thumbColor="#FFFFFF" trackColor={{ false: "#CBD5E1", true: theme.colors.primary }} value={Boolean(profile?.receiptEmailNotifyEnable)} />
        </Row>
        <Row label={t("settingsHub.email.backupNotify")}>
          <Switch onValueChange={value => void handleToggle("backup", value)} thumbColor="#FFFFFF" trackColor={{ false: "#CBD5E1", true: theme.colors.primary }} value={Boolean(profile?.backupWalletNotifyEnable)} />
        </Row>
        <Row label={t("settingsHub.email.rewardNotify")}>
          <Switch onValueChange={value => void handleToggle("reward", value)} thumbColor="#FFFFFF" trackColor={{ false: "#CBD5E1", true: theme.colors.primary }} value={Boolean(profile?.rewardEmailNotifyEnable)} />
        </Row>
      </Card>
    </HomeScaffold>
  )
}

export function EmailHomeScreen({ navigation }: StackProps<"EmailHomeScreen">) {
  const { t } = useTranslation()
  const { showToast } = useToast()
  const profile = useUserStore(state => state.profile)
  const [email, setEmail] = useState(profile?.email ?? "")
  const [loading, setLoading] = useState(false)
  const emailValid = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)

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

  const handleNext = async () => {
    try {
      setLoading(true)
      await sendBindEmailCaptcha(email.trim())
      setNumber(KvStorageKeys.EmailBindCountdownEndAt, Date.now() + 60_000)
      showToast({ message: t("settingsHub.email.codeSent"), tone: "success" })
      navigation.navigate("VerifyEmailScreen", { email: email.trim() })
    } catch {
      showToast({ message: t("settingsHub.email.sendCodeFailed"), tone: "error" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("settingsHub.email.title")}>
      <Card>
        <Text style={styles.sectionLabel}>{t("settingsHub.email.inputLabel")}</Text>
        <TextInput autoCapitalize="none" keyboardType="email-address" onChangeText={setEmail} placeholder={t("settingsHub.email.placeholder")} style={styles.input} value={email} />
        {!emailValid && email.length > 0 ? <Text style={styles.errorText}>{t("settingsHub.email.invalid")}</Text> : null}
      </Card>
      <PrimaryButton disabled={!emailValid} label={t("common.next")} loading={loading} onPress={() => void handleNext()} />
    </HomeScaffold>
  )
}

export function EmailBindedScreen({ navigation }: StackProps<"EmailBindedScreen">) {
  const { t } = useTranslation()
  const profile = useUserStore(state => state.profile)

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("settingsHub.email.title")}>
      <Card>
        <Text style={styles.centerMuted}>{t("settingsHub.email.currentBound")}</Text>
        <Text style={styles.emailValue}>{profile?.email}</Text>
      </Card>
      <PrimaryButton label={t("settingsHub.email.unbindAction")} onPress={() => navigation.navigate("EmailUnbindScreen")} />
    </HomeScaffold>
  )
}

export function EmailUnbindScreen({ navigation }: StackProps<"EmailUnbindScreen">) {
  const { t } = useTranslation()
  const { showToast } = useToast()
  const profile = useUserStore(state => state.profile)
  const refreshProfile = useProfileRefresh()
  const [code, setCode] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [sending, setSending] = useState(false)
  const countdown = usePersistentCountdown(KvStorageKeys.EmailUnbindCountdownEndAt, 60_000)

  const handleSend = async () => {
    try {
      setSending(true)
      await sendUnbindEmailCaptcha(profile?.email ?? "")
      countdown.start()
      showToast({ message: t("settingsHub.email.codeSent"), tone: "success" })
    } catch {
      showToast({ message: t("settingsHub.email.sendCodeFailed"), tone: "error" })
    } finally {
      setSending(false)
    }
  }

  const handleConfirm = async () => {
    try {
      setSubmitting(true)
      await unbindEmail({ email: profile?.email ?? "", captcha: code.trim() })
      await refreshProfile()
      navigation.navigate("SettingsHomeScreen")
    } catch {
      showToast({ message: t("settingsHub.email.unbindFailed"), tone: "error" })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("settingsHub.email.unbindTitle")}>
      <Card>
        <Text style={styles.centerMuted}>{t("settingsHub.email.currentBound")}</Text>
        <Text style={styles.emailValue}>{profile?.email}</Text>
        <TextInput keyboardType="number-pad" maxLength={6} onChangeText={setCode} placeholder={t("settingsHub.email.codePlaceholder")} style={styles.input} value={code} />
        <Pressable disabled={countdown.isActive || sending} onPress={() => void handleSend()} style={styles.inlineTextButton}>
          <Text style={styles.inlineTextButtonLabel}>{countdown.isActive ? t("settingsHub.email.resendCountdown", { sec: countdown.secondsLeft }) : t("settingsHub.email.sendCode")}</Text>
        </Pressable>
      </Card>
      <PrimaryButton disabled={code.length !== 6} label={t("common.confirm")} loading={submitting} onPress={() => void handleConfirm()} />
    </HomeScaffold>
  )
}

export function VerifyEmailScreen({ navigation, route }: StackProps<"VerifyEmailScreen">) {
  const { t } = useTranslation()
  const { showToast } = useToast()
  const refreshProfile = useProfileRefresh()
  const [code, setCode] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [sending, setSending] = useState(false)
  const countdown = usePersistentCountdown(KvStorageKeys.EmailBindCountdownEndAt, 60_000)

  const handleSubmit = async () => {
    try {
      setSubmitting(true)
      await bindEmail({ email: route.params.email, captcha: code.trim() })
      await refreshProfile()
      navigation.navigate("SettingsHomeScreen")
    } catch {
      showToast({ message: t("settingsHub.email.bindFailed"), tone: "error" })
    } finally {
      setSubmitting(false)
    }
  }

  const handleResend = async () => {
    try {
      setSending(true)
      await sendBindEmailCaptcha(route.params.email)
      countdown.start()
      showToast({ message: t("settingsHub.email.codeSent"), tone: "success" })
    } catch {
      showToast({ message: t("settingsHub.email.sendCodeFailed"), tone: "error" })
    } finally {
      setSending(false)
    }
  }

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("settingsHub.email.verifyTitle")}>
      <Card>
        <Text style={styles.sectionLabel}>{t("settingsHub.email.verifySentTo")}</Text>
        <Text style={styles.emailValue}>{route.params.email}</Text>
        <TextInput keyboardType="number-pad" maxLength={6} onChangeText={setCode} placeholder={t("settingsHub.email.codePlaceholder")} style={styles.input} value={code} />
        <Pressable disabled={countdown.isActive || sending} onPress={() => void handleResend()} style={styles.inlineTextButton}>
          <Text style={styles.inlineTextButtonLabel}>{countdown.isActive ? t("settingsHub.email.resendCountdown", { sec: countdown.secondsLeft }) : t("settingsHub.email.resend")}</Text>
        </Pressable>
      </Card>
      <PrimaryButton disabled={code.length !== 6} label={t("common.confirm")} loading={submitting} onPress={() => void handleSubmit()} />
    </HomeScaffold>
  )
}
