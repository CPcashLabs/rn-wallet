import React, { useEffect, useMemo, useState } from "react"

import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View } from "react-native"
import QRCode from "qrcode"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { HomeScaffold } from "@/features/home/components/HomeScaffold"
import { formatDateTime, formatTokenAmount } from "@/features/home/utils/format"
import { ActionRow, LabeledInput, StatusHero, SuccessStateCard } from "@/features/orders/components/OrdersUi"
import {
  getBillDetail,
  getOrderDetail,
  getRefundDetail,
  getTransferVoucher,
  sendDigitalReceiptEmail,
  sendFlowProofEmail,
  type BillDetail,
  type OrderDetail,
  type RefundDetail,
  type TransferVoucherDetail,
} from "@/features/orders/services/ordersApi"
import {
  buildFlowProofRange,
  formatAddressLabel,
  resolveDetailCounterparty,
  resolveOrderTypeLabel,
  resolveVoucherExternalUrl,
} from "@/features/orders/utils/orderHelpers"
import { PageEmpty, PrimaryButton, SecondaryButton, SectionCard } from "@/features/transfer/components/TransferUi"
import { openExternalUrl } from "@/features/settings/utils/settingsHub"
import { fileAdapter, shareAdapter } from "@/shared/native"
import { useUserStore } from "@/shared/store/useUserStore"
import { useToast } from "@/shared/toast/useToast"
import { useAppTheme } from "@/shared/theme/useAppTheme"

import type { OrdersStackParamList } from "@/app/navigation/types"

type SplitProps = NativeStackScreenProps<OrdersStackParamList, "SplitDetailScreen">
type ReimburseProps = NativeStackScreenProps<OrdersStackParamList, "ReimburseScreen">
type VoucherProps = NativeStackScreenProps<OrdersStackParamList, "OrderVoucherScreen">
type ReceiptProps = NativeStackScreenProps<OrdersStackParamList, "DigitalReceiptScreen">
type FlowProofProps = NativeStackScreenProps<OrdersStackParamList, "FlowProofScreen">
type RefundProps = NativeStackScreenProps<OrdersStackParamList, "RefundDetailScreen">
type BillDetailScreenBaseProps =
  (SplitProps | ReimburseProps) & {
    titleKey: string
    introKey: string
  }

type FlowProofPreset = "last7d" | "last30d" | "sinceCreated"

export function SplitDetailScreen(props: SplitProps) {
  return <BillDetailScreenBase {...props} titleKey="orders.split.title" introKey="orders.split.intro" />
}

export function ReimburseScreen(props: ReimburseProps) {
  return <BillDetailScreenBase {...props} titleKey="orders.reimburse.title" introKey="orders.reimburse.intro" />
}

function BillDetailScreenBase(props: BillDetailScreenBaseProps) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const [detail, setDetail] = useState<BillDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    void (async () => {
      try {
        const response = await getBillDetail({
          orderSn: props.route.params.orderSn,
        })

        if (active) {
          setDetail(response)
        }
      } catch {
        if (active) {
          Alert.alert(t("common.errorTitle"), t("orders.split.loadFailed"))
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
  }, [props.route.params.orderSn, t])

  return (
    <HomeScaffold canGoBack onBack={props.navigation.goBack} title={t(props.titleKey)}>
      {loading ? (
        <LoadingCard body={t("orders.split.loading")} />
      ) : null}

      {!loading && !detail ? <PageEmpty title={t("orders.split.emptyTitle")} body={t("orders.split.emptyBody")} /> : null}

      {detail ? (
        <>
          <StatusHero
            title={t(props.titleKey)}
            amount={`${formatTokenAmount(detail.recvActualAmount || detail.recvAmount)} ${detail.recvCoinName || detail.sendCoinName}`.trim()}
            subtitle={t(props.introKey)}
          />

          <SectionCard>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t("orders.split.summaryTitle")}</Text>
            <Text style={[styles.body, { color: theme.colors.mutedText }]}>{t(props.introKey)}</Text>
            <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
              {t("orders.split.feeSummary", { fee: formatTokenAmount(detail.feeAmount) })}
            </Text>
          </SectionCard>

          <SectionCard>
            <FieldTextRow label={t("orders.detail.type")} value={resolveOrderTypeLabel(t, detail.orderType)} />
            <FieldTextRow label={t("orders.split.createdAt")} value={formatDateTime(detail.createdAt)} />
            <FieldTextRow label={t("orders.detail.paymentAddress")} value={formatAddressLabel(detail.paymentAddress)} />
            <FieldTextRow label={t("orders.detail.receiveAddress")} value={formatAddressLabel(detail.receiveAddress)} />
            <FieldTextRow label={t("orders.detail.depositAddress")} value={formatAddressLabel(detail.depositAddress)} />
            <FieldTextRow label={t("orders.split.note")} value={detail.note || t("orders.detail.noNotes")} />
          </SectionCard>
        </>
      ) : null}
    </HomeScaffold>
  )
}

export function OrderVoucherScreen({ navigation, route }: VoucherProps) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const { showToast } = useToast()
  const [voucher, setVoucher] = useState<TransferVoucherDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [qrCodeUrl, setQrCodeUrl] = useState("")

  useEffect(() => {
    let active = true

    void (async () => {
      try {
        const response = await getTransferVoucher(route.params.orderSn)
        if (active) {
          setVoucher(response)
        }
      } catch {
        if (active) {
          Alert.alert(t("common.errorTitle"), t("orders.voucher.loadFailed"))
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
  }, [route.params.orderSn, t])

  useEffect(() => {
    if (!voucher?.orderReceiptUrl) {
      setQrCodeUrl("")
      return
    }

    let active = true
    void QRCode.toDataURL(voucher.orderReceiptUrl, { margin: 1 }).then(dataUrl => {
      if (active) {
        setQrCodeUrl(dataUrl)
      }
    }).catch(() => {
      if (active) {
        setQrCodeUrl("")
      }
    })

    return () => {
      active = false
    }
  }, [voucher?.orderReceiptUrl])

  const handleShare = async () => {
    if (!voucher) {
      return
    }

    const url = resolveVoucherExternalUrl(voucher)
    if (!url) {
      showToast({ message: t("orders.voucher.linkUnavailable"), tone: "warning" })
      return
    }

    const result = await shareAdapter.share({
      title: t("orders.voucher.title"),
      message: t("orders.voucher.shareMessage"),
      url,
    })

    if (!result.ok) {
      Alert.alert(t("common.errorTitle"), t("orders.voucher.shareFailed"))
    }
  }

  const handleSave = async () => {
    if (!qrCodeUrl) {
      showToast({ message: t("orders.voucher.imageUnavailable"), tone: "warning" })
      return
    }

    const base64 = qrCodeUrl.replace(/^data:image\/png;base64,/, "")
    const result = await fileAdapter.saveImage({
      filename: `voucher_${route.params.orderSn}.png`,
      base64,
    })

    if (!result.ok) {
      Alert.alert(t("common.errorTitle"), t("orders.voucher.saveFailed"))
      return
    }

    showToast({ message: t("orders.voucher.saveSuccess"), tone: "success" })
  }

  const handleOpen = async () => {
    if (!voucher) {
      return
    }

    const url = resolveVoucherExternalUrl(voucher)
    if (!url) {
      showToast({ message: t("orders.voucher.linkUnavailable"), tone: "warning" })
      return
    }

    try {
      await openExternalUrl(url)
    } catch {
      Alert.alert(t("common.errorTitle"), t("orders.voucher.openFailed"))
    }
  }

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("orders.voucher.title")}>
      {loading ? <LoadingCard body={t("orders.voucher.loading")} /> : null}

      {!loading && !voucher ? <PageEmpty title={t("orders.voucher.emptyTitle")} body={t("orders.voucher.emptyBody")} /> : null}

      {voucher ? (
        <>
          <StatusHero
            title={t("orders.voucher.heroTitle")}
            amount={`${formatTokenAmount(voucher.sendAmount)} ${voucher.sendCoinName}`.trim()}
            subtitle={t("orders.voucher.heroBody")}
          />

          {qrCodeUrl ? (
            <SectionCard>
              <Image source={{ uri: qrCodeUrl }} style={styles.qrCode} />
            </SectionCard>
          ) : null}

          <SectionCard>
            <FieldTextRow label={t("orders.detail.type")} value={resolveOrderTypeLabel(t, voucher.orderType)} />
            <FieldTextRow label={t("orders.voucher.receiptLink")} value={voucher.orderReceiptUrl || t("orders.voucher.linkUnavailable")} />
            <FieldTextRow label={t("orders.voucher.txLink")} value={voucher.txBrowserUrl || t("orders.voucher.linkUnavailable")} />
            <FieldTextRow label={t("orders.voucher.paymentAddress")} value={formatAddressLabel(voucher.paymentAddress)} />
            <FieldTextRow label={t("orders.voucher.transferAddress")} value={formatAddressLabel(voucher.transferAddress)} />
          </SectionCard>

          <SectionCard>
            <ActionRow label={t("orders.voucher.share")} onPress={() => void handleShare()} />
            <ActionRow label={t("orders.voucher.saveImage")} onPress={() => void handleSave()} />
            <ActionRow label={t("orders.voucher.openLink")} onPress={() => void handleOpen()} />
          </SectionCard>
        </>
      ) : null}
    </HomeScaffold>
  )
}

export function DigitalReceiptScreen({ navigation, route }: ReceiptProps) {
  const { t } = useTranslation()
  const { showToast } = useToast()
  const profile = useUserStore(state => state.profile)
  const [detail, setDetail] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [email, setEmail] = useState(profile?.email ?? "")
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    let active = true

    void (async () => {
      try {
        const response = await getOrderDetail(route.params.orderSn)
        if (!active) {
          return
        }

        setDetail(response)
        setEmail(profile?.email || response.buyerEmail || "")
      } catch {
        if (active) {
          Alert.alert(t("common.errorTitle"), t("orders.receipt.loadFailed"))
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
  }, [profile?.email, route.params.orderSn, t])

  const handleSubmit = async () => {
    if (!email.trim()) {
      showToast({ message: t("orders.receipt.emailRequired"), tone: "warning" })
      return
    }

    try {
      setSubmitting(true)
      await sendDigitalReceiptEmail({
        orderSn: route.params.orderSn,
        email: email.trim(),
      })
      setSuccess(true)
      showToast({ message: t("orders.receipt.success", { email: email.trim() }), tone: "success" })
    } catch {
      Alert.alert(t("common.errorTitle"), t("orders.receipt.failed"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("orders.receipt.title")}>
      {loading ? <LoadingCard body={t("orders.receipt.loading")} /> : null}

      {!loading && !detail ? <PageEmpty title={t("orders.receipt.emptyTitle")} body={t("orders.receipt.emptyBody")} /> : null}

      {detail ? (
        <>
          <StatusHero
            title={t("orders.receipt.heroTitle")}
            amount={`${formatTokenAmount(detail.recvActualAmount || detail.recvAmount)} ${detail.recvCoinName}`.trim()}
            subtitle={t("orders.receipt.heroBody")}
          />

          <SectionCard>
            <LabeledInput
              label={t("orders.receipt.emailLabel")}
              value={email}
              placeholder={t("orders.receipt.emailPlaceholder")}
              keyboardType="email-address"
              onChangeText={setEmail}
            />
          </SectionCard>

          {success ? <SuccessStateCard title={t("orders.receipt.successTitle")} body={t("orders.receipt.successBody", { email: email.trim() })} /> : null}

          <PrimaryButton
            label={submitting ? t("common.loading") : t("orders.receipt.submit")}
            onPress={() => void handleSubmit()}
            disabled={submitting}
          />
        </>
      ) : null}
    </HomeScaffold>
  )
}

export function FlowProofScreen({ navigation, route }: FlowProofProps) {
  const { t } = useTranslation()
  const { showToast } = useToast()
  const profile = useUserStore(state => state.profile)
  const [detail, setDetail] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [email, setEmail] = useState(profile?.email ?? "")
  const [address, setAddress] = useState("")
  const [preset, setPreset] = useState<FlowProofPreset>("last7d")
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    let active = true

    void (async () => {
      try {
        const response = await getOrderDetail(route.params.orderSn)
        if (!active) {
          return
        }

        setDetail(response)
        setEmail(profile?.email || response.buyerEmail || "")
        setAddress(resolveDetailCounterparty(response))
      } catch {
        if (active) {
          Alert.alert(t("common.errorTitle"), t("orders.flowProof.loadFailed"))
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
  }, [profile?.email, route.params.orderSn, t])

  const rangeSelection = useMemo(
    () => (detail ? buildFlowProofRange(detail, preset) : null),
    [detail, preset],
  )

  const handleSubmit = async () => {
    if (!email.trim()) {
      showToast({ message: t("orders.flowProof.emailRequired"), tone: "warning" })
      return
    }

    if (!address.trim() || !rangeSelection) {
      showToast({ message: t("orders.flowProof.addressRequired"), tone: "warning" })
      return
    }

    try {
      setSubmitting(true)
      await sendFlowProofEmail({
        email: email.trim(),
        address: address.trim(),
        startedAt: rangeSelection.startedAt,
        endedAt: rangeSelection.endedAt,
      })
      setSuccess(true)
      showToast({ message: t("orders.flowProof.success", { email: email.trim() }), tone: "success" })
    } catch {
      Alert.alert(t("common.errorTitle"), t("orders.flowProof.failed"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("orders.flowProof.title")}>
      {loading ? <LoadingCard body={t("orders.flowProof.loading")} /> : null}

      {!loading && !detail ? <PageEmpty title={t("orders.flowProof.emptyTitle")} body={t("orders.flowProof.emptyBody")} /> : null}

      {detail ? (
        <>
          <SectionCard>
            <Text style={styles.rangeTitle}>{t("orders.flowProof.rangeTitle")}</Text>
            <View style={styles.filterWrap}>
              {(["last7d", "last30d", "sinceCreated"] as FlowProofPreset[]).map(option => (
                <Pressable
                  key={option}
                  onPress={() => setPreset(option)}
                  style={[styles.rangeChip, preset === option ? styles.rangeChipActive : null]}
                >
                  <Text style={[styles.rangeChipText, preset === option ? styles.rangeChipTextActive : null]}>
                    {t(`orders.flowProof.presets.${option}`)}
                  </Text>
                </Pressable>
              ))}
            </View>
            {rangeSelection ? (
              <Text style={styles.rangeSummary}>
                {t("orders.flowProof.rangeSummary", {
                  startedAt: rangeSelection.startedAt.slice(0, 10),
                  endedAt: rangeSelection.endedAt.slice(0, 10),
                })}
              </Text>
            ) : null}
          </SectionCard>

          <SectionCard>
            <LabeledInput
              label={t("orders.flowProof.emailLabel")}
              value={email}
              placeholder={t("orders.flowProof.emailPlaceholder")}
              keyboardType="email-address"
              onChangeText={setEmail}
            />
            <LabeledInput
              label={t("orders.flowProof.addressLabel")}
              value={address}
              placeholder={t("orders.flowProof.addressPlaceholder")}
              onChangeText={setAddress}
            />
          </SectionCard>

          {success ? <SuccessStateCard title={t("orders.flowProof.successTitle")} body={t("orders.flowProof.successBody", { email: email.trim() })} /> : null}

          <PrimaryButton
            label={submitting ? t("common.loading") : t("orders.flowProof.submit")}
            onPress={() => void handleSubmit()}
            disabled={submitting}
          />
        </>
      ) : null}
    </HomeScaffold>
  )
}

export function RefundDetailScreen({ navigation, route }: RefundProps) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const { showToast } = useToast()
  const [detail, setDetail] = useState<RefundDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    void (async () => {
      try {
        const response = await getRefundDetail(route.params.orderSn)
        if (active) {
          setDetail(response)
        }
      } catch {
        if (active) {
          Alert.alert(t("common.errorTitle"), t("orders.refund.loadFailed"))
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
  }, [route.params.orderSn, t])

  const handleOpen = async () => {
    if (!detail?.refundTxidUrl) {
      showToast({ message: t("orders.refund.linkUnavailable"), tone: "warning" })
      return
    }

    try {
      await openExternalUrl(detail.refundTxidUrl)
    } catch {
      Alert.alert(t("common.errorTitle"), t("orders.refund.openFailed"))
    }
  }

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("orders.refund.title")}>
      {loading ? <LoadingCard body={t("orders.refund.loading")} /> : null}

      {!loading && !detail ? <PageEmpty title={t("orders.refund.emptyTitle")} body={t("orders.refund.emptyBody")} /> : null}

      {detail ? (
        <>
          <StatusHero
            title={t("orders.refund.heroTitle")}
            amount={`${formatTokenAmount(detail.amount)} ${detail.refundCoinName}`.trim()}
            subtitle={t("orders.refund.heroBody")}
          />

          <SectionCard>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t("orders.refund.summaryTitle")}</Text>
            <FieldTextRow label={t("orders.refund.address")} value={formatAddressLabel(detail.refundAddress)} />
            <FieldTextRow label={t("orders.refund.chain")} value={detail.refundChainName || "--"} />
            <FieldTextRow label={t("orders.refund.time")} value={formatDateTime(detail.refundAt)} />
            <FieldTextRow label={t("orders.refund.txid")} value={detail.refundTxid || "--"} />
          </SectionCard>

          <SecondaryButton label={t("orders.refund.openLink")} onPress={() => void handleOpen()} />
        </>
      ) : null}
    </HomeScaffold>
  )
}

function LoadingCard(props: { body: string }) {
  const theme = useAppTheme()

  return (
    <SectionCard>
      <View style={styles.loadingWrap}>
        <ActivityIndicator color={theme.colors.primary} />
        <Text style={[styles.body, { color: theme.colors.mutedText }]}>{props.body}</Text>
      </View>
    </SectionCard>
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
  summaryValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  body: {
    fontSize: 13,
    lineHeight: 20,
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
  qrCode: {
    width: 220,
    height: 220,
    alignSelf: "center",
  },
  rangeTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  filterWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  rangeChip: {
    minHeight: 34,
    borderRadius: 999,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E5E7EB",
  },
  rangeChipActive: {
    backgroundColor: "#DCFCE7",
  },
  rangeChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  rangeChipTextActive: {
    color: "#047857",
  },
  rangeSummary: {
    fontSize: 12,
    color: "#6B7280",
  },
})
