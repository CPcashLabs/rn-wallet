import React, { useEffect, useMemo, useRef, useState } from "react"

import { ActivityIndicator, FlatList, ScrollView, StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { HeaderTextAction, HomeScaffold } from "@/features/home/components/HomeScaffold"
import { formatAddress } from "@/features/home/utils/format"
import { ActionRow, FilterChip, OrderMonthSection, SummaryGrid, SuccessStateCard } from "@/features/orders/components/OrdersUi"
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
  resolveRangeOptions,
  summarizeStatistics,
  type RangePreset,
} from "@/features/orders/utils/orderHelpers"
import { PageEmpty, PrimaryButton, SectionCard } from "@/shared/ui/AppFlowUi"
import { useErrorPresenter } from "@/shared/errors/useErrorPresenter"
import { useUserStore } from "@/shared/store/useUserStore"
import { useToast } from "@/shared/toast/useToast"
import { useAppTheme } from "@/shared/theme/useAppTheme"
import { AppTextField } from "@/shared/ui/AppTextField"

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
  const { presentError } = useErrorPresenter()
  const { showToast } = useToast()
  const [rangePreset, setRangePreset] = useState<RangePreset>("all")
  const [orderType, setOrderType] = useState<OrderTypeFilter | undefined>(undefined)
  const [items, setItems] = useState<OrderListItem[]>([])
  const [statistics, setStatistics] = useState<OrderStatistics>({ receiptAmount: 0, paymentAmount: 0, fee: 0, transactions: 0 })
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const loadingMoreRef = useRef(false)

  const rangeSelection = useMemo(() => buildRangeSelection(rangePreset), [rangePreset])
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
  const rangeOptions = useMemo(() => resolveRangeOptions(t), [t])
  const typeOptions = useMemo(() => resolveOrderTypeOptions(t), [t])

  useEffect(() => {
    let active = true
    const cachedSnapshot = readOrderLogsCache(cacheKey)

    if (cachedSnapshot) {
      setItems(cachedSnapshot.items)
      setStatistics(cachedSnapshot.statistics)
      setPage(cachedSnapshot.page)
      setTotal(cachedSnapshot.total)
      setLoading(false)
    } else {
      setLoading(true)
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

        if (!active) {
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
        if (active && !cachedSnapshot) {
          presentError(error, {
            fallbackKey: "orders.list.loadFailed",
          })
        }
      } finally {
        if (active) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    })()

    return () => {
      active = false
    }
  }, [cacheKey, orderType, presentError, props.otherAddress, rangeSelection, showToast, t])

  const handleLoadMore = async () => {
    if (loading || refreshing || loadingMoreRef.current || items.length >= total) {
      return
    }

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

      setItems(current => {
        const nextItems = [...current, ...response.data]
        writeOrderLogsCache(cacheKey, {
          items: nextItems,
          statistics,
          page: response.page,
          total: response.total,
        })
        return nextItems
      })
      setPage(response.page)
      setTotal(response.total)
    } catch (error) {
      presentError(error, {
        fallbackKey: "orders.list.loadMoreFailed",
      })
    } finally {
      loadingMoreRef.current = false
      setLoadingMore(false)
    }
  }

  const handleRefresh = async () => {
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
      presentError(error, {
        fallbackKey: "orders.list.refreshFailed",
      })
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <HomeScaffold
      canGoBack
      onBack={props.navigation.goBack}
      title={props.title}
      scroll={false}
      right={
        props.openStatistics ? (
          <HeaderTextAction label={t("orders.list.statistics")} onPress={() => props.navigation.navigate("OrderBillScreen")} />
        ) : null
      }
    >
      <FlatList
        bounces
        contentContainerStyle={styles.content}
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
        ListHeaderComponent={
          <View style={styles.headerContent}>
            <SectionCard style={styles.filtersCard}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t("orders.filters.type")}</Text>
              <View style={styles.filtersPanel}>
                <ScrollView
                  horizontal
                  contentContainerStyle={styles.filterScrollContent}
                  showsHorizontalScrollIndicator={false}
                >
                  {typeOptions.map(option => (
                    <FilterChip
                      key={option.label}
                      label={option.label}
                      active={orderType === option.value}
                      onPress={() => setOrderType(option.value)}
                    />
                  ))}
                </ScrollView>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t("orders.filters.time")}</Text>
                <ScrollView
                  horizontal
                  contentContainerStyle={styles.filterScrollContent}
                  showsHorizontalScrollIndicator={false}
                >
                  {rangeOptions.map(option => (
                    <FilterChip
                      key={option.value}
                      label={option.label}
                      active={rangePreset === option.value}
                      onPress={() => setRangePreset(option.value)}
                    />
                  ))}
                </ScrollView>
              </View>
            </SectionCard>

            <SummaryGrid
              items={summarizeStatistics(statistics).map(item => ({
                label: t(`orders.summary.${item.key}`),
                value: item.value,
              }))}
            />

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
  const { presentError } = useErrorPresenter()
  const profile = useUserStore(state => state.profile)
  const [preset, setPreset] = useState<Exclude<RangePreset, "all">>(route.params?.preset ?? "today")
  const [statistics, setStatistics] = useState<OrderStatistics>({ receiptAmount: 0, paymentAmount: 0, fee: 0, transactions: 0 })
  const [items, setItems] = useState<OrderBillAddressItem[]>([])
  const [loading, setLoading] = useState(true)

  const rangeSelection = useMemo(() => buildRangeSelection(preset), [preset])
  const cacheKey = useMemo(() => buildOrderBillCacheKey(rangeSelection), [rangeSelection])
  const rangeOptions = useMemo(() => resolveOrderBillRangeOptions(t), [t])

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
      title={t("orders.bill.title")}
      scroll={false}
      right={
        !loading && rangeSelection.startedAt && rangeSelection.endedAt ? (
          <HeaderTextAction
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
      <ScrollView contentContainerStyle={styles.content}>
        <SectionCard style={styles.filtersCard}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t("orders.bill.rangeTitle")}</Text>
          <ScrollView horizontal contentContainerStyle={styles.filterScrollContent} showsHorizontalScrollIndicator={false}>
            {rangeOptions.map(option => (
              <FilterChip
                key={option.value}
                label={option.label}
                active={preset === option.value}
                onPress={() => setPreset(option.value)}
              />
            ))}
          </ScrollView>
        </SectionCard>

        <SummaryGrid
          items={summarizeStatistics(statistics).map(item => ({
            label: t(`orders.summary.${item.key}`),
            value: item.value,
          }))}
        />

        {loading ? (
          <SectionCard>
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={theme.colors.primary} />
              <Text style={[styles.body, { color: theme.colors.mutedText }]}>{t("orders.bill.loading")}</Text>
            </View>
          </SectionCard>
        ) : null}

        {!loading && items.length === 0 ? <PageEmpty title={t("orders.bill.emptyTitle")} body={t("orders.bill.emptyBody")} /> : null}

        {!loading
          ? items.map(item => (
              <SectionCard key={item.address}>
                <ActionRow
                  label={formatAddressLabel(item.address)}
                  body={t("orders.bill.addressSummary", {
                    payment: item.paymentAmount.toFixed(2),
                    receipt: item.receiptAmount.toFixed(2),
                  })}
                  onPress={() =>
                    navigation.navigate("TxlogsByAddressScreen", {
                      address: item.address,
                    })
                  }
                />
              </SectionCard>
            ))
          : null}
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

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 24,
  },
  headerContent: {
    gap: 14,
  },
  filtersCard: {
    gap: 12,
  },
  filtersPanel: {
    gap: 10,
  },
  filterScrollContent: {
    gap: 10,
    paddingRight: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  filterWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  loadingWrap: {
    minHeight: 120,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  body: {
    fontSize: 13,
    lineHeight: 20,
  },
  listGroup: {
    marginTop: 14,
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
    fontSize: 14,
    fontWeight: "700",
  },
  addressBody: {
    fontSize: 13,
  },
})
