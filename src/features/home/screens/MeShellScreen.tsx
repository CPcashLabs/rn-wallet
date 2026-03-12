import React, { useEffect } from "react"

import { Pressable, StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { HomeScaffold } from "@/features/home/components/HomeScaffold"
import { UserAvatar } from "@/features/home/components/UserAvatar"
import { getCurrentUserProfile } from "@/features/home/services/homeApi"
import { formatAddress } from "@/features/home/utils/format"
import { useAuthStore } from "@/shared/store/useAuthStore"
import { useUserStore } from "@/shared/store/useUserStore"
import { useWalletStore } from "@/shared/store/useWalletStore"
import { useAppTheme } from "@/shared/theme/useAppTheme"

import type { SettingsStackParamList } from "@/app/navigation/types"

type Props = NativeStackScreenProps<SettingsStackParamList, "MeShellScreen">

export function MeShellScreen({ navigation }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const loginType = useAuthStore(state => state.loginType)
  const session = useAuthStore(state => state.session)
  const walletAddress = useWalletStore(state => state.address)
  const profile = useUserStore(state => state.profile)
  const avatarVersion = useUserStore(state => state.avatarVersion)
  const setProfile = useUserStore(state => state.setProfile)

  const displayName = profile?.nickname || t("home.shell.defaultNickname")
  const address = walletAddress ?? profile?.address ?? session?.address ?? ""
  const avatar = profile?.avatar
  const inviteBound = Boolean(profile?.inviteBound)
  const passkeyExported = Boolean(profile?.walletIsBackup)
  const isPasskeyLogin = loginType === "passkey"

  useEffect(() => {
    void (async () => {
      try {
        const userProfile = await getCurrentUserProfile()
        setProfile(userProfile)
      } catch {
        // P-015/P-016 在后续会补完整错误态，这里先保持页面可用。
      }
    })()
  }, [setProfile])

  return (
    <HomeScaffold title={t("home.tabs.me")}>
      <View style={[styles.profileCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <UserAvatar cacheVersion={avatarVersion} label={displayName} size={48} uri={avatar} />
        <View style={styles.profileMeta}>
          <Text style={[styles.name, { color: theme.colors.text }]}>{displayName}</Text>
          <Text style={[styles.address, { color: theme.colors.mutedText }]}>{formatAddress(address)}</Text>
          <Text style={[styles.level, { color: theme.colors.mutedText }]}>
            {t("home.me.inviteStatus", { status: inviteBound ? t("home.me.inviteBound") : t("home.me.inviteUnbound") })}
          </Text>
        </View>
      </View>

      <View style={[styles.listCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <MenuRow label={t("home.me.personal")} onPress={() => navigation.navigate("PersonalScreen")} />
        <MenuRow
          label={t("home.me.addressBook")}
          onPress={() => {
            ;(navigation.getParent()?.getParent() as any)?.navigate("AddressBookStack", {
              screen: "AddressBookListScreen",
            })
          }}
        />
        <MenuRow
          label={t("home.me.totalAssets")}
          onPress={() => {
            ;(navigation.getParent() as any)?.navigate("HomeTab", {
              screen: "TotalAssetsScreen",
            })
          }}
        />
        <MenuRow label={t("home.me.settings")} onPress={() => navigation.navigate("SettingsHomeScreen")} />
        {isPasskeyLogin ? (
          <MenuRow
            badge={passkeyExported ? t("home.me.exportedBadge") : undefined}
            label={t("home.me.exportPasskey")}
            onPress={() => navigation.navigate("ExportPasskeyScreen")}
          />
        ) : null}
      </View>
    </HomeScaffold>
  )
}

function MenuRow(props: { label: string; badge?: string; onPress: () => void }) {
  const theme = useAppTheme()

  return (
    <Pressable onPress={props.onPress} style={styles.row}>
      <Text style={[styles.rowLabel, { color: theme.colors.text }]}>{props.label}</Text>
      <View style={styles.rowRight}>
        {props.badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{props.badge}</Text>
          </View>
        ) : null}
        <Text style={[styles.rowArrow, { color: theme.colors.mutedText }]}>›</Text>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  profileCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  profileMeta: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
  },
  address: {
    fontSize: 13,
  },
  level: {
    fontSize: 12,
  },
  listCard: {
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
  rowArrow: {
    fontSize: 19,
    lineHeight: 19,
  },
  badge: {
    borderRadius: 999,
    backgroundColor: "#FFF1E9",
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    color: "#E37318",
    fontWeight: "700",
  },
})
