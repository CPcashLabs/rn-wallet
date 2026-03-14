import React, { useCallback, useMemo, useState } from "react"

import { useFocusEffect } from "@react-navigation/native"
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { HomeScaffold } from "@/features/home/components/HomeScaffold"
import { formatDateTime } from "@/features/home/utils/format"
import { ActionRow, StatusHero } from "@/features/orders/components/OrdersUi"
import { confirmOrder, findOrderLabels, getOrderDetail, type OrderDetail, type OrderLabelBinding } from "@/features/orders/services/ordersApi"
import {
  formatAddressLabel,
  resolveCounterpartyLabel,
  resolveDetailCounterparty,
  resolveOrderExplorerUrl,
  resolveOrderStatusLabel,
  resolveOrderTypeLabel,
  shouldShowBillAction,
  shouldShowConfirm,
  shouldShowHistoryAction,
  shouldShowRefund,
  shouldShowVoucherAction,
} from "@/features/orders/utils/orderHelpers"
import { PageEmpty, PrimaryButton, SecondaryButton, SectionCard } from "@/features/transfer/components/TransferUi"
import { openExternalUrl } from "@/features/settings/utils/settingsHub"
import { useToast } from "@/shared/toast/useToast"
import { useAppTheme } from "@/shared/theme/useAppTheme"

import type { OrdersStackParamList } from "@/app/navigation/types"

type Props = NativeStackScreenProps<OrdersStackParamList, "OrderDetailScreen">

const EMPTY_LABEL_BINDING: OrderLabelBinding = {
  notes: "",
  notesImageUrl: "",
  labels: [],
}

export function OrderDetailScreen({ navigation, route }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const { showToast } = useToast()
  const orderSn = route.params.orderSn
  const [detail, setDetail] = useState<OrderDetail | null>(null)
  const [labelBinding, setLabelBinding] = useState<OrderLabelBinding>(EMPTY_LABEL_BINDING)
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)

  const loadOrderDetail = useCallback(async () => {
    setLoading(true)
    void (async () => {
      try {
        const [response, binding] = await Promise.all([getOrderDetail(orderSn), findOrderLabels(orderSn).catch(() => null)])
        setDetail(response)
        setLabelBinding(
          binding ?? {
            notes: response.note,
            notesImageUrl: response.notesImageUrl,
            labels: [],
          },
        )
      } catch {
        setDetail(null)
        setLabelBinding(EMPTY_LABEL_BINDING)
        Alert.alert(t("common.errorTitle"), t("orders.detail.loadFailed"))
      } finally {
        setLoading(false)
      }
    })()
  }, [orderSn, t])

  useFocusEffect(
    useCallback(() => {
      void loadOrderDetail()
    }, [loadOrderDetail]),
  )

  const counterpartyAddress = useMemo(() => (detail ? resolveDetailCounterparty(detail) : ""), [detail])
  const explorerUrl = useMemo(() => (detail ? resolveOrderExplorerUrl(detail) : ""), [detail])
  const previewLabels = useMemo(() => labelBinding.labels.slice(0, 3), [labelBinding.labels])
  const notePreview = useMemo(() => {
    const next = labelBinding.notes.trim() || detail?.note.trim() || ""
    return next || t("orders.detail.notesSummaryEmpty")
  }, [detail?.note, labelBinding.notes, t])
  const noteImageUrl = labelBinding.notesImageUrl || detail?.notesImageUrl || ""
  const hasTagsNotesContent = Boolean(previewLabels.length || labelBinding.notes.trim() || noteImageUrl)
  const showVoucherAction = detail ? shouldShowVoucherAction(detail.orderType, detail.status) : false
  const showBillActions = detail ? shouldShowBillAction(detail.status) : false
  const showHistoryAction = detail ? shouldShowHistoryAction(detail.status) && Boolean(counterpartyAddress) : false
  const showRefundAction = detail ? shouldShowRefund(detail) : false

  const handleConfirm = async () => {
    if (!detail) {
      return
    }

    try {
      setConfirming(true)
      await confirmOrder(detail.orderSn)
      const refreshed = await getOrderDetail(detail.orderSn)
      setDetail(refreshed)
      showToast({ message: t("orders.detail.confirmSuccess"), tone: "success" })
    } catch {
      Alert.alert(t("common.errorTitle"), t("orders.detail.confirmFailed"))
    } finally {
      setConfirming(false)
    }
  }

  const handleOpenExplorer = async () => {
    if (!explorerUrl) {
      showToast({ message: t("orders.detail.explorerUnavailable"), tone: "warning" })
      return
    }

    try {
      await openExternalUrl(explorerUrl)
    } catch {
      Alert.alert(t("common.errorTitle"), t("orders.detail.openExplorerFailed"))
    }
  }

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("orders.detail.title")} scroll={false}>
      <ScrollView contentContainerStyle={styles.content}>
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
            <StatusHero
              title={resolveOrderStatusLabel(t, detail.status)}
              amount={`${detail.recvActualAmount || detail.recvAmount} ${detail.recvCoinName || detail.sendCoinName}`.trim()}
              subtitle={resolveOrderTypeLabel(t, detail.orderType)}
            />

            <SectionCard>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t("orders.detail.summary")}</Text>
              <FieldTextRow label="Order SN" value={detail.orderSn || orderSn} />
              <FieldTextRow label={t("orders.detail.type")} value={resolveOrderTypeLabel(t, detail.orderType)} />
              <FieldTextRow label={t("orders.detail.status")} value={resolveOrderStatusLabel(t, detail.status)} />
              <FieldTextRow label={t("orders.detail.createdAt")} value={formatDateTime(detail.createdAt)} />
              <FieldTextRow label={t("orders.detail.send")} value={`${detail.sendAmount} ${detail.sendCoinName}`.trim()} />
              <FieldTextRow label={t("orders.detail.receive")} value={`${detail.recvAmount} ${detail.recvCoinName}`.trim()} />
              <FieldTextRow label={t("orders.detail.fee")} value={`${detail.sendFeeAmount || detail.sendActualFeeAmount} ${detail.sendCoinName}`.trim()} />
            </SectionCard>

            <SectionCard>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t("orders.detail.addresses")}</Text>
              <FieldTextRow label={resolveCounterpartyLabel(t, detail.orderType)} value={formatAddressLabel(counterpartyAddress)} />
              <FieldTextRow label={t("orders.detail.paymentAddress")} value={formatAddressLabel(detail.paymentAddress)} />
              <FieldTextRow label={t("orders.detail.receiveAddress")} value={formatAddressLabel(detail.receiveAddress)} />
              <FieldTextRow label={t("orders.detail.depositAddress")} value={formatAddressLabel(detail.depositAddress)} />
            </SectionCard>

            <SectionCard>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t("orders.detail.notesSectionTitle")}</Text>
              {previewLabels.length > 0 ? (
                <View style={styles.tagWrap}>
                  {previewLabels.map(label => (
                    <View key={label.id} style={styles.tagChip}>
                      <Text style={styles.tagChipText}>{label.name}</Text>
                    </View>
                  ))}
                  {labelBinding.labels.length > previewLabels.length ? (
                    <Text style={[styles.tagMoreText, { color: theme.colors.mutedText }]}>+{labelBinding.labels.length - previewLabels.length}</Text>
                  ) : null}
                </View>
              ) : null}
              <Text style={[styles.body, { color: hasTagsNotesContent ? theme.colors.text : theme.colors.mutedText }]}>{notePreview}</Text>
              {noteImageUrl ? <Image source={{ uri: noteImageUrl }} style={styles.previewImage} /> : null}
              <View style={styles.actionGroup}>
                <ActionRow
                  label={t("orders.detail.editTags")}
                  body={t("orders.detail.editTagsBody")}
                  onPress={() =>
                    navigation.navigate("TagsNotesScreen", {
                      orderSn,
                    })
                  }
                />
                <ActionRow
                  label={t("orders.detail.manageLabels")}
                  body={t("orders.detail.manageLabelsBody")}
                  onPress={() => navigation.navigate("LabelManagementScreen")}
                />
              </View>
            </SectionCard>

            {showVoucherAction || showBillActions || showRefundAction ? (
              <SectionCard>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t("orders.detail.billManagementTitle")}</Text>
                <View style={styles.actionGroup}>
                  {showVoucherAction ? (
                    <ActionRow
                      label={t("orders.detail.transferVoucher")}
                      body={t("orders.detail.transferVoucherBody")}
                      onPress={() => navigation.navigate("OrderVoucherScreen", { orderSn })}
                    />
                  ) : null}
                  {showBillActions ? (
                    <ActionRow
                      label={t("orders.detail.reimburse")}
                      body={t("orders.detail.reimburseBody")}
                      onPress={() => navigation.navigate("ReimburseScreen", { orderSn })}
                    />
                  ) : null}
                  {showBillActions ? (
                    <ActionRow
                      label={t("orders.detail.flowProof")}
                      body={t("orders.detail.flowProofBody")}
                      onPress={() => navigation.navigate("FlowProofScreen", { orderSn })}
                    />
                  ) : null}
                  {showBillActions ? (
                    <ActionRow
                      label={t("orders.detail.digitalReceipt")}
                      body={t("orders.detail.digitalReceiptBody")}
                      onPress={() => navigation.navigate("DigitalReceiptScreen", { orderSn })}
                    />
                  ) : null}
                  {showRefundAction ? (
                    <ActionRow
                      label={t("orders.detail.refundDetail")}
                      body={t("orders.detail.refundDetailBody")}
                      onPress={() => navigation.navigate("RefundDetailScreen", { orderSn })}
                    />
                  ) : null}
                </View>
              </SectionCard>
            ) : null}

            {showHistoryAction || showBillActions ? (
              <SectionCard>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t("orders.detail.relatedTitle")}</Text>
                <View style={styles.actionGroup}>
                  {showHistoryAction ? (
                    <ActionRow
                      label={t("orders.detail.viewRecords")}
                      body={t("orders.detail.viewRecordsBody")}
                      onPress={() => navigation.navigate("TxlogsByAddressScreen", { address: counterpartyAddress })}
                    />
                  ) : null}
                  {showBillActions ? (
                    <ActionRow
                      label={t("orders.detail.splitDetail")}
                      body={t("orders.detail.splitDetailBody")}
                      onPress={() => navigation.navigate("SplitDetailScreen", { orderSn })}
                    />
                  ) : null}
                  {showBillActions ? (
                    <ActionRow
                      label={t("orders.detail.openExplorer")}
                      body={t("orders.detail.openExplorerBody")}
                      onPress={() => void handleOpenExplorer()}
                    />
                  ) : null}
                </View>
              </SectionCard>
            ) : null}

            {shouldShowConfirm(detail) ? (
              <PrimaryButton
                label={confirming ? t("common.loading") : t("orders.detail.confirmAction")}
                onPress={() => void handleConfirm()}
                disabled={confirming}
              />
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </HomeScaffold>
  )
}

function FieldTextRow(props: { label: string; value: string }) {
  const theme = useAppTheme()

  return (
    <View style={styles.fieldRow}>
      <Text style={[styles.fieldLabel, { color: theme.colors.mutedText }]}>{props.label}</Text>
      <Text style={[styles.fieldValue, { color: theme.colors.text }]}>{props.value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 12,
  },
  loadingWrap: {
    minHeight: 120,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  body: {
    fontSize: 13,
    lineHeight: 20,
  },
  previewImage: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    backgroundColor: "#E2E8F0",
  },
  tagWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  tagChip: {
    borderRadius: 999,
    backgroundColor: "#DFF7F3",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tagChipText: {
    color: "#0F766E",
    fontSize: 12,
    fontWeight: "700",
  },
  tagMoreText: {
    fontSize: 12,
    fontWeight: "600",
  },
  fieldRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
  },
  fieldLabel: {
    fontSize: 13,
  },
  fieldValue: {
    flex: 1,
    textAlign: "right",
    fontSize: 14,
  },
  actionGroup: {
    gap: 2,
  },
})
