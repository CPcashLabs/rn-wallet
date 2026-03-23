import React, { useCallback, useEffect, useMemo } from "react"

import { useQueryClient } from "@tanstack/react-query"
import { useFocusEffect } from "@react-navigation/native"
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { navigateRoot } from "@/app/navigation/navigationRef"
import type { OrdersStackParamList } from "@/app/navigation/types"
import { HomeScaffold } from "@/features/home/components/HomeScaffold"
import { OrderCounterpartyAvatar } from "@/features/orders/components/OrderCounterpartyAvatar"
import {
  type OrderDetail,
  type OrderLabelBinding,
} from "@/features/orders/services/ordersApi"
import { EMPTY_ORDER_LABEL_BINDING, useConfirmOrderMutation, useOrderDetailQuery } from "@/features/orders/queries/orderQueries"
import {
  OrderStatus,
  formatAddressLabel,
  formatTokenAmount,
  formatTimestamp,
  isIncomingOrderType,
  resolveDetailCounterparty,
  resolveOrderExplorerUrl,
  resolveOrderStatusLabel,
  shouldShowBillAction,
  shouldShowConfirm,
  shouldShowHistoryAction,
  shouldShowRefund,
  shouldShowVoucherAction,
} from "@/features/orders/utils/orderHelpers"
import { openExternalUrl } from "@/features/settings/utils/settingsHub"
import { useErrorPresenter } from "@/shared/errors/useErrorPresenter"
import { clipboardAdapter } from "@/shared/native/clipboardAdapter"
import { useAppTheme } from "@/shared/theme/useAppTheme"
import { useToast } from "@/shared/toast/useToast"
import { PageEmpty, PrimaryButton, SectionCard } from "@/shared/ui/AppFlowUi"
import { AppGlyph, type AppGlyphName } from "@/shared/ui/AppGlyph"

type Props = NativeStackScreenProps<OrdersStackParamList, "OrderDetailScreen">
type DetailTone = "success" | "warning" | "info" | "danger"

type DetailRowItem = {
  key: string
  label: string
  value: string
  onPress?: () => void
  accessory?: "chevron" | "copy"
}

type ShortcutItem = {
  key: string
  label: string
  icon: AppGlyphName
  onPress: () => void
}

export function OrderDetailScreen({ navigation, route }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const { presentError } = useErrorPresenter()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const orderSn = route.params.orderSn
  const detailQuery = useOrderDetailQuery(orderSn)
  const confirmMutation = useConfirmOrderMutation(queryClient, orderSn)
  const detail = detailQuery.data?.detail ?? null
  const labelBinding: OrderLabelBinding = detailQuery.data?.labelBinding ?? EMPTY_ORDER_LABEL_BINDING
  const loading = detailQuery.isLoading && !detail
  const confirming = confirmMutation.isPending

  useFocusEffect(
    useCallback(() => {
      if (detailQuery.data) {
        void detailQuery.refetch()
      }
    }, [detailQuery.data, detailQuery.refetch]),
  )

  useEffect(() => {
    if (detailQuery.error && !detail) {
      presentError(detailQuery.error, {
        fallbackKey: "orders.detail.loadFailed",
      })
    }
  }, [detail, detailQuery.error, detailQuery.errorUpdatedAt, presentError])

  const counterpartyAddress = useMemo(() => (detail ? resolveDetailCounterparty(detail) : ""), [detail])
  const explorerUrl = useMemo(() => (detail ? resolveOrderExplorerUrl(detail) : ""), [detail])
  const hasTagsNotesContent = useMemo(
    () => Boolean(labelBinding.labels.length || labelBinding.notes.trim() || labelBinding.notesImageUrl || detail?.note.trim() || detail?.notesImageUrl),
    [detail?.note, detail?.notesImageUrl, labelBinding.labels.length, labelBinding.notes, labelBinding.notesImageUrl],
  )
  const showVoucherAction = detail ? shouldShowVoucherAction(detail.orderType, detail.status) : false
  const showBillActions = detail ? shouldShowBillAction(detail.status) : false
  const showHistoryAction = detail ? shouldShowHistoryAction(detail.status) && Boolean(counterpartyAddress) : false
  const showRefundAction = detail ? shouldShowRefund(detail) : false
  const isIncoming = detail ? isIncomingOrderType(detail.orderType) : false
  const statusTone = detail ? resolveDetailTone(detail.status) : "info"
  const statusColor = resolveToneColor(theme, statusTone)
  const statusLabelColor = statusTone === "warning"
    ? theme.colors.warning
    : statusTone === "danger"
      ? theme.colors.danger
      : theme.colors.text
  const amountValue = detail ? resolvePrimaryAmount(detail) : 0
  const feeValue = detail ? resolveFeeAmount(detail) : 0
  const signedAmount = `${isIncoming ? "+" : "-"}${formatTokenAmount(amountValue, 2)}`
  const isCompleted = detail?.status === OrderStatus.OrderFinished
  const receiveAmountValue = detail
    ? isCompleted
      ? detail.recvActualAmount || detail.recvAmount
      : detail.recvAmount
    : 0

  const handleConfirm = async () => {
    if (!detail) {
      return
    }

    try {
      await confirmMutation.mutateAsync()
      showToast({ message: t("orders.detail.confirmSuccess"), tone: "success" })
    } catch (error) {
      presentError(error, {
        fallbackKey: "orders.detail.confirmFailed",
      })
    }
  }

  const handleOpenExplorer = async () => {
    if (!explorerUrl) {
      showToast({ message: t("orders.detail.explorerUnavailable"), tone: "warning" })
      return
    }

    try {
      await openExternalUrl(explorerUrl)
    } catch (error) {
      presentError(error, {
        fallbackKey: "orders.detail.openExplorerFailed",
      })
    }
  }

  const handleOpenHelp = useCallback(() => {
    navigateRoot("HelpStack", {
      screen: "HelpCenterScreen",
    })
  }, [])

  const handleCopyOrderNumber = useCallback(async () => {
    const value = detail?.orderSn || orderSn
    const result = await clipboardAdapter.setString(value)

    if (result.ok) {
      showToast({ message: t("orders.detail.copySuccess"), tone: "success" })
      return
    }

    showToast({ message: t("orders.detail.copyFailed"), tone: "error" })
  }, [detail?.orderSn, orderSn, showToast, t])

  const overviewRows = useMemo<DetailRowItem[]>(() => {
    if (!detail) {
      return []
    }

    return [
      feeValue !== 0 ? {
        key: "amount",
        label: isCompleted
          ? t("orders.detail.actualReceive")
          : t("orders.detail.estimatedReceive"),
        value: formatTokenAmount(receiveAmountValue, 2),
      } : null,
      feeValue !== 0 ? {
        key: "fee",
        label: t("orders.detail.fee"),
        value: formatTokenAmount(feeValue, 2),
      } : null,
      {
        key: "counterparty",
        label: t("orders.detail.counterpartyAddress"),
        value: formatAddressLabel(counterpartyAddress),
        onPress: showHistoryAction ? () => navigation.navigate("TxlogsByAddressScreen", { address: counterpartyAddress }) : undefined,
        accessory: showHistoryAction ? "chevron" : undefined,
      },
      {
        key: "network",
        label: t("orders.detail.network"),
        value: isIncoming
          ? detail.sendChainName || detail.recvChainName || "--"
          : detail.recvChainName || detail.sendChainName || "--",
      },
      {
        key: "createdAt",
        label: t("orders.detail.createdAt"),
        value: formatTimestamp(detail.createdAt),
      },
      detail.recvActualReceivedAt ? {
        key: "receivedAt",
        label: t("orders.detail.receiveTime"),
        value: formatTimestamp(detail.recvActualReceivedAt),
      } : null,
      {
        key: "orderSn",
        label: t("orders.detail.orderNumber"),
        value: detail.orderSn || orderSn,
        onPress: () => void handleCopyOrderNumber(),
        accessory: "copy",
      },
    ].filter((row): row is DetailRowItem => row !== null)
  }, [
    amountValue,
    counterpartyAddress,
    detail,
    feeValue,
    handleCopyOrderNumber,
    isCompleted,
    isIncoming,
    navigation,
    orderSn,
    receiveAmountValue,
    showHistoryAction,
    t,
  ])

  const shortcutItems = useMemo<ShortcutItem[]>(() => {
    const items: ShortcutItem[] = []

    if (showHistoryAction) {
      items.push({
        key: "records",
        label: t("orders.detail.viewRecords"),
        icon: "book",
        onPress: () => navigation.navigate("TxlogsByAddressScreen", { address: counterpartyAddress }),
      })
    }

    if (showRefundAction) {
      items.push({
        key: "refund",
        label: t("orders.detail.refundDetail"),
        icon: "wallet",
        onPress: () => navigation.navigate("RefundDetailScreen", { orderSn }),
      })
    }

    if (showBillActions) {
      items.push({
        key: "flowProof",
        label: t("orders.detail.flowProof"),
        icon: "book",
        onPress: () => navigation.navigate("FlowProofScreen", { orderSn }),
      })
      items.push({
        key: "digitalReceipt",
        label: t("orders.detail.digitalReceipt"),
        icon: "mail",
        onPress: () => navigation.navigate("DigitalReceiptScreen", { orderSn }),
      })
      items.push({
        key: "splitDetail",
        label: t("orders.detail.splitDetail"),
        icon: "node",
        onPress: () => navigation.navigate("SplitDetailScreen", { orderSn }),
      })
      items.push({
        key: "reimburse",
        label: t("orders.detail.reimburse"),
        icon: "wallet",
        onPress: () => navigation.navigate("ReimburseScreen", { orderSn }),
      })
    }

    if (showVoucherAction) {
      items.push({
        key: "voucher",
        label: t("orders.detail.transferVoucher"),
        icon: "bubble",
        onPress: () => navigation.navigate("OrderVoucherScreen", { orderSn }),
      })
    }

    if (explorerUrl) {
      items.push({
        key: "explorer",
        label: t("orders.detail.openExplorer"),
        icon: "globe",
        onPress: () => void handleOpenExplorer(),
      })
    }

    return items
  }, [
    counterpartyAddress,
    explorerUrl,
    handleOpenExplorer,
    navigation,
    orderSn,
    showBillActions,
    showHistoryAction,
    showRefundAction,
    showVoucherAction,
    t,
  ])

  return (
    <HomeScaffold
      canGoBack
      onBack={navigation.goBack}
      title={t("orders.detail.title")}
      scroll={false}
      right={<HeaderLinkAction label={t("orders.detail.helpAction")} onPress={handleOpenHelp} />}
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <SectionCard>
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={theme.colors.primary} />
              <Text style={[styles.body, { color: theme.colors.mutedText }]}>{t("orders.detail.loading")}</Text>
            </View>
          </SectionCard>
        ) : null}

        {!loading && !detail ? <PageEmpty title={t("orders.detail.emptyTitle")} body={t("orders.detail.emptyBody")} /> : null}

        {detail ? (
          <>
            <SectionCard style={styles.overviewCard}>
              <View style={styles.statusHero}>
                <OrderCounterpartyAvatar item={detail} size={48} />
                <Text style={[styles.amountText, { color: isIncoming ? theme.colors.success : theme.colors.text }]}>{signedAmount}</Text>
                <Text style={[styles.statusLabel, { color: statusLabelColor }]}>{resolveOrderStatusLabel(t, detail.status)}</Text>
              </View>

              <View style={styles.detailRows}>
                {overviewRows.map((item, index) => (
                  <DetailInfoRow
                    key={item.key}
                    item={item}
                    isLast={index === overviewRows.length - 1}
                  />
                ))}
              </View>
            </SectionCard>

            <SectionCard style={styles.managementCard}>
              <View style={styles.managementHeader}>
                <Text style={[styles.managementTitle, { color: theme.colors.text }]}>{t("orders.detail.billManagementTitle")}</Text>
              </View>

              <Pressable
                onPress={() =>
                  navigation.navigate("TagsNotesScreen", {
                    orderSn,
                  })
                }
                style={styles.tagsRow}
              >
                <Text style={[styles.tagsLabel, { color: theme.colors.text }]}>{t("orders.detail.notesSectionTitle")}</Text>
                <View style={styles.tagsAction}>
                  <Text style={[styles.tagsActionText, { color: theme.colors.mutedText }]}>
                    {hasTagsNotesContent ? t("orders.detail.editAction") : t("orders.labels.add")}
                  </Text>
                  <ChevronIcon color={theme.colors.mutedText} />
                </View>
              </Pressable>

              {shortcutItems.length > 0 ? <View style={[styles.cardDivider, { backgroundColor: theme.colors.glassBorder }]} /> : null}

              {shortcutItems.length > 0 ? (
                <View style={styles.shortcutGrid}>
                  {shortcutItems.map(item => (
                    <ShortcutButton key={item.key} item={item} />
                  ))}
                </View>
              ) : null}
            </SectionCard>

            {shouldShowConfirm(detail) ? (
              <PrimaryButton
                disabled={confirming}
                label={confirming ? t("common.loading") : t("orders.detail.confirmAction")}
                onPress={() => void handleConfirm()}
              />
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </HomeScaffold>
  )
}

function DetailInfoRow(props: {
  item: DetailRowItem
  isLast: boolean
}) {
  const theme = useAppTheme()

  const content = (
    <View
      style={[
        styles.infoRow,
        !props.isLast
          ? {
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: theme.colors.glassBorder,
            }
          : null,
      ]}
    >
      <Text style={[styles.infoLabel, { color: theme.colors.mutedText }]}>{props.item.label}</Text>
      <View style={styles.infoValueWrap}>
        <Text numberOfLines={1} style={[styles.infoValue, { color: theme.colors.text }]}>
          {props.item.value}
        </Text>
        {props.item.accessory === "chevron" ? <ChevronIcon color={theme.colors.mutedText} /> : null}
        {props.item.accessory === "copy" ? <CopyIcon color={theme.colors.mutedText} /> : null}
      </View>
    </View>
  )

  if (!props.item.onPress) {
    return content
  }

  return <Pressable onPress={props.item.onPress}>{content}</Pressable>
}

function ShortcutButton(props: {
  item: ShortcutItem
}) {
  const theme = useAppTheme()

  return (
    <Pressable onPress={props.item.onPress} style={styles.shortcutButton}>
      <AppGlyph backgroundColor="transparent" name={props.item.icon} size={24} tintColor={theme.colors.primary} />
      <Text style={[styles.shortcutLabel, { color: theme.colors.primary }]}>{props.item.label}</Text>
    </Pressable>
  )
}

function HeaderLinkAction(props: {
  label: string
  onPress: () => void
}) {
  const theme = useAppTheme()

  return (
    <Pressable hitSlop={8} onPress={props.onPress}>
      <Text style={[styles.headerLinkText, { color: theme.colors.text }]}>{props.label}</Text>
    </Pressable>
  )
}

function ChevronIcon(props: { color: string }) {
  return <View style={[styles.chevronIcon, { borderColor: props.color }]} />
}

function CopyIcon(props: { color: string }) {
  return (
    <View style={styles.copyIconShell}>
      <View style={[styles.copyBack, { borderColor: props.color }]} />
      <View style={[styles.copyFront, { borderColor: props.color }]} />
    </View>
  )
}

function resolvePrimaryAmount(detail: OrderDetail) {
  return isIncomingOrderType(detail.orderType)
    ? detail.sendActualAmount || detail.sendAmount
    : detail.sendActualAmount || detail.sendAmount
}

function resolveFeeAmount(detail: OrderDetail) {
  return detail.sendActualFeeAmount || detail.sendFeeAmount || detail.sendEstimateFeeAmount
}

function resolveDetailTone(status: number): DetailTone {
  if (status === OrderStatus.OrderFinished) {
    return "success"
  }

  if (status === OrderStatus.BuyerPaying) {
    return "warning"
  }

  if (status < 0 || status === OrderStatus.Refunded) {
    return "danger"
  }

  return "info"
}

function resolveToneColor(theme: ReturnType<typeof useAppTheme>, tone: DetailTone) {
  switch (tone) {
    case "success":
      return theme.colors.success
    case "warning":
      return theme.colors.warning
    case "danger":
      return theme.colors.danger
    default:
      return theme.colors.primary
  }
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 0,
    paddingVertical: 12,
    gap: 12,
    paddingBottom: 28,
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
  headerLinkText: {
    fontSize: 16,
    fontWeight: "500",
  },
  overviewCard: {
    padding: 0,
    gap: 0,
    overflow: "hidden",
  },
  statusHero: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 28,
    paddingBottom: 18,
    paddingHorizontal: 16,
    gap: 10,
  },
  statusLabel: {
    fontSize: 18,
    fontWeight: "400",
  },
  amountText: {
    fontSize: 40,
    lineHeight: 44,
    fontWeight: "800",
    letterSpacing: -1.2,
  },
  detailRows: {
    paddingHorizontal: 14,
    paddingBottom: 4,
  },
  infoRow: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  infoLabel: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  infoValueWrap: {
    maxWidth: "58%",
    minWidth: 84,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
  },
  infoValue: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "right",
    flexShrink: 1,
  },
  chevronIcon: {
    width: 10,
    height: 10,
    borderTopWidth: 1.6,
    borderRightWidth: 1.6,
    transform: [{ rotate: "45deg" }],
  },
  copyIconShell: {
    width: 20,
    height: 20,
  },
  copyBack: {
    position: "absolute",
    top: 2,
    left: 5,
    width: 11,
    height: 13,
    borderWidth: 1.5,
    borderRadius: 2,
  },
  copyFront: {
    position: "absolute",
    top: 5,
    left: 1,
    width: 11,
    height: 13,
    borderWidth: 1.5,
    borderRadius: 2,
  },
  managementCard: {
    padding: 0,
    gap: 0,
    overflow: "hidden",
  },
  managementHeader: {
    paddingHorizontal: 14,
    paddingTop: 18,
    paddingBottom: 4,
  },
  managementTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  tagsRow: {
    minHeight: 74,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  tagsLabel: {
    fontSize: 16,
    fontWeight: "500",
    flex: 1,
  },
  tagsAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  tagsActionText: {
    fontSize: 16,
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 14,
  },
  shortcutGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 12,
    rowGap: 18,
    paddingHorizontal: 14,
    paddingTop: 18,
    paddingBottom: 20,
  },
  shortcutButton: {
    width: "47%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 28,
  },
  shortcutLabel: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "500",
    flex: 1,
  },
})
