import React, { useCallback, useEffect, useMemo, useState } from "react"

import { ScrollView, StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { resetToAuthStack, resetToMainTabs, resetToSupportScreen } from "@/app/navigation/navigationRef"
import type { TransferStackParamList } from "@/app/navigation/types"
import { HomeScaffold } from "@/features/home/components/HomeScaffold"
import { formatDateTime } from "@/features/home/utils/format"
import { FieldRow, PrimaryButton, SecondaryButton, SectionCard } from "@/shared/ui/AppFlowUi"
import { getOrderDetail, getPublicTxStatusDetail } from "@/plugins/transfer/services/transferApi"
import { formatAmount, resolveCountdownStorageKey, resolveOrderProgress } from "@/plugins/transfer/utils/order"
import { getNumber, removeItem, setBoolean, setNumber } from "@/shared/storage/kvStorage"
import { KvStorageKeys } from "@/shared/storage/sessionKeys"
import { useAuthStore } from "@/shared/store/useAuthStore"
import { useAppTheme } from "@/shared/theme/useAppTheme"
import { AppStatusHero } from "@/shared/ui/AppStatusHero"

type Props = NativeStackScreenProps<TransferStackParamList, "TxPayStatusScreen">
type StatusDetail = Awaited<ReturnType<typeof getOrderDetail>> | Awaited<ReturnType<typeof getPublicTxStatusDetail>>

const DEFAULT_COUNTDOWN_MS = 15_000

export function TxPayStatusScreen({ navigation, route }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const authenticated = Boolean(useAuthStore(state => state.session?.accessToken))
  const params = route.params as Partial<TransferStackParamList["TxPayStatusScreen"]> | undefined
  const orderSn = params?.orderSn
  const publicAccess = Boolean(params?.publicAccess)
  const publicTxid = params?.publicTxid
  const publicBaseUrl = params?.publicBaseUrl
  const fallbackPath = publicAccess
    ? publicBaseUrl && publicTxid
      ? `${publicBaseUrl}/send/detail?txid=${publicTxid}`
      : publicTxid
        ? `app://share?txid=${publicTxid}`
        : "app://share"
    : orderSn
      ? `app://orders/${orderSn}/status`
      : "app://orders/status"
  const [detail, setDetail] = useState<StatusDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [countdownLeft, setCountdownLeft] = useState(0)

  const progress = useMemo(() => {
    return resolveOrderProgress({
      statusName: detail?.statusName ?? "",
      status: detail?.status ?? 0,
      txid: detail?.txid ?? "",
    })
  }, [detail?.status, detail?.statusName, detail?.txid])

  const refreshOrder = useCallback(async () => {
    if (publicAccess) {
      if (!publicTxid) {
        throw new Error("missingPublicTxid")
      }

      const order = await getPublicTxStatusDetail(publicTxid, publicBaseUrl)
      setDetail(order)
      return
    }

    if (!orderSn) {
      throw new Error("missingOrderSn")
    }

    const order = await getOrderDetail(orderSn)
    setDetail(order)
  }, [orderSn, publicAccess, publicBaseUrl, publicTxid])

  useEffect(() => {
    if ((publicAccess && !publicTxid) || (!publicAccess && !orderSn)) {
      resetToSupportScreen("NotFoundScreen", {
        path: fallbackPath,
      })
      return
    }

    let mounted = true
    const countdownKey = !publicAccess && orderSn ? resolveCountdownStorageKey(orderSn) : null
    let timer: ReturnType<typeof setInterval> | null = null
    let poller: ReturnType<typeof setInterval> | null = null

    void (async () => {
      setLoading(true)

      try {
        await refreshOrder()
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }

      const existing = countdownKey ? getNumber(countdownKey) : null
      const shouldStartCountdown = Boolean(!publicAccess && countdownKey && (params?.pay || (existing !== null && existing > Date.now())))

      if (shouldStartCountdown && countdownKey) {
        const endAt = existing && existing > Date.now() ? existing : Date.now() + DEFAULT_COUNTDOWN_MS
        setNumber(countdownKey, endAt)
        setCountdownLeft(Math.max(0, endAt - Date.now()))

        timer = setInterval(() => {
          const next = Math.max(0, endAt - Date.now())
          if (!mounted) {
            return
          }

          setCountdownLeft(next)

          if (next === 0) {
            removeItem(countdownKey)
          }
        }, 1000)
      }

      poller = setInterval(() => {
        void refreshOrder()
      }, 5000)
    })()

    return () => {
      mounted = false
      if (timer) {
        clearInterval(timer)
      }
      if (poller) {
        clearInterval(poller)
      }
    }
  }, [fallbackPath, orderSn, params?.pay, publicAccess, publicTxid, refreshOrder])

  const handleDone = () => {
    if (authenticated) {
      setBoolean(KvStorageKeys.HomePageNeedRefresh, true)
      resetToMainTabs()
      return
    }

    resetToAuthStack()
  }

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("transfer.status.title")} scroll={false}>
      <ScrollView bounces={false} contentContainerStyle={styles.content}>
        <AppStatusHero
          amount={detail ? `${progress === "success" ? "+" : "-"}${formatAmount(detail.sendAmount)} ${detail.sendCoinName || detail.sendCoinCode}` : "--"}
          subtitle={countdownLeft > 0 ? t("transfer.status.countdown", { sec: Math.ceil(countdownLeft / 1000) }) : detail?.statusName || ""}
          title={
            progress === "success"
              ? t("transfer.status.success")
              : progress === "closed"
                ? t("transfer.status.closed")
                : t("transfer.status.pending")
          }
        />

        <SectionCard>
          <FieldRow
            label={t("transfer.status.receiveAmount")}
            value={`${formatAmount(detail?.recvActualAmount || detail?.recvAmount || 0)} ${detail?.recvCoinName || detail?.recvCoinCode || ""}`.trim()}
          />
          <FieldRow
            label={t("transfer.status.paymentMethod")}
            value={detail?.multisigWalletId ? t("transfer.confirm.copouch") : t("transfer.confirm.balance")}
          />
          <FieldRow
            label={t("transfer.status.arrival")}
            value={
              detail?.sellerEstimateReceiveAt
                ? formatDateTime(detail.sellerEstimateReceiveAt)
                : detail?.recvChainName || "-"
            }
          />
          <FieldRow label={t("transfer.status.txid")} value={detail?.txid || publicTxid || "-"} />
          <FieldRow label={t("transfer.status.orderType")} value={detail?.orderType || "-"} />
        </SectionCard>

        <SectionCard>
          <Text style={[styles.tipTitle, { color: theme.colors.text }]}>{t("transfer.status.tipTitle")}</Text>
          <Text style={[styles.tipBody, { color: theme.colors.mutedText }]}>
            {loading ? t("common.loading") : t("transfer.status.tipBody")}
          </Text>
        </SectionCard>

        <View style={styles.actions}>
          <SecondaryButton label={t("transfer.status.refresh")} onPress={() => void refreshOrder()} disabled={loading} />
          <PrimaryButton label={t("transfer.status.done")} onPress={handleDone} disabled={loading} />
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
