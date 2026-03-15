import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"

import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { useTranslation } from "react-i18next"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { HomeScaffold } from "@/features/home/components/HomeScaffold"
import { checkTransferNetwork, getOrderDetail, getReceivingOrder, submitShipOrder } from "@/plugins/transfer/services/transferApi"
import { isCancelledAction } from "@/plugins/transfer/utils/order"
import { NativeCapabilityUnavailableError } from "@/shared/errors"
import { walletAdapter } from "@/shared/native/walletAdapter"
import { useWalletStore } from "@/shared/store/useWalletStore"
import { useToast } from "@/shared/toast/useToast"
import { useAppTheme } from "@/shared/theme/useAppTheme"
import { FieldRow, PageEmpty, PrimaryButton, SecondaryButton, SectionCard } from "@/shared/ui/AppFlowUi"

export type TransferConfirmVariant = "default" | "normal"

export type TransferConfirmSuccess = {
  orderSn: string
  walletId?: string
}

type SharedProps = {
  onClose: () => void
  onCompleted: (result: TransferConfirmSuccess) => void
  orderSn: string
  variant: TransferConfirmVariant
}

type ModalProps = SharedProps & {
  visible: boolean
}

type OrderDetail = Awaited<ReturnType<typeof getReceivingOrder>>

function useTransferConfirmController({ onCompleted, orderSn, variant }: Omit<SharedProps, "onClose">) {
  const { t } = useTranslation()
  const { showToast } = useToast()
  const walletCapability = walletAdapter.getCapability()
  const submitUnavailableMessage = walletCapability.supported ? "" : t("auth.errors.walletUnavailable")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [detail, setDetail] = useState<OrderDetail | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const MAX_RETRIES = 10
    const BASE_DELAY_MS = 1500

    void (async () => {
      setLoading(true)
      setDetail(null)

      for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
        if (cancelled) {
          return
        }

        try {
          const order = await getReceivingOrder(orderSn).catch(() => getOrderDetail(orderSn))

          if (!cancelled) {
            setDetail(order)
            setLoading(false)
          }
          return
        } catch {
          if (cancelled) {
            return
          }

          if (attempt < MAX_RETRIES - 1) {
            const delay = BASE_DELAY_MS * Math.pow(1.3, attempt)
            await new Promise(resolve => setTimeout(resolve, delay))
          }
        }
      }

      if (!cancelled) {
        setLoading(false)
        Alert.alert(t("common.errorTitle"), t("transfer.confirm.loadFailed"))
      }
    })()

    return () => {
      cancelled = true
    }
  }, [orderSn, t])

  const handleSubmit = useCallback(async () => {
    if (!detail) {
      return
    }

    if (!walletCapability.supported) {
      Alert.alert(t("common.infoTitle"), submitUnavailableMessage)
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
      const shipAddress = walletAddress || detail.paymentAddress || detail.transferAddress || ""

      await submitShipOrder({
        orderSn: detail.orderSn,
        txid,
        address: shipAddress,
        variant,
      })

      onCompleted({
        orderSn: detail.orderSn,
        walletId: detail.multisigWalletId ?? undefined,
      })
    } catch (error) {
      if (isCancelledAction(error)) {
        showToast({ message: t("transfer.confirm.userRejected"), tone: "warning" })
      } else if (error instanceof NativeCapabilityUnavailableError) {
        Alert.alert(t("common.infoTitle"), t("auth.errors.walletUnavailable"))
      } else {
        Alert.alert(t("common.errorTitle"), t("transfer.confirm.submitFailed"))
      }
    } finally {
      if (mountedRef.current) {
        setSubmitting(false)
      }
    }
  }, [detail, onCompleted, showToast, t, variant])

  return {
    detail,
    loading,
    submitUnavailableMessage,
    submitting,
    onSubmit: handleSubmit,
  }
}

function TransferConfirmBody(props: {
  detail: OrderDetail | null
  loading: boolean
  onClose: () => void
  onSubmit: () => void
  submitUnavailableMessage?: string
  submitting: boolean
  bottomInset?: number
}) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const receiveAddressLabel = useMemo(
    () => props.detail?.receiveAddress || props.detail?.depositAddress || "-",
    [props.detail],
  )

  if (props.loading && !props.detail) {
    return (
      <View style={styles.stateWrap}>
        <ActivityIndicator color={theme.colors.primary} />
        <Text style={[styles.stateTitle, { color: theme.colors.text }]}>{t("transfer.confirm.title")}</Text>
        <Text style={[styles.stateBody, { color: theme.colors.mutedText }]}>{t("common.loading")}</Text>
      </View>
    )
  }

  if (!props.loading && !props.detail) {
    return (
      <View style={styles.emptyWrap}>
        <PageEmpty body={t("transfer.confirm.emptyBody")} title={t("transfer.confirm.emptyTitle")} />
      </View>
    )
  }

  return (
    <ScrollView
      bounces={false}
      contentContainerStyle={[styles.content, props.bottomInset != null ? { paddingBottom: props.bottomInset } : null]}
      keyboardShouldPersistTaps="handled"
    >
      <SectionCard>
        <Text style={[styles.amountText, { color: theme.colors.text }]}>
          {props.detail ? `${props.detail.sendAmount} ${props.detail.sendCoinName || props.detail.sendCoinCode}` : t("common.loading")}
        </Text>
        <Text style={[styles.chainBadge, { color: theme.colors.mutedText }]}>{props.detail?.recvChainName || "-"}</Text>
      </SectionCard>

      <SectionCard>
        <FieldRow label={t("transfer.confirm.to")} value={receiveAddressLabel} />
        <FieldRow
          emphasized
          label={t("transfer.confirm.receive")}
          value={`${props.detail?.recvAmount ?? 0} ${props.detail?.recvCoinName || props.detail?.recvCoinCode || ""}`.trim()}
        />
        <FieldRow
          label={t("transfer.confirm.fee")}
          value={`${props.detail?.sendEstimateFeeAmount ?? 0} ${props.detail?.sendCoinName || props.detail?.sendCoinCode || ""}`.trim()}
        />
        <FieldRow
          label={t("transfer.confirm.paymentMethod")}
          value={props.detail?.multisigWalletId ? t("transfer.confirm.copouch") : t("transfer.confirm.balance")}
        />
        {props.detail?.note ? <FieldRow label={t("transfer.confirm.note")} value={props.detail.note} /> : null}
      </SectionCard>

      <SectionCard>
        <Text style={[styles.tipTitle, { color: theme.colors.text }]}>{t("transfer.confirm.tipTitle")}</Text>
        <Text style={[styles.tipBody, { color: theme.colors.mutedText }]}>{t("transfer.confirm.tipBody")}</Text>
      </SectionCard>

      {props.submitUnavailableMessage ? (
        <SectionCard>
          <Text style={[styles.capabilityWarning, { color: theme.colors.warning }]}>
            {props.submitUnavailableMessage}
          </Text>
        </SectionCard>
      ) : null}

      <View style={styles.actions}>
        <SecondaryButton disabled={props.submitting} label={t("common.cancel")} onPress={props.onClose} />
        <PrimaryButton
          disabled={props.submitting || props.loading || !props.detail || Boolean(props.submitUnavailableMessage)}
          label={props.submitting ? t("common.loading") : t("transfer.confirm.submit")}
          onPress={props.onSubmit}
        />
      </View>
    </ScrollView>
  )
}

export function TransferConfirmScreenView(props: SharedProps) {
  const { t } = useTranslation()
  const controller = useTransferConfirmController({
    onCompleted: props.onCompleted,
    orderSn: props.orderSn,
    variant: props.variant,
  })

  return (
    <HomeScaffold canGoBack onBack={props.onClose} scroll={false} title={t("transfer.confirm.title")}>
      <TransferConfirmBody
        detail={controller.detail}
        loading={controller.loading}
        onClose={props.onClose}
        onSubmit={() => void controller.onSubmit()}
        submitUnavailableMessage={controller.submitUnavailableMessage}
        submitting={controller.submitting}
        bottomInset={24}
      />
    </HomeScaffold>
  )
}

export function TransferConfirmModal(props: ModalProps) {
  const theme = useAppTheme()
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()
  const controller = useTransferConfirmController({
    onCompleted: props.onCompleted,
    orderSn: props.orderSn,
    variant: props.variant,
  })
  const sheetOpacity = useRef(new Animated.Value(0)).current
  const sheetTranslateY = useRef(new Animated.Value(28)).current

  useEffect(() => {
    if (!props.visible) {
      return
    }

    sheetOpacity.setValue(0)
    sheetTranslateY.setValue(28)

    const animation = Animated.parallel([
      Animated.timing(sheetOpacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ])

    animation.start()

    return () => {
      animation.stop()
    }
  }, [props.visible, sheetOpacity, sheetTranslateY])

  if (!props.visible) {
    return null
  }

  const dismiss = () => {
    if (!controller.submitting) {
      props.onClose()
    }
  }

  return (
    <View style={styles.modalRoot}>
      <Animated.View style={[styles.modalBackdrop, { opacity: sheetOpacity }]}>
        <Pressable disabled={controller.submitting} onPress={dismiss} style={StyleSheet.absoluteFillObject} />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheetSurface,
          {
            backgroundColor: theme.colors.background,
            borderColor: theme.colors.border,
            top: Math.max(insets.top + 12, 28),
            paddingBottom: Math.max(insets.bottom + 8, 16),
            transform: [{ translateY: sheetTranslateY }],
          },
        ]}
      >
        <View
          style={[
            styles.sheetHeader,
            {
              backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface,
              borderBottomColor: theme.colors.border,
            },
          ]}
        >
          <View style={styles.sheetHeaderSide}>
            <Pressable
              accessibilityShowsLargeContentViewer={false}
              disabled={controller.submitting}
              hitSlop={8}
              onPress={dismiss}
              style={styles.backButton}
            >
              <Text style={[styles.backChevron, { color: theme.colors.primary }]}>‹</Text>
              <Text style={[styles.backText, { color: theme.colors.primary }]}>{t("common.back")}</Text>
            </Pressable>
          </View>
          <Text numberOfLines={1} style={[styles.sheetTitle, { color: theme.colors.text }]}>
            {t("transfer.confirm.title")}
          </Text>
          <View style={[styles.sheetHeaderSide, styles.sheetHeaderSideRight]}>
            <Pressable
              accessibilityShowsLargeContentViewer={false}
              disabled={controller.submitting}
              hitSlop={8}
              onPress={dismiss}
              style={[
                styles.closeButton,
                {
                  backgroundColor: theme.colors.surfaceMuted,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Text style={[styles.closeButtonText, { color: theme.colors.text }]}>{t("common.close")}</Text>
            </Pressable>
          </View>
        </View>

        <TransferConfirmBody
          bottomInset={Math.max(insets.bottom + 20, 28)}
          detail={controller.detail}
          loading={controller.loading}
          onClose={dismiss}
          onSubmit={() => void controller.onSubmit()}
          submitUnavailableMessage={controller.submitUnavailableMessage}
          submitting={controller.submitting}
        />
      </Animated.View>
    </View>
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
  capabilityWarning: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "600",
  },
  actions: {
    gap: 10,
  },
  stateWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 28,
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  stateBody: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
  emptyWrap: {
    padding: 16,
  },
  modalRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 30,
    elevation: 30,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,23,42,0.22)",
  },
  sheetSurface: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  sheetHeader: {
    minHeight: 68,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetHeaderSide: {
    minWidth: 72,
  },
  sheetHeaderSideRight: {
    alignItems: "flex-end",
  },
  sheetTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  backChevron: {
    fontSize: 22,
    lineHeight: 22,
    marginRight: 2,
  },
  backText: {
    fontSize: 17,
    fontWeight: "500",
  },
  closeButton: {
    minWidth: 74,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
})
