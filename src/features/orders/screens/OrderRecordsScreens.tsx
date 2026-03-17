import React, { useEffect, useMemo, useRef, useState } from "react"

import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"
import { useRoute } from "@react-navigation/native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { HeaderTextAction, HomeScaffold } from "@/features/home/components/HomeScaffold"
import { formatAddress } from "@/features/home/utils/format"
import { FilterChip, OrderMonthSection, SuccessStateCard } from "@/features/orders/components/OrdersUi"
import { SeedAddressAvatar } from "@/features/orders/components/OrderCounterpartyAvatar"
import { exportOrderBillFile } from "@/features/orders/services/orderExport"
import {
  buildOrderBillCacheKey,
  buildOrderLogsCacheKey,
  countNewOrderRecords,
  getOrderBillAddresses,
  getOrderBillStatistics,
  getOrderTxlogs,
  getOrderTxlogStatistics,
  readOrderBillCache,
  readOrderLogsCache,
  type OrderBillAddressItem,
  type OrderListItem,
  type OrderStatistics,
  type OrderTypeFilter,
  writeOrderBillCache,
  writeOrderLogsCache,
} from "@/features/orders/services/ordersApi"
import {
  buildRangeSelection,
  formatAddressLabel,
  groupOrdersByMonth,
  resolveOrderBillRangeOptions,
  resolveOrderTypeOptions,
  type RangePreset,
} from "@/features/orders/utils/orderHelpers"
import { createLatestTaskController } from "@/shared/async/taskController"
import { PageEmpty, PrimaryButton, SectionCard } from "@/shared/ui/AppFlowUi"
import { useErrorPresenter } from "@/shared/errors/useErrorPresenter"
import { useUserStore } from "@/shared/store/useUserStore"
import { useToast } from "@/shared/toast/useToast"
import { useAppTheme } from "@/shared/theme/useAppTheme"
import { AppGlyph } from "@/shared/ui/AppGlyph"
import { AppTextField } from "@/shared/ui/AppTextField"
import { getFloatingOverlayContentInset } from "@/shared/ui/floatingInsets"

import type { OrdersStackParamList } from "@/app/navigation/types"

const ORDER_PAGE_SIZE = 20

type TxlogsProps = NativeStackScreenProps<OrdersStackParamList, "TxlogsScreen">
type TxlogsByAddressProps = NativeStackScreenProps<OrdersStackParamList, "TxlogsByAddressScreen">
type OrderBillProps = NativeStackScreenProps<OrdersStackParamList, "OrderBillScreen">
type BillExportProps = NativeStackScreenProps<OrdersStackParamList, "BillExportScreen">

type OrderListBaseProps = {
  title: string
  otherAddress?: string
  openStatistics?: boolean
  navigation: TxlogsProps["navigation"] | TxlogsByAddressProps["navigation"]
}

export function TxlogsScreen({ navigation }: TxlogsProps) {
  const { t } = useTranslation()

  return (
    <OrderLogsScreenBase
      title={t("orders.list.title")}
      navigation={navigation}
      openStatistics
    />
  )
}

export function TxlogsByAddressScreen({ navigation, route }: TxlogsByAddressProps) {
  const { t } = useTranslation()

  return (
    <OrderLogsScreenBase
      title={t("orders.list.byAddressTitle", { address: formatAddress(route.params.address, 8, 6) })}
      otherAddress={route.params.address}
      navigation={navigation}
    />
  )
}

function OrderLogsScreenBase(props: OrderListBaseProps) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const route = useRoute()
  const insets = useSafeAreaInsets()
  const { presentError } = useErrorPresenter()
  const { showToast } = useToast()
  const [orderType, setOrderType] = useState<OrderTypeFilter | undefined>(undefined)
  const [items, setItems] = useState<OrderListItem[]>([])
  const [statistics, setStatistics] = useState<OrderStatistics>({ receiptAmount: 0, paymentAmount: 0, fee: 0, transactions: 0 })
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const loadingMoreRef = useRef(false)
  const mountedRef = useRef(true)
  const loadTaskControllerRef = useRef(createLatestTaskController())
  const itemsRef = useRef<OrderListItem[]>([])
  const statisticsRef = useRef<OrderStatistics>({ receiptAmount: 0, paymentAmount: 0, fee: 0, transactions: 0 })
  const totalRef = useRef(0)

  const rangeSelection = useMemo(() => buildRangeSelection("all"), [])
  const contentBottomInset = getFloatingOverlayContentInset(route.name, insets.bottom)
  const cacheKey = useMemo(
    () =>
      buildOrderLogsCacheKey({
        otherAddress: props.otherAddress,
        orderType,
        ...rangeSelection,
      }),
    [orderType, props.otherAddress, rangeSelection],
  )
  const orderGroups = useMemo(() => groupOrdersByMonth(items), [items])
  const typeOptions = useMemo(() => resolveOrderTypeOptions(t), [t])
  const typeChipToneStyle = useMemo(
    () => ({
      backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface,
      borderColor: "transparent",
    }),
    [theme.colors.surface, theme.colors.surfaceElevated],
  )

  useEffect(() => {
    itemsRef.current = items
  }, [items])

  useEffect(() => {
    statisticsRef.current = statistics
  }, [statistics])

  useEffect(() => {
    totalRef.current = total
  }, [total])

  useEffect(() => {
    return () => {
      mountedRef.current = false
      loadingMoreRef.current = false
      loadTaskControllerRef.current.cancel()
    }
  }, [])

  useEffect(() => {
    const run = loadTaskControllerRef.current.begin()
    const cachedSnapshot = readOrderLogsCache(cacheKey)
    loadingMoreRef.current = false

    if (cachedSnapshot) {
      setItems(cachedSnapshot.items)
      setStatistics(cachedSnapshot.statistics)
      setPage(cachedSnapshot.page)
      setTotal(cachedSnapshot.total)
      setLoading(false)
      setLoadingMore(false)
      setRefreshing(false)
    } else {
      setLoading(true)
      setLoadingMore(false)
      setRefreshing(false)
      setItems([])
      setStatistics({ receiptAmount: 0, paymentAmount: 0, fee: 0, transactions: 0 })
      setPage(1)
      setTotal(0)
    }

    void (async () => {
      try {
        const [listResponse, statsResponse] = await Promise.all([
          getOrderTxlogs({
            page: 1,
            perPage: ORDER_PAGE_SIZE,
            orderType,
            otherAddress: props.otherAddress,
            ...rangeSelection,
          }),
          getOrderTxlogStatistics({
            orderType,
            otherAddress: props.otherAddress,
            ...rangeSelection,
          }),
        ])

        if (!run.isCurrent() || !mountedRef.current) {
          return
        }

        setItems(listResponse.data)
        setStatistics(statsResponse)
        setPage(listResponse.page)
        setTotal(listResponse.total)
        writeOrderLogsCache(cacheKey, {
          items: listResponse.data,
          statistics: statsResponse,
          page: listResponse.page,
          total: listResponse.total,
        })

        if (cachedSnapshot) {
          const nextCount = countNewOrderRecords(cachedSnapshot.items, listResponse.data)
          if (nextCount > 0) {
            showToast({
              message: t("orders.list.updatedWithCount", { count: nextCount }),
              tone: "success",
            })
          }
        }
      } catch (error) {
        if (run.isCurrent() && mountedRef.current && !cachedSnapshot) {
          presentError(error, {
            fallbackKey: "orders.list.loadFailed",
          })
        }
      } finally {
        if (run.isCurrent() && mountedRef.current) {
          loadingMoreRef.current = false
          setLoading(false)
          setRefreshing(false)
          setLoadingMore(false)
        }
      }
    })()
  }, [cacheKey, orderType, presentError, props.otherAddress, rangeSelection, showToast, t])

  const handleLoadMore = async () => {
    if (loading || refreshing || loadingMoreRef.current || itemsRef.current.length >= totalRef.current) {
      return
    }

    const run = loadTaskControllerRef.current.begin()

    try {
      loadingMoreRef.current = true
      setLoadingMore(true)
      const nextPage = page + 1
      const response = await getOrderTxlogs({
        page: nextPage,
        perPage: ORDER_PAGE_SIZE,
        orderType,
        otherAddress: props.otherAddress,
        ...rangeSelection,
      })

      if (!run.isCurrent() || !mountedRef.current) {
        return
      }

      const nextStatistics = statisticsRef.current
      setItems(current => {
        const nextItems = [...current, ...response.data]
        writeOrderLogsCache(cacheKey, {
          items: nextItems,
          statistics: nextStatistics,
          page: response.page,
          total: response.total,
        })
        return nextItems
      })
      setPage(response.page)
      setTotal(response.total)
    } catch (error) {
      if (!run.isCurrent() || !mountedRef.current) {
        return
      }

      presentError(error, {
        fallbackKey: "orders.list.loadMoreFailed",
      })
    } finally {
      if (run.isCurrent() && mountedRef.current) {
        loadingMoreRef.current = false
        setLoadingMore(false)
      }
    }
  }

  const handleRefresh = async () => {
    const run = loadTaskControllerRef.current.begin()
    loadingMoreRef.current = false
    setLoadingMore(false)
    setRefreshing(true)

    try {
      const [listResponse, statsResponse] = await Promise.all([
        getOrderTxlogs({
          page: 1,
          perPage: ORDER_PAGE_SIZE,
          orderType,
          otherAddress: props.otherAddress,
          ...rangeSelection,
        }),
        getOrderTxlogStatistics({
          orderType,
          otherAddress: props.otherAddress,
          ...rangeSelection,
        }),
      ])

      if (!run.isCurrent() || !mountedRef.current) {
        return
      }

      setItems(listResponse.data)
      setStatistics(statsResponse)
      setPage(listResponse.page)
      setTotal(listResponse.total)
      writeOrderLogsCache(cacheKey, {
        items: listResponse.data,
        statistics: statsResponse,
        page: listResponse.page,
        total: listResponse.total,
      })
    } catch (error) {
      if (!run.isCurrent() || !mountedRef.current) {
        return
      }

      presentError(error, {
        fallbackKey: "orders.list.refreshFailed",
      })
    } finally {
      if (run.isCurrent() && mountedRef.current) {
        setRefreshing(false)
      }
    }
  }

  return (
    <HomeScaffold
      canGoBack
      onBack={props.navigation.goBack}
      reserveFloatingOverlayInset={false}
      title={props.title}
      scroll={false}
    >
      <FlatList
        bounces
        contentContainerStyle={[styles.content, { paddingBottom: contentBottomInset }]}
        data={loading ? [] : orderGroups}
        keyExtractor={([month]) => month}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <PageEmpty title={t("orders.list.emptyTitle")} body={t("orders.list.emptyBody")} />
            </View>
          ) : null
        }
        ListFooterComponent={
          <View style={styles.listFooter}>
            {loadingMore ? <ActivityIndicator color={theme.colors.primary} /> : null}
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.monthSectionSpacer} />}
        ListHeaderComponent={
          <View style={styles.headerContent}>
            <View style={styles.typeBar}>
              <ScrollView
                horizontal
                contentContainerStyle={styles.typeBarScrollContent}
                showsHorizontalScrollIndicator={false}
                style={styles.typeBarScroll}
              >
                {typeOptions.map(option => (
                  <FilterChip
                    key={option.label}
                    label={option.label}
                    labelStyle={styles.typeBarChipText}
                    active={orderType === option.value}
                    onPress={() => setOrderType(option.value)}
                    style={[styles.typeBarChip, typeChipToneStyle]}
                  />
                ))}
              </ScrollView>
              {props.openStatistics ? (
                <Pressable
                  hitSlop={8}
                  onPress={() => props.navigation.navigate("OrderBillScreen")}
                  style={styles.typeBarAction}
                >
                  <Text style={[styles.typeBarActionLabel, { color: theme.colors.primary }]}>{t("orders.list.statistics")}</Text>
                </Pressable>
              ) : null}
            </View>

            {props.otherAddress ? (
              <SectionCard>
                <Text style={[styles.addressTitle, { color: theme.colors.text }]}>{t("orders.list.currentAddress")}</Text>
                <Text style={[styles.addressBody, { color: theme.colors.mutedText }]}>{formatAddressLabel(props.otherAddress)}</Text>
              </SectionCard>
            ) : null}

            {loading ? (
              <SectionCard>
                <View style={styles.loadingWrap}>
                  <ActivityIndicator color={theme.colors.primary} />
                  <Text style={[styles.body, { color: theme.colors.mutedText }]}>{t("orders.list.loading")}</Text>
                </View>
              </SectionCard>
            ) : null}
          </View>
        }
        onEndReached={() => void handleLoadMore()}
        onEndReachedThreshold={0.35}
        onRefresh={() => void handleRefresh()}
        refreshing={refreshing}
        renderItem={({ item: [month, monthItems] }) => (
          <OrderMonthSection
            month={month}
            items={monthItems}
            t={t}
            onPressItem={item =>
              props.navigation.navigate("OrderDetailScreen", {
                orderSn: item.orderSn,
                source: "manual",
              })
            }
          />
        )}
        showsVerticalScrollIndicator={false}
      />
    </HomeScaffold>
  )
}

export function OrderBillScreen({ navigation, route }: OrderBillProps) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const { presentError } = useErrorPresenter()
  const profile = useUserStore(state => state.profile)
  const [preset, setPreset] = useState<Exclude<RangePreset, "all">>(route.params?.preset ?? "today")
  const [statistics, setStatistics] = useState<OrderStatistics>({ receiptAmount: 0, paymentAmount: 0, fee: 0, transactions: 0 })
  const [items, setItems] = useState<OrderBillAddressItem[]>([])
  const [loading, setLoading] = useState(true)

  const rangeSelection = useMemo(() => buildRangeSelection(preset), [preset])
  const contentBottomInset = getFloatingOverlayContentInset(route.name, insets.bottom)
  const cacheKey = useMemo(() => buildOrderBillCacheKey(rangeSelection), [rangeSelection])
  const rangeOptions = useMemo(() => resolveOrderBillRangeOptions(t), [t])
  const rangeChipToneStyle = useMemo(
    () => ({
      backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface,
      borderColor: "transparent",
    }),
    [theme.colors.surface, theme.colors.surfaceElevated],
  )
  const billMetrics = useMemo(
    () => [
      { key: "payment", label: t("orders.summary.payment"), value: formatBillNumber(statistics.paymentAmount) },
      { key: "receipt", label: t("orders.summary.receipt"), value: formatBillNumber(statistics.receiptAmount) },
      { key: "fee", label: t("orders.summary.fee"), value: formatBillNumber(statistics.fee) },
      { key: "transactions", label: t("orders.summary.transactions"), value: formatBillNumber(statistics.transactions, 0) },
    ],
    [statistics.fee, statistics.paymentAmount, statistics.receiptAmount, statistics.transactions, t],
  )
  const billPeriodTitle = useMemo(() => resolveBillPeriodTitle(preset, rangeSelection), [preset, rangeSelection])

  useEffect(() => {
    let active = true
    const cachedSnapshot = readOrderBillCache(cacheKey)

    if (cachedSnapshot) {
      setStatistics(cachedSnapshot.statistics)
      setItems(cachedSnapshot.items)
      setLoading(false)
    } else {
      setLoading(true)
      setStatistics({ receiptAmount: 0, paymentAmount: 0, fee: 0, transactions: 0 })
      setItems([])
    }

    void (async () => {
      try {
        const [statsResponse, listResponse] = await Promise.all([
          getOrderBillStatistics(rangeSelection),
          getOrderBillAddresses(rangeSelection),
        ])

        if (!active) {
          return
        }

        setStatistics(statsResponse)
        setItems(listResponse.data)
        writeOrderBillCache(cacheKey, {
          statistics: statsResponse,
          items: listResponse.data,
        })
      } catch (error) {
        if (active && !cachedSnapshot) {
          presentError(error, {
            fallbackKey: "orders.bill.loadFailed",
          })
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    })()

    return () => {
      active = false
    }
  }, [cacheKey, presentError, rangeSelection])

  return (
    <HomeScaffold
      canGoBack
      onBack={navigation.goBack}
      reserveFloatingOverlayInset={false}
      title={t("orders.bill.title")}
      scroll={false}
      right={
        !loading && rangeSelection.startedAt && rangeSelection.endedAt ? (
          <HeaderTextAction
            variant="plain"
            label={t("orders.bill.export")}
            onPress={() =>
              navigation.navigate("BillExportScreen", {
                startedAt: rangeSelection.startedAt as string,
                endedAt: rangeSelection.endedAt as string,
                startedTimestamp: rangeSelection.startedTimestamp,
                endedTimestamp: rangeSelection.endedTimestamp,
                email: profile?.email,
              })
            }
          />
        ) : null
      }
    >
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: contentBottomInset }]}>
        <View style={styles.billRangeBar}>
          <ScrollView horizontal contentContainerStyle={styles.filterScrollContent} showsHorizontalScrollIndicator={false}>
            {rangeOptions.map(option => (
              <FilterChip
                key={option.value}
                labelStyle={styles.billRangeChipText}
                label={option.label}
                active={preset === option.value}
                onPress={() => setPreset(option.value)}
                style={[styles.billRangeChip, rangeChipToneStyle]}
              />
            ))}
          </ScrollView>
        </View>

        <SectionCard style={styles.billPanelCard}>
          <View style={styles.billPanelHeader}>
            <Text style={[styles.billPanelTitle, { color: theme.colors.text }]}>{billPeriodTitle}</Text>
          </View>

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={theme.colors.primary} />
              <Text style={[styles.body, { color: theme.colors.mutedText }]}>{t("orders.bill.loading")}</Text>
            </View>
          ) : (
            <>
              <View style={styles.billMetricsGrid}>
                {billMetrics.map(metric => (
                  <View key={metric.key} style={styles.billMetricBlock}>
                    <Text style={[styles.billSummaryLabel, { color: theme.colors.mutedText }]}>{metric.label}</Text>
                    <Text style={[styles.billSummaryValue, { color: theme.colors.text }]}>{metric.value}</Text>
                  </View>
                ))}
              </View>

              {items.length > 0 ? (
                <>
                  <View style={[styles.billTableHeader, { borderBottomColor: theme.colors.glassBorder }]}>
                    <Text style={[styles.billTableHeaderAddress, { color: theme.colors.mutedText }]}>{t("orders.detail.counterpartyAddress")}</Text>
                    <Text style={[styles.billTableHeaderAmount, { color: theme.colors.mutedText }]}>{t("orders.summary.payment")}</Text>
                    <Text style={[styles.billTableHeaderAmount, { color: theme.colors.mutedText }]}>{t("orders.summary.receipt")}</Text>
                  </View>

                  {items.map((item, index) => (
                    <Pressable
                      key={item.address}
                      onPress={() =>
                        navigation.navigate("TxlogsByAddressScreen", {
                          address: item.address,
                        })
                      }
                      style={[
                        styles.billTableRow,
                        index < items.length - 1 ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.glassBorder } : null,
                      ]}
                    >
                      <View style={styles.billAddressCell}>
                        <SeedAddressAvatar seedSource={item.address} size={32} uri={item.avatar} />
                        <Text numberOfLines={1} style={[styles.billAddressLabel, { color: theme.colors.text }]}>
                          {formatAddressLabel(item.address)}
                        </Text>
                      </View>
                      <Text style={[styles.billTableValue, { color: theme.colors.text }]}>{formatBillNumber(item.paymentAmount)}</Text>
                      <Text style={[styles.billTableValue, { color: theme.colors.text }]}>{formatBillNumber(item.receiptAmount)}</Text>
                    </Pressable>
                  ))}
                </>
              ) : (
                <View style={styles.billEmptyState}>
                  <AppGlyph
                    backgroundColor={theme.colors.primarySoft ?? `${theme.colors.primary}12`}
                    name="book"
                    size={42}
                    tintColor={theme.colors.primary}
                  />
                  <Text style={[styles.billEmptyTitle, { color: theme.colors.text }]}>{t("orders.bill.emptyTitle")}</Text>
                  <Text style={[styles.billEmptyBody, { color: theme.colors.mutedText }]}>{t("orders.bill.emptyBody")}</Text>
                </View>
              )}
            </>
          )}
        </SectionCard>
      </ScrollView>
    </HomeScaffold>
  )
}

export function BillExportScreen({ navigation, route }: BillExportProps) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const { presentError, presentMessage } = useErrorPresenter()
  const { showToast } = useToast()
  const profile = useUserStore(state => state.profile)
  const [email, setEmail] = useState(route.params.email ?? profile?.email ?? "")
  const [loading, setLoading] = useState(false)
  const [resultMessage, setResultMessage] = useState<string | null>(null)

  const handleExport = async () => {
    if (!email.trim()) {
      showToast({ message: t("orders.export.emailRequired"), tone: "warning" })
      return
    }

    setLoading(true)
    setResultMessage(null)

    try {
      const result = await exportOrderBillFile({
        startedAt: route.params.startedAt,
        endedAt: route.params.endedAt,
        startedTimestamp: route.params.startedTimestamp,
        endedTimestamp: route.params.endedTimestamp,
        orderSn: route.params.orderSn,
        orderType: route.params.orderType,
        email: email.trim(),
      })

      const message = result.kind === "file"
        ? t("orders.export.successSaved", { filename: result.filename })
        : t("orders.export.successSent", { email: email.trim() })

      setResultMessage(message)
      showToast({ message, tone: "success" })
    } catch (error) {
      const message = error instanceof Error && error.name === "NativeCapabilityUnavailableError"
        ? t("orders.export.fileUnavailable")
        : t("orders.export.failed")
      if (message === t("orders.export.failed")) {
        presentError(error, {
          fallbackKey: "orders.export.failed",
        })
        return
      }

      presentMessage(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("orders.export.title")}>
      <SectionCard>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t("orders.export.summaryTitle")}</Text>
        <Text style={[styles.body, { color: theme.colors.mutedText }]}>
          {t("orders.export.rangeSummary", {
            startedAt: route.params.startedAt.slice(0, 10),
            endedAt: route.params.endedAt.slice(0, 10),
          })}
        </Text>
      </SectionCard>

      <SectionCard>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t("orders.export.emailLabel")}</Text>
        <AppTextField
          autoCapitalize="none"
          backgroundTone="background"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder={t("orders.export.emailPlaceholder")}
          value={email}
        />
      </SectionCard>

      {resultMessage ? <SuccessStateCard title={t("orders.export.successTitle")} body={resultMessage} /> : null}

      <PrimaryButton
        label={loading ? t("common.loading") : t("orders.export.submit")}
        onPress={() => void handleExport()}
        disabled={loading}
      />
    </HomeScaffold>
  )
}

function formatBillNumber(value: number, digits = 2) {
  if (!Number.isFinite(value)) {
    return digits === 0 ? "0" : "0.00"
  }

  return value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

function resolveBillPeriodTitle(preset: Exclude<RangePreset, "all">, rangeSelection: ReturnType<typeof buildRangeSelection>) {
  const startedAt = rangeSelection.startedAt?.slice(0, 10)
  const endedAt = rangeSelection.endedAt?.slice(0, 10)

  if (!startedAt) {
    return "--"
  }

  if (preset === "today" || preset === "yesterday") {
    return startedAt
  }

  if (!endedAt) {
    return startedAt
  }

  if (preset === "last30d") {
    return startedAt.slice(0, 7) === endedAt.slice(0, 7) ? startedAt.slice(0, 7) : `${startedAt.slice(0, 7)} - ${endedAt.slice(0, 7)}`
  }

  return startedAt === endedAt ? startedAt : `${startedAt.slice(5)} - ${endedAt.slice(5)}`
}

const styles = StyleSheet.create({
  content: {
    padding: 18,
    gap: 14,
  },
  headerContent: {
    gap: 16,
  },
  filtersCard: {
    gap: 16,
  },
  filtersPanel: {
    gap: 10,
  },
  billRangeBar: {
    paddingHorizontal: 4,
  },
  filterScrollContent: {
    gap: 8,
    paddingRight: 4,
  },
  typeBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 4,
  },
  typeBarScroll: {
    flex: 1,
  },
  typeBarScrollContent: {
    gap: 10,
    paddingRight: 8,
  },
  typeBarChip: {
    minHeight: 34,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  typeBarChipText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "500",
  },
  typeBarAction: {
    minHeight: 36,
    justifyContent: "center",
    paddingLeft: 6,
  },
  typeBarActionLabel: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "500",
    letterSpacing: -0.2,
  },
  sectionTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  billRangeChip: {
    minHeight: 34,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  billRangeChipText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "500",
  },
  billPanelCard: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 0,
  },
  billPanelHeader: {
    paddingBottom: 18,
  },
  billPanelTitle: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  billMetricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 22,
    columnGap: 24,
    paddingBottom: 18,
  },
  billMetricBlock: {
    width: "46%",
  },
  billSummaryLabel: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "400",
  },
  billSummaryValue: {
    marginTop: 8,
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: -0.4,
    fontWeight: "700",
  },
  filterWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  loadingWrap: {
    minHeight: 128,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
  },
  billTableHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  billTableHeaderAddress: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "400",
  },
  billTableHeaderAmount: {
    width: 92,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "right",
    fontWeight: "400",
  },
  billTableRow: {
    minHeight: 84,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 18,
  },
  billAddressCell: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  billAddressLabel: {
    flex: 1,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "500",
    letterSpacing: -0.2,
  },
  billTableValue: {
    width: 92,
    fontSize: 16,
    lineHeight: 21,
    textAlign: "right",
    fontWeight: "500",
  },
  billEmptyState: {
    minHeight: 260,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingVertical: 8,
  },
  billEmptyTitle: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "700",
    letterSpacing: -0.3,
    textAlign: "center",
  },
  billEmptyBody: {
    maxWidth: 280,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  listGroup: {
    marginTop: 14,
  },
  monthSectionSpacer: {
    height: 16,
  },
  emptyState: {
    marginTop: 12,
  },
  listFooter: {
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  addressTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "700",
  },
  addressBody: {
    fontSize: 14,
    lineHeight: 20,
  },
})
