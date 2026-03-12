import React from "react"

import { Alert, Pressable, StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { HomeScaffold } from "@/features/home/components/HomeScaffold"
import { useProfileSync } from "@/features/home/hooks/useProfileSync"
import { UserAvatar } from "@/features/home/components/UserAvatar"
import { formatAddress } from "@/features/home/utils/format"
import { updateProfileAvatar, uploadProfileImage } from "@/features/home/services/homeApi"
import { fileAdapter, isNativeImagePickerCancelledError } from "@/shared/native"
import { useAuthStore } from "@/shared/store/useAuthStore"
import { useUserStore } from "@/shared/store/useUserStore"
import { useWalletStore } from "@/shared/store/useWalletStore"
import { useAppTheme } from "@/shared/theme/useAppTheme"

import type { SettingsStackParamList } from "@/app/navigation/types"

type Props = NativeStackScreenProps<SettingsStackParamList, "PersonalScreen">

export function PersonalScreen({ navigation }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const { profile, refresh } = useProfileSync()
  const avatarVersion = useUserStore(state => state.avatarVersion)
  const session = useAuthStore(state => state.session)
  const walletAddress = useWalletStore(state => state.address)
  const patchProfile = useUserStore(state => state.patchProfile)
  const [uploading, setUploading] = React.useState(false)

  const address = walletAddress ?? profile?.address ?? session?.address ?? ""
  const nickname = profile?.nickname || t("home.shell.defaultNickname")
  const email = profile?.email || "--"
  const avatar = profile?.avatar

  const handleAvatarPress = async () => {
    const capability = fileAdapter.getCapability()

    if (!capability.supported) {
      Alert.alert(t("common.infoTitle"), t("home.personal.avatarPending"))
      return
    }

    try {
      const picked = await fileAdapter.pickImage()
      if (!picked.ok) {
        if (isNativeImagePickerCancelledError(picked.error)) {
          return
        }
        throw picked.error
      }

      setUploading(true)

      const avatarUrl = await uploadProfileImage(picked.data)
      if (!avatarUrl) {
        throw new Error("missing avatar url")
      }

      await updateProfileAvatar(avatarUrl)
      patchProfile({ avatar: avatarUrl })
      void refresh()

      Alert.alert(t("common.infoTitle"), t("home.personal.avatarUpdated"))
    } catch (error) {
      if (isNativeImagePickerCancelledError(error)) {
        return
      }

      Alert.alert(t("common.errorTitle"), t("home.personal.avatarUploadFailed"))
    } finally {
      setUploading(false)
    }
  }

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("home.personal.title")}>
      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <Pressable onPress={handleAvatarPress} style={styles.row}>
          <Text style={[styles.rowLabel, { color: theme.colors.text }]}>{t("home.personal.avatar")}</Text>
          <View style={styles.rowRight}>
            <UserAvatar cacheVersion={avatarVersion} label={nickname} size={32} uri={avatar} />
            <Text style={[styles.rowValue, { color: theme.colors.mutedText }]}>
              {uploading ? t("common.loading") : "›"}
            </Text>
          </View>
        </Pressable>

        <Pressable onPress={() => navigation.navigate("UpdateNameScreen")} style={styles.row}>
          <Text style={[styles.rowLabel, { color: theme.colors.text }]}>{t("home.personal.nickname")}</Text>
          <View style={styles.rowRight}>
            <Text style={[styles.rowValue, { color: theme.colors.mutedText }]}>{nickname}</Text>
            <Text style={[styles.rowValue, { color: theme.colors.mutedText }]}>›</Text>
          </View>
        </Pressable>

        <Pressable onPress={() => Alert.alert(t("common.infoTitle"), address)} style={styles.row}>
          <Text style={[styles.rowLabel, { color: theme.colors.text }]}>{t("home.personal.address")}</Text>
          <View style={styles.rowRight}>
            <Text style={[styles.rowValue, { color: theme.colors.mutedText }]}>{formatAddress(address)}</Text>
            <Text style={[styles.rowValue, { color: theme.colors.mutedText }]}>›</Text>
          </View>
        </Pressable>

        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: theme.colors.text }]}>{t("home.personal.email")}</Text>
          <Text style={[styles.rowValue, { color: theme.colors.mutedText }]}>{email}</Text>
        </View>
      </View>
    </HomeScaffold>
  )
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    overflow: "hidden",
  },
  row: {
    minHeight: 52,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#CBD5E133",
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: "500",
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rowValue: {
    fontSize: 13,
  },
})
