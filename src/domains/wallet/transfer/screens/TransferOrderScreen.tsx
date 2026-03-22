import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { Image } from "expo-image"
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { TransferConfirmModal, type TransferConfirmSuccess, type TransferConfirmVariant } from "@/domains/wallet/transfer/components/TransferConfirmPanel"
import { TransferOrderCreatingOverlay } from "@/domains/wallet/transfer/components/TransferOrderCreatingOverlay"
import { formatWalletAddress } from "@/domains/wallet/shared/utils/format"
import { useAddressBookEntriesQuery } from "@/shared/address-book/addressBookQueries"
import { PageEmpty } from "@/shared/ui/AppFlowUi"
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
import { HeaderTextAction, HomeScaffold } from "@/shared/ui/HomeScaffold"
import { resolveChainNameById } from "@/shared/api/walletAssets"
import { formatAmount, parseDecimalInput } from "@/shared/exchange/utils/order"
import { useWalletBalanceQuery } from "@/shared/queries/balanceQueries"
import { useUserStore } from "@/shared/store/useUserStore"
import { useWalletStore } from "@/shared/store/useWalletStore"
import { useAppTheme } from "@/shared/theme/useAppTheme"
import { SFSymbolIcon } from "@/shared/ui/SFSymbolIcon"

import type { TransferStackParamList } from "@/app/navigation/types"

const QUICK_NOTE_KEYS = ["loan", "thanks", "living", "rent", "shopping", "repayment"] as const

type Props = NativeStackScreenProps<
  TransferStackParamList,
  "TransferOrderScreen" | "TransferOrderNormalScreen" | "TransferOrderCopouchScreen" | "TransferOrderCowalletScreen"
>

export function TransferOrderScreen({ navigation, route }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const { fontScale, height: screenHeight, width: screenWidth } = useWindowDimensions()
  const chainId = useWalletStore(state => state.chainId)
  const walletAddress = useWalletStore(state => state.address)
  const profile = useUserStore(state => state.profile)
  const avatarVersion = useUserStore(state => state.avatarVersion)
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
  const addressBookEntriesQuery = useAddressBookEntriesQuery()
  const addressBookEntries = addressBookEntriesQuery.data ?? []
  const [options, setOptions] = useState<TransferOrderOption[]>([])
  const [selectedOptionCode, setSelectedOptionCode] = useState(selectedSendCoinCode)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [quotedOption, setQuotedOption] = useState<TransferQuotedOption | null>(null)
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [quoteFailed, setQuoteFailed] = useState(false)
  const [confirmOrderSn, setConfirmOrderSn] = useState<string | null>(null)
  const [confirmVisible, setConfirmVisible] = useState(false)
  const [bannerVisible, setBannerVisible] = useState(true)
  const [activeField, setActiveField] = useState<"amount" | "note" | null>(null)
  const amountInputRef = useRef<TextInput>(null)
  const noteInputRef = useRef<TextInput>(null)
  const quoteRequestIdRef = useRef(0)

  const sendChainName = resolveChainNameById(chainId)
  const multisigWalletId = route.params?.multisigWalletId
  const isNormalRoute = route.name === "TransferOrderNormalScreen"
  const confirmVariant: TransferConfirmVariant = selectedChannel?.channelType === "normal" || isNormalRoute ? "normal" : "default"
  const balances = balanceQuery.data?.balances ?? {}

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
  const titleSymbol = resolvedOption?.recvCoinSymbol || selectedOption?.recvCoinSymbol || selectedOption?.sendCoinSymbol || ""
  const recipientPrimary = recipientAddress ? formatWalletAddress(recipientAddress, 4, 3) : "--"
  const recipientSecondary = recipientAddress ? formatWalletAddress(recipientAddress, 6, 4) : "--"

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
  const amountSecondaryMessage = inputValidationMessage || quoteValidationMessage || quoteHint
  const amountSecondaryColor =
    inputValidationMessage || quoteFailed ? theme.colors.danger : quoteHint ? theme.colors.primary : theme.colors.mutedText
  const quickNoteOptions = useMemo(
    () =>
      QUICK_NOTE_KEYS.map(key => ({
        key,
        label: t(`transfer.order.quickNote.${key}`),
      })),
    [t],
  )
  const canSubmit = !submitting && !validationMessage && !loading && options.length > 0
  const showQuickNotes = activeField === "note" || note.length > 0
  const displayCurrencySymbol = useMemo(() => resolveDisplayCurrencySymbol(selectedOption?.sendCoinSymbol || titleSymbol), [selectedOption?.sendCoinSymbol, titleSymbol])
  const recipientAvatarUri = useMemo(() => {
    const normalizedRecipient = recipientAddress.trim().toLowerCase()
    if (!normalizedRecipient) {
      return ""
    }

    const matchedAddressBookAvatar = addressBookEntries.find(item => item.walletAddress.trim().toLowerCase() === normalizedRecipient)?.avatar?.trim() || ""
    if (matchedAddressBookAvatar) {
      return matchedAddressBookAvatar
    }

    const normalizedWalletAddress = walletAddress?.trim()?.toLowerCase() || ""
    const normalizedProfileAddress = profile?.address?.trim().toLowerCase() || ""
    const normalizedProfileAvatar = profile?.avatar?.trim() || ""
    if (normalizedProfileAvatar && (normalizedRecipient === normalizedWalletAddress || normalizedRecipient === normalizedProfileAddress)) {
      return appendAvatarCacheVersion(normalizedProfileAvatar, avatarVersion)
    }

    return ""
  }, [addressBookEntries, avatarVersion, profile?.address, profile?.avatar, recipientAddress, walletAddress])
  const isCompactHeight = screenHeight < 860
  const dynamicTypeScale = clamp(fontScale, 1, 1.24)
  const contentHorizontalInset = clamp(Math.round(screenWidth * 0.05), 16, 20)
  const contentGap = 16
  const cardRadius = isCompactHeight ? 18 : 20
  const recipientAvatarSize = isCompactHeight ? 52 : 56
  const amountCardMinHeight = clamp(Math.round(screenHeight * 0.17), 148, 176)
  const amountFontSize = clamp(Math.round(screenWidth * 0.106 * dynamicTypeScale), 38, 52)
  const amountCurrencySize = clamp(Math.round(amountFontSize * 0.7), 28, 38)
  const buttonHeight = isCompactHeight ? 50 : 52

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

  const handleFocusAmount = useCallback(() => {
    noteInputRef.current?.blur()
    setActiveField("amount")
    amountInputRef.current?.focus()
  }, [])

  const handleAmountChange = useCallback(
    (value: string) => {
      setOrderDraft({ sendAmount: parseDecimalInput(value) })
    },
    [setOrderDraft],
  )

  const handleQuickNotePress = useCallback(
    (value: string) => {
      setOrderDraft({ note: value.slice(0, 50) })
    },
    [setOrderDraft],
  )

  if (!selectedChannel) {
    return (
      <HomeScaffold canGoBack onBack={navigation.goBack} title={t("transfer.order.title")}>
        <PageEmpty body={t("transfer.order.channelMissingBody")} title={t("transfer.order.channelMissingTitle")} />
      </HomeScaffold>
    )
  }

  const pageBackgroundColor = theme.colors.backgroundMuted ?? theme.colors.background
  const cardBackgroundColor = theme.colors.surfaceElevated ?? theme.colors.surface
  const secondarySurfaceColor = theme.colors.surfaceMuted ?? theme.colors.background
  const dividerColor = theme.colors.border
  const cardBorderColor = theme.colors.border
  const textColor = theme.colors.text
  const mutedColor = theme.colors.mutedText
  const placeholderColor = theme.colors.mutedText
  const accentColor = theme.colors.primary
  const accentSoftColor = theme.colors.primarySoft ?? `${theme.colors.primary}14`
  const noticeBackgroundColor = accentSoftColor
  const noticeBorderColor = theme.isDark ? "rgba(10,132,255,0.32)" : "rgba(10,132,255,0.18)"
  const submitBackgroundColor = canSubmit ? accentColor : secondarySurfaceColor
  const submitTextColor = canSubmit ? "#FFFFFF" : mutedColor
  const caretColor = accentColor
  const availableText = t("transfer.order.availableBalance", {
    amount: formatAmount(availableBalance),
    symbol: selectedOption?.sendCoinSymbol || selectedOption?.sendCoinCode || titleSymbol,
  })

  return (
    <View style={styles.screenRoot}>
      <HomeScaffold
        backgroundColor={pageBackgroundColor}
        canGoBack
        contentContainerStyle={styles.scaffoldContent}
        onBack={navigation.goBack}
        reserveFloatingOverlayInset={false}
        right={<HeaderTextAction label={t("transfer.order.recordsAction")} onPress={handleOpenRecords} variant="plain" />}
        scroll={false}
        title={t("transfer.order.title")}
      >
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={[styles.layoutRoot, { backgroundColor: pageBackgroundColor }]}>
          <ScrollView
            bounces={false}
            contentContainerStyle={[
              styles.scrollContent,
              {
                gap: contentGap,
                paddingHorizontal: contentHorizontalInset,
                paddingTop: isCompactHeight ? 14 : 18,
                paddingBottom: isCompactHeight ? 18 : 24,
              },
            ]}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.sectionGroup}>
              <Text style={[styles.sectionLabel, { color: mutedColor }]}>{t("transfer.order.recipientLabel")}</Text>
              <View
                style={[
                  styles.recipientCard,
                  {
                    backgroundColor: cardBackgroundColor,
                    borderColor: cardBorderColor,
                    borderRadius: cardRadius,
                    paddingHorizontal: 16,
                    paddingVertical: isCompactHeight ? 14 : 16,
                  },
                ]}
              >
                <RecipientAddressAvatar
                  uri={recipientAvatarUri}
                  size={recipientAvatarSize}
                  backgroundColor={theme.isDark ? "#262932" : "#F1F1F3"}
                  iconColor={theme.isDark ? "#767D89" : "#BDBDBD"}
                />
                <View style={styles.recipientContent}>
                  <Text numberOfLines={1} style={[styles.recipientTitle, { color: textColor }]}>
                    {recipientPrimary}
                  </Text>
                  <Text numberOfLines={1} style={[styles.recipientSubtitle, { color: mutedColor }]}>
                    {recipientSecondary}
                  </Text>
                </View>
              </View>

              {bannerVisible ? (
                <View
                  style={[
                    styles.noticeCard,
                    {
                      backgroundColor: noticeBackgroundColor,
                      borderColor: noticeBorderColor,
                    },
                  ]}
                >
                  <View style={styles.noticeContent}>
                    <SFSymbolIcon color={accentColor} fallbackName="alert-circle-outline" name="exclamationmark.circle.fill" size={18} />
                    <Text style={[styles.noticeText, { color: textColor }]}>{t("transfer.order.warningBanner")}</Text>
                  </View>
                  <Pressable hitSlop={10} onPress={() => setBannerVisible(false)} style={styles.noticeCloseButton}>
                    <SFSymbolIcon color={mutedColor} fallbackName="close" name="xmark" size={16} />
                  </Pressable>
                </View>
              ) : null}
            </View>

            <Pressable
              onPress={handleFocusAmount}
              style={[
                styles.card,
                styles.amountCard,
                {
                  backgroundColor: cardBackgroundColor,
                  borderColor: activeField === "amount" ? noticeBorderColor : cardBorderColor,
                  borderRadius: cardRadius,
                  minHeight: amountCardMinHeight,
                  paddingHorizontal: 20,
                  paddingTop: isCompactHeight ? 18 : 20,
                  paddingBottom: isCompactHeight ? 16 : 18,
                },
              ]}
            >
              <Text style={[styles.cardTitle, { color: textColor }]}>{t("transfer.order.amountLabel")}</Text>
              <View style={styles.amountInputShell}>
                <Text
                  style={[
                    styles.amountCurrency,
                    {
                      color: textColor,
                      fontSize: amountCurrencySize,
                      lineHeight: amountCurrencySize + 4,
                    },
                  ]}
                >
                  {displayCurrencySymbol}
                </Text>
                <View style={styles.amountTextShell}>
                  {!sendAmount ? (
                    <Text numberOfLines={1} style={[styles.amountPlaceholder, { color: placeholderColor }]}>
                      {t("transfer.order.amountPlaceholder")}
                    </Text>
                  ) : null}
                  <TextInput
                    ref={amountInputRef}
                    keyboardType="decimal-pad"
                    onChangeText={handleAmountChange}
                    onBlur={() => setActiveField(current => (current === "amount" ? null : current))}
                    onFocus={() => setActiveField("amount")}
                    selectionColor={caretColor}
                    style={[
                      styles.amountInput,
                      {
                        color: textColor,
                        fontSize: amountFontSize,
                        lineHeight: amountFontSize + 6,
                      },
                    ]}
                    value={sendAmount}
                  />
                </View>
              </View>
              <View style={styles.amountHelperGroup}>
                <Text style={[styles.amountHelperPrimary, { color: mutedColor }]}>{availableText}</Text>
                {amountSecondaryMessage ? (
                  <Text style={[styles.amountHelperSecondary, { color: amountSecondaryColor }]}>{amountSecondaryMessage}</Text>
                ) : null}
              </View>
            </Pressable>

            <View
              style={[
                styles.card,
                styles.noteCard,
                {
                  backgroundColor: secondarySurfaceColor,
                  borderColor: activeField === "note" ? noticeBorderColor : cardBorderColor,
                  borderRadius: cardRadius,
                  paddingHorizontal: 20,
                  paddingTop: isCompactHeight ? 18 : 20,
                  paddingBottom: isCompactHeight ? 16 : 18,
                },
              ]}
            >
              <View style={styles.noteHeader}>
                <Text style={[styles.cardTitle, { color: textColor }]}>{t("transfer.order.noteLabelCompact")}</Text>
                <Text style={[styles.noteCount, { color: mutedColor }]}>{`${note.length}/50`}</Text>
              </View>
              <TextInput
                ref={noteInputRef}
                maxLength={50}
                onBlur={() => setActiveField(current => (current === "note" ? null : current))}
                onChangeText={value => setOrderDraft({ note: value.slice(0, 50) })}
                onFocus={() => {
                  amountInputRef.current?.blur()
                  setActiveField("note")
                }}
                placeholder={t("transfer.order.notePlaceholderCompact")}
                placeholderTextColor={placeholderColor}
                style={[styles.noteInput, { color: textColor }]}
                value={note}
              />
              {showQuickNotes ? (
                <>
                  <View style={[styles.noteDivider, { backgroundColor: dividerColor }]} />
                  <View style={styles.quickNoteWrap}>
                    {quickNoteOptions.map(item => (
                      <Pressable
                        key={item.key}
                        onPress={() => handleQuickNotePress(item.label)}
                        style={[
                          styles.quickNoteChip,
                          {
                            borderColor: note === item.label ? accentColor : cardBorderColor,
                            backgroundColor: note === item.label ? accentSoftColor : cardBackgroundColor,
                          },
                        ]}
                      >
                        <Text style={[styles.quickNoteText, { color: note === item.label ? accentColor : mutedColor }]}>{item.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              ) : null}
            </View>
          </ScrollView>

          <View style={[styles.footerBar, { backgroundColor: cardBackgroundColor, borderTopColor: dividerColor }]}>
            <Pressable
              disabled={!canSubmit}
              onPress={() => void handleSubmit()}
              style={[
                styles.footerSubmitButton,
                {
                  backgroundColor: submitBackgroundColor,
                  borderColor: canSubmit ? submitBackgroundColor : cardBorderColor,
                  borderRadius: 16,
                  minHeight: buttonHeight,
                },
              ]}
            >
              <Text style={[styles.footerSubmitText, { color: submitTextColor }]}>
                {submitting ? t("common.loading") : t("transfer.order.submitPrimary")}
              </Text>
            </Pressable>
            <View style={styles.assuranceRow}>
              <SFSymbolIcon color={accentColor} fallbackName="shield-check" name="checkmark.shield.fill" size={16} />
              <Text style={[styles.assuranceText, { color: mutedColor }]}>{t("transfer.order.assurance")}</Text>
            </View>
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
  scaffoldContent: {
    paddingHorizontal: 0,
  },
  layoutRoot: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 18,
  },
  sectionGroup: {
    gap: 10,
  },
  sectionLabel: {
    paddingHorizontal: 4,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    letterSpacing: -0.08,
  },
  recipientCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  recipientAvatarShell: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  recipientAvatarImage: {
    width: "100%",
    height: "100%",
  },
  recipientContent: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  recipientTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "600",
    letterSpacing: -0.41,
  },
  recipientSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "400",
  },
  noticeCard: {
    minHeight: 52,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  noticeContent: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  noticeText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "400",
  },
  noticeCloseButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  amountCard: {
    minHeight: 188,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 18,
  },
  cardTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",
    letterSpacing: -0.24,
  },
  amountInputShell: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    paddingBottom: 2,
    paddingTop: 12,
    gap: 8,
  },
  amountTextShell: {
    flex: 1,
    minHeight: 66,
    justifyContent: "flex-end",
    position: "relative",
  },
  amountCurrency: {
    paddingBottom: 5,
    fontSize: 46,
    lineHeight: 50,
    fontWeight: "600",
    letterSpacing: -0.8,
  },
  amountPlaceholder: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 4,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "400",
    letterSpacing: -0.41,
  },
  amountInput: {
    minHeight: 64,
    paddingVertical: 0,
    paddingHorizontal: 0,
    fontSize: 48,
    lineHeight: 54,
    fontWeight: "600",
    letterSpacing: -1.1,
    fontVariant: ["tabular-nums"],
  },
  amountHelperGroup: {
    gap: 4,
    paddingTop: 14,
  },
  amountHelperPrimary: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "400",
  },
  amountHelperSecondary: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "400",
  },
  noteCard: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 18,
  },
  noteHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  noteCount: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
  noteInput: {
    minHeight: 44,
    marginTop: 10,
    paddingVertical: 0,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "400",
  },
  noteDivider: {
    height: StyleSheet.hairlineWidth,
    marginTop: 12,
    marginBottom: 14,
  },
  quickNoteWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  quickNoteChip: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  quickNoteText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400",
  },
  assuranceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
  },
  assuranceText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "400",
  },
  footerBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerSubmitButton: {
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  footerSubmitText: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "600",
  },
})

function RecipientAddressAvatar(props: {
  size: number
  uri?: string
  backgroundColor: string
  iconColor: string
}) {
  const [imageFailed, setImageFailed] = useState(false)
  const normalizedUri = props.uri?.trim() || ""

  useEffect(() => {
    setImageFailed(false)
  }, [normalizedUri])

  const borderRadius = Math.round(props.size * 0.32)

  if (normalizedUri && !imageFailed) {
    return (
      <View
        style={[
          styles.recipientAvatarShell,
          {
            width: props.size,
            height: props.size,
            borderRadius,
            backgroundColor: props.backgroundColor,
          },
        ]}
      >
        <Image
          cachePolicy="memory-disk"
          contentFit="cover"
          onError={() => setImageFailed(true)}
          source={normalizedUri}
          style={styles.recipientAvatarImage}
          transition={0}
        />
      </View>
    )
  }

  return (
    <View
      style={[
        styles.recipientAvatarShell,
        {
          width: props.size,
          height: props.size,
          borderRadius,
          backgroundColor: props.backgroundColor,
        },
      ]}
    >
      <SFSymbolIcon color={props.iconColor} fallbackName="account" name="person.fill" size={Math.round(props.size * 0.54)} />
    </View>
  )
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function appendAvatarCacheVersion(uri: string, cacheVersion?: number) {
  if (!uri) {
    return ""
  }

  if (typeof cacheVersion !== "number") {
    return uri
  }

  return `${uri}${uri.includes("?") ? "&" : "?"}avatarCache=${cacheVersion}`
}

function resolveDisplayCurrencySymbol(symbol?: string) {
  const normalized = symbol?.trim()

  if (!normalized) {
    return "¥"
  }

  if (normalized.length <= 2) {
    return normalized
  }

  return "¥"
}
