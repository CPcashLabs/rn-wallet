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
import { useToast } from "@/shared/toast/useToast"
import { useAppTheme } from "@/shared/theme/useAppTheme"
import { AppCard, APP_LIST_ROW_MIN_HEIGHT, APP_LIST_ROW_PADDING } from "@/shared/ui/AppCard"

import type { SettingsStackParamList } from "@/app/navigation/types"

type Props = NativeStackScreenProps<SettingsStackParamList, "PersonalScreen">

export function PersonalScreen({ navigation }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const { showToast } = useToast()
  const { profile, refresh } = useProfileSync()
  const avatarVersion = useUserStore(state => state.avatarVersion)
  const session = useAuthStore(state => state.session)
  const walletAddress = useWalletStore(state => state.address)
  const patchProfile = useUserStore(state => state.patchProfile)
  const [uploading, setUploading] = React.useState(false)

  const address = walletAddress ?? profile?.address ?? session?.address ?? ""
  const nickname = profile?.nickname || t("home.shell.defaultNickname")
  const hasEmail = Boolean(profile?.email)
  const email = profile?.email || t("settingsHub.email.unbound")
  const avatar = profile?.avatar

  const handleAvatarPress = async () => {
    const capability = fileAdapter.getCapability()

    if (!capability.supported) {
      showToast({ message: t("home.personal.avatarPending"), tone: "warning" })
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

      showToast({ message: t("home.personal.avatarUpdated"), tone: "success" })
    } catch (error) {
      if (isNativeImagePickerCancelledError(error)) {
        return
      }

      showToast({ message: t("home.personal.avatarUploadFailed"), tone: "error" })
    } finally {
      setUploading(false)
    }
  }

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("home.personal.title")}>
      <AppCard overflow="hidden" padding={0}>
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

        <Pressable
          onPress={() => navigation.navigate(hasEmail ? "EmailBindedScreen" : "EmailHomeScreen")}
          style={styles.row}
        >
          <Text style={[styles.rowLabel, { color: theme.colors.text }]}>{t("home.personal.email")}</Text>
          <View style={styles.rowRight}>
            <Text style={[styles.rowValue, { color: theme.colors.mutedText }]}>{email}</Text>
            <Text style={[styles.rowValue, { color: theme.colors.mutedText }]}>›</Text>
          </View>
        </Pressable>
      </AppCard>
    </HomeScaffold>
  )
}

const styles = StyleSheet.create({
  row: {
    minHeight: APP_LIST_ROW_MIN_HEIGHT,
    paddingHorizontal: APP_LIST_ROW_PADDING,
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
