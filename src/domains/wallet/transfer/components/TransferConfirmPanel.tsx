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

import { formatWalletAddress } from "@/domains/wallet/shared/utils/format"
import { HomeScaffold } from "@/shared/ui/HomeScaffold"
import { checkTransferNetwork, getOrderDetail, getReceivingOrder, submitShipOrder } from "@/domains/wallet/transfer/services/transferApi"
import {
  resolveTransferConfirmPaymentOptions,
  type TransferConfirmPaymentOptionItem,
} from "@/domains/wallet/transfer/components/transferConfirmPaymentOptions"
import { createBridgeTransferOrder, createNormalTransferOrder } from "@/shared/exchange/services/orderCreationApi"
import { getTransferOrderOptions, getTransferQuote, type TransferOrderOption } from "@/shared/exchange/services/exchangeApi"
import {
  getTransferConfirmRetryDelay,
  isAbortLikeError,
  waitForTransferConfirmRetry,
} from "@/domains/wallet/transfer/components/transferConfirmRetry"
import { isCancelledAction } from "@/domains/wallet/transfer/utils/order"
import { formatAmount } from "@/shared/exchange/utils/order"
import { NativeCapabilityUnavailableError } from "@/shared/errors"
import { useErrorPresenter } from "@/shared/errors/useErrorPresenter"
import { walletAdapter } from "@/shared/native/walletAdapter"
import { useWalletBalanceQuery } from "@/shared/queries/balanceQueries"
import { useWalletStore } from "@/shared/store/useWalletStore"
import { useToast } from "@/shared/toast/useToast"
import { useAppTheme } from "@/shared/theme/useAppTheme"
import { PageEmpty, PrimaryButton, SectionCard } from "@/shared/ui/AppFlowUi"
import { NetworkLogo } from "@/shared/ui/NetworkLogo"

export type TransferConfirmVariant = "default" | "normal"

export type TransferConfirmSuccess = {
  orderSn: string
  walletId?: string
}

type TransferConfirmOrderUpdate = {
  orderSn: string
  recvCoinCode: string
  sendCoinCode: string
}

type SharedProps = {
  enabled?: boolean
  onClose: () => void
  onCompleted: (result: TransferConfirmSuccess) => void
  onOrderUpdated?: (payload: TransferConfirmOrderUpdate) => void
  orderSn: string
  variant: TransferConfirmVariant
}

type ModalProps = SharedProps & {
  visible: boolean
}

type OrderDetail = Awaited<ReturnType<typeof getReceivingOrder>>
const PAYMENT_ROW_ACTIVE_EASING = Easing.bezier(0.22, 1, 0.36, 1)
const PAYMENT_ROW_PRESS_EASING = Easing.out(Easing.cubic)

function dedupePaymentOptions(options: TransferOrderOption[]) {
  const seen = new Set<string>()

  return options.filter(option => {
    const key = option.sendCoinCode
    if (!key || seen.has(key)) {
      return false
    }

    seen.add(key)
    return true
  })
}

async function loadTransferConfirmOrder(orderSn: string, signal: AbortSignal) {
  try {
    return await getReceivingOrder(orderSn, signal)
  } catch (error) {
    if (isAbortLikeError(error) || signal.aborted) {
      throw error
    }

    return getOrderDetail(orderSn, signal)
  }
}

function useTransferConfirmController({ enabled = true, onCompleted, onOrderUpdated, orderSn, variant }: Omit<SharedProps, "onClose">) {
  const { t } = useTranslation()
  const { presentError } = useErrorPresenter()
  const { showToast } = useToast()
  const walletCapability = walletAdapter.getCapability()
  const submitUnavailableMessage = walletCapability.supported ? "" : t("auth.errors.walletUnavailable")
  const [activeOrderSn, setActiveOrderSn] = useState(orderSn)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [switchingPayment, setSwitchingPayment] = useState(false)
  const [detail, setDetail] = useState<OrderDetail | null>(null)
  const [paymentOptions, setPaymentOptions] = useState<TransferOrderOption[]>([])
  const [paymentOptionsLoading, setPaymentOptionsLoading] = useState(false)
  const [pendingPaymentCoinCode, setPendingPaymentCoinCode] = useState<string | null>(null)
  const [pendingOrderUpdate, setPendingOrderUpdate] = useState<TransferConfirmOrderUpdate | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    setActiveOrderSn(orderSn)
    setPendingPaymentCoinCode(null)
    setPendingOrderUpdate(null)
  }, [orderSn])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!enabled) {
      return
    }

    const MAX_RETRIES = 10
    const retryController = new AbortController()

    void (async () => {
      if (mountedRef.current) {
        setLoading(true)
      }

      for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
        if (retryController.signal.aborted) {
          return
        }

        try {
          const order = await loadTransferConfirmOrder(activeOrderSn, retryController.signal)

          if (!retryController.signal.aborted && mountedRef.current) {
            setDetail(order)
            setLoading(false)
          }
          return
        } catch (error) {
          if (isAbortLikeError(error) || retryController.signal.aborted) {
            return
          }

          if (attempt < MAX_RETRIES - 1) {
            try {
              await waitForTransferConfirmRetry(getTransferConfirmRetryDelay(attempt), retryController.signal)
            } catch (sleepError) {
              if (isAbortLikeError(sleepError) || retryController.signal.aborted) {
                return
              }

              throw sleepError
            }
          }
        }
      }

      if (!retryController.signal.aborted && mountedRef.current) {
        setLoading(false)
        Alert.alert(t("common.errorTitle"), t("transfer.confirm.loadFailed"))
      }
    })()

    return () => {
      retryController.abort()
    }
  }, [activeOrderSn, enabled, t])

  useEffect(() => {
    if (!enabled || !detail) {
      setPaymentOptions([])
      setPaymentOptionsLoading(false)
      return
    }

    let mounted = true
    const channelType = variant === "normal" ? "normal" : "bridge"

    void (async () => {
      setPaymentOptionsLoading(true)

      try {
        const result = await getTransferOrderOptions({
          sendChainName: detail.sendChainName,
          receiveChainName: detail.recvChainName || detail.sendChainName,
          channelType,
        })

        if (mounted) {
          setPaymentOptions(dedupePaymentOptions(result.options))
        }
      } catch {
        if (mounted) {
          setPaymentOptions([])
        }
      } finally {
        if (mounted) {
          setPaymentOptionsLoading(false)
        }
      }
    })()

    return () => {
      mounted = false
    }
  }, [detail, enabled, variant])

  useEffect(() => {
    if (!detail || !pendingOrderUpdate || detail.orderSn !== pendingOrderUpdate.orderSn) {
      return
    }

    setPendingPaymentCoinCode(null)
    onOrderUpdated?.(pendingOrderUpdate)
    setPendingOrderUpdate(null)
  }, [detail, onOrderUpdated, pendingOrderUpdate])

  useEffect(() => {
    if (!pendingPaymentCoinCode) {
      return
    }

    if (detail?.sendCoinCode === pendingPaymentCoinCode) {
      setPendingPaymentCoinCode(null)
      return
    }

    if (!loading && detail?.orderSn !== activeOrderSn) {
      setPendingPaymentCoinCode(null)
    }
  }, [activeOrderSn, detail?.orderSn, detail?.sendCoinCode, loading, pendingPaymentCoinCode])

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
        multisigWalletId: detail.multisigWalletId,
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
        presentError(error, {
          fallbackKey: "transfer.confirm.submitFailed",
        })
      }
    } finally {
      if (mountedRef.current) {
        setSubmitting(false)
      }
    }
  }, [detail, onCompleted, presentError, showToast, t, variant])

  const handleSelectPaymentOption = useCallback(
    async (option: TransferOrderOption) => {
      if (!detail || submitting || switchingPayment || option.sendCoinCode === detail.sendCoinCode) {
        return
      }

      setPendingPaymentCoinCode(option.sendCoinCode)
      setSwitchingPayment(true)

      try {
        const recvAddress = detail.receiveAddress || detail.depositAddress || ""
        const nextRecvCoinCode = option.recvCoinCode || detail.recvCoinCode
        const nextOrder =
          variant === "normal"
            ? await createNormalTransferOrder({
                coinCode: option.sendCoinCode,
                amount: detail.sendAmount || detail.recvAmount,
                recvAddress,
                note: detail.note,
                multisigWalletId: detail.multisigWalletId ?? undefined,
              })
            : await (async () => {
                const quote = await getTransferQuote({
                  sendCoinCode: option.sendCoinCode,
                  recvCoinCode: nextRecvCoinCode,
                  recvAmount: detail.recvAmount,
                })

                const quotedSellerId = quote.sellerId != null && quote.sellerId > 0 ? quote.sellerId : undefined
                const fallbackSellerId = option.sellerId ? Number(option.sellerId) : undefined

                return createBridgeTransferOrder({
                  sellerId: quotedSellerId ?? (fallbackSellerId && fallbackSellerId > 0 ? fallbackSellerId : undefined),
                  recvAddress,
                  recvCoinCode: nextRecvCoinCode,
                  sendCoinCode: option.sendCoinCode,
                  sendAmount: quote.sendAmount,
                  note: detail.note,
                  multisigWalletId: detail.multisigWalletId ?? undefined,
                })
              })()

        if (!mountedRef.current) {
          return
        }

        setPendingOrderUpdate({
          orderSn: nextOrder.orderSn,
          recvCoinCode: nextRecvCoinCode,
          sendCoinCode: option.sendCoinCode,
        })
        setActiveOrderSn(nextOrder.orderSn)
      } catch (error) {
        if (mountedRef.current) {
          setPendingPaymentCoinCode(null)
        }
        presentError(error, {
          fallbackKey: "transfer.confirm.switchPaymentFailed",
        })
      } finally {
        if (mountedRef.current) {
          setSwitchingPayment(false)
        }
      }
    },
    [detail, presentError, submitting, switchingPayment, variant],
  )

  return {
    detail,
    loading,
    onSelectPaymentOption: handleSelectPaymentOption,
    paymentOptions,
    paymentOptionsLoading,
    pendingPaymentCoinCode,
    submitUnavailableMessage,
    submitting,
    switchingPayment,
    onSubmit: handleSubmit,
  }
}

function TransferConfirmPaymentRow(props: {
  active: boolean
  disabled: boolean
  item: TransferConfirmPaymentOptionItem
  onSelectPaymentOption: (option: TransferOrderOption) => void
}) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const highlightProgress = useRef(new Animated.Value(props.active ? 1 : 0)).current
  const checkProgress = useRef(new Animated.Value(props.active ? 1 : 0)).current
  const pressProgress = useRef(new Animated.Value(0)).current
  const highlightScale = highlightProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.985, 1],
  })
  const pressScale = pressProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.985],
  })
  const checkScale = checkProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.78, 1],
  })
  const checkTranslateY = checkProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [3, 0],
  })

  useEffect(() => {
    const animation = Animated.parallel([
      Animated.timing(highlightProgress, {
        toValue: props.active ? 1 : 0,
        duration: props.active ? 260 : 180,
        easing: PAYMENT_ROW_ACTIVE_EASING,
        useNativeDriver: true,
      }),
      Animated.timing(checkProgress, {
        toValue: props.active ? 1 : 0,
        duration: props.active ? 280 : 160,
        easing: PAYMENT_ROW_ACTIVE_EASING,
        useNativeDriver: true,
      }),
    ])

    animation.start()

    return () => {
      animation.stop()
    }
  }, [checkProgress, highlightProgress, props.active])

  useEffect(() => {
    if (!props.disabled) {
      return
    }

    pressProgress.stopAnimation()
    pressProgress.setValue(0)
  }, [pressProgress, props.disabled])

  const handlePressIn = useCallback(() => {
    if (props.disabled) {
      return
    }

    Animated.timing(pressProgress, {
      toValue: 1,
      duration: 90,
      easing: PAYMENT_ROW_PRESS_EASING,
      useNativeDriver: true,
    }).start()
  }, [pressProgress, props.disabled])

  const handlePressOut = useCallback(() => {
    Animated.timing(pressProgress, {
      toValue: 0,
      duration: 180,
      easing: PAYMENT_ROW_PRESS_EASING,
      useNativeDriver: true,
    }).start()
  }, [pressProgress])

  const symbol = props.item.option.sendCoinSymbol || props.item.option.sendCoinCode
  const networkName = props.item.option.paymentNetworkName || props.item.option.sendChainFullName || props.item.option.sendChainName || symbol

  return (
    <Pressable
      disabled={props.disabled}
      onPress={() => void props.onSelectPaymentOption(props.item.option)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.paymentRow,
        props.item.unavailableReason != null ? { backgroundColor: theme.colors.surfaceMuted } : null,
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.paymentRowHighlight,
          {
            backgroundColor: theme.colors.primarySoft ?? `${theme.colors.primary}12`,
            opacity: highlightProgress,
            transform: [{ scale: highlightScale }],
          },
        ]}
      />
      <Animated.View style={[styles.paymentRowInner, { transform: [{ scale: pressScale }] }]}>
        <View style={styles.paymentRowIcon}>
          <NetworkLogo
            chainColor={props.item.option.paymentNetworkColor || props.item.option.sendChainColor || theme.colors.primary}
            chainName={networkName}
            logoUri={props.item.option.paymentNetworkLogo || props.item.option.sendChainLogo}
            size={42}
          />
        </View>
        <View style={styles.paymentRowContent}>
          <Text style={[styles.paymentRowTitle, { color: props.item.unavailableReason != null ? theme.colors.mutedText : theme.colors.text }]}>
            {networkName}
          </Text>
          <Text style={[styles.paymentRowSubtitle, { color: theme.colors.mutedText }]}>
            {`${t("transfer.order.available")}: ${formatAmount(props.item.availableBalance)} ${symbol}`.trim()}
          </Text>
          {props.item.unavailableReason === "balanceInsufficient" ? (
            <Text style={[styles.paymentRowReason, { color: theme.colors.danger }]}>
              {t("transfer.confirm.balanceInsufficientHint")}
            </Text>
          ) : null}
        </View>
        <View style={styles.paymentRowAccessory}>
          <Animated.View
            style={[
              styles.paymentRowCheckWrap,
              {
                opacity: checkProgress,
                transform: [{ scale: checkScale }, { translateY: checkTranslateY }],
              },
            ]}
          >
            <Text style={[styles.paymentRowCheck, { color: theme.colors.primary }]}>✓</Text>
          </Animated.View>
        </View>
      </Animated.View>
    </Pressable>
  )
}

function TransferConfirmBody(props: {
  detail: OrderDetail | null
  loading: boolean
  onClose: () => void
  onSelectPaymentOption: (option: TransferOrderOption) => void
  onSubmit: () => void
  paymentOptions: TransferOrderOption[]
  paymentOptionsLoading: boolean
  pendingPaymentCoinCode: string | null
  submitUnavailableMessage?: string
  submitting: boolean
  switchingPayment: boolean
  bottomInset?: number
}) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const chainId = useWalletStore(state => state.chainId)
  const walletAddress = useWalletStore(state => state.address)
  const balanceQuery = useWalletBalanceQuery({
    address: walletAddress,
    chainId,
  })
  const balances = balanceQuery.data?.balances ?? {}
  const paymentOptionGroups = useMemo(
    () =>
      resolveTransferConfirmPaymentOptions({
        paymentOptions: props.paymentOptions,
        detail: props.detail,
        balances,
        hasBalanceSnapshot: balanceQuery.data != null,
      }),
    [balanceQuery.data, balances, props.detail, props.paymentOptions],
  )
  const submitDisabled =
    props.submitting ||
    props.loading ||
    props.switchingPayment ||
    !props.detail ||
    Boolean(props.submitUnavailableMessage) ||
    paymentOptionGroups.selectedOptionUnavailable
  const footerInset = props.bottomInset ?? 16
  const receiveAddressLabel = useMemo(
    () => props.detail?.receiveAddress || props.detail?.depositAddress || "-",
    [props.detail],
  )
  const formattedRecipientLabel = useMemo(() => formatWalletAddress(receiveAddressLabel, 8, 4), [receiveAddressLabel])
  const selectedPaymentCoinCode = props.pendingPaymentCoinCode ?? props.detail?.sendCoinCode ?? ""
  const renderPaymentRow = useCallback(
    (item: TransferConfirmPaymentOptionItem, index: number, total: number) => {
      const disabled = props.loading || props.submitting || props.switchingPayment || item.unavailableReason != null

      return (
        <View
          key={`${item.option.sendCoinCode}-${item.option.recvCoinCode || "same-chain"}`}
          style={[
            styles.paymentRowContainer,
            total > 1 && index < total - 1 ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border } : null,
          ]}
        >
          <TransferConfirmPaymentRow
            active={item.option.sendCoinCode === selectedPaymentCoinCode && item.unavailableReason == null}
            disabled={disabled}
            item={item}
            onSelectPaymentOption={props.onSelectPaymentOption}
          />
        </View>
      )
    },
    [props.loading, props.onSelectPaymentOption, props.submitting, props.switchingPayment, selectedPaymentCoinCode, theme.colors.border],
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
    <View style={styles.bodyLayout}>
      <ScrollView
        bounces={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        style={styles.scrollBody}
      >
        <View style={[styles.summaryPanel, { backgroundColor: theme.isDark ? theme.colors.surfaceElevated : "#EEF5FF" }]}>
          <Text style={[styles.summaryRecipient, { color: theme.colors.text }]}>{t("transfer.confirm.sendTo", { address: formattedRecipientLabel })}</Text>
          <Text style={[styles.amountText, { color: theme.colors.text }]}>
            {props.detail ? `${props.detail.sendAmount} ${props.detail.sendCoinName || props.detail.sendCoinCode}` : t("common.loading")}
          </Text>
          <Text style={[styles.chainBadge, { color: theme.colors.mutedText }]}>{props.detail?.recvChainName || "-"}</Text>
        </View>

        {props.paymentOptions.length > 0 ? (
          <View style={styles.paymentSection}>
            <View style={styles.paymentHeader}>
              <Text style={[styles.paymentSectionLabel, { color: theme.colors.mutedText }]}>{t("transfer.confirm.paymentMethod")}</Text>
              {props.paymentOptionsLoading || props.switchingPayment ? (
                <View style={styles.paymentLoading}>
                  <ActivityIndicator color={theme.colors.primary} size="small" />
                  <Text style={[styles.paymentLoadingText, { color: theme.colors.mutedText }]}>{t("transfer.confirm.switchingPayment")}</Text>
                </View>
              ) : null}
            </View>

            {paymentOptionGroups.available.length > 0 ? (
              <SectionCard
                style={[
                  styles.paymentGroupCard,
                  {
                    backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface,
                  },
                ]}
              >
                {paymentOptionGroups.available.map((item, index) => renderPaymentRow(item, index, paymentOptionGroups.available.length))}
              </SectionCard>
            ) : null}

            {paymentOptionGroups.unavailable.length > 0 ? (
              <View style={styles.unavailableSection}>
                <Text style={[styles.paymentSectionLabel, { color: theme.colors.mutedText }]}>
                  {t("transfer.confirm.unavailablePaymentMethods")}
                </Text>
                <SectionCard
                  style={[
                    styles.paymentGroupCard,
                    {
                      backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface,
                    },
                  ]}
                >
                  {paymentOptionGroups.unavailable.map((item, index) =>
                    renderPaymentRow(item, index, paymentOptionGroups.unavailable.length),
                  )}
                </SectionCard>
              </View>
            ) : null}
          </View>
        ) : null}

        {props.submitUnavailableMessage ? (
          <SectionCard>
            <Text style={[styles.capabilityWarning, { color: theme.colors.warning }]}>
              {props.submitUnavailableMessage}
            </Text>
          </SectionCard>
        ) : null}
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.isDark ? theme.colors.background : "#EEF5FF",
            paddingBottom: footerInset,
          },
        ]}
      >
        <PrimaryButton
          disabled={submitDisabled}
          label={props.submitting || props.switchingPayment ? t("common.loading") : t("transfer.confirm.submit")}
          onPress={props.onSubmit}
        />
      </View>
    </View>
  )
}

export function TransferConfirmScreenView(props: SharedProps) {
  const { t } = useTranslation()
  const theme = useAppTheme()
  const controller = useTransferConfirmController({
    enabled: props.enabled,
    onCompleted: props.onCompleted,
    onOrderUpdated: props.onOrderUpdated,
    orderSn: props.orderSn,
    variant: props.variant,
  })

  return (
    <HomeScaffold
      canGoBack
      onBack={props.onClose}
      scroll={false}
      title={t("transfer.confirm.title")}
      backgroundColor={theme.isDark ? theme.colors.background : "#EEF5FF"}
      headerBackgroundColor={theme.isDark ? theme.colors.surfaceElevated : "#EEF5FF"}
    >
      <TransferConfirmBody
        detail={controller.detail}
        loading={controller.loading}
        onClose={props.onClose}
        onSelectPaymentOption={option => void controller.onSelectPaymentOption(option)}
        onSubmit={() => void controller.onSubmit()}
        paymentOptions={controller.paymentOptions}
        paymentOptionsLoading={controller.paymentOptionsLoading}
        pendingPaymentCoinCode={controller.pendingPaymentCoinCode}
        submitUnavailableMessage={controller.submitUnavailableMessage}
        submitting={controller.submitting}
        switchingPayment={controller.switchingPayment}
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
    enabled: props.visible,
    onCompleted: props.onCompleted,
    onOrderUpdated: props.onOrderUpdated,
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
    if (!controller.submitting && !controller.switchingPayment) {
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
            backgroundColor: theme.isDark ? theme.colors.background : "#EEF5FF",
            borderColor: theme.colors.border,
            top: Math.max(insets.top + 12, 28),
            transform: [{ translateY: sheetTranslateY }],
          },
        ]}
      >
        <View
          style={[
            styles.sheetHeader,
            {
              backgroundColor: theme.isDark ? theme.colors.surfaceElevated ?? theme.colors.surface : "#EEF5FF",
              borderBottomColor: "transparent",
            },
          ]}
        >
          <View style={styles.sheetHeaderSide}>
            <Pressable
              accessibilityShowsLargeContentViewer={false}
              disabled={controller.submitting || controller.switchingPayment}
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
              disabled={controller.submitting || controller.switchingPayment}
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
          onSelectPaymentOption={option => void controller.onSelectPaymentOption(option)}
          onSubmit={() => void controller.onSubmit()}
          paymentOptions={controller.paymentOptions}
          paymentOptionsLoading={controller.paymentOptionsLoading}
          pendingPaymentCoinCode={controller.pendingPaymentCoinCode}
          submitUnavailableMessage={controller.submitUnavailableMessage}
          submitting={controller.submitting}
          switchingPayment={controller.switchingPayment}
        />
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  bodyLayout: {
    flex: 1,
  },
  scrollBody: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 16,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  summaryPanel: {
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 6,
  },
  summaryRecipient: {
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
  },
  amountText: {
    fontSize: 44,
    fontWeight: "800",
    textAlign: "center",
  },
  chainBadge: {
    fontSize: 14,
    textAlign: "center",
  },
  paymentHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  paymentSection: {
    gap: 10,
  },
  unavailableSection: {
    gap: 10,
  },
  paymentSectionLabel: {
    fontSize: 15,
    fontWeight: "500",
    paddingHorizontal: 4,
  },
  paymentLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  paymentLoadingText: {
    fontSize: 12,
    fontWeight: "500",
  },
  paymentGroupCard: {
    borderRadius: 26,
    overflow: "hidden",
  },
  paymentRowContainer: {
    overflow: "hidden",
  },
  paymentRow: {
    minHeight: 84,
    paddingHorizontal: 18,
    paddingVertical: 16,
    position: "relative",
    overflow: "hidden",
  },
  paymentRowHighlight: {
    ...StyleSheet.absoluteFillObject,
  },
  paymentRowInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  paymentRowIcon: {
    alignItems: "center",
    justifyContent: "center",
  },
  paymentRowContent: {
    flex: 1,
    gap: 4,
  },
  paymentRowTitle: {
    fontSize: 18,
    fontWeight: "500",
  },
  paymentRowSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  paymentRowReason: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  paymentRowAccessory: {
    minWidth: 24,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  paymentRowCheckWrap: {
    minWidth: 24,
    alignItems: "center",
  },
  paymentRowCheck: {
    fontSize: 22,
    fontWeight: "700",
  },
  capabilityWarning: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "600",
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
