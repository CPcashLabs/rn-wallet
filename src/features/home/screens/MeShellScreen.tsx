import React from "react"

import { Pressable, StyleSheet, Text, View } from "react-native"
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
import { AppCard, APP_LIST_ROW_MIN_HEIGHT, APP_LIST_ROW_PADDING } from "@/shared/ui/AppCard"

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

      <AppCard overflow="hidden" padding={0} style={styles.listCard}>
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
        <MenuRow label={t("home.me.settings")} last onPress={() => navigation.navigate("SettingsHomeScreen")} />
      </AppCard>

      <AppCard overflow="hidden" padding={0} style={styles.listCard}>
        <MenuRow
          last
          label={t("home.me.messages")}
          onPress={() => {
            ;(navigation.getParent()?.getParent() as any)?.navigate("MessageStack", {
              screen: "MessageScreen",
            })
          }}
        />
      </AppCard>
    </HomeScaffold>
  )
}

function MenuRow(props: { label: string; badge?: string; onPress: () => void; last?: boolean }) {
  const theme = useAppTheme()

  return (
    <Pressable
      onPress={props.onPress}
      style={[styles.row, { borderBottomColor: theme.colors.border }, props.last ? styles.rowLast : null]}
    >
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
  row: {
    minHeight: APP_LIST_ROW_MIN_HEIGHT,
    paddingHorizontal: APP_LIST_ROW_PADDING,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLast: {
    borderBottomWidth: 0,
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
