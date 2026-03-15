import React from "react"

import { Alert, StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { resetToAuthStack } from "@/app/navigation/navigationRef"
import { HomeScaffold } from "@/features/home/components/HomeScaffold"
import { clearAuthSession } from "@/shared/api/auth-session"
import { getCurrentLanguage } from "@/shared/i18n"
import { resetProfileSyncSession } from "@/shared/session/profileSyncSession"
import { getJson, getNumber, setString } from "@/shared/storage/kvStorage"
import { KvStorageKeys } from "@/shared/storage/sessionKeys"
import { useAuthStore } from "@/shared/store/useAuthStore"
import { useBalanceStore } from "@/shared/store/useBalanceStore"
import { useUserStore } from "@/shared/store/useUserStore"
import { DEFAULT_WALLET_CHAIN_ID, useWalletStore } from "@/shared/store/useWalletStore"
import { useThemeStore, type ThemeMode } from "@/shared/store/useThemeStore"
import { useAppTheme } from "@/shared/theme/useAppTheme"
import { persistThemePreference } from "@/shared/theme/themePersistence"
import { AppButton } from "@/shared/ui/AppButton"
import { AppCard } from "@/shared/ui/AppCard"
import { AppListCard, AppListRow } from "@/shared/ui/AppList"
import { AppGlyph, type AppGlyphName } from "@/shared/ui/AppGlyph"

import type { SettingsStackParamList } from "@/app/navigation/types"

type Props = NativeStackScreenProps<SettingsStackParamList, "SettingsHomeScreen">

const themeModes: ThemeMode[] = ["system", "light", "dark"]
type SelectedCurrency = {
  currency: string
  symbol: string
}

export function SettingsScreen({ navigation }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const themeMode = useThemeStore(state => state.themeMode)
  const currentLanguage = getCurrentLanguage()
  const isPasskeyLogin = useAuthStore(state => state.loginType) === "passkey"
  const chainId = useWalletStore(state => state.chainId) ?? DEFAULT_WALLET_CHAIN_ID
  const profile = useUserStore(state => state.profile)
  const selectedCurrency = getJson<SelectedCurrency>(KvStorageKeys.SelectedCurrency)
  const rpcIndex = getNumber(KvStorageKeys.WalletRpcIndex) ?? 0

  const switchNetwork = () => {
    const nextChainId = chainId === "199" ? "1029" : "199"
    const walletState = useWalletStore.getState()

    setString(KvStorageKeys.WalletChainId, nextChainId)
    useWalletStore.getState().setWalletState({
      status: walletState.status,
      address: walletState.address,
      chainId: nextChainId,
    })
    useBalanceStore.getState().clear()

    if (walletState.address) {
      void useBalanceStore.getState().loadCoins(nextChainId)
    }
  }

  const logout = async () => {
    try {
      await clearAuthSession()
      resetProfileSyncSession()
      useAuthStore.getState().clearSession()
      useWalletStore.getState().setWalletState({
        status: "idle",
        address: null,
        chainId,
      })
      useUserStore.getState().clearProfile()
      useBalanceStore.getState().clear()
      resetToAuthStack()
    } catch {
      Alert.alert(t("common.errorTitle"), t("home.settings.logoutFailed"))
    }
  }

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("home.settings.title")}>
      <AppCard style={[styles.summaryCard, { backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface }]}>
        <Text style={[styles.summaryTitle, { color: theme.colors.text }]}>{t("home.settings.title")}</Text>
        <Text style={[styles.summaryBody, { color: theme.colors.mutedText }]}>
          {isPasskeyLogin ? t("home.settings.exportPasskey") : t("home.settings.changePassword")}
          {" · "}
          {t(`home.settings.networkOptions.${chainId === "199" ? "mainnet" : "testnet"}`)}
          {" · "}
          {t(`home.settings.languageOptions.${currentLanguage}`)}
        </Text>
      </AppCard>

      <Text style={[styles.sectionTitle, { color: theme.colors.mutedText }]}>{t("home.settings.accountSection")}</Text>
      <AppListCard style={styles.card}>
        <SettingsRow
          icon="lock"
          label={t("home.settings.changePassword")}
          onPress={() => {
            ;(navigation.getParent()?.getParent() as any)?.navigate("AuthStack", {
              screen: "LoggedInSetPasswordScreen",
            })
          }}
        />
        {isPasskeyLogin ? (
          <SettingsRow icon="wallet" label={t("home.settings.exportPasskey")} onPress={() => navigation.navigate("ExportPasskeyScreen")} />
        ) : null}
        <SettingsRow
          icon="gear"
          detail={t(`home.settings.theme.${themeMode}`)}
          hideDivider={false}
          label={t("home.settings.themeMode")}
          onPress={() => {
            const nextMode = themeModes[(themeModes.indexOf(themeMode) + 1) % themeModes.length]
            persistThemePreference(nextMode)
          }}
        />
        <SettingsRow
          icon="globe"
          detail={t(`home.settings.languageOptions.${currentLanguage}`)}
          label={t("home.settings.language")}
          onPress={() => navigation.navigate("LanguageScreen")}
        />
        <SettingsRow
          hideDivider
          icon="node"
          detail={t(`home.settings.networkOptions.${chainId === "199" ? "mainnet" : "testnet"}`)}
          label={t("home.settings.network")}
          onPress={switchNetwork}
        />
      </AppListCard>

      <Text style={[styles.sectionTitle, { color: theme.colors.mutedText }]}>{t("home.settings.preferenceSection")}</Text>
      <AppListCard style={styles.card}>
        <SettingsRow
          icon="mail"
          detail={profile?.email || t("settingsHub.email.unbound")}
          label={t("home.settings.email")}
          onPress={() => navigation.navigate(profile?.email ? "EmailBindedScreen" : "EmailHomeScreen")}
        />
        <SettingsRow
          icon="spark"
          detail={selectedCurrency?.currency ?? "USD"}
          label={t("home.settings.unit")}
          onPress={() => navigation.navigate("UnitScreen")}
        />
        <SettingsRow
          icon="node"
          detail={t("settingsHub.node.nodeDetail", { index: rpcIndex + 1 })}
          label={t("home.settings.node")}
          onPress={() => navigation.navigate("NodeSetupScreen")}
        />
        <SettingsRow hideDivider icon="bell" label={t("settingsHub.email.notificationTitle")} onPress={() => navigation.navigate("EmailNotificationScreen")} />
      </AppListCard>

      <AppButton label={t("home.settings.logout")} onPress={() => void logout()} tone="danger" />
    </HomeScaffold>
  )
}

function SettingsRow(props: { label: string; detail?: string; onPress: () => void; icon: AppGlyphName; hideDivider?: boolean }) {
  const theme = useAppTheme()

  return (
    <AppListRow
      hideDivider={props.hideDivider}
      left={<AppGlyph name={props.icon} />}
      onPress={props.onPress}
      right={
        <View style={styles.rowAccessory}>
          {props.detail ? <Text style={[styles.rowDetail, { color: theme.colors.mutedText }]}>{props.detail}</Text> : null}
          <Text style={[styles.rowChevron, { color: theme.colors.mutedText }]}>›</Text>
        </View>
      }
      title={props.label}
    />
  )
}

const styles = StyleSheet.create({
  summaryCard: {
    gap: 8,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  summaryBody: {
    fontSize: 13,
    lineHeight: 20,
  },
  card: {
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
  rowAccessory: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rowDetail: {
    fontSize: 13,
  },
  rowChevron: {
    fontSize: 22,
    lineHeight: 22,
    fontWeight: "300",
  },
})
