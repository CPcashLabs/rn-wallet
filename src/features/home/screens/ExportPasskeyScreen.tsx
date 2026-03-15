import React, { useEffect, useMemo, useState } from "react"

import { StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { HomeScaffold } from "@/features/home/components/HomeScaffold"
import { markWalletBackup } from "@/features/home/services/homeApi"
import { useAuthStore } from "@/shared/store/useAuthStore"
import { useUserStore } from "@/shared/store/useUserStore"
import { useToast } from "@/shared/toast/useToast"
import { useAppTheme } from "@/shared/theme/useAppTheme"
import { AppButton } from "@/shared/ui/AppButton"

import type { SettingsStackParamList } from "@/app/navigation/types"

type Props = NativeStackScreenProps<SettingsStackParamList, "ExportPasskeyScreen">

const FINAL_STEP = 4
const FIRST_STEP_COUNTDOWN_SECONDS = 3

export function ExportPasskeyScreen({ navigation }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const { showToast } = useToast()
  const loginType = useAuthStore(state => state.loginType)
  const profile = useUserStore(state => state.profile)
  const patchProfile = useUserStore(state => state.patchProfile)
  const [step, setStep] = useState(1)
  const [secondsLeft, setSecondsLeft] = useState(FIRST_STEP_COUNTDOWN_SECONDS)
  const [finishing, setFinishing] = useState(false)

  const isPasskeyLogin = loginType === "passkey"
  const isStepLocked = step === 1 && secondsLeft > 0

  useEffect(() => {
    if (step !== 1 || secondsLeft <= 0) {
      return
    }

    const timer = setInterval(() => {
      setSecondsLeft(previous => Math.max(previous - 1, 0))
    }, 1000)

    return () => {
      clearInterval(timer)
    }
  }, [secondsLeft, step])

  const stepContent = useMemo(() => {
    if (step === 1) return t("home.export.step1")
    if (step === 2) return t("home.export.step2")
    if (step === 3) return t("home.export.step3")
    return t("home.export.step4")
  }, [step, t])

  const proceed = () => {
    if (step < FINAL_STEP) {
      setStep(previous => previous + 1)
      return
    }

    void finish()
  }

  const finish = async () => {
    if (!isPasskeyLogin) {
      navigation.goBack()
      return
    }

    setFinishing(true)

    try {
      await markWalletBackup()
      patchProfile({
        walletIsBackup: true,
      })
      showToast({ message: t("home.export.doneSuccess"), tone: "success" })
      navigation.goBack()
    } catch {
      showToast({ message: t("home.export.doneFailed"), tone: "error" })
    } finally {
      setFinishing(false)
    }
  }

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("home.export.title")}>
      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        {profile?.walletIsBackup ? (
          <View style={[styles.warning, { backgroundColor: theme.colors.warningSoft }]}>
            <Text style={[styles.warningText, { color: theme.colors.warning }]}>{t("home.export.alreadyDone")}</Text>
          </View>
        ) : null}

        {isPasskeyLogin ? (
          <>
            <Text style={[styles.subtitle, { color: theme.colors.text }]}>{t("home.export.subtitle")}</Text>
            <Text style={[styles.stepText, { color: theme.colors.mutedText }]}>
              {t("home.export.currentStep", { step })}
            </Text>
            <Text style={[styles.bodyText, { color: theme.colors.text }]}>{stepContent}</Text>
          </>
        ) : (
          <Text style={[styles.bodyText, { color: theme.colors.mutedText }]}>{t("home.export.notPasskey")}</Text>
        )}
      </View>

      <View style={styles.footer}>
        <AppButton
          disabled={!isPasskeyLogin || isStepLocked || finishing}
          label={
            step < FINAL_STEP
              ? isStepLocked
                ? t("home.export.nextLocked", { sec: secondsLeft })
                : t("home.export.next")
              : finishing
                ? t("common.loading")
                : t("home.export.done")
          }
          onPress={proceed}
        />

        <AppButton
          label={t("home.export.maybeLater")}
          onPress={() => navigation.goBack()}
          variant="secondary"
        />
      </View>
    </HomeScaffold>
  )
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  warning: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  warningText: {
    fontSize: 12,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  stepText: {
    fontSize: 13,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 22,
  },
  footer: {
    gap: 10,
  },
})
