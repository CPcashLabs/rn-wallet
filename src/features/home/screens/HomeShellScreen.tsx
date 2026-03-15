import React, { useEffect, useMemo, useRef, useState } from "react"

import { Alert, Pressable, StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { bindInviteCode } from "@/features/auth/services/authApi"
import { useProfileSync } from "@/features/home/hooks/useProfileSync"
import { getInviteBindingMessage } from "@/features/auth/utils/authMessages"
import { HomeScaffold } from "@/features/home/components/HomeScaffold"
import { formatCurrency } from "@/features/home/utils/format"
import { HomeMessagePreview } from "@/features/messages/components/HomeMessagePreview"
import { buildPluginHostParams } from "@/shared/plugins/navigation"
import { getBoolean, setBoolean } from "@/shared/storage/kvStorage"
import { KvStorageKeys } from "@/shared/storage/sessionKeys"
import { useBalanceStore } from "@/shared/store/useBalanceStore"
import { useWalletStore } from "@/shared/store/useWalletStore"
import { useToast } from "@/shared/toast/useToast"
import { useAppTheme } from "@/shared/theme/useAppTheme"
import { AppCard, APP_CARD_RADIUS } from "@/shared/ui/AppCard"

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
  const loadingCoins = useBalanceStore(state => state.loading)
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

  const handleOpenOrders = () => {
    ;(navigation.getParent()?.getParent() as any)?.navigate("OrdersStack", {
      screen: "TxlogsScreen",
    })
  }

  const handleOpenMessages = () => {
    ;(navigation.getParent()?.getParent() as any)?.navigate("MessageStack", {
      screen: "MessageScreen",
    })
  }

  return (
    <HomeScaffold hideHeader title={t("home.shell.title")}>
      <View style={[styles.balanceCard, { backgroundColor: theme.colors.primary }]}>
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
        <ActionButton label={t("home.actions.transfer")} onPress={handleOpenTransfer} />
        <ActionButton label={t("home.actions.receive")} onPress={handleOpenReceive} />
        <ActionButton label={t("home.actions.records")} onPress={handleOpenOrders} />
        <ActionButton label={t("home.actions.copouch")} onPress={handleOpenCopouch} />
      </View>

      <HomeMessagePreview onPress={handleOpenMessages} />

      <AppCard style={styles.tipsCard}>
        <Text style={[styles.tipTitle, { color: theme.colors.text }]}>{t("home.shell.statusTitle")}</Text>
        <Text style={[styles.tipBody, { color: theme.colors.mutedText }]}>
          {loadingCoins ? t("home.shell.loadingAssets") : t("home.shell.loadedCoins", { count: coins.length })}
        </Text>
      </AppCard>
    </HomeScaffold>
  )
}

function ActionButton(props: { label: string; onPress: () => void }) {
  const theme = useAppTheme()

  return (
    <Pressable
      onPress={props.onPress}
      style={[styles.actionButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
    >
      <Text style={[styles.actionLabel, { color: theme.colors.text }]}>{props.label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  balanceCard: {
    borderRadius: 20,
    padding: 18,
    gap: 10,
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
    flexWrap: "wrap",
    gap: 12,
  },
  actionButton: {
    width: "48%",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: APP_CARD_RADIUS,
    minHeight: 76,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  tipsCard: {
    gap: 6,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  tipBody: {
    fontSize: 13,
    lineHeight: 20,
  },
})
