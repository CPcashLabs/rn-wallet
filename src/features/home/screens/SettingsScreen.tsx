import React from "react"

import { Alert, StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { navigateRoot, resetToAuthStack } from "@/app/navigation/navigationRef"
import { HomeScaffold } from "@/features/home/components/HomeScaffold"
import { clearAuthSession } from "@/shared/api/auth-session"
import { getCurrentLanguage, getLanguagePreference } from "@/shared/i18n"
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
  const languagePreference = getLanguagePreference()
  const isPasskeyLogin = useAuthStore(state => state.loginType) === "passkey"
  const chainId = useWalletStore(state => state.chainId) ?? DEFAULT_WALLET_CHAIN_ID
  const profile = useUserStore(state => state.profile)
  const selectedCurrency = getJson<SelectedCurrency>(KvStorageKeys.SelectedCurrency)
  const rpcIndex = getNumber(KvStorageKeys.WalletRpcIndex) ?? 0
  const languageLabelKey = languagePreference === "system" ? "home.settings.languageOptions.system" : `home.settings.languageOptions.${currentLanguage}`

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
    <HomeScaffold canGoBack contentContainerStyle={styles.page} onBack={navigation.goBack} title={t("home.settings.title")}>
      <Text style={[styles.sectionTitle, { color: theme.colors.mutedText }]}>{t("home.settings.accountSection")}</Text>
      <AppListCard style={styles.card}>
        <SettingsRow
          icon="lock"
          label={t("home.settings.changePassword")}
          onPress={() => {
            navigateRoot("AuthStack", {
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
          detail={t(languageLabelKey)}
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

      <AppButton label={t("home.settings.logout")} onPress={() => void logout()} style={styles.logoutButton} tone="danger" />
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
          {props.detail ? (
            <Text numberOfLines={1} style={[styles.rowDetail, { color: theme.colors.mutedText }]}>
              {props.detail}
            </Text>
          ) : null}
          <Text style={[styles.rowChevron, { color: theme.colors.mutedText }]}>›</Text>
        </View>
      }
      title={props.label}
    />
  )
}

const styles = StyleSheet.create({
  page: {
    gap: 14,
    paddingBottom: 148,
  },
  card: {
    gap: 0,
  },
  sectionTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",
    letterSpacing: -0.1,
    paddingHorizontal: 6,
    paddingTop: 2,
  },
  rowAccessory: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
    marginLeft: 12,
  },
  rowDetail: {
    maxWidth: 138,
    fontSize: 15,
    lineHeight: 20,
    textAlign: "right",
    flexShrink: 1,
  },
  rowChevron: {
    fontSize: 20,
    lineHeight: 20,
    fontWeight: "300",
  },
  logoutButton: {
    marginTop: 2,
  },
})
