import React from "react"

import { Alert, StyleSheet, Text, View } from "react-native"
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
import { AppListCard, AppListRow } from "@/shared/ui/AppList"

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
      <AppListCard>
        <AppListRow
          onPress={handleAvatarPress}
          right={
            <View style={styles.rowRight}>
              <UserAvatar cacheVersion={avatarVersion} label={nickname} size={32} uri={avatar} />
              <Text style={[styles.rowValue, { color: theme.colors.mutedText }]}>{uploading ? t("common.loading") : "›"}</Text>
            </View>
          }
          title={t("home.personal.avatar")}
        />
        <AppListRow
          onPress={() => navigation.navigate("UpdateNameScreen")}
          right={
            <View style={styles.rowRight}>
              <Text style={[styles.rowValue, { color: theme.colors.mutedText }]}>{nickname}</Text>
              <Text style={[styles.rowValue, { color: theme.colors.mutedText }]}>›</Text>
            </View>
          }
          title={t("home.personal.nickname")}
        />
        <AppListRow
          onPress={() => Alert.alert(t("common.infoTitle"), address)}
          right={
            <View style={styles.rowRight}>
              <Text style={[styles.rowValue, { color: theme.colors.mutedText }]}>{formatAddress(address)}</Text>
              <Text style={[styles.rowValue, { color: theme.colors.mutedText }]}>›</Text>
            </View>
          }
          title={t("home.personal.address")}
        />
        <AppListRow
          hideDivider
          onPress={() => navigation.navigate(hasEmail ? "EmailBindedScreen" : "EmailHomeScreen")}
          right={
            <View style={styles.rowRight}>
              <Text style={[styles.rowValue, { color: theme.colors.mutedText }]}>{email}</Text>
              <Text style={[styles.rowValue, { color: theme.colors.mutedText }]}>›</Text>
            </View>
          }
          title={t("home.personal.email")}
        />
      </AppListCard>
    </HomeScaffold>
  )
}

const styles = StyleSheet.create({
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rowValue: {
    fontSize: 13,
  },
})
