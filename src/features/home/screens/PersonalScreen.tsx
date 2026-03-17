import React from "react"

import { Alert, StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { HomeScaffold } from "@/features/home/components/HomeScaffold"
import { ImageCropModal, type CropResult } from "@/features/home/components/ImageCropModal"
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
import { AppGlyph } from "@/shared/ui/AppGlyph"
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
  const [cropUri, setCropUri] = React.useState<string | null>(null)

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

      // 打开裁剪弹窗，后续上传在 handleCropConfirm 中进行
      setCropUri(picked.data.uri)
    } catch (error) {
      if (isNativeImagePickerCancelledError(error)) {
        return
      }

      showToast({ message: t("home.personal.avatarUploadFailed"), tone: "error" })
    }
  }

  const handleCropConfirm = async (cropResult: CropResult) => {
    setCropUri(null)
    setUploading(true)

    try {
      const avatarUrl = await uploadProfileImage({
        uri: cropResult.sourceUri,
        name: "avatar.jpg",
        mimeType: "image/jpeg",
      })
      if (!avatarUrl) {
        throw new Error("missing avatar url")
      }

      await updateProfileAvatar(avatarUrl)
      patchProfile({ avatar: avatarUrl })
      void refresh()

      showToast({ message: t("home.personal.avatarUpdated"), tone: "success" })
    } catch {
      showToast({ message: t("home.personal.avatarUploadFailed"), tone: "error" })
    } finally {
      setUploading(false)
    }
  }

  const handleCropCancel = () => {
    setCropUri(null)
  }

  return (
    <HomeScaffold canGoBack contentContainerStyle={styles.page} onBack={navigation.goBack} title={t("home.personal.title")}>
      {cropUri ? (
        <ImageCropModal
          imageUri={cropUri}
          onCancel={handleCropCancel}
          onConfirm={handleCropConfirm}
          visible
        />
      ) : null}

      <AppListCard>
        <AppListRow
          left={<AppGlyph name="photo" />}
          onPress={handleAvatarPress}
          right={
            <View style={styles.rowRight}>
              <UserAvatar accountKey={address} cacheVersion={avatarVersion} label={nickname} size={36} uri={avatar} />
              <Text style={[uploading ? styles.rowValue : styles.chevron, { color: theme.colors.mutedText }]}>
                {uploading ? t("common.loading") : "›"}
              </Text>
            </View>
          }
          title={t("home.personal.avatar")}
        />
        <AppListRow
          left={<AppGlyph name="edit" />}
          onPress={() => navigation.navigate("UpdateNameScreen")}
          right={
            <View style={styles.rowRight}>
              <Text numberOfLines={1} style={[styles.rowValue, { color: theme.colors.mutedText }]}>{nickname}</Text>
              <Text style={[styles.chevron, { color: theme.colors.mutedText }]}>›</Text>
            </View>
          }
          title={t("home.personal.nickname")}
        />
        <AppListRow
          left={<AppGlyph name="wallet" />}
          onPress={() => Alert.alert(t("common.infoTitle"), address)}
          right={
            <View style={styles.rowRight}>
              <Text numberOfLines={1} style={[styles.rowValue, styles.rowValueCompressed, { color: theme.colors.mutedText }]}>
                {formatAddress(address)}
              </Text>
              <Text style={[styles.chevron, { color: theme.colors.mutedText }]}>›</Text>
            </View>
          }
          title={t("home.personal.address")}
        />
        <AppListRow
          hideDivider
          left={<AppGlyph name="mail" />}
          onPress={() => navigation.navigate(hasEmail ? "EmailBindedScreen" : "EmailHomeScreen")}
          right={
            <View style={styles.rowRight}>
              <Text numberOfLines={1} style={[styles.rowValue, styles.rowValueCompressed, { color: theme.colors.mutedText }]}>
                {email}
              </Text>
              <Text style={[styles.chevron, { color: theme.colors.mutedText }]}>›</Text>
            </View>
          }
          title={t("home.personal.email")}
        />
      </AppListCard>
    </HomeScaffold>
  )
}

const styles = StyleSheet.create({
  page: {
    gap: 16,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    maxWidth: "64%",
    minWidth: 0,
  },
  rowValue: {
    flexShrink: 1,
    fontSize: 15,
    lineHeight: 20,
    textAlign: "right",
  },
  rowValueCompressed: {
    maxWidth: 150,
  },
  chevron: {
    fontSize: 20,
    lineHeight: 20,
    fontWeight: "300",
  },
})
