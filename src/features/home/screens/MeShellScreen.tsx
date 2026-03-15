import React from "react"

import { StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { HomeScaffold } from "@/features/home/components/HomeScaffold"
import { useProfileSync } from "@/features/home/hooks/useProfileSync"
import { UserAvatar } from "@/features/home/components/UserAvatar"
import { formatAddress } from "@/features/home/utils/format"
import { useAuthStore } from "@/shared/store/useAuthStore"
import { useUserStore } from "@/shared/store/useUserStore"
import { useWalletStore } from "@/shared/store/useWalletStore"
import { useAppTheme } from "@/shared/theme/useAppTheme"
import { AppCard } from "@/shared/ui/AppCard"
import { AppListCard, AppListRow } from "@/shared/ui/AppList"

import type { SettingsStackParamList } from "@/app/navigation/types"

type Props = NativeStackScreenProps<SettingsStackParamList, "MeShellScreen">

export function MeShellScreen({ navigation }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const session = useAuthStore(state => state.session)
  const walletAddress = useWalletStore(state => state.address)
  const { profile } = useProfileSync()
  const avatarVersion = useUserStore(state => state.avatarVersion)

  const displayName = profile?.nickname || t("home.shell.defaultNickname")
  const address = walletAddress ?? profile?.address ?? session?.address ?? ""
  const avatar = profile?.avatar
  const inviteBound = Boolean(profile?.inviteBound)

  return (
    <HomeScaffold title={t("home.tabs.me")}>
      <AppCard style={styles.profileCard}>
        <UserAvatar cacheVersion={avatarVersion} label={displayName} size={48} uri={avatar} />
        <View style={styles.profileMeta}>
          <Text style={[styles.name, { color: theme.colors.text }]}>{displayName}</Text>
          <Text style={[styles.address, { color: theme.colors.mutedText }]}>{formatAddress(address)}</Text>
          <Text style={[styles.level, { color: theme.colors.mutedText }]}>
            {t("home.me.inviteStatus", { status: inviteBound ? t("home.me.inviteBound") : t("home.me.inviteUnbound") })}
          </Text>
        </View>
      </AppCard>

      <AppListCard style={styles.listCard}>
        <MenuRow label={t("home.me.personal")} onPress={() => navigation.navigate("PersonalScreen")} />
        <MenuRow
          label={t("home.me.addressBook")}
          onPress={() => {
            ;(navigation.getParent()?.getParent() as any)?.navigate("AddressBookStack", {
              screen: "AddressBookListScreen",
            })
          }}
        />
        <MenuRow label={t("settingsHub.invite.title")} onPress={() => navigation.navigate("InviteHomeScreen")} />
        <MenuRow label={t("home.me.settings")} onPress={() => navigation.navigate("SettingsHomeScreen")} />
        <MenuRow label={t("settingsHub.help.title")} onPress={() => navigation.navigate("HelpCenterScreen")} />
        <MenuRow label={t("settingsHub.about.title")} last onPress={() => navigation.navigate("AboutScreen")} />
      </AppListCard>
    </HomeScaffold>
  )
}

function MenuRow(props: { label: string; badge?: string; onPress: () => void; last?: boolean }) {
  const theme = useAppTheme()

  return (
    <AppListRow
      hideDivider={props.last}
      onPress={props.onPress}
      right={
        props.badge ? (
          <View style={styles.rowRight}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{props.badge}</Text>
            </View>
            <Text style={[styles.rowArrow, { color: theme.colors.mutedText }]}>›</Text>
          </View>
        ) : undefined
      }
      title={props.label}
    />
  )
}

const styles = StyleSheet.create({
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
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
    gap: 0,
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
