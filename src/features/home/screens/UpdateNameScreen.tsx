import React, { useEffect, useState } from "react"

import { Pressable, StyleSheet, Text, TextInput, View } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { HomeScaffold } from "@/features/home/components/HomeScaffold"
import { useProfileSync } from "@/features/home/hooks/useProfileSync"
import { updateProfileNickname } from "@/features/home/services/homeApi"
import { useUserStore } from "@/shared/store/useUserStore"
import { useToast } from "@/shared/toast/useToast"
import { useAppTheme } from "@/shared/theme/useAppTheme"

import type { SettingsStackParamList } from "@/app/navigation/types"

type Props = NativeStackScreenProps<SettingsStackParamList, "UpdateNameScreen">

const MAX_NAME_LENGTH = 20

export function UpdateNameScreen({ navigation }: Props) {
  const theme = useAppTheme()
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
      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <Text style={[styles.label, { color: theme.colors.text }]}>{t("home.updateName.label")}</Text>
        <TextInput
          autoCapitalize="words"
          maxLength={MAX_NAME_LENGTH}
          onChangeText={setName}
          placeholder={t("home.updateName.placeholder")}
          placeholderTextColor={theme.colors.mutedText}
          style={[
            styles.input,
            {
              color: theme.colors.text,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.background,
            },
          ]}
          value={name}
        />
      </View>

      <Pressable
        disabled={submitting}
        onPress={() => void save()}
        style={[styles.saveButton, { backgroundColor: theme.colors.primary, opacity: submitting ? 0.65 : 1 }]}
      >
        <Text style={styles.saveText}>{submitting ? t("common.loading") : t("home.updateName.save")}</Text>
      </Pressable>
    </HomeScaffold>
  )
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
  },
  input: {
    minHeight: 44,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  saveButton: {
    minHeight: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
})
