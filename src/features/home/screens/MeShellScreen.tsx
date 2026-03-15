import React from "react"

import { StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { HomeScaffold } from "@/features/home/components/HomeScaffold"
import { useProfileSync } from "@/features/home/hooks/useProfileSync"
import { UserAvatar } from "@/features/home/components/UserAvatar"
import { formatAddress } from "@/features/home/utils/format"
import { navigateRoot } from "@/app/navigation/navigationRef"
import { useAuthStore } from "@/shared/store/useAuthStore"
import { useUserStore } from "@/shared/store/useUserStore"
import { useWalletStore } from "@/shared/store/useWalletStore"
import { useAppTheme } from "@/shared/theme/useAppTheme"
import { AppCard } from "@/shared/ui/AppCard"
import { AppGlyph, type AppGlyphName } from "@/shared/ui/AppGlyph"
import { AppListCard, AppListRow } from "@/shared/ui/AppList"

import type { SettingsStackParamList } from "@/app/navigation/types"

type Props = NativeStackScreenProps<SettingsStackParamList, "MeShellScreen">

export function MeShellScreen({ navigation }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const session = useAuthStore(state => state.session)
  const loginType = useAuthStore(state => state.loginType)
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
        <UserAvatar cacheVersion={avatarVersion} label={displayName} size={58} uri={avatar} />
        <View style={styles.profileMeta}>
          <Text style={[styles.name, { color: theme.colors.text }]}>{displayName}</Text>
          <Text style={[styles.address, { color: theme.colors.mutedText }]}>{formatAddress(address)}</Text>
          <View style={styles.statusRow}>
            <StatusPill label={inviteBound ? t("home.me.inviteBound") : t("home.me.inviteUnbound")} tone={inviteBound ? "primary" : "neutral"} />
            <StatusPill label={loginType === "passkey" ? "Passkey" : "Wallet"} tone="neutral" />
          </View>
        </View>
      </AppCard>

      <Text style={[styles.sectionTitle, { color: theme.colors.mutedText }]}>{t("home.me.personal")}</Text>
      <AppListCard style={styles.listCard}>
        <MenuRow body={t("home.personal.title")} icon="person" label={t("home.me.personal")} onPress={() => navigation.navigate("PersonalScreen")} />
        <MenuRow
          body={t("home.me.addressBook")}
          icon="addressBook"
          label={t("home.me.addressBook")}
          onPress={() => {
            navigateRoot("AddressBookStack", {
              screen: "AddressBookListScreen",
            })
          }}
        />
        <MenuRow
          body={t("home.me.recordsBody")}
          icon="book"
          label={t("home.me.records")}
          onPress={() => {
            navigateRoot("OrdersStack", {
              screen: "TxlogsScreen",
            })
          }}
        />
        <MenuRow body={t("settingsHub.invite.bindTitle")} icon="invite" label={t("settingsHub.invite.title")} onPress={() => navigation.navigate("InviteHomeScreen")} />
      </AppListCard>

      <Text style={[styles.sectionTitle, { color: theme.colors.mutedText }]}>{t("home.me.settings")}</Text>
      <AppListCard style={styles.listCard}>
        <MenuRow body={t("home.settings.title")} icon="gear" label={t("home.me.settings")} onPress={() => navigation.navigate("SettingsHomeScreen")} />
        <MenuRow body={t("settingsHub.help.needHelp")} icon="help" label={t("settingsHub.help.title")} onPress={() => navigation.navigate("HelpCenterScreen")} />
        <MenuRow body={t("settingsHub.about.title")} icon="info" label={t("settingsHub.about.title")} last onPress={() => navigation.navigate("AboutScreen")} />
      </AppListCard>
    </HomeScaffold>
  )
}

function MenuRow(props: { label: string; body: string; icon: AppGlyphName; badge?: string; onPress: () => void; last?: boolean }) {
  const theme = useAppTheme()

  return (
    <AppListRow
      hideDivider={props.last}
      left={<AppGlyph name={props.icon} />}
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
      subtitle={props.body}
      title={props.label}
    />
  )
}

function StatusPill(props: { label: string; tone: "primary" | "neutral" }) {
  const theme = useAppTheme()
  const backgroundColor = props.tone === "primary" ? theme.colors.primarySoft ?? `${theme.colors.primary}14` : theme.colors.surfaceMuted ?? theme.colors.background
  const color = props.tone === "primary" ? theme.colors.primary : theme.colors.mutedText

  return (
    <View style={[styles.statusPill, { backgroundColor }]}>
      <Text style={[styles.statusPillText, { color }]}>{props.label}</Text>
    </View>
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
    fontSize: 19,
    fontWeight: "700",
  },
  address: {
    fontSize: 13,
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  listCard: {
    gap: 0,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    paddingHorizontal: 4,
    paddingTop: 4,
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
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: "600",
  },
})
