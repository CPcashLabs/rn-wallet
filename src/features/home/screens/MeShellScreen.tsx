import React from "react"

import { Pressable, StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { HomeScaffold } from "@/features/home/components/HomeScaffold"
import { UserAvatar } from "@/features/home/components/UserAvatar"
import { useProfileSync } from "@/features/home/hooks/useProfileSync"
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
  const handleOpenHelp = () => {
    navigateRoot("HelpStack", {
      screen: "HelpCenterScreen",
    })
  }

  return (
    <HomeScaffold backgroundColor={theme.colors.background} hideHeader title={t("home.tabs.me")}>
      <View style={styles.page}>
        <View style={styles.topActions}>
          <TopActionButton icon="help" onPress={handleOpenHelp} />
          <TopActionButton icon="gear" onPress={() => navigation.navigate("SettingsHomeScreen")} />
        </View>

        <Pressable
          onPress={() => navigation.navigate("PersonalScreen")}
          style={({ pressed }) => [
            styles.heroPressable,
            {
              transform: [{ scale: pressed ? 0.992 : 1 }],
            },
          ]}
        >
          <AppCard
            backgroundColor={theme.colors.surfaceElevated ?? theme.colors.surface}
            borderColor={theme.colors.border}
            style={styles.heroCard}
          >
            <View style={styles.profileCard}>
              <View
                style={[
                  styles.avatarShell,
                  theme.shadows.card,
                  {
                    backgroundColor: theme.colors.surfaceMuted ?? theme.colors.background,
                  },
                ]}
              >
                <UserAvatar accountKey={address} cacheVersion={avatarVersion} label={displayName} size={72} uri={avatar} />
              </View>

              <View style={styles.profileMeta}>
                <Text numberOfLines={1} style={[styles.name, theme.typography.title2, { color: theme.colors.text }]}>
                  {displayName}
                </Text>
                <Text numberOfLines={1} style={[styles.address, theme.typography.subheadline, { color: theme.colors.mutedText }]}>
                  {formatAddress(address) || "--"}
                </Text>
                <Text style={[styles.profileHint, theme.typography.footnote, { color: theme.colors.mutedText }]}>{t("home.me.personal")}</Text>
                <View style={styles.statusRow}>
                  <StatusPill label={inviteBound ? t("home.me.inviteBound") : t("home.me.inviteUnbound")} tone={inviteBound ? "primary" : "neutral"} />
                  <StatusPill label={loginType === "passkey" ? "Passkey" : "Wallet"} tone="neutral" />
                </View>
              </View>

              <Text style={[styles.heroArrow, { color: theme.colors.mutedText }]}>›</Text>
            </View>
          </AppCard>
        </Pressable>

        <AppListCard style={styles.listCard}>
          <MenuRow
            icon="addressBook"
            label={t("home.me.addressBook")}
            onPress={() => {
              navigateRoot("AddressBookStack", {
                screen: "AddressBookListScreen",
              })
            }}
          />
          <MenuRow
            icon="book"
            label={t("home.me.records")}
            onPress={() => {
              navigateRoot("OrdersStack", {
                screen: "TxlogsScreen",
              })
            }}
          />
          <MenuRow icon="invite" label={t("settingsHub.invite.title")} last onPress={() => navigation.navigate("InviteHomeScreen")} />
        </AppListCard>

        <AppListCard style={styles.listCard}>
          <MenuRow icon="gear" label={t("home.me.settings")} onPress={() => navigation.navigate("SettingsHomeScreen")} />
          <MenuRow icon="help" label={t("settingsHub.help.title")} onPress={handleOpenHelp} />
          <MenuRow icon="info" label={t("settingsHub.about.title")} last onPress={() => navigation.navigate("AboutScreen")} />
        </AppListCard>
      </View>
    </HomeScaffold>
  )
}

function TopActionButton(props: { icon: AppGlyphName; onPress: () => void }) {
  const theme = useAppTheme()

  return (
    <Pressable
      onPress={props.onPress}
      style={({ pressed }) => [
        styles.topActionButton,
        theme.shadows.control,
        {
          width: theme.components.inlineIconButton.size,
          height: theme.components.inlineIconButton.size,
          borderRadius: theme.components.inlineIconButton.size / 2,
          backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface,
          borderColor: theme.colors.border,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
      ]}
    >
      <AppGlyph backgroundColor="transparent" name={props.icon} size={20} tintColor={theme.colors.text} />
    </Pressable>
  )
}

function MenuRow(props: { label: string; icon: AppGlyphName; badge?: string; onPress: () => void; last?: boolean }) {
  const theme = useAppTheme()

  return (
    <AppListRow
      hideDivider={props.last}
      left={<AppGlyph name={props.icon} />}
      minHeight={theme.controls.listRowProminentMinHeight}
      onPress={props.onPress}
      right={
        props.badge ? (
          <View style={styles.rowRight}>
            <View style={[styles.badge, { backgroundColor: theme.colors.warningSoft }]}>
              <Text style={[styles.badgeText, { color: theme.colors.warning }]}>{props.badge}</Text>
            </View>
            <Text style={[styles.rowArrow, { color: theme.colors.mutedText }]}>›</Text>
          </View>
        ) : undefined
      }
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
      <Text style={[styles.statusPillText, theme.typography.footnoteEmphasized, { color }]}>{props.label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  page: {
    gap: 16,
    paddingBottom: 28,
  },
  topActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginBottom: 4,
  },
  topActionButton: {
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  heroPressable: {
    marginTop: 2,
  },
  heroCard: {
    minHeight: 148,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    minHeight: 104,
  },
  avatarShell: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  profileMeta: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  name: {
  },
  address: {
  },
  profileHint: {
  },
  heroArrow: {
    fontSize: 22,
    lineHeight: 22,
    fontWeight: "300",
    marginLeft: 4,
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
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
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  statusPill: {
    minHeight: 28,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    justifyContent: "center",
  },
  statusPillText: {
  },
})
