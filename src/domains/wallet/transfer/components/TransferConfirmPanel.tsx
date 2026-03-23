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
  useWindowDimensions,
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
import { broadcastTransferWithLocalWallet, readLocalWalletCapability } from "@/shared/native/localWalletVault"
import { useWalletBalanceQuery } from "@/shared/queries/balanceQueries"
import { useWalletStore } from "@/shared/store/useWalletStore"
import { useToast } from "@/shared/toast/useToast"
import { useAppTheme } from "@/shared/theme/useAppTheme"
import { PageEmpty, PrimaryButton, SectionCard } from "@/shared/ui/AppFlowUi"
import { NetworkLogo } from "@/shared/ui/NetworkLogo"
import { SFSymbolIcon } from "@/shared/ui/SFSymbolIcon"

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
  const walletCapability = readLocalWalletCapability()
  const submitUnavailableMessage = walletCapability.supported ? "" : t("auth.errors.walletUnavailable")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [quoteFetching, setQuoteFetching] = useState(false)
  const [detail, setDetail] = useState<OrderDetail | null>(null)
  const [paymentOptions, setPaymentOptions] = useState<TransferOrderOption[]>([])
  const [paymentOptionsLoading, setPaymentOptionsLoading] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<{
    option: TransferOrderOption
    quote: { sendAmount: string; sellerId?: number | null } | null
  } | null>(null)
  const [quoteTimestamp, setQuoteTimestamp] = useState<number | null>(null)
  const mountedRef = useRef(true)

  // Reset selection state whenever the source order changes
  useEffect(() => {
    setSelectedPayment(null)
    setQuoteTimestamp(null)
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
          const order = await loadTransferConfirmOrder(orderSn, retryController.signal)

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
  }, [enabled, orderSn, t])

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

      // If the user picked a different payment option, create the order now at submit time.
      // (Quote-only selection does not create orders; that only happens here.)
      let activeDetail = detail
      if (selectedPayment != null && selectedPayment.option.sendCoinCode !== detail.sendCoinCode) {
        const recvAddress = detail.receiveAddress || detail.depositAddress || ""
        const nextRecvCoinCode = selectedPayment.option.recvCoinCode || detail.recvCoinCode
        const newOrder =
          variant === "normal"
            ? await createNormalTransferOrder({
                coinCode: selectedPayment.option.sendCoinCode,
                amount: detail.sendAmount || detail.recvAmount,
                recvAddress,
                note: detail.note,
                multisigWalletId: detail.multisigWalletId ?? undefined,
              })
            : await createBridgeTransferOrder({
                sellerId:
                  selectedPayment.quote?.sellerId != null && selectedPayment.quote.sellerId > 0
                    ? selectedPayment.quote.sellerId
                    : selectedPayment.option.sellerId
                    ? Number(selectedPayment.option.sellerId)
                    : undefined,
                recvAddress,
                recvCoinCode: nextRecvCoinCode,
                sendCoinCode: selectedPayment.option.sendCoinCode,
                sendAmount: selectedPayment.quote?.sendAmount ?? "",
                note: detail.note,
                multisigWalletId: detail.multisigWalletId ?? undefined,
              })

        if (!mountedRef.current) {
          return
        }

        // Load the new order detail to obtain deposit address, coin precision, contract, etc.
        const newDetail = await loadTransferConfirmOrder(newOrder.orderSn, new AbortController().signal)
        if (!mountedRef.current) {
          return
        }
        activeDetail = newDetail
      }

      const network = await checkTransferNetwork({
        chainName: activeDetail.sendChainName,
        address: walletAddress || activeDetail.depositAddress || activeDetail.receiveAddress,
      })

      if (!network.matched) {
        Alert.alert(
          t("common.errorTitle"),
          t("transfer.confirm.networkMismatch", { chain: network.chainName || activeDetail.sendChainName }),
        )
        return
      }

      const toAddress = activeDetail.depositAddress || activeDetail.receiveAddress
      const broadcastResult = await broadcastTransferWithLocalWallet({
        toAddress,
        amount: activeDetail.sendAmount,
        coinPrecision: activeDetail.sendCoinPrecision,
        contractAddress: activeDetail.sendCoinContract,
        chainId: walletState.chainId,
      })
      const txid = broadcastResult.txHash
      const shipAddress = walletAddress || activeDetail.paymentAddress || activeDetail.transferAddress || ""

      await submitShipOrder({
        orderSn: activeDetail.orderSn,
        txid,
        address: shipAddress,
        variant,
        multisigWalletId: activeDetail.multisigWalletId,
      })

      onCompleted({
        orderSn: activeDetail.orderSn,
        walletId: activeDetail.multisigWalletId ?? undefined,
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
  }, [detail, onCompleted, presentError, selectedPayment, showToast, submitUnavailableMessage, t, variant, walletCapability])

  const handleSelectPaymentOption = useCallback(
    async (option: TransferOrderOption) => {
      if (!detail || submitting || quoteFetching || option.sendCoinCode === detail.sendCoinCode) {
        return
      }

      // Immediately reflect the selection; fetch quote for bridge transfers
      setSelectedPayment({ option, quote: null })
      setQuoteTimestamp(null)

      if (variant !== "bridge") {
        return
      }

      setQuoteFetching(true)
      try {
        const nextRecvCoinCode = option.recvCoinCode || detail.recvCoinCode
        const quote = await getTransferQuote({
          sendCoinCode: option.sendCoinCode,
          recvCoinCode: nextRecvCoinCode,
          recvAmount: detail.recvAmount,
        })

        if (!mountedRef.current) {
          return
        }

        setSelectedPayment({ option, quote })
        setQuoteTimestamp(Date.now())
      } catch (error) {
        if (mountedRef.current) {
          setSelectedPayment(null)
          presentError(error, {
            fallbackKey: "transfer.confirm.switchPaymentFailed",
          })
        }
      } finally {
        if (mountedRef.current) {
          setQuoteFetching(false)
        }
      }
    },
    [detail, presentError, quoteFetching, submitting, variant],
  )

  const handleQuoteExpired = useCallback(async () => {
    if (!selectedPayment?.option || !detail || !mountedRef.current) {
      return
    }

    setQuoteFetching(true)
    try {
      const nextRecvCoinCode = selectedPayment.option.recvCoinCode || detail.recvCoinCode
      const quote = await getTransferQuote({
        sendCoinCode: selectedPayment.option.sendCoinCode,
        recvCoinCode: nextRecvCoinCode,
        recvAmount: detail.recvAmount,
      })

      if (!mountedRef.current) {
        return
      }

      setSelectedPayment(prev => (prev ? { ...prev, quote } : null))
      setQuoteTimestamp(Date.now())
    } catch {
      // Silent background refresh — quote stays until next user action
    } finally {
      if (mountedRef.current) {
        setQuoteFetching(false)
      }
    }
  }, [detail, selectedPayment])

  return {
    detail,
    loading,
    onSelectPaymentOption: handleSelectPaymentOption,
    onQuoteExpired: handleQuoteExpired,
    paymentOptions,
    paymentOptionsLoading,
    quoteFetching,
    quoteTimestamp,
    selectedPayment,
    submitUnavailableMessage,
    submitting,
    onSubmit: handleSubmit,
  }
}

const QUOTE_TTL_MS = 5_000

function QuoteCountdownRow(props: { quoteTimestamp: number; onExpired: () => void }) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const progressAnim = useRef(new Animated.Value(1)).current
  const [secsLeft, setSecsLeft] = useState(Math.ceil(QUOTE_TTL_MS / 1000))

  useEffect(() => {
    const elapsed = Date.now() - props.quoteTimestamp
    const remaining = Math.max(0, QUOTE_TTL_MS - elapsed)
    const startProgress = remaining / QUOTE_TTL_MS

    progressAnim.setValue(startProgress)
    setSecsLeft(Math.ceil(remaining / 1000))

    if (remaining <= 0) {
      props.onExpired()
      return
    }

    const barAnim = Animated.timing(progressAnim, {
      toValue: 0,
      duration: remaining,
      easing: Easing.linear,
      useNativeDriver: false,
    })
    barAnim.start(({ finished }) => {
      if (finished) props.onExpired()
    })

    const endTime = props.quoteTimestamp + QUOTE_TTL_MS
    const ticker = setInterval(() => {
      setSecsLeft(Math.max(0, Math.ceil((endTime - Date.now()) / 1000)))
    }, 200)

    return () => {
      barAnim.stop()
      clearInterval(ticker)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.quoteTimestamp])

  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] })

  return (
    <View style={countdownStyles.root}>
      <View style={countdownStyles.row}>
        <SFSymbolIcon color={theme.colors.mutedText} fallbackName="refresh-cw" name="arrow.clockwise" size={11} weight="medium" />
        <Text style={[countdownStyles.label, { color: theme.colors.mutedText }]}>
          {secsLeft > 0
            ? t("transfer.confirm.quoteExpiresIn", { sec: secsLeft, defaultValue: `报价 ${secsLeft}s 后更新` })
            : t("transfer.confirm.quoteRefreshing", { defaultValue: "正在更新报价…" })}
        </Text>
      </View>
      <View style={[countdownStyles.track, { backgroundColor: theme.colors.border }]}>
        <Animated.View style={[countdownStyles.fill, { width: progressWidth, backgroundColor: theme.colors.primary }]} />
      </View>
    </View>
  )
}

const countdownStyles = StyleSheet.create({
  root: {
    gap: 6,
    paddingHorizontal: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
  },
  track: {
    height: 2,
    borderRadius: 1,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 1,
  },
})

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
  const activeBorderColor = theme.isDark ? "rgba(10,132,255,0.34)" : "rgba(10,132,255,0.22)"
  const rowBackgroundColor = props.item.unavailableReason != null ? theme.colors.surfaceMuted : theme.colors.surfaceElevated ?? theme.colors.surface
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
        {
          backgroundColor: rowBackgroundColor,
          borderColor: props.active ? activeBorderColor : theme.colors.border,
        },
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
            <SFSymbolIcon color={theme.colors.primary} fallbackName="check-circle" name="checkmark.circle.fill" size={20} />
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
  onQuoteExpired: () => void
  onSelectPaymentOption: (option: TransferOrderOption) => void
  onSubmit: () => void
  paymentOptions: TransferOrderOption[]
  paymentOptionsLoading: boolean
  quoteFetching: boolean
  quoteTimestamp: number | null
  selectedPayment: { option: TransferOrderOption; quote: { sendAmount: string; sellerId?: number | null } | null } | null
  submitUnavailableMessage?: string
  submitting: boolean
  bottomInset?: number
}) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const { fontScale } = useWindowDimensions()
  const chainId = useWalletStore(state => state.chainId)
  const walletAddress = useWalletStore(state => state.address)
  const balanceQuery = useWalletBalanceQuery({
    address: walletAddress,
    chainId,
  })
  const balances = balanceQuery.data?.balances ?? {}
  const pageBackgroundColor = theme.colors.backgroundMuted ?? theme.colors.background
  const cardBackgroundColor = theme.colors.surfaceElevated ?? theme.colors.surface
  const secondarySurfaceColor = theme.colors.surfaceMuted ?? theme.colors.background
  const cardBorderColor = theme.colors.border
  const dynamicTypeScale = clamp(fontScale, 1, 1.18)
  const summaryAmountFontSize = clamp(Math.round(35 * dynamicTypeScale), 36, 42)
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
    props.quoteFetching ||
    !props.detail ||
    Boolean(props.submitUnavailableMessage) ||
    paymentOptionGroups.selectedOptionUnavailable
  const footerInset = props.bottomInset ?? 16
  const receiveAddressLabel = useMemo(
    () => props.detail?.receiveAddress || props.detail?.depositAddress || "-",
    [props.detail],
  )
  const formattedRecipientLabel = useMemo(() => formatWalletAddress(receiveAddressLabel, 8, 4), [receiveAddressLabel])
  const selectedPaymentCoinCode = props.selectedPayment?.option.sendCoinCode ?? props.detail?.sendCoinCode ?? ""
  const summaryAmountLabel = useMemo(() => {
    if (!props.detail) {
      return t("common.loading")
    }

    if (props.selectedPayment?.quote) {
      const symbol = props.selectedPayment.option.sendCoinSymbol || props.selectedPayment.option.sendCoinCode
      return `${formatAmount(props.selectedPayment.quote.sendAmount)} ${symbol}`
    }

    return `${formatAmount(props.detail.sendAmount)} ${props.detail.sendCoinName || props.detail.sendCoinCode}`
  }, [props.detail, props.selectedPayment, t])
  const chainLabel = props.detail?.recvChainName || props.detail?.sendChainName || "-"
  const renderPaymentRow = useCallback(
    (item: TransferConfirmPaymentOptionItem) => {
      const disabled = props.loading || props.submitting || props.quoteFetching || item.unavailableReason != null

      return (
        <View
          key={`${item.option.sendCoinCode}-${item.option.recvCoinCode || "same-chain"}`}
          style={styles.paymentRowContainer}
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
    [props.loading, props.onSelectPaymentOption, props.submitting, props.quoteFetching, selectedPaymentCoinCode],
  )

  const [paymentExpanded, setPaymentExpanded] = useState(false)

  // Collapse back to single-row view whenever the underlying order changes (e.g. after a successful switch)
  useEffect(() => {
    setPaymentExpanded(false)
  }, [props.detail?.orderSn])

  const activePaymentItem = useMemo(
    () =>
      paymentOptionGroups.available.find(
        item => item.option.sendCoinCode === selectedPaymentCoinCode && item.unavailableReason == null,
      ) ??
      paymentOptionGroups.available[0] ??
      null,
    [paymentOptionGroups.available, selectedPaymentCoinCode],
  )
  const hasMultiplePaymentOptions =
    paymentOptionGroups.available.length + paymentOptionGroups.unavailable.length > 1

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
        contentContainerStyle={[styles.content, { paddingBottom: 20 }]}
        keyboardShouldPersistTaps="handled"
        style={styles.scrollBody}
      >
        <View
          style={[
            styles.summaryPanel,
            {
              backgroundColor: cardBackgroundColor,
              borderColor: cardBorderColor,
            },
          ]}
        >
          <Text style={[styles.summaryRecipient, { color: theme.colors.mutedText }]}>{t("transfer.confirm.sendTo", { address: formattedRecipientLabel })}</Text>
          <Text
            style={[
              styles.amountText,
              {
                color: theme.colors.text,
                fontSize: summaryAmountFontSize,
                lineHeight: summaryAmountFontSize + 4,
              },
            ]}
          >
            {summaryAmountLabel}
          </Text>
          <View style={styles.summaryMeta}>
            <View
              style={[
                styles.chainBadge,
                {
                  backgroundColor: secondarySurfaceColor,
                  borderColor: cardBorderColor,
                },
              ]}
            >
              <Text style={[styles.chainBadgeText, { color: theme.colors.mutedText }]}>{chainLabel}</Text>
            </View>
          </View>
        </View>

        {props.paymentOptions.length > 0 ? (
          <View style={styles.paymentSection}>
            <View style={styles.paymentHeader}>
              <Text style={[styles.paymentSectionLabel, { color: theme.colors.mutedText }]}>{t("transfer.confirm.paymentMethod")}</Text>
              {props.paymentOptionsLoading || props.quoteFetching ? (
                <View style={styles.paymentLoading}>
                  <ActivityIndicator color={theme.colors.primary} size="small" />
                  <Text style={[styles.paymentLoadingText, { color: theme.colors.mutedText }]}>{t("transfer.confirm.switchingPayment")}</Text>
                </View>
              ) : null}
            </View>

            {!paymentExpanded ? (
              <View style={styles.paymentGroup}>
                {activePaymentItem != null ? renderPaymentRow(activePaymentItem) : null}
              </View>
            ) : (
              <>
                {paymentOptionGroups.available.length > 0 ? (
                  <View style={styles.paymentGroup}>{paymentOptionGroups.available.map(item => renderPaymentRow(item))}</View>
                ) : null}
                {paymentOptionGroups.unavailable.length > 0 ? (
                  <View style={styles.unavailableSection}>
                    <Text style={[styles.paymentSectionLabel, { color: theme.colors.mutedText }]}>
                      {t("transfer.confirm.unavailablePaymentMethods")}
                    </Text>
                    <View style={[styles.paymentGroup, { opacity: 0.82 }]}>
                      {paymentOptionGroups.unavailable.map(item => renderPaymentRow(item))}
                    </View>
                  </View>
                ) : null}
              </>
            )}

            {hasMultiplePaymentOptions ? (
              <Pressable
                hitSlop={8}
                onPress={() => setPaymentExpanded(prev => !prev)}
                style={styles.paymentExpandToggle}
              >
                <SFSymbolIcon
                  color={theme.colors.mutedText}
                  fallbackName={paymentExpanded ? "chevron-up" : "chevron-down"}
                  name={paymentExpanded ? "chevron.up" : "chevron.down"}
                  size={14}
                  weight="semibold"
                />
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {props.submitUnavailableMessage ? (
          <SectionCard
            style={[
              styles.capabilityWarningCard,
              {
                backgroundColor: theme.colors.warningSoft,
                borderColor: theme.colors.warningBorder,
              },
            ]}
          >
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
            backgroundColor: pageBackgroundColor,
            borderTopColor: theme.colors.border,
            paddingBottom: footerInset,
          },
        ]}
      >
        <PrimaryButton
          disabled={submitDisabled}
          label={t("transfer.confirm.submit")}
          loading={props.submitting}
          onPress={props.onSubmit}
        />
        {props.quoteTimestamp != null && !props.quoteFetching && !props.submitting ? (
          <QuoteCountdownRow onExpired={props.onQuoteExpired} quoteTimestamp={props.quoteTimestamp} />
        ) : props.quoteFetching && !props.submitting ? (
          <View style={styles.quoteRefreshingRow}>
            <ActivityIndicator color={theme.colors.primary} size="small" />
            <Text style={[styles.quoteRefreshingLabel, { color: theme.colors.mutedText }]}>
              {t("transfer.confirm.quoteRefreshing", { defaultValue: "正在更新报价…" })}
            </Text>
          </View>
        ) : null}
        <Text style={[styles.footerCaption, { color: theme.colors.mutedText }]}>{t("transfer.order.assurance")}</Text>
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
      backgroundColor={theme.colors.backgroundMuted ?? theme.colors.background}
      headerBackgroundColor={theme.colors.backgroundMuted ?? theme.colors.background}
    >
      <TransferConfirmBody
        bottomInset={24}
        detail={controller.detail}
        loading={controller.loading}
        onClose={props.onClose}
        onQuoteExpired={() => void controller.onQuoteExpired()}
        onSelectPaymentOption={option => void controller.onSelectPaymentOption(option)}
        onSubmit={() => void controller.onSubmit()}
        paymentOptions={controller.paymentOptions}
        paymentOptionsLoading={controller.paymentOptionsLoading}
        quoteFetching={controller.quoteFetching}
        quoteTimestamp={controller.quoteTimestamp}
        selectedPayment={controller.selectedPayment}
        submitUnavailableMessage={controller.submitUnavailableMessage}
        submitting={controller.submitting}
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
    if (!controller.submitting && !controller.quoteFetching) {
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
            backgroundColor: theme.colors.backgroundMuted ?? theme.colors.background,
            borderColor: theme.colors.border,
            top: Math.max(insets.top + 8, 20),
            transform: [{ translateY: sheetTranslateY }],
          },
        ]}
      >
        <View
          style={[
            styles.sheetChrome,
            {
              backgroundColor: theme.colors.backgroundMuted ?? theme.colors.background,
            },
          ]}
        >
          <View
            style={[
              styles.sheetGrabber,
              {
                backgroundColor: theme.isDark ? "#48484A" : "#C7C7CC",
              },
            ]}
          />
          <View style={styles.sheetHeader}>
            <View style={styles.sheetHeaderSide} />
            <Text numberOfLines={1} style={[styles.sheetTitle, { color: theme.colors.text }]}>
              {t("transfer.confirm.title")}
            </Text>
            <View style={[styles.sheetHeaderSide, styles.sheetHeaderSideRight]}>
              <Pressable
                accessibilityLabel={t("common.close")}
                accessibilityShowsLargeContentViewer={false}
                disabled={controller.submitting || controller.quoteFetching}
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
                <SFSymbolIcon color={theme.colors.text} fallbackName="close" name="xmark" size={13} weight="semibold" />
              </Pressable>
            </View>
          </View>
        </View>

        <TransferConfirmBody
          bottomInset={Math.max(insets.bottom + 20, 28)}
          detail={controller.detail}
          loading={controller.loading}
          onClose={dismiss}
          onQuoteExpired={() => void controller.onQuoteExpired()}
          onSelectPaymentOption={option => void controller.onSelectPaymentOption(option)}
          onSubmit={() => void controller.onSubmit()}
          paymentOptions={controller.paymentOptions}
          paymentOptionsLoading={controller.paymentOptionsLoading}
          quoteFetching={controller.quoteFetching}
          quoteTimestamp={controller.quoteTimestamp}
          selectedPayment={controller.selectedPayment}
          submitUnavailableMessage={controller.submitUnavailableMessage}
          submitting={controller.submitting}
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
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 16,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  footerButtonStableDisabled: {
    opacity: 1,
  },
  summaryPanel: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 18,
    gap: 8,
  },
  summaryRecipient: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "400",
    textAlign: "center",
  },
  amountText: {
    fontSize: 38,
    fontWeight: "600",
    letterSpacing: -0.9,
    textAlign: "center",
  },
  summaryMeta: {
    alignItems: "center",
  },
  chainBadge: {
    minHeight: 30,
    paddingHorizontal: 12,
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  chainBadgeText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
  paymentHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  paymentSection: {
    gap: 12,
  },
  unavailableSection: {
    gap: 10,
  },
  paymentSectionLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    paddingHorizontal: 4,
    letterSpacing: -0.08,
  },
  paymentLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  paymentLoadingText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "400",
  },
  paymentGroup: {
    gap: 10,
  },
  paymentExpandToggle: {
    alignSelf: "center",
    minHeight: 32,
    minWidth: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  paymentRowContainer: {
    overflow: "visible",
  },
  paymentRow: {
    minHeight: 78,
    paddingHorizontal: 16,
    paddingVertical: 14,
    position: "relative",
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
  },
  paymentRowHighlight: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
  },
  paymentRowInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  paymentRowIcon: {
    alignItems: "center",
    justifyContent: "center",
  },
  paymentRowContent: {
    flex: 1,
    gap: 3,
  },
  paymentRowTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "600",
    letterSpacing: -0.41,
  },
  paymentRowSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  paymentRowReason: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
  paymentRowAccessory: {
    minWidth: 28,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  paymentRowCheckWrap: {
    minWidth: 28,
    alignItems: "center",
  },
  capabilityWarningCard: {
    borderRadius: 18,
  },
  capabilityWarning: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
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
    backgroundColor: "rgba(15,23,42,0.18)",
  },
  sheetSurface: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  sheetChrome: {
    paddingTop: 8,
    gap: 4,
  },
  sheetGrabber: {
    alignSelf: "center",
    width: 36,
    height: 5,
    borderRadius: 999,
  },
  sheetHeader: {
    minHeight: 52,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  sheetHeaderSide: {
    minWidth: 44,
  },
  sheetHeaderSideRight: {
    alignItems: "flex-end",
  },
  sheetTitle: {
    flex: 1,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "600",
    letterSpacing: -0.41,
    textAlign: "center",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  footerCaption: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  quoteRefreshingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 4,
    minHeight: 20,
  },
  quoteRefreshingLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
  },
})

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}
