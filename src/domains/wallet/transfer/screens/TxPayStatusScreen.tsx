import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { ScrollView, StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { resetToAuthStack, resetToMainTabs, resetToSupportScreen } from "@/app/navigation/navigationRef"
import type { TransferStackParamList } from "@/app/navigation/types"
import { mapWalletTransferStatusFields } from "@/domains/wallet/shared/presentation/orderFields"
import { HomeScaffold } from "@/features/home/components/HomeScaffold"
import { readAuthSession } from "@/shared/api/auth-session"
import { FieldRow, PrimaryButton, SecondaryButton, SectionCard } from "@/shared/ui/AppFlowUi"
import { getOrderDetail, getPublicTxStatusDetail } from "@/domains/wallet/transfer/services/transferApi"
import { formatAmount, resolveCountdownStorageKey, resolveOrderProgress } from "@/domains/wallet/transfer/utils/order"
import { getNumber, removeItem, setBoolean, setNumber } from "@/shared/storage/kvStorage"
import { KvStorageKeys } from "@/shared/storage/sessionKeys"
import { useAuthStore } from "@/shared/store/useAuthStore"
import { useAppTheme } from "@/shared/theme/useAppTheme"
import { AppStatusHero } from "@/shared/ui/AppStatusHero"
import {
  resolveTxPayStatusCountdownEndAt,
  shouldDisableTxPayStatusRefresh,
  startTxPayStatusCountdown,
  startTxPayStatusPoller,
} from "@/domains/wallet/transfer/screens/txPayStatusTimers"

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
  const mountedRef = useRef(true)
  const refreshOrderRef = useRef<() => Promise<boolean>>(async () => false)
  const refreshContextKey = useMemo(
    () => (publicAccess ? `public:${publicBaseUrl ?? ""}:${publicTxid ?? ""}` : `private:${orderSn ?? ""}`),
    [orderSn, publicAccess, publicBaseUrl, publicTxid],
  )
  const refreshContextKeyRef = useRef(refreshContextKey)
  refreshContextKeyRef.current = refreshContextKey
  const fields = mapWalletTransferStatusFields(t, detail, { publicTxid })

  const progress = useMemo(() => {
    return resolveOrderProgress({
      statusName: detail?.statusName ?? "",
      status: detail?.status ?? 0,
      txid: detail?.txid ?? "",
    })
  }, [detail?.status, detail?.statusName, detail?.txid])

  const refreshOrder = useCallback(async () => {
    const contextKeyAtStart = refreshContextKeyRef.current

    if (publicAccess) {
      if (!publicTxid) {
        throw new Error("missingPublicTxid")
      }

      const order = await getPublicTxStatusDetail(publicTxid, publicBaseUrl)
      if (!mountedRef.current || contextKeyAtStart !== refreshContextKeyRef.current) {
        return false
      }

      setDetail(order)
      return true
    }

    if (!orderSn) {
      throw new Error("missingOrderSn")
    }

    const order = await getOrderDetail(orderSn)
    if (!mountedRef.current || contextKeyAtStart !== refreshContextKeyRef.current) {
      return false
    }

    setDetail(order)
    return true
  }, [orderSn, publicAccess, publicBaseUrl, publicTxid])

  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    refreshOrderRef.current = refreshOrder
  }, [refreshOrder])

  useEffect(() => {
    if ((publicAccess && !publicTxid) || (!publicAccess && !orderSn)) {
      resetToSupportScreen("NotFoundScreen", {
        path: fallbackPath,
      })
      return
    }

    const countdownKey = !publicAccess && orderSn ? resolveCountdownStorageKey(orderSn) : null
    let clearCountdown = () => {}
    let clearPoller = () => {}
    let cancelled = false

    void (async () => {
      setLoading(true)

      try {
        await refreshOrder()
      } finally {
        if (!cancelled && mountedRef.current) {
          setLoading(false)
        }
      }

      if (cancelled) {
        return
      }

      const existing = countdownKey ? getNumber(countdownKey) : null
      const countdownEndAt = resolveTxPayStatusCountdownEndAt({
        durationMs: DEFAULT_COUNTDOWN_MS,
        existingEndAt: existing,
        shouldStart: Boolean(!publicAccess && countdownKey && (params?.pay || (existing !== null && existing > Date.now()))),
      })

      if (countdownEndAt && countdownKey) {
        setNumber(countdownKey, countdownEndAt)
        clearCountdown = startTxPayStatusCountdown({
          endAt: countdownEndAt,
          onExpire: () => {
            removeItem(countdownKey)
          },
          onTick: next => {
            if (cancelled || !mountedRef.current) {
              return
            }

            setCountdownLeft(next)
          },
        })
      } else if (mountedRef.current) {
        setCountdownLeft(0)
      }

      clearPoller = startTxPayStatusPoller({
        getTask: () => () => {
          if (cancelled) {
            return
          }

          void refreshOrderRef.current()
        },
      })
    })()

    return () => {
      cancelled = true
      clearCountdown()
      clearPoller()
    }
  }, [fallbackPath, orderSn, params?.pay, publicAccess, publicTxid, refreshOrder])

  const handleDone = useCallback(async () => {
    let hasSession = authenticated

    if (!hasSession) {
      const persistedSession = await readAuthSession()
      hasSession = Boolean(persistedSession?.accessToken)

      if (persistedSession?.accessToken) {
        useAuthStore.getState().setSession(persistedSession)
      }
    }

    if (hasSession) {
      setBoolean(KvStorageKeys.HomePageNeedRefresh, true)
      resetToMainTabs()
      return
    }

    resetToAuthStack()
  }, [authenticated])

  const refreshDisabled = shouldDisableTxPayStatusRefresh({
    countdownLeft,
    loading,
  })

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
          <FieldRow label={fields.receiveAmount.label} value={fields.receiveAmount.value} />
          <FieldRow label={fields.paymentMethod.label} value={fields.paymentMethod.value} />
          <FieldRow label={fields.arrival.label} value={fields.arrival.value} />
          <FieldRow label={fields.txid.label} value={fields.txid.value} />
          <FieldRow label={fields.orderType.label} value={fields.orderType.value} />
        </SectionCard>

        <SectionCard>
          <Text style={[styles.tipTitle, { color: theme.colors.text }]}>{t("transfer.status.tipTitle")}</Text>
          <Text style={[styles.tipBody, { color: theme.colors.mutedText }]}>
            {loading ? t("common.loading") : t("transfer.status.tipBody")}
          </Text>
        </SectionCard>

        <View style={styles.actions}>
          <SecondaryButton label={t("transfer.status.refresh")} onPress={() => void refreshOrder()} disabled={refreshDisabled} />
          <PrimaryButton label={t("transfer.status.done")} onPress={() => void handleDone()} disabled={loading} />
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
