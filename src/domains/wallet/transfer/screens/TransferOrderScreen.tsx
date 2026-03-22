import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { TransferConfirmModal, type TransferConfirmSuccess, type TransferConfirmVariant } from "@/domains/wallet/transfer/components/TransferConfirmPanel"
import { TransferOrderCreatingOverlay } from "@/domains/wallet/transfer/components/TransferOrderCreatingOverlay"
import { formatWalletAddress } from "@/domains/wallet/shared/utils/format"
import { PageEmpty, PrimaryButton } from "@/shared/ui/AppFlowUi"
import {
  getTransferOrderOptions,
  getTransferQuote,
  type TransferOrderOption,
} from "@/shared/exchange/services/exchangeApi"
import { createBridgeTransferOrder, createNormalTransferOrder } from "@/shared/exchange/services/orderCreationApi"
import {
  applyTransferQuote,
  buildTransferQuoteKey,
  resolveTransferOption,
  type TransferQuotedOption,
} from "@/domains/wallet/transfer/screens/transferQuote"
import { useTransferDraftStore } from "@/domains/wallet/transfer/store/useTransferDraftStore"
import { navigateRoot } from "@/app/navigation/navigationRef"
import { SeedAddressAvatar } from "@/shared/avatar/SeedAddressAvatar"
import { HomeScaffold } from "@/shared/ui/HomeScaffold"
import { resolveChainNameById } from "@/shared/api/walletAssets"
import { formatAmount, parseDecimalInput } from "@/shared/exchange/utils/order"
import { useWalletBalanceQuery } from "@/shared/queries/balanceQueries"
import { useWalletStore } from "@/shared/store/useWalletStore"
import { useAppTheme } from "@/shared/theme/useAppTheme"

import type { TransferStackParamList } from "@/app/navigation/types"

const CNY_EXCHANGE_RATE = 7.2

type Props = NativeStackScreenProps<
  TransferStackParamList,
  "TransferOrderScreen" | "TransferOrderNormalScreen" | "TransferOrderCopouchScreen" | "TransferOrderCowalletScreen"
>

export function TransferOrderScreen({ navigation, route }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const chainId = useWalletStore(state => state.chainId)
  const walletAddress = useWalletStore(state => state.address)
  const selectedChannel = useTransferDraftStore(state => state.selectedChannel)
  const recipientAddress = useTransferDraftStore(state => state.recipientAddress)
  const sendAmount = useTransferDraftStore(state => state.sendAmount)
  const note = useTransferDraftStore(state => state.note)
  const selectedSendCoinCode = useTransferDraftStore(state => state.selectedSendCoinCode)
  const selectedRecvCoinCode = useTransferDraftStore(state => state.selectedRecvCoinCode)
  const setOrderDraft = useTransferDraftStore(state => state.setOrderDraft)
  const setLatestOrderSn = useTransferDraftStore(state => state.setLatestOrderSn)
  const balanceQuery = useWalletBalanceQuery({
    address: walletAddress,
    chainId,
  })
  const [options, setOptions] = useState<TransferOrderOption[]>([])
  const [selectedOptionCode, setSelectedOptionCode] = useState(selectedSendCoinCode)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [quotedOption, setQuotedOption] = useState<TransferQuotedOption | null>(null)
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [quoteFailed, setQuoteFailed] = useState(false)
  const [confirmOrderSn, setConfirmOrderSn] = useState<string | null>(null)
  const [confirmVisible, setConfirmVisible] = useState(false)
  const quoteRequestIdRef = useRef(0)

  const sendChainName = resolveChainNameById(chainId)
  const multisigWalletId = route.params?.multisigWalletId
  const isNormalRoute = route.name === "TransferOrderNormalScreen"
  const confirmVariant: TransferConfirmVariant = selectedChannel?.channelType === "normal" || isNormalRoute ? "normal" : "default"
  const balances = balanceQuery.data?.balances ?? {}
  const coinList = balanceQuery.data?.coins ?? []

  const selectedOption = useMemo(() => {
    return (
      options.find(item => item.sendCoinCode === selectedOptionCode && item.recvCoinCode === selectedRecvCoinCode) ??
      options.find(item => item.sendCoinCode === selectedOptionCode) ??
      options[0] ??
      null
    )
  }, [options, selectedOptionCode, selectedRecvCoinCode])

  const numericAmount = Number(sendAmount || 0)
  const availableBalance = selectedOption ? balances[selectedOption.sendCoinCode] ?? 0 : 0
  const currentQuoteRequestKey = useMemo(() => {
    if (!selectedChannel || selectedChannel.channelType !== "bridge" || !selectedOption?.recvCoinCode || !numericAmount || numericAmount <= 0) {
      return null
    }

    return buildTransferQuoteKey({
      channelKey: selectedChannel.key,
      sendCoinCode: selectedOption.sendCoinCode,
      recvCoinCode: selectedOption.recvCoinCode,
      amount: numericAmount,
    })
  }, [numericAmount, selectedChannel, selectedOption])

  useEffect(() => {
    if (!selectedOption || !currentQuoteRequestKey) {
      quoteRequestIdRef.current += 1
      setQuotedOption(null)
      setQuoteLoading(false)
      setQuoteFailed(false)
      return
    }

    const requestId = quoteRequestIdRef.current + 1
    quoteRequestIdRef.current = requestId
    const baseOption = selectedOption

    setQuotedOption(null)
    setQuoteLoading(true)
    setQuoteFailed(false)

    void getTransferQuote({
      sendCoinCode: baseOption.sendCoinCode,
      recvCoinCode: baseOption.recvCoinCode,
      recvAmount: numericAmount,
    })
      .then(quote => {
        if (requestId !== quoteRequestIdRef.current) {
          return
        }

        setQuotedOption({
          requestKey: currentQuoteRequestKey,
          sendAmount: quote.sendAmount,
          option: applyTransferQuote(baseOption, quote),
        })
        setQuoteLoading(false)
        setQuoteFailed(false)
      })
      .catch(() => {
        if (requestId !== quoteRequestIdRef.current) {
          return
        }

        setQuotedOption(null)
        setQuoteLoading(false)
        setQuoteFailed(true)
      })
  }, [currentQuoteRequestKey, numericAmount, selectedOption])

  const resolvedOption = useMemo(
    () => resolveTransferOption(selectedOption, quotedOption, currentQuoteRequestKey),
    [currentQuoteRequestKey, quotedOption, selectedOption],
  )
  const quoteRequired = selectedChannel?.channelType === "bridge" && currentQuoteRequestKey != null
  const hasCurrentQuote = quotedOption?.requestKey === currentQuoteRequestKey
  const resolvedSendAmount = quoteRequired && hasCurrentQuote ? quotedOption?.sendAmount ?? 0 : numericAmount
  const selectedCoin = useMemo(
    () => coinList.find(item => item.code === (selectedOption?.sendCoinCode ?? "")) ?? null,
    [coinList, selectedOption?.sendCoinCode],
  )
  const titleSymbol = resolvedOption?.recvCoinSymbol || selectedOption?.recvCoinSymbol || selectedOption?.sendCoinSymbol || ""
  const screenTitle = titleSymbol ? t("transfer.order.titleWithAsset", { symbol: titleSymbol }) : t("transfer.order.title")
  const recipientPrimary = recipientAddress ? formatWalletAddress(recipientAddress, 4, 3) : "--"
  const recipientSecondary = recipientAddress ? formatWalletAddress(recipientAddress, 6, 4) : "--"
  const approxCnyValue = Math.max(numericAmount, 0) * (selectedCoin?.price ?? 0) * CNY_EXCHANGE_RATE

  const inputValidationMessage = useMemo(() => {
    if (!recipientAddress) {
      return t("transfer.order.addressMissing")
    }

    if (!resolvedOption) {
      return t("transfer.order.noOption")
    }

    if (!sendAmount) {
      return t("transfer.order.amountRequired")
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return t("transfer.order.amountInvalid")
    }

    if (resolvedOption.sendMinAmount > 0 && numericAmount < resolvedOption.sendMinAmount) {
      return t("transfer.order.amountTooSmall", { amount: formatAmount(resolvedOption.sendMinAmount) })
    }

    if (!quoteRequired && numericAmount > availableBalance) {
      return t("transfer.order.balanceInsufficient")
    }

    if (quoteRequired && hasCurrentQuote && resolvedSendAmount > availableBalance) {
      return t("transfer.order.balanceInsufficient")
    }

    return ""
  }, [availableBalance, hasCurrentQuote, numericAmount, quoteRequired, recipientAddress, resolvedOption, resolvedSendAmount, sendAmount, t])

  const quoteValidationMessage = useMemo(() => {
    if (!quoteRequired) {
      return ""
    }

    if (quoteLoading) {
      return t("transfer.order.quoteLoading")
    }

    if (quoteFailed) {
      return t("transfer.order.quoteFailed")
    }

    if (!hasCurrentQuote || resolvedSendAmount <= 0) {
      return t("transfer.order.quoteLoading")
    }

    return ""
  }, [hasCurrentQuote, quoteFailed, quoteLoading, quoteRequired, resolvedSendAmount, t])

  const validationMessage = inputValidationMessage || quoteValidationMessage
  const quoteHint = useMemo(() => {
    if (!quoteRequired || !resolvedOption?.recvCoinSymbol || !hasCurrentQuote) {
      return ""
    }

    return `${t("transfer.order.receiveEstimate")}: ${formatAmount(resolvedOption.recvEstimateAmount)} ${resolvedOption.recvCoinSymbol}`
  }, [hasCurrentQuote, quoteRequired, resolvedOption?.recvCoinSymbol, resolvedOption?.recvEstimateAmount, t])
  const amountHelperMessage = inputValidationMessage || quoteValidationMessage || quoteHint
  const amountHelperColor = inputValidationMessage || quoteFailed ? theme.colors.danger : theme.colors.mutedText

  useEffect(() => {
    let mounted = true

    if (!selectedChannel) {
      setLoading(false)
      return
    }

    void (async () => {
      setLoading(true)

      try {
        const result = await getTransferOrderOptions({
          sendChainName,
          receiveChainName: selectedChannel.receiveChainName,
          channelType: selectedChannel.channelType,
        })

        if (!mounted) {
          return
        }

        setOptions(result.options)
        if (result.options.length > 0) {
          const preferred =
            result.options.find(item => item.sendCoinCode === selectedSendCoinCode && item.recvCoinCode === selectedRecvCoinCode) ??
            result.options[0]
          setSelectedOptionCode(preferred.sendCoinCode)
          setOrderDraft({
            sendCoinCode: preferred.sendCoinCode,
            recvCoinCode: preferred.recvCoinCode,
          })
        }
      } catch {
        if (mounted) {
          Alert.alert(t("common.errorTitle"), t("transfer.order.loadFailed"))
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    })()

    return () => {
      mounted = false
    }
  }, [selectedChannel, selectedRecvCoinCode, selectedSendCoinCode, sendChainName, setOrderDraft, t])

  useEffect(() => {
    setConfirmOrderSn(null)
    setConfirmVisible(false)
  }, [note, recipientAddress, resolvedOption?.recvCoinCode, resolvedOption?.sendCoinCode, sendAmount])

  const handleSubmit = useCallback(async () => {
    if (confirmOrderSn) {
      setConfirmVisible(true)
      return
    }

    if (!resolvedOption || validationMessage) {
      Alert.alert(t("common.errorTitle"), validationMessage || t("transfer.order.noOption"))
      return
    }

    setSubmitting(true)

    try {
      const result =
        selectedChannel?.channelType === "normal"
          ? await createNormalTransferOrder({
              coinCode: resolvedOption.sendCoinCode,
              amount: numericAmount,
              recvAddress: recipientAddress,
              note,
              multisigWalletId,
            })
          : await createBridgeTransferOrder({
              sellerId: resolvedOption.sellerId ? Number(resolvedOption.sellerId) : undefined,
              recvAddress: recipientAddress,
              recvCoinCode: resolvedOption.recvCoinCode,
              sendCoinCode: resolvedOption.sendCoinCode,
              sendAmount: resolvedSendAmount,
              note,
              multisigWalletId,
            })

      setLatestOrderSn(result.orderSn)
      setOrderDraft({
        sendCoinCode: resolvedOption.sendCoinCode,
        recvCoinCode: resolvedOption.recvCoinCode,
      })
      setConfirmOrderSn(result.orderSn)
      setConfirmVisible(true)
    } catch (error) {
      const maybeResponse = Reflect.get(error as object, "response") as { data?: { code?: number } } | undefined
      if (maybeResponse?.data?.code === 60013) {
        Alert.alert(t("common.errorTitle"), t("transfer.order.addressInvalid"))
      } else {
        Alert.alert(t("common.errorTitle"), t("transfer.order.submitFailed"))
      }
    } finally {
      setSubmitting(false)
    }
  }, [
    note,
    recipientAddress,
    resolvedOption,
    selectedChannel?.channelType,
    setLatestOrderSn,
    setOrderDraft,
    t,
    validationMessage,
    confirmOrderSn,
    resolvedSendAmount,
    numericAmount,
    multisigWalletId,
  ])

  const handleConfirmCompleted = useCallback(
    ({ orderSn, walletId }: TransferConfirmSuccess) => {
      setConfirmVisible(false)
      setConfirmOrderSn(null)
      navigation.navigate("TxPayStatusScreen", {
        orderSn,
        pay: true,
        walletId,
      })
    },
    [navigation],
  )

  const handleConfirmOrderUpdated = useCallback(
    ({ orderSn, recvCoinCode, sendCoinCode }: { orderSn: string; recvCoinCode: string; sendCoinCode: string }) => {
      setConfirmOrderSn(orderSn)
      setLatestOrderSn(orderSn)
      setOrderDraft({
        sendCoinCode,
        recvCoinCode,
      })
    },
    [setLatestOrderSn, setOrderDraft],
  )

  const handleOpenRecords = useCallback(() => {
    navigateRoot("OrdersStack", { screen: "TxlogsScreen" })
  }, [])

  if (!selectedChannel) {
    return (
      <HomeScaffold canGoBack onBack={navigation.goBack} title={t("transfer.order.title")}>
        <PageEmpty body={t("transfer.order.channelMissingBody")} title={t("transfer.order.channelMissingTitle")} />
      </HomeScaffold>
    )
  }

  const pageBackgroundColor = theme.isDark ? theme.colors.background : "#FBF8F3"
  const cardBackgroundColor = theme.isDark ? theme.colors.surface : "#FFFFFF"
  const cardBorderColor = theme.isDark ? theme.colors.glassBorder ?? theme.colors.border : "rgba(35, 35, 35, 0.05)"
  const cardShadowOpacity = theme.isDark ? 0.18 : 0.06
  const accentColor = theme.isDark ? "#68DA84" : "#51CA73"
  const accentSoft = theme.isDark ? "rgba(104,218,132,0.22)" : "#DDF4E2"
  const accentMuted = theme.isDark ? "#B6F0C4" : "#84D99A"
  const textMuted = theme.colors.mutedText
  const inputPlaceholderColor = theme.isDark ? "rgba(255,255,255,0.18)" : "#E2E0DA"
  const noteIconColor = theme.isDark ? "rgba(255,255,255,0.42)" : "#AFB4B0"
  const amountSymbol = selectedOption?.sendCoinSymbol ?? titleSymbol
  const availableText = t("transfer.order.availableBalance", {
    amount: formatAmount(availableBalance),
    symbol: amountSymbol,
  })

  return (
    <View style={styles.screenRoot}>
      <HomeScaffold backgroundColor={pageBackgroundColor} hideHeader reserveFloatingOverlayInset={false} scroll={false} title={screenTitle}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.layoutRoot}>
          <View style={styles.headerRow}>
            <Pressable accessibilityLabel={t("common.back")} hitSlop={12} onPress={navigation.goBack} style={styles.headerIconButton}>
              <Text style={[styles.headerIcon, { color: accentColor }]}>←</Text>
            </Pressable>
            <Text numberOfLines={1} style={[styles.headerTitle, { color: theme.colors.text }]}>
              {screenTitle}
            </Text>
            <Pressable accessibilityLabel={t("home.actions.records")} hitSlop={12} onPress={handleOpenRecords} style={styles.headerIconButton}>
              <Text style={[styles.headerIcon, { color: accentColor }]}>↺</Text>
            </Pressable>
          </View>

          <ScrollView
            bounces={false}
            contentContainerStyle={styles.scrollContent}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionLabel, { color: textMuted }]}>{t("transfer.order.recipientLabel")}</Text>
              <View
                style={[
                  styles.card,
                  styles.recipientCard,
                  {
                    backgroundColor: cardBackgroundColor,
                    borderColor: cardBorderColor,
                    shadowColor: theme.colors.shadow,
                    shadowOpacity: cardShadowOpacity,
                  },
                ]}
              >
                <SeedAddressAvatar borderColor={accentSoft} seedSource={recipientAddress || selectedChannel.receiveChainName} size={58} />
                <View style={styles.recipientContent}>
                  <View style={styles.recipientTitleRow}>
                    <Text numberOfLines={1} style={[styles.recipientTitle, { color: theme.colors.text }]}>
                      {recipientPrimary}
                    </Text>
                    <View style={[styles.networkBadge, { backgroundColor: accentSoft }]}>
                      <Text numberOfLines={1} style={[styles.networkBadgeText, { color: accentColor }]}>
                        {selectedChannel.receiveChainFullName || selectedChannel.title}
                      </Text>
                    </View>
                  </View>
                  <Text numberOfLines={1} style={[styles.recipientSubtitle, { color: textMuted }]}>
                    {recipientSecondary}
                  </Text>
                </View>
                <View style={[styles.verifiedBadge, { backgroundColor: accentSoft }]}>
                  <Text style={[styles.verifiedCheck, { color: accentColor }]}>✓</Text>
                </View>
              </View>
            </View>

            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionLabel, { color: textMuted }]}>{t("transfer.order.amountLabel")}</Text>
              <View
                style={[
                  styles.card,
                  styles.amountCard,
                  {
                    backgroundColor: cardBackgroundColor,
                    borderColor: cardBorderColor,
                    shadowColor: theme.colors.shadow,
                    shadowOpacity: cardShadowOpacity,
                  },
                ]}
              >
                <View style={styles.amountInputShell}>
                  <Text style={[styles.amountCurrency, { color: accentColor }]}>$</Text>
                  <TextInput
                    keyboardType="decimal-pad"
                    onChangeText={value => setOrderDraft({ sendAmount: parseDecimalInput(value) })}
                    placeholder="0.00"
                    placeholderTextColor={inputPlaceholderColor}
                    selectionColor={accentColor}
                    style={[styles.amountInput, { color: theme.colors.text }]}
                    value={sendAmount}
                  />
                </View>
                <View style={[styles.amountDivider, { backgroundColor: cardBorderColor }]} />
                <View style={styles.amountMetaRow}>
                  <Text numberOfLines={1} style={[styles.amountMetaLabel, { color: theme.colors.text }]}>
                    {availableText}
                  </Text>
                  <Text numberOfLines={1} style={[styles.amountMetaValue, { color: theme.colors.text }]}>
                    {formatApproximateCny(approxCnyValue)}
                  </Text>
                </View>
              </View>
              {amountHelperMessage ? (
                <Text style={[styles.helperText, { color: amountHelperColor }]}>
                  {amountHelperMessage}
                </Text>
              ) : null}
            </View>

            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionLabel, { color: textMuted }]}>{t("transfer.order.noteLabelCompact")}</Text>
              <View
                style={[
                  styles.card,
                  styles.noteCard,
                  {
                    backgroundColor: cardBackgroundColor,
                    borderColor: cardBorderColor,
                    shadowColor: theme.colors.shadow,
                    shadowOpacity: cardShadowOpacity,
                  },
                ]}
              >
                <RemarkIcon color={noteIconColor} />
                <TextInput
                  maxLength={50}
                  onChangeText={value => setOrderDraft({ note: value.slice(0, 50) })}
                  placeholder={t("transfer.order.notePlaceholderCompact")}
                  placeholderTextColor={textMuted}
                  selectionColor={accentColor}
                  style={[styles.noteInput, { color: theme.colors.text }]}
                  value={note}
                />
              </View>
            </View>
          </ScrollView>

          <View style={[styles.footer, { backgroundColor: pageBackgroundColor }]}>
            <PrimaryButton
              disabled={submitting || Boolean(validationMessage) || loading || options.length === 0}
              label={submitting ? t("common.loading") : t("transfer.order.submitPrimary")}
              onPress={() => void handleSubmit()}
              style={[
                styles.submitButton,
                {
                  backgroundColor: accentColor,
                  borderColor: accentMuted,
                },
              ]}
            />
            <Text style={[styles.footerHint, { color: textMuted }]}>
              {t("transfer.order.disclaimer")}
            </Text>
          </View>
        </KeyboardAvoidingView>
      </HomeScaffold>

      <TransferOrderCreatingOverlay visible={submitting} />
      {confirmOrderSn && confirmVisible ? (
        <TransferConfirmModal
          visible
          onClose={() => setConfirmVisible(false)}
          onCompleted={handleConfirmCompleted}
          onOrderUpdated={handleConfirmOrderUpdated}
          orderSn={confirmOrderSn}
          variant={confirmVariant}
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
  },
  layoutRoot: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 18,
  },
  headerIconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerIcon: {
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 30,
  },
  headerTitle: {
    flex: 1,
    marginHorizontal: 12,
    textAlign: "center",
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  scrollContent: {
    paddingBottom: 24,
    gap: 28,
  },
  sectionBlock: {
    gap: 12,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 30,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  recipientCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 14,
  },
  recipientContent: {
    flex: 1,
    minWidth: 0,
    gap: 8,
  },
  recipientTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  recipientTitle: {
    flexShrink: 1,
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  networkBadge: {
    maxWidth: 152,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  networkBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  recipientSubtitle: {
    fontSize: 16,
    fontWeight: "500",
  },
  verifiedBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  verifiedCheck: {
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 22,
  },
  amountCard: {
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 18,
  },
  amountInputShell: {
    minHeight: 150,
    justifyContent: "center",
  },
  amountCurrency: {
    position: "absolute",
    left: 0,
    top: "50%",
    marginTop: -28,
    fontSize: 56,
    lineHeight: 56,
    fontWeight: "700",
    letterSpacing: -1,
  },
  amountInput: {
    minHeight: 88,
    paddingHorizontal: 52,
    textAlign: "center",
    fontSize: 58,
    lineHeight: 66,
    fontWeight: "700",
    letterSpacing: -2,
  },
  amountDivider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: 16,
  },
  amountMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  amountMetaLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
  },
  amountMetaValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  helperText: {
    fontSize: 13,
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  noteCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 14,
  },
  noteInput: {
    flex: 1,
    minHeight: 28,
    fontSize: 16,
    fontWeight: "500",
  },
  remarkIcon: {
    width: 22,
    gap: 4,
  },
  remarkStroke: {
    height: 2.5,
    borderRadius: 999,
  },
  footer: {
    paddingTop: 8,
    paddingBottom: 8,
    gap: 14,
  },
  submitButton: {
    minHeight: 72,
    borderRadius: 28,
  },
  footerHint: {
    textAlign: "center",
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: 12,
  },
})

function RemarkIcon(props: { color: string }) {
  return (
    <View style={styles.remarkIcon}>
      <View style={[styles.remarkStroke, { width: 22, backgroundColor: props.color }]} />
      <View style={[styles.remarkStroke, { width: 18, backgroundColor: props.color }]} />
      <View style={[styles.remarkStroke, { width: 22, backgroundColor: props.color }]} />
    </View>
  )
}

function formatApproximateCny(value: number) {
  const normalizedValue = Number.isFinite(value) ? value : 0

  return `≈ ¥${normalizedValue.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} CNY`
}
