import React, { useCallback, useEffect, useMemo, useState } from "react"

import { Alert, ScrollView, StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { FieldRow, PageEmpty, PrimaryButton, SecondaryButton, SectionCard } from "@/shared/ui/AppFlowUi"
import { checkTransferNetwork, getOrderDetail, getReceivingOrder, submitShipOrder } from "@/plugins/transfer/services/transferApi"
import { isCancelledAction } from "@/plugins/transfer/utils/order"
import { HomeScaffold } from "@/features/home/components/HomeScaffold"
import { walletAdapter } from "@/shared/native/walletAdapter"
import { useWalletStore } from "@/shared/store/useWalletStore"
import { useToast } from "@/shared/toast/useToast"
import { useAppTheme } from "@/shared/theme/useAppTheme"

import type { TransferStackParamList } from "@/app/navigation/types"

type Props = NativeStackScreenProps<
  TransferStackParamList,
  "TransferConfirmScreen" | "TransferConfirmNormalScreen"
>

export function TransferConfirmScreen({ navigation, route }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof getReceivingOrder>> | null>(null)

  const receiveAddressLabel = useMemo(() => detail?.receiveAddress || detail?.depositAddress || "-", [detail])

  useEffect(() => {
    let mounted = true

    const MAX_RETRIES = 10
    const BASE_DELAY_MS = 1500

    void (async () => {
      setLoading(true)

      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        if (!mounted) return

        try {
          const order = await getReceivingOrder(route.params.orderSn).catch(() => getOrderDetail(route.params.orderSn))

          if (mounted) {
            setDetail(order)
            setLoading(false)
          }
          return
        } catch {
          if (!mounted) return

          if (attempt < MAX_RETRIES - 1) {
            const delay = BASE_DELAY_MS * Math.pow(1.3, attempt)
            await new Promise(resolve => setTimeout(resolve, delay))
          }
        }
      }

      if (mounted) {
        setLoading(false)
        Alert.alert(t("common.errorTitle"), t("transfer.confirm.loadFailed"))
      }
    })()

    return () => {
      mounted = false
    }
  }, [route.params.orderSn, t])

  const handleSubmit = useCallback(async () => {
    if (!detail) {
      return
    }

    setSubmitting(true)

    try {
      const walletState = useWalletStore.getState()
      const walletAddress = walletState.address ?? ""

      const network = await checkTransferNetwork({
        chainName: detail.sendChainName,
        address: walletAddress || detail.depositAddress || detail.receiveAddress,
      })

      if (!network.matched) {
        Alert.alert(
          t("common.errorTitle"),
          t("transfer.confirm.networkMismatch", { chain: network.chainName || detail.sendChainName }),
        )
        return
      }

      const toAddress = detail.depositAddress || detail.receiveAddress
      const broadcastResult = await walletAdapter.signAndBroadcastTransfer({
        toAddress,
        amount: detail.sendAmount,
        coinPrecision: detail.sendCoinPrecision,
        contractAddress: detail.sendCoinContract,
        chainId: walletState.chainId,
      })

      if (!broadcastResult.ok) {
        throw broadcastResult.error
      }

      const txid = broadcastResult.data.txHash
      const isNormalRoute = route.name === "TransferConfirmNormalScreen"
      const shipAddress = walletAddress || detail.paymentAddress || detail.transferAddress || ""

      await submitShipOrder({
        orderSn: detail.orderSn,
        txid,
        address: shipAddress,
        variant: isNormalRoute ? "normal" : "default",
      })

      navigation.replace("TxPayStatusScreen", {
        orderSn: detail.orderSn,
        pay: true,
        walletId: detail.multisigWalletId ?? undefined,
      })
    } catch (error) {
      if (isCancelledAction(error)) {
        showToast({ message: t("transfer.confirm.userRejected"), tone: "warning" })
      } else {
        Alert.alert(t("common.errorTitle"), t("transfer.confirm.submitFailed"))
      }
    } finally {
      setSubmitting(false)
    }
  }, [detail, navigation, route.name, showToast, t])

  if (!loading && !detail) {
    return (
      <HomeScaffold canGoBack onBack={navigation.goBack} title={t("transfer.confirm.title")}>
        <PageEmpty body={t("transfer.confirm.emptyBody")} title={t("transfer.confirm.emptyTitle")} />
      </HomeScaffold>
    )
  }

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("transfer.confirm.title")} scroll={false}>
      <ScrollView bounces={false} contentContainerStyle={styles.content}>
        <SectionCard>
          <Text style={[styles.amountText, { color: theme.colors.text }]}>
            {detail ? `${detail.sendAmount} ${detail.sendCoinName || detail.sendCoinCode}` : t("common.loading")}
          </Text>
          <Text style={[styles.chainBadge, { color: theme.colors.mutedText }]}>{detail?.recvChainName || "-"}</Text>
        </SectionCard>

        <SectionCard>
          <FieldRow label={t("transfer.confirm.to")} value={receiveAddressLabel} />
          <FieldRow
            label={t("transfer.confirm.receive")}
            value={`${detail?.recvAmount ?? 0} ${detail?.recvCoinName || detail?.recvCoinCode || ""}`.trim()}
            emphasized
          />
          <FieldRow
            label={t("transfer.confirm.fee")}
            value={`${detail?.sendEstimateFeeAmount ?? 0} ${detail?.sendCoinName || detail?.sendCoinCode || ""}`.trim()}
          />
          <FieldRow
            label={t("transfer.confirm.paymentMethod")}
            value={detail?.multisigWalletId ? t("transfer.confirm.copouch") : t("transfer.confirm.balance")}
          />
          {detail?.note ? <FieldRow label={t("transfer.confirm.note")} value={detail.note} /> : null}
        </SectionCard>

        <SectionCard>
          <Text style={[styles.tipTitle, { color: theme.colors.text }]}>{t("transfer.confirm.tipTitle")}</Text>
          <Text style={[styles.tipBody, { color: theme.colors.mutedText }]}>{t("transfer.confirm.tipBody")}</Text>
        </SectionCard>

        <View style={styles.actions}>
          <SecondaryButton label={t("common.cancel")} onPress={navigation.goBack} disabled={submitting} />
          <PrimaryButton
            label={submitting ? t("common.loading") : t("transfer.confirm.submit")}
            onPress={() => void handleSubmit()}
            disabled={submitting || loading || !detail}
          />
        </View>
      </ScrollView>
    </HomeScaffold>
  )
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 12,
  },
  amountText: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
  },
  chainBadge: {
    fontSize: 12,
    textAlign: "center",
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  tipBody: {
    fontSize: 13,
    lineHeight: 20,
  },
  actions: {
    gap: 10,
    marginBottom: 24,
  },
})
