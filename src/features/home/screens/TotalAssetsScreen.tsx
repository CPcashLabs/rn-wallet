import React, { useEffect, useMemo, useState } from "react"

import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { HeaderTextAction, HomeScaffold } from "@/features/home/components/HomeScaffold"
import { formatCurrency, formatDateTime, formatTokenAmount } from "@/features/home/utils/format"
import { resolveBalanceQueryError, useWalletBalanceQuery } from "@/shared/queries/balanceQueries"
import { getBoolean, setBoolean } from "@/shared/storage/kvStorage"
import { KvStorageKeys } from "@/shared/storage/sessionKeys"
import { useWalletStore } from "@/shared/store/useWalletStore"
import { useAppTheme } from "@/shared/theme/useAppTheme"
import { AppCard, APP_LIST_ROW_PADDING } from "@/shared/ui/AppCard"

import type { HomeTabStackParamList } from "@/app/navigation/types"

type Props = NativeStackScreenProps<HomeTabStackParamList, "TotalAssetsScreen">

export function TotalAssetsScreen({ navigation }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const address = useWalletStore(state => state.address)
  const chainId = useWalletStore(state => state.chainId)
  const balanceQuery = useWalletBalanceQuery({
    address,
    chainId,
  })
  const [showBalance, setShowBalance] = useState(true)
  const coins = balanceQuery.data?.coins ?? []
  const balances = balanceQuery.data?.balances ?? {}
  const loading = balanceQuery.isLoading && !balanceQuery.data
  const refreshing = balanceQuery.isRefetching
  const error = useMemo(
    () => resolveBalanceQueryError(balanceQuery.error, balanceQuery.isRefetchError),
    [balanceQuery.error, balanceQuery.isRefetchError],
  )
  const lastUpdatedAt = balanceQuery.data?.lastUpdatedAt ?? null

  useEffect(() => {
    const persisted = getBoolean(KvStorageKeys.ShowBalance)
    if (typeof persisted === "boolean") {
      setShowBalance(persisted)
    }
  }, [])

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

  const metaMessage = loading
    ? t("home.totalAssets.loading")
    : error
      ? t(error.kind === "refresh" ? "home.totalAssets.refreshFailed" : "home.totalAssets.loadFailed")
      : t("home.totalAssets.updatedAt", { at: formatDateTime(lastUpdatedAt) })
  const cardBackgroundColor = theme.colors.surfaceElevated ?? theme.colors.surface

  return (
    <HomeScaffold
      canGoBack
      onBack={navigation.goBack}
      title={t("home.totalAssets.title")}
      right={
        <HeaderTextAction
          disabled={refreshing || !address}
          label={refreshing ? t("common.loading") : t("home.totalAssets.refresh")}
          onPress={() => void balanceQuery.refetch()}
        />
      }
      scroll={false}
    >
      <ScrollView bounces={false} contentContainerStyle={styles.content}>
        <AppCard backgroundColor={cardBackgroundColor} borderColor={theme.colors.border} gap={theme.spacing.md} radius={theme.radius.xxl} style={styles.totalCard}>
          <View style={styles.totalHeader}>
            <View style={[styles.totalLabelPill, { backgroundColor: theme.colors.primarySoft ?? `${theme.colors.primary}14` }]}>
              <Text style={[styles.totalLabel, theme.typography.footnoteEmphasized, { color: theme.colors.primary }]}>
                {t("home.totalAssets.walletBalance")}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={toggleShowBalance}
              style={[
                styles.totalToggle,
                {
                  backgroundColor: theme.colors.surfaceMuted ?? theme.colors.background,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Text style={[styles.totalToggleText, theme.typography.subheadlineEmphasized, { color: theme.colors.text }]}>
                {showBalance ? t("home.shell.hide") : t("home.shell.show")}
              </Text>
            </Pressable>
          </View>
          <Text style={[styles.totalValue, theme.typography.largeTitle, { color: theme.colors.text }]}>
            {showBalance ? formatCurrency(totalAssetValue) : "*****"}
          </Text>
        </AppCard>

        <AppCard gap={6} padding={12} style={styles.metaCard}>
          <Text style={[styles.metaText, theme.typography.footnote, { color: error ? theme.colors.danger : theme.colors.mutedText }]}>{metaMessage}</Text>
        </AppCard>

        <AppCard overflow="hidden" padding={0} style={styles.listCard}>
          {rows.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, theme.typography.footnote, { color: theme.colors.mutedText }]}>{t("home.totalAssets.empty")}</Text>
            </View>
          ) : (
            rows.map(row => (
              <View key={row.code} style={[styles.assetRow, { borderBottomColor: theme.colors.border }]}>
                <View style={styles.assetLeft}>
                  <Text style={[styles.assetCode, theme.typography.subheadlineEmphasized, { color: theme.colors.text }]}>{row.symbol || row.code}</Text>
                  <Text style={[styles.assetName, theme.typography.footnote, { color: theme.colors.mutedText }]}>{row.name}</Text>
                </View>
                <View style={styles.assetRight}>
                  <Text style={[styles.assetAmount, theme.typography.subheadlineEmphasized, { color: theme.colors.text }]}>
                    {showBalance ? formatTokenAmount(row.balance) : "***"}
                  </Text>
                  <Text style={[styles.assetValue, theme.typography.footnote, { color: theme.colors.mutedText }]}>
                    {showBalance ? formatCurrency(row.value) : "***"}
                  </Text>
                </View>
              </View>
            ))
          )}
        </AppCard>
      </ScrollView>
    </HomeScaffold>
  )
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 8,
    paddingBottom: 28,
    gap: 12,
  },
  totalCard: {
  },
  totalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabelPill: {
    minHeight: 28,
    borderRadius: 999,
    paddingHorizontal: 10,
    justifyContent: "center",
  },
  totalLabel: {
  },
  totalToggle: {
    minHeight: 44,
    minWidth: 44,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  totalToggleText: {
  },
  totalValue: {
    fontVariant: ["tabular-nums"],
  },
  metaCard: {
    minHeight: 42,
    justifyContent: "center",
  },
  metaText: {
  },
  listCard: {
    gap: 0,
  },
  emptyState: {
    minHeight: 120,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  emptyText: {
  },
  assetRow: {
    minHeight: 66,
    paddingHorizontal: APP_LIST_ROW_PADDING,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  assetLeft: {
    gap: 4,
  },
  assetRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  assetCode: {
  },
  assetName: {
  },
  assetAmount: {
  },
  assetValue: {
  },
})
