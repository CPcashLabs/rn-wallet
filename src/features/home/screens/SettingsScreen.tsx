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
import { AppListRow } from "@/shared/ui/AppList"

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
      <AppCard style={styles.card}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t("home.settings.accountSection")}</Text>
        <SettingsRow
          label={t("home.settings.changePassword")}
          onPress={() => {
            ;(navigation.getParent()?.getParent() as any)?.navigate("AuthStack", {
              screen: "LoggedInSetPasswordScreen",
            })
          }}
        />
        {isPasskeyLogin ? (
          <SettingsRow label={t("home.settings.exportPasskey")} onPress={() => navigation.navigate("ExportPasskeyScreen")} />
        ) : null}
        <SettingsRow
          detail={t(`home.settings.theme.${themeMode}`)}
          label={t("home.settings.themeMode")}
          onPress={() => {
            const nextMode = themeModes[(themeModes.indexOf(themeMode) + 1) % themeModes.length]
            persistThemePreference(nextMode)
          }}
        />
        <SettingsRow
          detail={t(`home.settings.languageOptions.${currentLanguage}`)}
          label={t("home.settings.language")}
          onPress={() => navigation.navigate("LanguageScreen")}
        />
        <SettingsRow
          detail={t(`home.settings.networkOptions.${chainId === "199" ? "mainnet" : "testnet"}`)}
          label={t("home.settings.network")}
          onPress={switchNetwork}
        />
      </AppCard>

      <AppCard style={styles.card}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t("home.settings.preferenceSection")}</Text>
        <SettingsRow
          detail={profile?.email || t("settingsHub.email.unbound")}
          label={t("home.settings.email")}
          onPress={() => navigation.navigate(profile?.email ? "EmailBindedScreen" : "EmailHomeScreen")}
        />
        <SettingsRow
          detail={selectedCurrency?.currency ?? "USD"}
          label={t("home.settings.unit")}
          onPress={() => navigation.navigate("UnitScreen")}
        />
        <SettingsRow
          detail={t("settingsHub.node.nodeDetail", { index: rpcIndex + 1 })}
          label={t("home.settings.node")}
          onPress={() => navigation.navigate("NodeSetupScreen")}
        />
        <SettingsRow label={t("settingsHub.email.notificationTitle")} onPress={() => navigation.navigate("EmailNotificationScreen")} />
      </AppCard>

      <AppButton label={t("home.settings.logout")} onPress={() => void logout()} tone="danger" />
    </HomeScaffold>
  )
}

function SettingsRow(props: { label: string; detail?: string; onPress: () => void }) {
  return <AppListRow onPress={props.onPress} subtitle={props.detail} title={props.label} />
}

const styles = StyleSheet.create({
  card: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
})
