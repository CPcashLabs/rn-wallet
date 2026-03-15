import React, { useEffect, useMemo, useRef, useState } from "react"

import { Alert, Pressable, StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { bindInviteCode } from "@/features/auth/services/authApi"
import { useProfileSync } from "@/features/home/hooks/useProfileSync"
import { getInviteBindingMessage } from "@/features/auth/utils/authMessages"
import { HomeScaffold } from "@/features/home/components/HomeScaffold"
import { formatAddress, formatCurrency } from "@/features/home/utils/format"
import { HomeMessagePreview } from "@/features/messages/components/HomeMessagePreview"
import { buildPluginHostParams } from "@/shared/plugins/navigation"
import { getBoolean, setBoolean } from "@/shared/storage/kvStorage"
import { KvStorageKeys } from "@/shared/storage/sessionKeys"
import { useBalanceStore } from "@/shared/store/useBalanceStore"
import { useWalletStore } from "@/shared/store/useWalletStore"
import { useToast } from "@/shared/toast/useToast"
import { useAppTheme } from "@/shared/theme/useAppTheme"
import { APP_CARD_RADIUS } from "@/shared/ui/AppCard"
import { AppleBrandMark } from "@/shared/ui/AppleBrandMark"

import type { HomeTabStackParamList } from "@/app/navigation/types"

type Props = NativeStackScreenProps<HomeTabStackParamList, "HomeShellScreen">

export function HomeShellScreen({ navigation, route }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const { showToast } = useToast()
  const walletAddress = useWalletStore(state => state.address)
  const walletChainId = useWalletStore(state => state.chainId)
  useProfileSync()
  const coins = useBalanceStore(state => state.coins)
  const balances = useBalanceStore(state => state.balances)
  const loadCoins = useBalanceStore(state => state.loadCoins)
  const [showBalance, setShowBalance] = useState(true)
  const inviteHandledRef = useRef(false)

  const totalAssetValue = useMemo(() => {
    return coins.reduce((sum, coin) => {
      const balance = balances[coin.code] ?? 0
      return sum + balance * coin.price
    }, 0)
  }, [balances, coins])

  useEffect(() => {
    const persisted = getBoolean(KvStorageKeys.ShowBalance)
    if (typeof persisted === "boolean") {
      setShowBalance(persisted)
    }
  }, [])

  useEffect(() => {
    void loadCoins(walletChainId)
  }, [loadCoins, walletAddress, walletChainId])

  useEffect(() => {
    if (!route.params?.inviteCode || inviteHandledRef.current) {
      return
    }

    inviteHandledRef.current = true

    void (async () => {
      try {
        await bindInviteCode(route.params?.inviteCode as string)
        showToast({ message: t("home.shell.inviteBound"), tone: "success" })
      } catch (error) {
        Alert.alert(t("common.errorTitle"), getInviteBindingMessage(error))
      }
    })()
  }, [route.params?.inviteCode, t])

  const handleToggleBalance = () => {
    const next = !showBalance
    setShowBalance(next)
    setBoolean(KvStorageKeys.ShowBalance, next)
  }

  const handleOpenTransfer = () => {
    ;(navigation.getParent()?.getParent() as any)?.navigate("PluginHost", buildPluginHostParams({ pluginId: "transfer" }))
  }

  const handleOpenReceive = () => {
    ;(navigation.getParent()?.getParent() as any)?.navigate("PluginHost", buildPluginHostParams({ pluginId: "receive" }))
  }

  const handleOpenCopouch = () => {
    ;(navigation.getParent()?.getParent() as any)?.navigate("PluginHost", buildPluginHostParams({ pluginId: "copouch" }))
  }

  const handleOpenMessages = () => {
    ;(navigation.getParent()?.getParent() as any)?.navigate("MessageStack", {
      screen: "MessageScreen",
    })
  }

  return (
    <HomeScaffold hideHeader title={t("home.shell.title")}>
      <View style={styles.heroRow}>
        <View style={styles.brandCluster}>
          <AppleBrandMark size={58} tone="light" />
          <View style={styles.brandMeta}>
            <Text style={[styles.brandTitle, { color: theme.colors.text }]}>
              {walletAddress ? formatAddress(walletAddress) : t("home.shell.defaultNickname")}
            </Text>
            <Text style={[styles.brandCaption, { color: theme.colors.mutedText }]}>
              {t("home.shell.walletBalance")}
            </Text>
          </View>
        </View>
        <Pressable
          onPress={handleOpenMessages}
          style={[
            styles.messageShortcut,
            {
              backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text style={[styles.messageShortcutText, { color: theme.colors.text }]}>{t("message.title")}</Text>
        </Pressable>
      </View>

      <View
        style={[
          styles.balanceCard,
          {
            backgroundColor: theme.isDark ? theme.colors.surfaceElevated ?? theme.colors.surface : theme.colors.brand,
            borderColor: theme.isDark ? theme.colors.border : "rgba(255,255,255,0.12)",
          },
        ]}
      >
        <View style={[styles.balanceGlow, styles.balanceGlowPrimary, { backgroundColor: theme.colors.primary }]} />
        <View style={[styles.balanceGlow, styles.balanceGlowSecondary, { backgroundColor: "rgba(255,255,255,0.26)" }]} />
        <View style={styles.balanceHeader}>
          <Text style={styles.balanceLabel}>{t("home.shell.walletBalance")}</Text>
          <Pressable onPress={handleToggleBalance} style={styles.balanceToggle}>
            <Text style={styles.balanceToggleText}>{showBalance ? t("home.shell.hide") : t("home.shell.show")}</Text>
          </Pressable>
        </View>

        <Text style={styles.balanceValue}>{showBalance ? formatCurrency(totalAssetValue) : "*****"}</Text>

        <Pressable onPress={() => navigation.navigate("TotalAssetsScreen")} style={styles.totalAssetsButton}>
          <Text style={styles.totalAssetsButtonText}>{t("home.shell.openTotalAssets")}</Text>
        </Pressable>
      </View>

      <View style={styles.actionGrid}>
        <ActionButton label={t("home.actions.transfer")} onPress={handleOpenTransfer} symbol="↑" />
        <ActionButton label={t("home.actions.receive")} onPress={handleOpenReceive} symbol="↓" />
        <ActionButton label={t("home.actions.copouch")} onPress={handleOpenCopouch} symbol="◉" />
      </View>

      <HomeMessagePreview onPress={handleOpenMessages} />
    </HomeScaffold>
  )
}

function ActionButton(props: { label: string; onPress: () => void; symbol: string }) {
  const theme = useAppTheme()

  return (
    <Pressable
      onPress={props.onPress}
      style={({ pressed }) => [
        styles.actionButton,
        {
          backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface,
          borderColor: theme.colors.border,
          shadowColor: theme.colors.shadow,
          shadowOpacity: theme.isDark ? 0.12 : 0.08,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 8 },
          elevation: 2,
        },
        pressed ? styles.actionButtonPressed : null,
      ]}
    >
      <View style={[styles.actionIconShell, { backgroundColor: theme.colors.primarySoft ?? `${theme.colors.primary}14` }]}>
        <Text style={[styles.actionSymbol, { color: theme.colors.primary }]}>{props.symbol}</Text>
      </View>
      <Text style={[styles.actionLabel, { color: theme.colors.text }]}>{props.label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  brandCluster: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  brandMeta: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  brandTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  brandCaption: {
    fontSize: 13,
  },
  messageShortcut: {
    minHeight: 38,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  messageShortcutText: {
    fontSize: 13,
    fontWeight: "600",
  },
  balanceCard: {
    borderRadius: 28,
    padding: 18,
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  balanceGlow: {
    position: "absolute",
    borderRadius: 999,
  },
  balanceGlowPrimary: {
    width: 180,
    height: 180,
    right: -40,
    top: -90,
    opacity: 0.45,
  },
  balanceGlowSecondary: {
    width: 120,
    height: 120,
    left: -30,
    bottom: -50,
    opacity: 0.18,
  },
  balanceHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  balanceLabel: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  balanceToggle: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  balanceToggleText: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  balanceValue: {
    fontSize: 28,
    color: "#FFFFFF",
    fontWeight: "800",
  },
  totalAssetsButton: {
    alignSelf: "flex-start",
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  totalAssetsButtonText: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
  },
  actionGrid: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    minWidth: 0,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: APP_CARD_RADIUS,
    minHeight: 118,
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  actionButtonPressed: {
    transform: [{ scale: 0.985 }],
  },
  actionIconShell: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  actionSymbol: {
    fontSize: 24,
    fontWeight: "600",
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
})
