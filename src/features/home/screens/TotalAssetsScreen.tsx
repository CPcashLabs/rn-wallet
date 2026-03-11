import React, { useEffect, useMemo, useState } from "react"

import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { HomeScaffold } from "@/features/home/components/HomeScaffold"
import { formatCurrency, formatDateTime, formatTokenAmount } from "@/features/home/utils/format"
import { getBoolean, setBoolean } from "@/shared/storage/kvStorage"
import { KvStorageKeys } from "@/shared/storage/sessionKeys"
import { useBalanceStore } from "@/shared/store/useBalanceStore"
import { useWalletStore } from "@/shared/store/useWalletStore"
import { useAppTheme } from "@/shared/theme/useAppTheme"

import type { HomeTabStackParamList } from "@/app/navigation/types"

type Props = NativeStackScreenProps<HomeTabStackParamList, "TotalAssetsScreen">

export function TotalAssetsScreen({ navigation }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const chainId = useWalletStore(state => state.chainId)
  const coins = useBalanceStore(state => state.coins)
  const balances = useBalanceStore(state => state.balances)
  const loading = useBalanceStore(state => state.loading)
  const refreshing = useBalanceStore(state => state.refreshing)
  const lastUpdatedAt = useBalanceStore(state => state.lastUpdatedAt)
  const loadCoins = useBalanceStore(state => state.loadCoins)
  const refreshCoins = useBalanceStore(state => state.refreshCoins)
  const [showBalance, setShowBalance] = useState(true)

  useEffect(() => {
    const persisted = getBoolean(KvStorageKeys.ShowBalance)
    if (typeof persisted === "boolean") {
      setShowBalance(persisted)
    }
  }, [])

  useEffect(() => {
    void loadCoins(chainId)
  }, [chainId, loadCoins])

  const rows = useMemo(() => {
    return coins
      .map(coin => {
        const balance = balances[coin.code] ?? 0
        return {
          ...coin,
          balance,
          value: balance * coin.price,
        }
      })
      .sort((a, b) => b.value - a.value)
  }, [balances, coins])

  const totalAssetValue = useMemo(() => rows.reduce((sum, row) => sum + row.value, 0), [rows])

  const toggleShowBalance = () => {
    const next = !showBalance
    setShowBalance(next)
    setBoolean(KvStorageKeys.ShowBalance, next)
  }

  return (
    <HomeScaffold
      canGoBack
      onBack={navigation.goBack}
      title={t("home.totalAssets.title")}
      right={
        <Pressable onPress={() => void refreshCoins(chainId)} style={styles.refreshButton}>
          <Text style={[styles.refreshText, { color: theme.colors.primary }]}>
            {refreshing ? t("common.loading") : t("home.totalAssets.refresh")}
          </Text>
        </Pressable>
      }
      scroll={false}
    >
      <ScrollView bounces={false} contentContainerStyle={styles.content}>
        <View style={[styles.totalCard, { backgroundColor: theme.colors.primary }]}>
          <View style={styles.totalHeader}>
            <Text style={styles.totalLabel}>{t("home.totalAssets.walletBalance")}</Text>
            <Pressable onPress={toggleShowBalance} style={styles.totalToggle}>
              <Text style={styles.totalToggleText}>{showBalance ? t("home.shell.hide") : t("home.shell.show")}</Text>
            </Pressable>
          </View>
          <Text style={styles.totalValue}>{showBalance ? formatCurrency(totalAssetValue) : "*****"}</Text>
        </View>

        <View style={[styles.metaCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.metaText, { color: theme.colors.mutedText }]}>
            {loading ? t("home.totalAssets.loading") : t("home.totalAssets.updatedAt", { at: formatDateTime(lastUpdatedAt) })}
          </Text>
        </View>

        <View style={[styles.listCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          {rows.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: theme.colors.mutedText }]}>{t("home.totalAssets.empty")}</Text>
            </View>
          ) : (
            rows.map(row => (
              <View key={row.code} style={styles.assetRow}>
                <View style={styles.assetLeft}>
                  <Text style={[styles.assetCode, { color: theme.colors.text }]}>{row.symbol || row.code}</Text>
                  <Text style={[styles.assetName, { color: theme.colors.mutedText }]}>{row.name}</Text>
                </View>
                <View style={styles.assetRight}>
                  <Text style={[styles.assetAmount, { color: theme.colors.text }]}>
                    {showBalance ? formatTokenAmount(row.balance) : "***"}
                  </Text>
                  <Text style={[styles.assetValue, { color: theme.colors.mutedText }]}>
                    {showBalance ? formatCurrency(row.value) : "***"}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </HomeScaffold>
  )
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 12,
  },
  refreshButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  refreshText: {
    fontSize: 13,
    fontWeight: "700",
  },
  totalCard: {
    borderRadius: 20,
    padding: 18,
    gap: 8,
  },
  totalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  totalToggle: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  totalToggleText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  totalValue: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
  },
  metaCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  metaText: {
    fontSize: 12,
  },
  listCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    overflow: "hidden",
  },
  emptyState: {
    minHeight: 120,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  emptyText: {
    fontSize: 13,
  },
  assetRow: {
    minHeight: 66,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#CBD5E133",
  },
  assetLeft: {
    gap: 4,
  },
  assetRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  assetCode: {
    fontSize: 15,
    fontWeight: "700",
  },
  assetName: {
    fontSize: 12,
  },
  assetAmount: {
    fontSize: 15,
    fontWeight: "700",
  },
  assetValue: {
    fontSize: 12,
  },
})
