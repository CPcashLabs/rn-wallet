import React, { useEffect, useMemo, useState } from "react"

import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { HomeScaffold } from "@/features/home/components/HomeScaffold"
import { formatDateTime } from "@/features/home/utils/format"
import { ActionRow, StatusHero } from "@/features/orders/components/OrdersUi"
import { confirmOrder, getOrderDetail, type OrderDetail } from "@/features/orders/services/ordersApi"
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
import { useAppTheme } from "@/shared/theme/useAppTheme"

import type { OrdersStackParamList } from "@/app/navigation/types"

type Props = NativeStackScreenProps<OrdersStackParamList, "OrderDetailScreen">

export function OrderDetailScreen({ navigation, route }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const orderSn = route.params.orderSn
  const [detail, setDetail] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    let active = true

    void (async () => {
      try {
        const response = await getOrderDetail(orderSn)
        if (active) {
          setDetail(response)
        }
      } catch {
        if (active) {
          Alert.alert(t("common.errorTitle"), t("orders.detail.loadFailed"))
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
  }, [orderSn, t])

  const counterpartyAddress = useMemo(() => (detail ? resolveDetailCounterparty(detail) : ""), [detail])
  const explorerUrl = useMemo(() => (detail ? resolveOrderExplorerUrl(detail) : ""), [detail])

  const handleConfirm = async () => {
    if (!detail) {
      return
    }

    try {
      setConfirming(true)
      await confirmOrder(detail.orderSn)
      const refreshed = await getOrderDetail(detail.orderSn)
      setDetail(refreshed)
      Alert.alert(t("common.infoTitle"), t("orders.detail.confirmSuccess"))
    } catch {
      Alert.alert(t("common.errorTitle"), t("orders.detail.confirmFailed"))
    } finally {
      setConfirming(false)
    }
  }

  const handleOpenExplorer = async () => {
    if (!explorerUrl) {
      Alert.alert(t("common.infoTitle"), t("orders.detail.explorerUnavailable"))
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
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t("orders.detail.notes")}</Text>
              <Text style={[styles.body, { color: theme.colors.text }]}>{detail.note || t("orders.detail.noNotes")}</Text>
              {detail.notesImageUrl ? <Image source={{ uri: detail.notesImageUrl }} style={styles.previewImage} /> : null}
              <View style={styles.noteActions}>
                <SecondaryButton
                  label={t("orders.detail.editTags")}
                  onPress={() =>
                    navigation.navigate("TagsNotesScreen", {
                      orderSn,
                    })
                  }
                />
                <SecondaryButton label={t("orders.detail.manageLabels")} onPress={() => navigation.navigate("LabelManagementScreen")} />
              </View>
            </SectionCard>

            <SectionCard>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t("orders.detail.actionsTitle")}</Text>

              {shouldShowHistoryAction(detail.status) && counterpartyAddress ? (
                <ActionRow
                  label={t("orders.detail.viewRecords")}
                  body={t("orders.detail.viewRecordsBody")}
                  onPress={() => navigation.navigate("TxlogsByAddressScreen", { address: counterpartyAddress })}
                />
              ) : null}

              {shouldShowVoucherAction(detail.orderType, detail.status) ? (
                <ActionRow
                  label={t("orders.detail.transferVoucher")}
                  body={t("orders.detail.transferVoucherBody")}
                  onPress={() => navigation.navigate("OrderVoucherScreen", { orderSn })}
                />
              ) : null}

              {shouldShowBillAction(detail.status) ? (
                <>
                  <ActionRow
                    label={t("orders.detail.reimburse")}
                    body={t("orders.detail.reimburseBody")}
                    onPress={() => navigation.navigate("ReimburseScreen", { orderSn })}
                  />
                  <ActionRow
                    label={t("orders.detail.flowProof")}
                    body={t("orders.detail.flowProofBody")}
                    onPress={() => navigation.navigate("FlowProofScreen", { orderSn })}
                  />
                  <ActionRow
                    label={t("orders.detail.digitalReceipt")}
                    body={t("orders.detail.digitalReceiptBody")}
                    onPress={() => navigation.navigate("DigitalReceiptScreen", { orderSn })}
                  />
                  <ActionRow
                    label={t("orders.detail.splitDetail")}
                    body={t("orders.detail.splitDetailBody")}
                    onPress={() => navigation.navigate("SplitDetailScreen", { orderSn })}
                  />
                </>
              ) : null}

              {shouldShowRefund(detail) ? (
                <ActionRow
                  label={t("orders.detail.refundDetail")}
                  body={t("orders.detail.refundDetailBody")}
                  onPress={() => navigation.navigate("RefundDetailScreen", { orderSn })}
                />
              ) : null}

              {shouldShowBillAction(detail.status) ? (
                <ActionRow
                  label={t("orders.detail.openExplorer")}
                  body={t("orders.detail.openExplorerBody")}
                  onPress={() => void handleOpenExplorer()}
                />
              ) : null}
            </SectionCard>

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
  noteActions: {
    gap: 10,
  },
})
