import React, { useEffect, useState } from "react"

import { View } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { HomeScaffold } from "@/features/home/components/HomeScaffold"
import { useProfileSync } from "@/features/home/hooks/useProfileSync"
import { updateProfileNickname } from "@/features/home/services/homeApi"
import { useUserStore } from "@/shared/store/useUserStore"
import { useToast } from "@/shared/toast/useToast"
import { AppButton } from "@/shared/ui/AppButton"
import { AppCard } from "@/shared/ui/AppCard"
import { AppTextField } from "@/shared/ui/AppTextField"

import type { SettingsStackParamList } from "@/app/navigation/types"

type Props = NativeStackScreenProps<SettingsStackParamList, "UpdateNameScreen">

const MAX_NAME_LENGTH = 20

export function UpdateNameScreen({ navigation }: Props) {
  const { t } = useTranslation()
  const { showToast } = useToast()
  const { profile, refresh } = useProfileSync()
  const patchProfile = useUserStore(state => state.patchProfile)
  const [name, setName] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setName(profile?.nickname ?? "")
  }, [profile?.nickname])

  const save = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      showToast({ message: t("home.updateName.empty"), tone: "warning" })
      return
    }

    setSubmitting(true)

    try {
      await updateProfileNickname(trimmed)
      patchProfile({
        nickname: trimmed,
      })
      void refresh()

      showToast({ message: t("home.updateName.success"), tone: "success" })
      navigation.goBack()
    } catch {
      showToast({ message: t("home.updateName.failed"), tone: "error" })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("home.updateName.title")}>
      <AppCard>
        <AppTextField
          autoCapitalize="words"
          backgroundTone="background"
          label={t("home.updateName.label")}
          maxLength={MAX_NAME_LENGTH}
          onChangeText={setName}
          placeholder={t("home.updateName.placeholder")}
          value={name}
        />
      </AppCard>

      <AppButton
        disabled={submitting}
        label={submitting ? t("common.loading") : t("home.updateName.save")}
        onPress={() => void save()}
      />
    </HomeScaffold>
  )
}
