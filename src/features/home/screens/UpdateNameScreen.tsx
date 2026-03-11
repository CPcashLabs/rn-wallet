import React, { useEffect, useState } from "react"

import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { HomeScaffold } from "@/features/home/components/HomeScaffold"
import { getCurrentUserProfile, updateProfileNickname } from "@/features/home/services/homeApi"
import { useUserStore } from "@/shared/store/useUserStore"
import { useAppTheme } from "@/shared/theme/useAppTheme"

import type { SettingsStackParamList } from "@/app/navigation/types"

type Props = NativeStackScreenProps<SettingsStackParamList, "UpdateNameScreen">

const MAX_NAME_LENGTH = 20

export function UpdateNameScreen({ navigation }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const profile = useUserStore(state => state.profile)
  const patchProfile = useUserStore(state => state.patchProfile)
  const setProfile = useUserStore(state => state.setProfile)
  const [name, setName] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setName(profile?.nickname ?? "")
  }, [profile?.nickname])

  const save = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      Alert.alert(t("common.errorTitle"), t("home.updateName.empty"))
      return
    }

    setSubmitting(true)

    try {
      await updateProfileNickname(trimmed)
      patchProfile({
        nickname: trimmed,
      })

      try {
        const freshProfile = await getCurrentUserProfile()
        setProfile(freshProfile)
      } catch {
        // 刷新失败不阻断昵称更新反馈。
      }

      Alert.alert(t("common.infoTitle"), t("home.updateName.success"))
      navigation.goBack()
    } catch {
      Alert.alert(t("common.errorTitle"), t("home.updateName.failed"))
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
