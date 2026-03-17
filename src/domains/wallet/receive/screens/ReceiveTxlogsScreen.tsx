import React, { useEffect, useMemo, useState } from "react"

import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { useIsFocused } from "@react-navigation/native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import type { ReceiveStackParamList } from "@/app/navigation/types"
import {
  buildReceiveTxlogSources,
  filterReceiveTxlogs,
  mergeReceiveTxlogs,
  resolveDefaultReceiveTxlogFilter,
  type ReceiveTxlogItem,
  type ReceiveTxlogRecordFilter,
} from "@/domains/wallet/receive/screens/receiveTxlogsModel"
import { useReceiveTxlogSnapshotQuery } from "@/domains/wallet/receive/queries/receiveTxlogQueries"
import { buildReceiveTxlogKey } from "@/domains/wallet/receive/screens/receiveTxlogsPolling"
import {
  formatWalletAddress,
  formatWalletAmount,
  formatWalletDayKey,
  formatWalletDayLabel,
  formatWalletInteger,
  formatWalletMonthKey,
  formatWalletMonthLabel,
  formatWalletRecordTime,
} from "@/domains/wallet/shared/utils/format"
import { openWalletOrderDetail } from "@/domains/wallet/shared/navigation/orderDetail"
import { useAppForeground } from "@/shared/hooks/useAppForeground"
import { useAppTheme } from "@/shared/theme/useAppTheme"
import { SectionCard } from "@/shared/ui/AppFlowUi"
import { HomeScaffold } from "@/shared/ui/HomeScaffold"
import { SeedAddressAvatar } from "@/shared/avatar/SeedAddressAvatar"
import { useToast } from "@/shared/toast/useToast"

type Props = NativeStackScreenProps<ReceiveStackParamList, "ReceiveTxlogsScreen">

type DayGroup = {
  dateKey: string
  items: ReceiveTxlogItem[]
  transactionCount: number
  receiptAmount: number
  feeAmount: number
  recvActualAmount: number
}

export function ReceiveTxlogsScreen({ navigation, route }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const { showToast } = useToast()
  const isFocused = useIsFocused()
  const isAppForeground = useAppForeground()
  const sources = useMemo(
    () =>
      buildReceiveTxlogSources({
        orderSn: route.params?.orderSn,
        orderType: route.params?.orderType,
        personalOrderSn: route.params?.personalOrderSn,
        businessOrderSn: route.params?.businessOrderSn,
      }),
    [route.params?.businessOrderSn, route.params?.orderSn, route.params?.orderType, route.params?.personalOrderSn],
  )
  const [selectedFilter, setSelectedFilter] = useState<ReceiveTxlogRecordFilter>(() =>
    resolveDefaultReceiveTxlogFilter(route.params?.orderType),
  )
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const query = useReceiveTxlogSnapshotQuery({
    sources,
    payChain: route.params?.payChain,
    pollEnabled: isFocused && isAppForeground,
  })
  const detailByType = query.data?.detailByType ?? {}
  const logsByType = query.data?.logsByType ?? {}
  const newLogKeys = query.data?.newLogKeys ?? []
  const loading = sources.length > 0 && query.isLoading && !query.data
  const refreshing = query.isRefetching && !!query.data

  useEffect(() => {
    if (!query.error) {
      return
    }

    if (query.data) {
      showToast({ message: t("receive.logs.refreshFailed"), tone: "error" })
      return
    }

    Alert.alert(t("common.errorTitle"), t("receive.logs.loadFailed"))
  }, [query.data, query.error, showToast, t])

  useEffect(() => {
    setSelectedFilter(resolveDefaultReceiveTxlogFilter(route.params?.orderType))
  }, [route.params?.orderType])

  const currentMonthKey = formatWalletMonthKey(Date.now())
  const allLogs = mergeReceiveTxlogs([...(logsByType.TRACE ?? []), ...(logsByType.TRACE_LONG_TERM ?? [])])
  const filteredLogs = filterReceiveTxlogs(allLogs, selectedFilter)
  const filteredFallbackTimestamps = [
    selectedFilter !== "business" ? detailByType.TRACE?.createdAt ?? null : null,
    selectedFilter !== "individuals" ? detailByType.TRACE_LONG_TERM?.createdAt ?? null : null,
  ]
  const availableMonths = buildAvailableMonthKeys(
    filteredLogs,
    filteredFallbackTimestamps,
    currentMonthKey,
  )
  const availableMonthsKey = availableMonths.join("|")
  const activeMonthKey = selectedMonth ?? currentMonthKey
  const assetCode =
    filteredLogs.find(item => item.coinName)?.coinName ||
    (selectedFilter !== "business" ? detailByType.TRACE?.coinName : "") ||
    (selectedFilter !== "individuals" ? detailByType.TRACE_LONG_TERM?.coinName : "") ||
    ""
  const visibleLogs = filteredLogs.filter(item => formatWalletMonthKey(item.createdAt) === activeMonthKey)
  const dayGroups = buildDayGroups(visibleLogs)
  const todayKey = formatWalletDayKey(Date.now())
  const showTodayCard = activeMonthKey === currentMonthKey
  const todayGroup = dayGroups.find(item => item.dateKey === todayKey) ?? createEmptyDayGroup(todayKey)
  const historyGroups = showTodayCard ? dayGroups.filter(item => item.dateKey !== todayKey) : dayGroups
  const incomeLabel = assetCode ? `${t("receive.logs.income")}(${assetCode})` : t("receive.logs.income")

  useEffect(() => {
    if (!selectedMonth || !availableMonths.includes(selectedMonth)) {
      setSelectedMonth(availableMonths[0] ?? currentMonthKey)
    }
  }, [availableMonths, availableMonthsKey, currentMonthKey, selectedMonth])

  function handleCycleMonth() {
    if (availableMonths.length < 2) {
      return
    }

    const currentIndex = availableMonths.indexOf(activeMonthKey)
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % availableMonths.length : 0
    setSelectedMonth(availableMonths[nextIndex] ?? activeMonthKey)
  }

  return (
    <HomeScaffold
      backgroundColor={theme.isDark ? theme.colors.background : "#EEF5FF"}
      hideHeader
      title={t("receive.logs.title")}
      scroll={false}
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable hitSlop={8} onPress={navigation.goBack} style={styles.headerBackButton}>
            <Text style={[styles.headerBackIcon, { color: theme.colors.text }]}>‹</Text>
          </Pressable>
          <Text numberOfLines={1} style={[styles.headerTitle, { color: theme.colors.text }]}>
            {t("receive.logs.title")}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.filterRow}>
          <RecordFilterChip active={selectedFilter === "all"} label={t("receive.logs.all")} onPress={() => setSelectedFilter("all")} />
          <RecordFilterChip
            active={selectedFilter === "individuals"}
            label={t("receive.home.individuals")}
            onPress={() => setSelectedFilter("individuals")}
          />
          <RecordFilterChip
            active={selectedFilter === "business"}
            label={t("receive.home.business")}
            onPress={() => setSelectedFilter("business")}
          />
        </View>

        <View style={styles.monthRow}>
          <Pressable disabled={availableMonths.length < 2} onPress={handleCycleMonth} style={styles.monthButton}>
            <Text style={[styles.monthLabel, { color: theme.colors.text }]}>{formatWalletMonthLabel(activeMonthKey)}</Text>
            <Text style={[styles.monthChevron, { color: theme.colors.mutedText }]}>▾</Text>
          </Pressable>
          {refreshing && !loading ? <Text style={[styles.refreshingText, { color: theme.colors.mutedText }]}>{t("receive.logs.refreshing")}</Text> : null}
        </View>

        {loading ? (
          <SectionCard style={[styles.loadingCard, { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.glassBorder }]}>
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={theme.colors.primary} />
              <Text style={[styles.loadingText, { color: theme.colors.mutedText }]}>{t("receive.logs.loading")}</Text>
            </View>
          </SectionCard>
        ) : (
          <>
            {showTodayCard ? (
              <ReceiveDayCard
                amountReceivedLabel={t("receive.logs.amountReceived")}
                feeLabel={t("receive.logs.fee")}
                group={todayGroup}
                incomeLabel={incomeLabel}
                newBadgeLabel={t("receive.logs.new")}
                newLogKeys={newLogKeys}
                noRecordsMessage={t("receive.logs.noTodayRecords")}
                title={`${t("receive.logs.today")} ${formatWalletDayLabel(todayKey)}`}
                transactionsLabel={t("receive.logs.transactions")}
              />
            ) : null}

            {historyGroups.map(group => (
              <ReceiveDayCard
                key={group.dateKey}
                amountReceivedLabel={t("receive.logs.amountReceived")}
                feeLabel={t("receive.logs.fee")}
                group={group}
                incomeLabel={incomeLabel}
                newBadgeLabel={t("receive.logs.new")}
                newLogKeys={newLogKeys}
                noRecordsMessage={t("receive.logs.emptyBody")}
                title={formatWalletDayLabel(group.dateKey)}
                transactionsLabel={t("receive.logs.transactions")}
              />
            ))}

            {!showTodayCard && historyGroups.length === 0 ? (
              <SectionCard style={[styles.emptyMonthCard, { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.glassBorder }]}>
                <EmptyReceiveDayState message={t("receive.logs.emptyBody")} />
              </SectionCard>
            ) : null}

            <View style={styles.footer}>
              <View style={[styles.footerLine, { backgroundColor: theme.colors.glassBorder }]} />
              <Text style={[styles.footerText, { color: theme.colors.mutedText }]}>{t("receive.logs.noMoreData")}</Text>
              <View style={[styles.footerLine, { backgroundColor: theme.colors.glassBorder }]} />
            </View>
          </>
        )}
      </ScrollView>
    </HomeScaffold>
  )
}

function ReceiveDayCard(props: {
  title: string
  group: DayGroup
  incomeLabel: string
  transactionsLabel: string
  feeLabel: string
  amountReceivedLabel: string
  noRecordsMessage: string
  newLogKeys: string[]
  newBadgeLabel: string
}) {
  const theme = useAppTheme()

  return (
    <SectionCard style={[styles.dayCard, { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.glassBorder }]}>
      <View style={styles.dayCardInner}>
        <Text style={[styles.dayTitle, { color: theme.colors.text }]}>{props.title}</Text>

        {props.group.items.length === 0 ? (
          <EmptyReceiveDayState message={props.noRecordsMessage} />
        ) : (
          <>
            <View style={styles.summaryHero}>
              <View style={styles.summaryBlock}>
                <Text style={[styles.summaryLabel, { color: theme.colors.mutedText }]}>{props.transactionsLabel}</Text>
                <Text style={[styles.summaryValue, { color: theme.colors.text }]}>{formatWalletInteger(props.group.transactionCount)}</Text>
              </View>
              <View style={[styles.summaryBlock, styles.summaryBlockRight]}>
                <Text style={[styles.summaryLabel, { color: theme.colors.mutedText }]}>{props.incomeLabel}</Text>
                <Text style={[styles.summaryValue, { color: theme.colors.text }]}>{formatWalletAmount(props.group.receiptAmount)}</Text>
              </View>
            </View>

            <View style={styles.summaryMetaBlock}>
              <View style={styles.summaryMetaRow}>
                <Text style={[styles.summaryMetaLabel, { color: theme.colors.mutedText }]}>{props.feeLabel}</Text>
                <Text style={[styles.summaryMetaValue, { color: theme.colors.text }]}>{formatWalletAmount(props.group.feeAmount)}</Text>
              </View>
              <View style={styles.summaryMetaRow}>
                <Text style={[styles.summaryMetaLabel, { color: theme.colors.mutedText }]}>{props.amountReceivedLabel}</Text>
                <Text style={[styles.summaryMetaValue, { color: theme.colors.text }]}>{formatWalletAmount(props.group.recvActualAmount)}</Text>
              </View>
            </View>

            <View style={[styles.cardDivider, { backgroundColor: theme.colors.glassBorder }]} />

            <View>
              {props.group.items.map((item, index) => (
                <ReceiveRecordRow
                  amountReceivedLabel={props.amountReceivedLabel}
                  feeLabel={props.feeLabel}
                  isLast={index === props.group.items.length - 1}
                  item={item}
                  key={`${buildReceiveTxlogKey(item)}:${index}`}
                  newBadgeLabel={props.newBadgeLabel}
                  onPress={() => openWalletOrderDetail({ orderSn: item.orderSn })}
                  showNewBadge={props.newLogKeys.includes(buildReceiveTxlogKey(item))}
                />
              ))}
            </View>
          </>
        )}
      </View>
    </SectionCard>
  )
}

function ReceiveRecordRow(props: {
  item: ReceiveTxlogItem
  feeLabel: string
  amountReceivedLabel: string
  showNewBadge: boolean
  newBadgeLabel: string
  isLast: boolean
  onPress: () => void
}) {
  const theme = useAppTheme()
  const primaryText = formatWalletAddress(props.item.fromAddress || props.item.txid || props.item.orderSn || "-", 6, 4)

  return (
    <Pressable
      onPress={props.onPress}
      style={({ pressed }) => [
        styles.recordRow,
        !props.isLast ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.glassBorder } : null,
        pressed ? { opacity: 0.92 } : null,
      ]}
    >
      <View style={styles.recordLeft}>
        <SeedAddressAvatar
          borderColor={props.showNewBadge ? theme.colors.primary : undefined}
          seedSource={props.item.fromAddress || props.item.txid || props.item.orderSn || "-"}
          size={48}
        />
        <View style={styles.recordMeta}>
          <View style={styles.recordTitleRow}>
            <Text numberOfLines={1} style={[styles.recordTitle, { color: theme.colors.text }]}>
              {primaryText}
            </Text>
            {props.showNewBadge ? (
              <View style={[styles.rowBadge, { backgroundColor: theme.colors.primarySoft }]}>
                <Text style={[styles.rowBadgeText, { color: theme.colors.primary }]}>{props.newBadgeLabel}</Text>
              </View>
            ) : null}
          </View>
          <Text style={[styles.recordTime, { color: theme.colors.mutedText }]}>{formatWalletRecordTime(props.item.createdAt)}</Text>
        </View>
      </View>

      <View style={styles.recordRight}>
        <Text style={[styles.recordAmount, { color: theme.colors.text }]}>{`+ ${formatWalletAmount(props.item.receiptAmount)}`}</Text>
        <Text style={[styles.recordSubAmount, { color: theme.colors.mutedText }]}>{`${props.feeLabel}: ${formatWalletAmount(props.item.feeAmount)}`}</Text>
        <Text style={[styles.recordSubAmount, { color: theme.colors.mutedText }]}>{`${props.amountReceivedLabel}: + ${formatWalletAmount(
          props.item.recvActualAmount,
        )}`}</Text>
      </View>
    </Pressable>
  )
}

function RecordFilterChip(props: { label: string; active: boolean; onPress: () => void }) {
  const theme = useAppTheme()

  return (
    <Pressable
      onPress={props.onPress}
      style={[
        styles.filterChip,
        {
          backgroundColor: theme.colors.surfaceElevated,
          borderColor: props.active ? theme.colors.primarySoft : theme.colors.glassBorder,
        },
      ]}
    >
      <Text style={[styles.filterChipText, { color: props.active ? theme.colors.primary : theme.colors.text }]}>{props.label}</Text>
    </Pressable>
  )
}

function EmptyReceiveDayState(props: { message: string }) {
  const theme = useAppTheme()

  return (
    <View style={styles.emptyWrap}>
      <EmptyReceiveIllustration />
      <Text style={[styles.emptyText, { color: theme.colors.mutedText }]}>{props.message}</Text>
    </View>
  )
}

function EmptyReceiveIllustration() {
  const theme = useAppTheme()

  return (
    <View style={styles.emptyArt}>
      <View style={[styles.emptyArtShadow, { backgroundColor: theme.isDark ? theme.colors.border : "#E6EBF5" }]} />
      <View style={[styles.emptyArtBoxBack, { backgroundColor: theme.isDark ? theme.colors.surfaceMuted : "#E5EAF4" }]} />
      <View style={[styles.emptyArtBoxFront, { backgroundColor: theme.isDark ? theme.colors.surface : "#F2F5FB" }]} />
      <View style={[styles.emptyArtFlapLeft, { backgroundColor: theme.isDark ? theme.colors.backgroundMuted : "#EEF2FA" }]} />
      <View style={[styles.emptyArtFlapRight, { backgroundColor: theme.isDark ? theme.colors.backgroundMuted : "#E8EDF7" }]} />
      <View style={[styles.emptyArtRing, { borderColor: "#F5B94C" }]} />
      <View style={[styles.emptyArtHandle, { backgroundColor: "#F5B94C" }]} />
    </View>
  )
}

function buildAvailableMonthKeys(logs: ReceiveTxlogItem[], fallbackTimestamps: Array<number | null>, currentMonthKey: string) {
  const monthKeys = new Set<string>([currentMonthKey])

  fallbackTimestamps.forEach(value => {
    if (value) {
      monthKeys.add(formatWalletMonthKey(value))
    }
  })

  logs.forEach(item => {
    monthKeys.add(formatWalletMonthKey(item.createdAt))
  })

  return Array.from(monthKeys).sort((left, right) => right.localeCompare(left))
}

function buildDayGroups(logs: ReceiveTxlogItem[]) {
  const grouped = new Map<string, ReceiveTxlogItem[]>()

  logs.forEach(item => {
    const dateKey = formatWalletDayKey(item.createdAt)
    const bucket = grouped.get(dateKey) ?? []
    bucket.push(item)
    grouped.set(dateKey, bucket)
  })

  return Array.from(grouped.entries())
    .map(([dateKey, items]) => ({
      dateKey,
      items: items.sort((left, right) => (right.createdAt ?? 0) - (left.createdAt ?? 0)),
      transactionCount: items.length,
      receiptAmount: items.reduce((sum, item) => sum + item.receiptAmount, 0),
      feeAmount: items.reduce((sum, item) => sum + item.feeAmount, 0),
      recvActualAmount: items.reduce((sum, item) => sum + item.recvActualAmount, 0),
    }))
    .sort((left, right) => right.dateKey.localeCompare(left.dateKey))
}

function createEmptyDayGroup(dateKey: string): DayGroup {
  return {
    dateKey,
    items: [],
    transactionCount: 0,
    receiptAmount: 0,
    feeAmount: 0,
    recvActualAmount: 0,
  }
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingBottom: 28,
    gap: 16,
  },
  headerRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
    marginBottom: 10,
  },
  headerBackButton: {
    width: 40,
    height: 40,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  headerBackIcon: {
    fontSize: 34,
    lineHeight: 34,
    marginLeft: 2,
  },
  headerTitle: {
    flex: 1,
    fontSize: 19,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: -0.4,
  },
  headerSpacer: {
    width: 40,
    height: 40,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  filterChip: {
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  filterChipText: {
    fontSize: 15,
    fontWeight: "600",
  },
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  monthButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  monthLabel: {
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: -0.3,
  },
  monthChevron: {
    fontSize: 14,
  },
  refreshingText: {
    fontSize: 12,
  },
  loadingCard: {
    padding: 0,
    gap: 0,
  },
  loadingWrap: {
    minHeight: 220,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
  },
  dayCard: {
    padding: 0,
    gap: 0,
    overflow: "hidden",
  },
  dayCardInner: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 20,
  },
  summaryHero: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 20,
  },
  summaryBlock: {
    flex: 1,
    gap: 8,
  },
  summaryBlockRight: {
    alignItems: "flex-end",
  },
  summaryLabel: {
    fontSize: 12,
    lineHeight: 18,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.6,
  },
  summaryMetaBlock: {
    gap: 12,
    marginTop: 18,
  },
  summaryMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
  },
  summaryMetaLabel: {
    fontSize: 13,
    lineHeight: 20,
  },
  summaryMetaValue: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "600",
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    marginTop: 20,
    marginBottom: 8,
  },
  recordRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 14,
    paddingVertical: 16,
  },
  recordLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  recordMeta: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  recordTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  recordTitle: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: "600",
  },
  rowBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  rowBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  recordTime: {
    fontSize: 12,
  },
  recordRight: {
    minWidth: 132,
    alignItems: "flex-end",
    gap: 4,
  },
  recordAmount: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  recordSubAmount: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: "right",
  },
  emptyMonthCard: {
    padding: 0,
    gap: 0,
  },
  emptyWrap: {
    minHeight: 300,
    alignItems: "center",
    justifyContent: "center",
    gap: 22,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  emptyArt: {
    width: 190,
    height: 130,
    position: "relative",
  },
  emptyArtShadow: {
    position: "absolute",
    left: 40,
    right: 40,
    bottom: 12,
    height: 14,
    borderRadius: 999,
    opacity: 0.6,
  },
  emptyArtBoxBack: {
    position: "absolute",
    left: 56,
    top: 28,
    width: 76,
    height: 34,
    borderRadius: 8,
    transform: [{ skewX: "-18deg" }],
  },
  emptyArtBoxFront: {
    position: "absolute",
    left: 54,
    top: 54,
    width: 84,
    height: 58,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  emptyArtFlapLeft: {
    position: "absolute",
    left: 34,
    top: 50,
    width: 56,
    height: 28,
    borderRadius: 8,
    transform: [{ rotate: "22deg" }],
  },
  emptyArtFlapRight: {
    position: "absolute",
    left: 104,
    top: 50,
    width: 56,
    height: 28,
    borderRadius: 8,
    transform: [{ rotate: "-22deg" }],
  },
  emptyArtRing: {
    position: "absolute",
    right: 26,
    top: 42,
    width: 34,
    height: 34,
    borderRadius: 999,
    borderWidth: 3,
  },
  emptyArtHandle: {
    position: "absolute",
    right: 20,
    top: 72,
    width: 18,
    height: 4,
    borderRadius: 999,
    transform: [{ rotate: "42deg" }],
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: 2,
  },
  footerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  footerText: {
    fontSize: 14,
  },
})
