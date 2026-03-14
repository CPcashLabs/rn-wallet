import React, { useCallback, useEffect, useMemo, useState } from "react"

import { useFocusEffect } from "@react-navigation/native"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"
import { useTranslation } from "react-i18next"
import { Alert, Pressable, Text, View } from "react-native"

import type { CopouchStackParamList } from "@/app/navigation/types"
import { CopouchScaffold } from "@/features/copouch/components/CopouchScaffold"
import {
  LoadingCard,
  WalletGuard,
  billFilters,
  resolveBillAmount,
  resolveBillCounterparty,
  resolveEventMessage,
  resolveTransactionTitle,
  styles,
  useCopouchWalletDetail,
} from "@/features/copouch/screens/copouchOperationShared"
import {
  exportCopouchBill,
  getCopouchAssetBreakdown,
  getCopouchBillList,
  getCopouchBillStatistics,
  getCopouchMemberAccountList,
  getCopouchWalletEvents,
  markAllCopouchEventsRead,
  type CopouchAssetItem,
  type CopouchBillItem,
  type CopouchBillStatistics,
  type CopouchDetail,
  type CopouchEvent,
  type CopouchMemberAccount,
} from "@/features/copouch/services/copouchApi"
import { formatAddress, formatCurrency, formatDateTime, formatTokenAmount } from "@/features/home/utils/format"
import { FilterChip, SummaryGrid } from "@/features/orders/components/OrdersUi"
import { FieldRow, PageEmpty, SecondaryButton, SectionCard } from "@/features/transfer/components/TransferUi"
import { formatAmount } from "@/features/transfer/utils/order"
import { ApiError } from "@/shared/errors"
import { useSocketStore } from "@/shared/store/useSocketStore"
import { useUserStore } from "@/shared/store/useUserStore"
import { useWalletStore } from "@/shared/store/useWalletStore"
import { useToast } from "@/shared/toast/useToast"
import { useAppTheme } from "@/shared/theme/useAppTheme"

type StackProps<T extends keyof CopouchStackParamList> = NativeStackScreenProps<CopouchStackParamList, T>

export function CopouchBillListScreen({ navigation, route }: StackProps<"CopouchBillListScreen">) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const { showToast } = useToast()
  const profile = useUserStore(state => state.profile)
  const { detail, loading, invalidAccess, reload } = useCopouchWalletDetail(route.params.id)
  const [billLoading, setBillLoading] = useState(true)
  const [items, setItems] = useState<CopouchBillItem[]>([])
  const [stats, setStats] = useState<CopouchBillStatistics>({ totalPaymentAmount: 0, totalReceivedAmount: 0 })
  const [members, setMembers] = useState<CopouchMemberAccount[]>([])
  const [selectedFilterKey, setSelectedFilterKey] = useState<(typeof billFilters)[number]["key"]>("all")
  const [selectedMemberId, setSelectedMemberId] = useState("")
  const [exporting, setExporting] = useState(false)

  const activeFilter = useMemo(() => billFilters.find(item => item.key === selectedFilterKey) ?? billFilters[0], [selectedFilterKey])

  const loadBills = useCallback(async () => {
    setBillLoading(true)
    try {
      const [billResponse, statResponse, memberResponse] = await Promise.all([
        getCopouchBillList({
          walletId: route.params.id,
          perPage: 40,
          orderTypeList: activeFilter.orderTypeList as string[] | undefined,
          userId: selectedMemberId || undefined,
        }),
        getCopouchBillStatistics({
          walletId: route.params.id,
          orderTypeList: activeFilter.orderTypeList as string[] | undefined,
          userId: selectedMemberId || undefined,
        }),
        getCopouchMemberAccountList({
          walletId: route.params.id,
          selectSelf: false,
        }),
      ])

      setItems(billResponse.items)
      setStats(statResponse)
      setMembers(memberResponse)
    } finally {
      setBillLoading(false)
    }
  }, [activeFilter.orderTypeList, route.params.id, selectedMemberId])

  useEffect(() => {
    void reload().catch(() => null)
  }, [reload])

  useEffect(() => {
    void loadBills().catch(() => {
      Alert.alert(t("common.errorTitle"), t("copouch.bill.loadFailed"))
    })
  }, [loadBills, t])

  const memberChips = useMemo(() => {
    return [
      { memberId: "", nickname: t("copouch.bill.filters.allMembers") },
      ...members.map(member => ({
        memberId: member.memberId,
        nickname: member.nickname || t("copouch.member.unknown"),
      })),
    ]
  }, [members, t])

  const handleExport = async () => {
    if (!profile?.email) {
      showToast({ message: t("copouch.bill.exportNeedEmail"), tone: "warning" })
      return
    }

    setExporting(true)
    try {
      await exportCopouchBill({
        walletId: route.params.id,
        email: profile.email,
        orderType: activeFilter.orderTypeList?.length === 1 ? activeFilter.orderTypeList[0] : undefined,
      })
      showToast({ message: t("copouch.bill.exportSuccess", { email: profile.email }), tone: "success" })
    } catch {
      showToast({ message: t("copouch.bill.exportFailed"), tone: "error" })
    } finally {
      setExporting(false)
    }
  }

  return (
    <CopouchScaffold
      canGoBack
      onBack={navigation.goBack}
      right={
        <Pressable disabled={exporting} onPress={() => void handleExport()}>
          <Text style={[styles.headerAction, { color: theme.colors.primary }]}>{exporting ? t("common.loading") : t("copouch.bill.export")}</Text>
        </Pressable>
      }
      title={t("copouch.bill.title")}
    >
      <WalletGuard
        invalidBody={t("copouch.bill.invalidBody")}
        invalidTitle={t("copouch.bill.invalidTitle")}
        invalidAccess={invalidAccess}
        loading={loading}
        loadingBody={t("copouch.bill.loading")}
      >
        <SummaryGrid
          items={[
            { label: t("copouch.bill.totalReceived"), value: formatCurrency(stats.totalReceivedAmount) },
            { label: t("copouch.bill.totalPaid"), value: formatCurrency(stats.totalPaymentAmount) },
            { label: t("copouch.bill.walletName"), value: detail?.walletName || t("copouch.home.unnamedWallet") },
            { label: t("copouch.bill.itemCount"), value: String(items.length) },
          ]}
        />

        <SectionCard>
          <View style={styles.filterWrap}>
            {billFilters.map(filter => (
              <FilterChip key={filter.key} active={selectedFilterKey === filter.key} label={t(filter.titleKey)} onPress={() => setSelectedFilterKey(filter.key)} />
            ))}
          </View>
          <View style={styles.filterWrap}>
            {memberChips.map(member => (
              <FilterChip key={member.memberId || "all"} active={selectedMemberId === member.memberId} label={member.nickname} onPress={() => setSelectedMemberId(member.memberId)} />
            ))}
          </View>
          <View style={styles.inlineLinks}>
            <Pressable onPress={() => navigation.navigate("CopouchBalanceScreen", { id: route.params.id })}>
              <Text style={[styles.linkText, { color: theme.colors.primary }]}>{t("copouch.bill.openBalance")}</Text>
            </Pressable>
            <Pressable onPress={() => navigation.navigate("CopouchRemindScreen", { id: route.params.id })}>
              <Text style={[styles.linkText, { color: theme.colors.primary }]}>{t("copouch.bill.openRemind")}</Text>
            </Pressable>
          </View>
        </SectionCard>

        {billLoading ? <LoadingCard body={t("copouch.bill.loading")} /> : null}

        {!billLoading && items.length === 0 ? <PageEmpty title={t("copouch.bill.emptyTitle")} body={t("copouch.bill.emptyBody")} /> : null}

        {items.map(item => {
          const amount = resolveBillAmount(item)
          return (
            <Pressable
              key={item.orderSn}
              onPress={() =>
                (navigation.getParent() as any)?.navigate("OrdersStack", {
                  screen: "OrderDetailScreen",
                  params: {
                    orderSn: item.orderSn,
                    source: "manual",
                  },
                })
              }
            >
              <SectionCard>
                <View style={styles.rowBetween}>
                  <Text style={[styles.rowTitle, { color: theme.colors.text }]}>
                    {resolveTransactionTitle(t, item.transactionType, item.orderType)}
                  </Text>
                  <Text style={[styles.billAmount, { color: amount.incoming ? "#0F766E" : theme.colors.text }]}>{amount.label}</Text>
                </View>
                <Text style={[styles.helperText, { color: theme.colors.mutedText }]}>{formatAddress(resolveBillCounterparty(item))}</Text>
                <Text style={[styles.helperText, { color: theme.colors.mutedText }]}>{formatDateTime(item.createdAt)}</Text>
                {item.canAllocate ? (
                  <SecondaryButton
                    label={t("copouch.bill.reallocate")}
                    onPress={() =>
                      navigation.navigate("CopouchAllocationScreen", {
                        id: route.params.id,
                        orderSn: item.orderSn,
                      })
                    }
                  />
                ) : item.reallocateWalletAddress ? (
                  <SecondaryButton
                    label={t("copouch.bill.viewAllocation")}
                    onPress={() =>
                      navigation.navigate("CopouchViewAllocationScreen", {
                        id: route.params.id,
                        orderSn: item.orderSn,
                      })
                    }
                  />
                ) : null}
              </SectionCard>
            </Pressable>
          )
        })}
      </WalletGuard>
    </CopouchScaffold>
  )
}

export function CopouchRemindScreen({ navigation, route }: StackProps<"CopouchRemindScreen">) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const lastEvent = useSocketStore(state => state.lastEvent)
  const { loading, invalidAccess, reload } = useCopouchWalletDetail(route.params.id)
  const [events, setEvents] = useState<CopouchEvent[]>([])
  const [eventLoading, setEventLoading] = useState(true)

  const loadEvents = useCallback(async () => {
    setEventLoading(true)
    try {
      const response = await getCopouchWalletEvents({
        walletId: route.params.id,
        perPage: 40,
      })
      setEvents(response.items)
      if (response.items.length > 0) {
        await markAllCopouchEventsRead().catch(() => null)
      }
    } finally {
      setEventLoading(false)
    }
  }, [route.params.id])

  useEffect(() => {
    void Promise.all([reload().catch(() => null), loadEvents()]).catch(() => {
      Alert.alert(t("common.errorTitle"), t("copouch.remind.loadFailed"))
    })
  }, [loadEvents, reload, t])

  useFocusEffect(
    React.useCallback(() => {
      void loadEvents().catch(() => null)
    }, [loadEvents]),
  )

  useEffect(() => {
    if (lastEvent?.type && ["MultisigWalletMemberAddSuc", "MultisigWalletMemberDelSuc"].includes(lastEvent.type)) {
      void loadEvents().catch(() => null)
    }
  }, [lastEvent, loadEvents])

  return (
    <CopouchScaffold
      canGoBack
      onBack={navigation.goBack}
      right={
        <Pressable onPress={() => void markAllCopouchEventsRead().then(() => loadEvents())}>
          <Text style={[styles.headerAction, { color: theme.colors.primary }]}>{t("copouch.remind.readAll")}</Text>
        </Pressable>
      }
      title={t("copouch.remind.title")}
    >
      <WalletGuard
        invalidBody={t("copouch.remind.invalidBody")}
        invalidTitle={t("copouch.remind.invalidTitle")}
        invalidAccess={invalidAccess}
        loading={loading}
        loadingBody={t("copouch.remind.loading")}
      >
        {eventLoading ? <LoadingCard body={t("copouch.remind.loading")} /> : null}
        {!eventLoading && events.length === 0 ? <PageEmpty title={t("copouch.remind.emptyTitle")} body={t("copouch.remind.emptyBody")} /> : null}
        {events.map(event => (
          <SectionCard key={event.id}>
            <View style={styles.eventRow}>
              <View style={[styles.eventAvatar, { backgroundColor: theme.colors.primary }]}>
                <Text style={styles.eventAvatarText}>{(event.targetUserName || event.operatorUserName || "?").slice(0, 1).toUpperCase()}</Text>
              </View>
              <View style={styles.eventContent}>
                <Text style={[styles.eventTitle, { color: theme.colors.text }]}>{resolveEventMessage(t, event)}</Text>
                <Text style={[styles.helperText, { color: theme.colors.mutedText }]}>{formatDateTime(event.eventTime)}</Text>
              </View>
            </View>
          </SectionCard>
        ))}
      </WalletGuard>
    </CopouchScaffold>
  )
}

export function CopouchBalanceScreen({ navigation, route }: StackProps<"CopouchBalanceScreen">) {
  const { t } = useTranslation()
  const chainId = useWalletStore(state => state.chainId)
  const [loading, setLoading] = useState(true)
  const [invalidAccess, setInvalidAccess] = useState(false)
  const [wallet, setWallet] = useState<CopouchDetail | null>(null)
  const [assets, setAssets] = useState<CopouchAssetItem[]>([])
  const [memberAccounts, setMemberAccounts] = useState<CopouchMemberAccount[]>([])
  const [totalValue, setTotalValue] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)

    try {
      const [assetResponse, memberResponse] = await Promise.all([
        getCopouchAssetBreakdown({
          walletId: route.params.id,
          chainId,
        }),
        getCopouchMemberAccountList({
          walletId: route.params.id,
          selectSelf: false,
        }),
      ])

      setWallet(assetResponse.wallet)
      setAssets(assetResponse.assets)
      setTotalValue(assetResponse.totalValue)
      setMemberAccounts(memberResponse)
      setInvalidAccess(false)
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        setInvalidAccess(true)
      } else {
        throw error
      }
    } finally {
      setLoading(false)
    }
  }, [chainId, route.params.id])

  useEffect(() => {
    void load().catch(() => {
      Alert.alert(t("common.errorTitle"), t("copouch.balance.loadFailed"))
    })
  }, [load, t])

  return (
    <CopouchScaffold canGoBack onBack={navigation.goBack} title={t("copouch.balance.title")}>
      <WalletGuard
        invalidBody={t("copouch.balance.invalidBody")}
        invalidTitle={t("copouch.balance.invalidTitle")}
        invalidAccess={invalidAccess}
        loading={loading}
        loadingBody={t("copouch.balance.loading")}
      >
        <SummaryGrid
          items={[
            { label: t("copouch.balance.totalAssets"), value: formatCurrency(totalValue) },
            { label: t("copouch.balance.assetCount"), value: String(assets.filter(item => item.balance > 0).length) },
            { label: t("copouch.balance.memberCount"), value: String(wallet?.ownerCount ?? memberAccounts.length) },
            { label: t("copouch.balance.walletName"), value: wallet?.walletName || t("copouch.home.unnamedWallet") },
          ]}
        />

        <SectionCard>
          <Text style={styles.sectionTitle}>{t("copouch.balance.assetList")}</Text>
          {assets.length === 0 ? (
            <PageEmpty title={t("copouch.balance.emptyAssetsTitle")} body={t("copouch.balance.emptyAssetsBody")} />
          ) : (
            <View style={styles.assetList}>
              {assets.map(asset => (
                <View key={asset.coinCode} style={styles.rowBetween}>
                  <View>
                    <Text style={styles.rowTitle}>{asset.coinName || asset.coinCode}</Text>
                    <Text style={styles.helperText}>
                      {formatTokenAmount(asset.balance)} {asset.coinCode}
                    </Text>
                  </View>
                  <Text style={styles.billAmount}>{formatCurrency(asset.totalValue)}</Text>
                </View>
              ))}
            </View>
          )}
        </SectionCard>

        <SectionCard>
          <Text style={styles.sectionTitle}>{t("copouch.balance.memberSection")}</Text>
          {memberAccounts.length === 0 ? (
            <PageEmpty title={t("copouch.balance.emptyMembersTitle")} body={t("copouch.balance.emptyMembersBody")} />
          ) : (
            <View style={styles.assetList}>
              {memberAccounts.map(member => (
                <View key={member.memberId} style={styles.memberStatCard}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.rowTitle}>{member.nickname || t("copouch.member.unknown")}</Text>
                    <Text style={[styles.billAmount, { color: member.balanceAmount >= 0 ? "#0F766E" : "#B91C1C" }]}>
                      {formatAmount(member.balanceAmount)}
                    </Text>
                  </View>
                  <View style={styles.statTriplet}>
                    <FieldRow label={t("copouch.balance.credit")} value={formatAmount(member.creditAmount)} />
                    <FieldRow label={t("copouch.balance.debit")} value={formatAmount(member.debitAmount)} />
                    <FieldRow label={t("copouch.balance.balance")} value={formatAmount(member.balanceAmount)} />
                  </View>
                </View>
              ))}
            </View>
          )}
        </SectionCard>
      </WalletGuard>
    </CopouchScaffold>
  )
}
