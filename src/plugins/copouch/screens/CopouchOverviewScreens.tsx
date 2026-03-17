import React, { useEffect, useMemo, useRef, useState } from "react"

import { useTranslation } from "react-i18next"
import { Pressable, Text, View } from "react-native"

import { navigateRoot } from "@/app/navigation/navigationRef"
import { HeaderTextAction } from "@/shared/ui/HomeScaffold"
import { CopouchScaffold } from "@/plugins/copouch/components/CopouchScaffold"
import type { CopouchStackScreenProps } from "@/plugins/copouch/screens/copouchScreenProps"
import {
  LoadingCard,
  WalletGuard,
  billFilters,
  resolveBillAmount,
  resolveBillCounterparty,
  resolveEventMessage,
  resolveTransactionTitle,
  styles,
  isCopouchForbiddenError,
  useCopouchWalletDetail,
} from "@/plugins/copouch/screens/copouchOperationShared"
import {
  exportCopouchBill,
  markAllCopouchEventsRead,
} from "@/plugins/copouch/services/copouchApi"
import {
  useCopouchAssetBreakdownQuery,
  useCopouchBillListQuery,
  useCopouchBillStatisticsQuery,
  useCopouchEventsQuery,
  useCopouchMemberAccountsQuery,
} from "@/plugins/copouch/queries/copouchQueries"
import { formatAddress, formatCurrency, formatDateTime, formatTokenAmount } from "@/shared/utils/format"
import { FilterChip, SummaryGrid } from "@/shared/ui/WalletCommonUi"
import { FieldRow, PageEmpty, SecondaryButton, SectionCard } from "@/shared/ui/AppFlowUi"
import { formatAmount } from "@/shared/exchange/utils/order"
import { useErrorPresenter } from "@/shared/errors/useErrorPresenter"
import { useSocketStore } from "@/shared/store/useSocketStore"
import { useUserStore } from "@/shared/store/useUserStore"
import { useWalletStore } from "@/shared/store/useWalletStore"
import { useToast } from "@/shared/toast/useToast"
import { useAppTheme } from "@/shared/theme/useAppTheme"

export function CopouchBillListScreen({ navigation, route }: CopouchStackScreenProps<"CopouchBillListScreen">) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const { presentError } = useErrorPresenter()
  const { showToast } = useToast()
  const profile = useUserStore(state => state.profile)
  const { detail, error: detailError, loading, invalidAccess } = useCopouchWalletDetail(route.params.id)
  const [selectedFilterKey, setSelectedFilterKey] = useState<(typeof billFilters)[number]["key"]>("all")
  const [selectedMemberId, setSelectedMemberId] = useState("")
  const [exporting, setExporting] = useState(false)

  const activeFilter = useMemo(() => billFilters.find(item => item.key === selectedFilterKey) ?? billFilters[0], [selectedFilterKey])
  const billQuery = useCopouchBillListQuery({
    walletId: route.params.id,
    perPage: 40,
    orderTypeList: activeFilter.orderTypeList as string[] | undefined,
    userId: selectedMemberId || undefined,
  })
  const statsQuery = useCopouchBillStatisticsQuery({
    walletId: route.params.id,
    orderTypeList: activeFilter.orderTypeList as string[] | undefined,
    userId: selectedMemberId || undefined,
  })
  const membersQuery = useCopouchMemberAccountsQuery({
    walletId: route.params.id,
    selectSelf: false,
  })
  const items = billQuery.data ?? []
  const stats = statsQuery.data ?? { totalPaymentAmount: 0, totalReceivedAmount: 0 }
  const members = membersQuery.data ?? []
  const billLoading = billQuery.isLoading || statsQuery.isLoading || membersQuery.isLoading
  const screenInvalidAccess =
    invalidAccess ||
    isCopouchForbiddenError(billQuery.error) ||
    isCopouchForbiddenError(statsQuery.error) ||
    isCopouchForbiddenError(membersQuery.error)

  useEffect(() => {
    const loadError = detailError ?? billQuery.error ?? statsQuery.error ?? membersQuery.error

    if (!loadError || isCopouchForbiddenError(loadError)) {
      return
    }

    presentError(loadError, {
      fallbackKey: "copouch.bill.loadFailed",
      mode: "toast",
    })
  }, [billQuery.error, detailError, membersQuery.error, presentError, statsQuery.error])

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
    } catch (error) {
      presentError(error, {
        fallbackKey: "copouch.bill.exportFailed",
        mode: "toast",
      })
    } finally {
      setExporting(false)
    }
  }

  return (
    <CopouchScaffold
      canGoBack
      onBack={navigation.goBack}
      right={
        <HeaderTextAction
          disabled={exporting}
          label={exporting ? t("common.loading") : t("copouch.bill.export")}
          onPress={() => void handleExport()}
        />
      }
      title={t("copouch.bill.title")}
    >
      <WalletGuard
        invalidBody={t("copouch.bill.invalidBody")}
        invalidTitle={t("copouch.bill.invalidTitle")}
        invalidAccess={screenInvalidAccess}
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
                navigateRoot("OrdersStack", {
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
                  <Text style={[styles.billAmount, { color: amount.incoming ? theme.colors.success : theme.colors.text }]}>{amount.label}</Text>
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

export function CopouchRemindScreen({ navigation, route }: CopouchStackScreenProps<"CopouchRemindScreen">) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const { presentError } = useErrorPresenter()
  const copouchRevision = useSocketStore(state => state.copouchRevision)
  const { error: detailError, loading, invalidAccess, reload } = useCopouchWalletDetail(route.params.id)
  const eventsQuery = useCopouchEventsQuery({
    walletId: route.params.id,
    perPage: 40,
  })
  const events = eventsQuery.data ?? []
  const eventLoading = eventsQuery.isLoading && !eventsQuery.data
  const eventSignatureRef = useRef("")
  const screenInvalidAccess = invalidAccess || isCopouchForbiddenError(eventsQuery.error)

  useEffect(() => {
    if (detailError && !isCopouchForbiddenError(detailError)) {
      presentError(detailError, {
        fallbackKey: "copouch.remind.loadFailed",
      })
    }
  }, [detailError, presentError])

  useEffect(() => {
    if (eventsQuery.error && !isCopouchForbiddenError(eventsQuery.error)) {
      presentError(eventsQuery.error, {
        fallbackKey: "copouch.remind.loadFailed",
      })
    }
  }, [eventsQuery.error, presentError])

  useEffect(() => {
    if (copouchRevision <= 0) {
      return
    }

    void Promise.all([reload(), eventsQuery.refetch()]).catch(() => null)
  }, [copouchRevision, eventsQuery.refetch, reload])

  useEffect(() => {
    const signature = events.map(event => event.id).join("|")

    if (!signature || signature === eventSignatureRef.current) {
      return
    }

    eventSignatureRef.current = signature
    void markAllCopouchEventsRead()
      .then(() => reload().catch(() => null))
      .catch(() => null)
  }, [events, reload])

  return (
    <CopouchScaffold
      canGoBack
      onBack={navigation.goBack}
      right={
        <HeaderTextAction
          label={t("copouch.remind.readAll")}
          onPress={() =>
            void markAllCopouchEventsRead()
              .then(() => Promise.all([reload(), eventsQuery.refetch()]))
              .catch(error => {
                presentError(error, {
                  fallbackKey: "copouch.remind.loadFailed",
                })
              })
          }
        />
      }
      title={t("copouch.remind.title")}
    >
      <WalletGuard
        invalidBody={t("copouch.remind.invalidBody")}
        invalidTitle={t("copouch.remind.invalidTitle")}
        invalidAccess={screenInvalidAccess}
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

export function CopouchBalanceScreen({ navigation, route }: CopouchStackScreenProps<"CopouchBalanceScreen">) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const { presentError } = useErrorPresenter()
  const chainId = useWalletStore(state => state.chainId)
  const assetBreakdownQuery = useCopouchAssetBreakdownQuery({
    walletId: route.params.id,
    chainId,
  })
  const memberAccountsQuery = useCopouchMemberAccountsQuery({
    walletId: route.params.id,
    selectSelf: false,
  })
  const loading = assetBreakdownQuery.isLoading || memberAccountsQuery.isLoading
  const invalidAccess = isCopouchForbiddenError(assetBreakdownQuery.error) || isCopouchForbiddenError(memberAccountsQuery.error)
  const wallet = assetBreakdownQuery.data?.wallet ?? null
  const assets = assetBreakdownQuery.data?.assets ?? []
  const memberAccounts = memberAccountsQuery.data ?? []
  const totalValue = assetBreakdownQuery.data?.totalValue ?? 0

  useEffect(() => {
    const loadError = assetBreakdownQuery.error ?? memberAccountsQuery.error

    if (!loadError || isCopouchForbiddenError(loadError)) {
      return
    }

    presentError(loadError, {
      fallbackKey: "copouch.balance.loadFailed",
    })
  }, [assetBreakdownQuery.error, memberAccountsQuery.error, presentError])

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
                    <Text style={[styles.billAmount, { color: member.balanceAmount >= 0 ? theme.colors.success : theme.colors.danger }]}>
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
