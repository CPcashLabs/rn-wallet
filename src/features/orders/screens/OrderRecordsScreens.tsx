import React, { useEffect, useMemo, useState } from "react"

import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { HomeScaffold } from "@/features/home/components/HomeScaffold"
import { formatAddress } from "@/features/home/utils/format"
import { ActionRow, FilterChip, MonthHeader, OrderListCard, SummaryGrid, SuccessStateCard } from "@/features/orders/components/OrdersUi"
import { exportOrderBillFile } from "@/features/orders/services/orderExport"
import {
  getOrderBillAddresses,
  getOrderBillStatistics,
  getOrderTxlogs,
  getOrderTxlogStatistics,
  type OrderBillAddressItem,
  type OrderListItem,
  type OrderStatistics,
  type OrderTypeFilter,
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
import { PageEmpty, PrimaryButton, SectionCard } from "@/features/transfer/components/TransferUi"
import { useUserStore } from "@/shared/store/useUserStore"
import { useAppTheme } from "@/shared/theme/useAppTheme"

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
  const [rangePreset, setRangePreset] = useState<RangePreset>("all")
  const [orderType, setOrderType] = useState<OrderTypeFilter | undefined>(undefined)
  const [items, setItems] = useState<OrderListItem[]>([])
  const [statistics, setStatistics] = useState<OrderStatistics>({ receiptAmount: 0, paymentAmount: 0, fee: 0, transactions: 0 })
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  const rangeSelection = useMemo(() => buildRangeSelection(rangePreset), [rangePreset])
  const orderGroups = useMemo(() => groupOrdersByMonth(items), [items])
  const rangeOptions = useMemo(() => resolveRangeOptions(t), [t])
  const typeOptions = useMemo(() => resolveOrderTypeOptions(t), [t])

  useEffect(() => {
    let active = true

    void (async () => {
      setLoading(true)
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
      } catch {
        if (active) {
          Alert.alert(t("common.errorTitle"), t("orders.list.loadFailed"))
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
  }, [orderType, props.otherAddress, rangeSelection, t])

  const handleLoadMore = async () => {
    if (loadingMore || items.length >= total) {
      return
    }

    try {
      setLoadingMore(true)
      const nextPage = page + 1
      const response = await getOrderTxlogs({
        page: nextPage,
        perPage: ORDER_PAGE_SIZE,
        orderType,
        otherAddress: props.otherAddress,
        ...rangeSelection,
      })

      setItems(current => [...current, ...response.data])
      setPage(response.page)
      setTotal(response.total)
    } catch {
      Alert.alert(t("common.errorTitle"), t("orders.list.loadMoreFailed"))
    } finally {
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
    } catch {
      Alert.alert(t("common.errorTitle"), t("orders.list.refreshFailed"))
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
          <Pressable onPress={() => props.navigation.navigate("OrderBillScreen")} style={styles.headerButton}>
            <Text style={[styles.headerButtonText, { color: theme.colors.primary }]}>{t("orders.list.statistics")}</Text>
          </Pressable>
        ) : null
      }
    >
      <ScrollView contentContainerStyle={styles.content}>
        <SectionCard>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t("orders.filters.time")}</Text>
          <View style={styles.filterWrap}>
            {rangeOptions.map(option => (
              <FilterChip
                key={option.value}
                label={option.label}
                active={rangePreset === option.value}
                onPress={() => setRangePreset(option.value)}
              />
            ))}
          </View>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t("orders.filters.type")}</Text>
          <View style={styles.filterWrap}>
            {typeOptions.map(option => (
              <FilterChip
                key={option.label}
                label={option.label}
                active={orderType === option.value}
                onPress={() => setOrderType(option.value)}
              />
            ))}
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

        {!loading && items.length === 0 ? <PageEmpty title={t("orders.list.emptyTitle")} body={t("orders.list.emptyBody")} /> : null}

        {!loading
          ? orderGroups.map(([month, monthItems]) => (
              <View key={month} style={styles.listGroup}>
                <MonthHeader value={month} />
                {monthItems.map(item => (
                  <OrderListCard
                    key={item.orderSn}
                    item={item}
                    t={t}
                    onPress={() =>
                      props.navigation.navigate("OrderDetailScreen", {
                        orderSn: item.orderSn,
                        source: "manual",
                      })
                    }
                  />
                ))}
              </View>
            ))
          : null}

        {!loading && items.length < total ? (
          <PrimaryButton
            label={loadingMore ? t("common.loading") : t("orders.list.loadMore")}
            onPress={() => void handleLoadMore()}
            disabled={loadingMore}
          />
        ) : null}

        {!loading ? (
          <Pressable onPress={() => void handleRefresh()} style={[styles.refreshButton, { borderColor: theme.colors.border }]}>
            <Text style={[styles.refreshText, { color: theme.colors.text }]}>
              {refreshing ? t("common.loading") : t("orders.list.refresh")}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </HomeScaffold>
  )
}

export function OrderBillScreen({ navigation, route }: OrderBillProps) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const profile = useUserStore(state => state.profile)
  const [preset, setPreset] = useState<Exclude<RangePreset, "all">>(route.params?.preset ?? "today")
  const [statistics, setStatistics] = useState<OrderStatistics>({ receiptAmount: 0, paymentAmount: 0, fee: 0, transactions: 0 })
  const [items, setItems] = useState<OrderBillAddressItem[]>([])
  const [loading, setLoading] = useState(true)

  const rangeSelection = useMemo(() => buildRangeSelection(preset), [preset])
  const rangeOptions = useMemo(() => resolveOrderBillRangeOptions(t), [t])

  useEffect(() => {
    let active = true

    void (async () => {
      setLoading(true)
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
      } catch {
        if (active) {
          Alert.alert(t("common.errorTitle"), t("orders.bill.loadFailed"))
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
  }, [rangeSelection, t])

  return (
    <HomeScaffold
      canGoBack
      onBack={navigation.goBack}
      title={t("orders.bill.title")}
      scroll={false}
      right={
        !loading && rangeSelection.startedAt && rangeSelection.endedAt ? (
          <Pressable
            onPress={() =>
              navigation.navigate("BillExportScreen", {
                startedAt: rangeSelection.startedAt as string,
                endedAt: rangeSelection.endedAt as string,
                startedTimestamp: rangeSelection.startedTimestamp,
                endedTimestamp: rangeSelection.endedTimestamp,
                email: profile?.email,
              })
            }
            style={styles.headerButton}
          >
            <Text style={[styles.headerButtonText, { color: theme.colors.primary }]}>{t("orders.bill.export")}</Text>
          </Pressable>
        ) : null
      }
    >
      <ScrollView contentContainerStyle={styles.content}>
        <SectionCard>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t("orders.bill.rangeTitle")}</Text>
          <View style={styles.filterWrap}>
            {rangeOptions.map(option => (
              <FilterChip
                key={option.value}
                label={option.label}
                active={preset === option.value}
                onPress={() => setPreset(option.value)}
              />
            ))}
          </View>
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
  const profile = useUserStore(state => state.profile)
  const [email, setEmail] = useState(route.params.email ?? profile?.email ?? "")
  const [loading, setLoading] = useState(false)
  const [resultMessage, setResultMessage] = useState<string | null>(null)

  const handleExport = async () => {
    if (!email.trim()) {
      Alert.alert(t("common.infoTitle"), t("orders.export.emailRequired"))
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
      Alert.alert(t("common.infoTitle"), message)
    } catch (error) {
      const message = error instanceof Error && error.name === "NativeCapabilityUnavailableError"
        ? t("orders.export.fileUnavailable")
        : t("orders.export.failed")
      Alert.alert(t("common.errorTitle"), message)
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
        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder={t("orders.export.emailPlaceholder")}
          placeholderTextColor={theme.colors.mutedText}
          style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text }]}
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
    gap: 12,
  },
  headerButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  headerButtonText: {
    fontSize: 13,
    fontWeight: "700",
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
    gap: 10,
  },
  refreshButton: {
    minHeight: 44,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  refreshText: {
    fontSize: 14,
    fontWeight: "600",
  },
  addressTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  addressBody: {
    fontSize: 13,
  },
  input: {
    minHeight: 48,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 15,
  },
})
