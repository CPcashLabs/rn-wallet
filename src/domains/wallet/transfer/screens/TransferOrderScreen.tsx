import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { Image } from "expo-image"
import { Alert, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native"
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
import { HomeScaffold } from "@/shared/ui/HomeScaffold"
import { resolveChainNameById } from "@/shared/api/walletAssets"
import { formatAmount, parseDecimalInput } from "@/shared/exchange/utils/order"
import { useWalletBalanceQuery } from "@/shared/queries/balanceQueries"
import { useUserStore } from "@/shared/store/useUserStore"
import { useWalletStore } from "@/shared/store/useWalletStore"
import { useAppTheme } from "@/shared/theme/useAppTheme"
import { SFSymbolIcon } from "@/shared/ui/SFSymbolIcon"

import type { TransferStackParamList } from "@/app/navigation/types"

const QUICK_NOTE_KEYS = ["loan", "thanks", "living", "rent", "shopping", "repayment"] as const
const NUMERIC_KEY_ROWS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
] as const

type Props = NativeStackScreenProps<
  TransferStackParamList,
  "TransferOrderScreen" | "TransferOrderNormalScreen" | "TransferOrderCopouchScreen" | "TransferOrderCowalletScreen"
>

export function TransferOrderScreen({ navigation, route }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const { height: screenHeight, width: screenWidth } = useWindowDimensions()
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
  const [activeField, setActiveField] = useState<"amount" | "note" | null>("amount")
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
  const amountSecondaryColor = inputValidationMessage || quoteFailed ? theme.colors.danger : theme.colors.mutedText
  const quickNoteOptions = useMemo(
    () =>
      QUICK_NOTE_KEYS.map(key => ({
        key,
        label: t(`transfer.order.quickNote.${key}`),
      })),
    [t],
  )
  const canSubmit = !submitting && !validationMessage && !loading && options.length > 0
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
  const contentHorizontalInset = clamp(Math.round(screenWidth * 0.054), 18, 24)
  const contentGap = isCompactHeight ? 16 : 20
  const cardRadius = isCompactHeight ? 24 : 28
  const recipientAvatarSize = isCompactHeight ? 62 : 68
  const amountCardMinHeight = clamp(Math.round(screenHeight * 0.2), 168, 196)
  const amountFontSize = clamp(Math.round(screenWidth * 0.13), 44, 54)
  const amountCurrencySize = clamp(amountFontSize - 2, 40, 50)
  const buttonHeight = isCompactHeight ? 54 : 58
  const keyboardRowHeight = isCompactHeight ? 68 : 72
  const amountSelection = useMemo(
    () => ({
      start: sendAmount.length,
      end: sendAmount.length,
    }),
    [sendAmount.length],
  )

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

  useEffect(() => {
    if (activeField !== "amount") {
      return
    }

    Keyboard.dismiss()
    const timer = setTimeout(() => {
      amountInputRef.current?.focus()
    }, 0)

    return () => clearTimeout(timer)
  }, [activeField])

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
    Keyboard.dismiss()
    setActiveField("amount")
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

  const handleAmountKeyboardPress = useCallback(
    (key: NumericKeyboardInput) => {
      setOrderDraft({
        sendAmount: applyNumericKeyboardInput(sendAmount, key),
      })
    },
    [sendAmount, setOrderDraft],
  )

  if (!selectedChannel) {
    return (
      <HomeScaffold canGoBack onBack={navigation.goBack} title={t("transfer.order.title")}>
        <PageEmpty body={t("transfer.order.channelMissingBody")} title={t("transfer.order.channelMissingTitle")} />
      </HomeScaffold>
    )
  }

  const pageBackgroundColor = theme.isDark ? "#101114" : "#F2F2F7"
  const cardBackgroundColor = theme.isDark ? "#17191D" : "#FFFFFF"
  const dividerColor = theme.isDark ? "#2A2D33" : "#E5E5EA"
  const cardBorderColor = theme.isDark ? "#262A31" : "#E8E8ED"
  const textColor = theme.colors.text
  const mutedColor = theme.isDark ? "#8B9098" : "#8E8E93"
  const placeholderColor = theme.isDark ? "#5C626D" : "#C7C7CC"
  const warningBackgroundColor = theme.isDark ? "rgba(255, 120, 28, 0.12)" : "#FFF4E6"
  const warningTextColor = theme.isDark ? "#FFB16B" : "#FF6A00"
  const keyboardKeyBackground = theme.isDark ? "#14161A" : "#FFFFFF"
  const keyboardSideBackground = theme.isDark ? "#21252B" : "#F1F1F1"
  const keyboardKeyBorderColor = theme.isDark ? "#272A30" : "#EAEAEA"
  const submitBackgroundColor = canSubmit ? "#F6A04D" : keyboardSideBackground
  const submitTextColor = canSubmit ? "#FFFFFF" : (theme.isDark ? "#7D828C" : "#B6B8BD")
  const caretColor = "#4E8EF7"
  const availableText = t("transfer.order.availableBalance", {
    amount: formatAmount(availableBalance),
    symbol: selectedOption?.sendCoinSymbol || selectedOption?.sendCoinCode || titleSymbol,
  })

  return (
    <View style={styles.screenRoot}>
      <HomeScaffold backgroundColor={cardBackgroundColor} hideHeader reserveFloatingOverlayInset={false} scroll={false} title={t("transfer.order.title")}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={[styles.layoutRoot, { backgroundColor: pageBackgroundColor }]}>
          <View
            style={[
              styles.headerRow,
              {
                backgroundColor: cardBackgroundColor,
                borderBottomColor: dividerColor,
              },
            ]}
          >
            <Pressable accessibilityLabel={t("common.back")} hitSlop={12} onPress={navigation.goBack} style={styles.headerIconButton}>
              <SFSymbolIcon color={textColor} fallbackName="chevron-left" name="chevron.left" size={24} />
            </Pressable>
            <Text numberOfLines={1} style={[styles.headerTitle, { color: textColor }]}>
              {t("transfer.order.title")}
            </Text>
            <Pressable accessibilityLabel={t("transfer.order.recordsAction")} hitSlop={12} onPress={handleOpenRecords} style={styles.headerActionButton}>
              <Text numberOfLines={1} style={[styles.headerActionText, { color: textColor }]}>
                {t("transfer.order.recordsAction")}
              </Text>
            </Pressable>
          </View>

          {bannerVisible ? (
            <View style={[styles.bannerRow, { backgroundColor: warningBackgroundColor }]}>
              <View style={styles.bannerContent}>
                <SFSymbolIcon color={warningTextColor} fallbackName="bullhorn-outline" name="speaker.wave.2.fill" size={20} />
                <Text numberOfLines={1} style={[styles.bannerText, { color: warningTextColor }]}>
                  {t("transfer.order.warningBanner")}
                </Text>
              </View>
              <Pressable hitSlop={10} onPress={() => setBannerVisible(false)} style={styles.bannerCloseButton}>
                <SFSymbolIcon color={warningTextColor} fallbackName="close" name="xmark" size={20} />
              </Pressable>
            </View>
          ) : null}

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
            <View style={styles.recipientSection}>
              <View
                style={[
                  styles.recipientCard,
                  {
                    backgroundColor: cardBackgroundColor,
                    borderColor: cardBorderColor,
                    borderRadius: cardRadius,
                    paddingHorizontal: isCompactHeight ? 16 : 18,
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
            </View>

            <Pressable
              onPress={handleFocusAmount}
              style={[
                styles.card,
                styles.amountCard,
                {
                  backgroundColor: cardBackgroundColor,
                  borderColor: cardBorderColor,
                  borderRadius: cardRadius,
                  minHeight: amountCardMinHeight,
                  paddingHorizontal: isCompactHeight ? 22 : 24,
                  paddingTop: isCompactHeight ? 20 : 22,
                  paddingBottom: isCompactHeight ? 18 : 20,
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
                    contextMenuHidden
                    keyboardType="decimal-pad"
                    onChangeText={handleAmountChange}
                    onFocus={() => setActiveField("amount")}
                    selection={amountSelection}
                    selectionColor={caretColor}
                    showSoftInputOnFocus={false}
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
            </Pressable>

            <View style={styles.amountHelperGroup}>
              <Text style={[styles.amountHelperText, { color: mutedColor }]}>{availableText}</Text>
              {amountSecondaryMessage ? (
                <Text style={[styles.amountHelperText, { color: amountSecondaryColor }]}>{amountSecondaryMessage}</Text>
              ) : null}
            </View>

            <View
              style={[
                styles.card,
                styles.noteCard,
                {
                  backgroundColor: cardBackgroundColor,
                  borderColor: cardBorderColor,
                  borderRadius: cardRadius,
                  paddingHorizontal: isCompactHeight ? 22 : 24,
                  paddingTop: isCompactHeight ? 20 : 22,
                  paddingBottom: isCompactHeight ? 16 : 18,
                },
              ]}
            >
              <Text style={[styles.cardTitle, { color: textColor }]}>{t("transfer.order.noteLabelCompact")}</Text>
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
              <View style={[styles.noteDivider, { backgroundColor: dividerColor }]} />
              <View style={styles.quickNoteWrap}>
                {quickNoteOptions.map(item => (
                  <Pressable
                    key={item.key}
                    onPress={() => handleQuickNotePress(item.label)}
                    style={[
                      styles.quickNoteChip,
                      {
                        borderColor: note === item.label ? "#F6A04D" : keyboardKeyBorderColor,
                        backgroundColor: note === item.label ? (theme.isDark ? "rgba(246,160,77,0.16)" : "#FFF4E8") : cardBackgroundColor,
                      },
                    ]}
                  >
                    <Text style={[styles.quickNoteText, { color: note === item.label ? "#E07E1F" : mutedColor }]}>{item.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <Text style={[styles.assuranceText, { color: mutedColor }]}>{t("transfer.order.assurance")}</Text>
          </ScrollView>

          {activeField === "amount" ? (
            <View style={[styles.keyboardShell, { backgroundColor: cardBackgroundColor, borderTopColor: keyboardKeyBorderColor }]}>
              <Pressable
                hitSlop={10}
                onPress={() => {
                  amountInputRef.current?.blur()
                  setActiveField(null)
                }}
                style={[styles.keyboardCollapseBar, { borderBottomColor: keyboardKeyBorderColor }]}
              >
                <SFSymbolIcon color={mutedColor} fallbackName="chevron-down" name="chevron.down" size={22} />
              </Pressable>

              <View style={styles.keyboardGrid}>
                <View style={styles.keyboardMain}>
                  {NUMERIC_KEY_ROWS.map(row => (
                    <View key={row.join("")} style={styles.keyboardRow}>
                      {row.map(item => (
                        <NumericKeyboardKey
                          backgroundColor={keyboardKeyBackground}
                          borderColor={keyboardKeyBorderColor}
                          key={item}
                          label={item}
                          onPress={handleAmountKeyboardPress}
                          rowHeight={keyboardRowHeight}
                          textColor={textColor}
                        />
                      ))}
                    </View>
                  ))}
                  <View style={styles.keyboardRow}>
                    <NumericKeyboardKey
                      backgroundColor={keyboardKeyBackground}
                      borderColor={keyboardKeyBorderColor}
                      flex={2}
                      label="0"
                      onPress={handleAmountKeyboardPress}
                      rowHeight={keyboardRowHeight}
                      textColor={textColor}
                    />
                    <NumericKeyboardKey
                      backgroundColor={keyboardKeyBackground}
                      borderColor={keyboardKeyBorderColor}
                      label="."
                      onPress={handleAmountKeyboardPress}
                      rowHeight={keyboardRowHeight}
                      textColor={textColor}
                    />
                  </View>
                </View>

                <View style={styles.keyboardSideColumn}>
                  <Pressable
                    onPress={() => handleAmountKeyboardPress("backspace")}
                    style={[
                      styles.keyboardBackspaceKey,
                      {
                        backgroundColor: keyboardKeyBackground,
                        borderColor: keyboardKeyBorderColor,
                        height: keyboardRowHeight,
                      },
                    ]}
                  >
                    <SFSymbolIcon color={textColor} fallbackName="backspace-outline" name="delete.left" size={26} />
                  </Pressable>

                  <Pressable
                    disabled={!canSubmit}
                    onPress={() => void handleSubmit()}
                    style={[
                      styles.keyboardSubmitKey,
                      {
                        backgroundColor: submitBackgroundColor,
                        borderColor: keyboardKeyBorderColor,
                        minHeight: keyboardRowHeight * 3,
                      },
                    ]}
                  >
                    <Text style={[styles.keyboardSubmitText, { color: submitTextColor }]}>
                      {submitting ? t("common.loading") : t("transfer.order.submitPrimary")}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ) : (
            <View style={[styles.footerBar, { backgroundColor: cardBackgroundColor, borderTopColor: dividerColor }]}>
              <Pressable
                disabled={!canSubmit}
                onPress={() => void handleSubmit()}
                style={[
                  styles.footerSubmitButton,
                  {
                    backgroundColor: canSubmit ? "#F6A04D" : keyboardSideBackground,
                    borderRadius: buttonHeight / 2,
                    minHeight: buttonHeight,
                  },
                ]}
              >
                <Text style={[styles.footerSubmitText, { color: canSubmit ? "#FFFFFF" : submitTextColor }]}>
                  {submitting ? t("common.loading") : t("transfer.order.submitPrimary")}
                </Text>
              </Pressable>
            </View>
          )}
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
    paddingLeft: 8,
    paddingRight: 18,
    paddingTop: 2,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerIconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 22,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  headerActionButton: {
    minWidth: 96,
    height: 44,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  headerActionText: {
    fontSize: 17,
    fontWeight: "400",
  },
  bannerRow: {
    minHeight: 44,
    paddingLeft: 16,
    paddingRight: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  bannerContent: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  bannerText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
  },
  bannerCloseButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 18,
  },
  recipientSection: {
    paddingTop: 8,
  },
  recipientCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
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
    fontSize: 20,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  recipientSubtitle: {
    fontSize: 17,
    fontWeight: "400",
  },
  card: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  amountCard: {
    minHeight: 188,
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 20,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.1,
  },
  amountInputShell: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    paddingBottom: 4,
    paddingTop: 14,
    gap: 6,
  },
  amountTextShell: {
    flex: 1,
    minHeight: 72,
    justifyContent: "flex-end",
    position: "relative",
  },
  amountCurrency: {
    paddingBottom: 6,
    fontSize: 46,
    lineHeight: 50,
    fontWeight: "600",
    letterSpacing: -0.5,
  },
  amountPlaceholder: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 6,
    fontSize: 21,
    lineHeight: 26,
    fontWeight: "400",
    letterSpacing: -0.1,
  },
  amountInput: {
    minHeight: 68,
    paddingVertical: 0,
    paddingHorizontal: 0,
    fontSize: 48,
    lineHeight: 54,
    fontWeight: "600",
    letterSpacing: -0.8,
    fontVariant: ["tabular-nums"],
  },
  amountHelperGroup: {
    gap: 4,
    marginTop: 0,
  },
  amountHelperText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "400",
  },
  noteCard: {
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 18,
  },
  noteInput: {
    minHeight: 44,
    marginTop: 12,
    paddingVertical: 0,
    fontSize: 17,
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
    gap: 8,
  },
  quickNoteChip: {
    minHeight: 34,
    paddingHorizontal: 13,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  quickNoteText: {
    fontSize: 15,
    fontWeight: "500",
  },
  assuranceText: {
    textAlign: "center",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "400",
    paddingTop: 2,
  },
  keyboardShell: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  keyboardCollapseBar: {
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  keyboardGrid: {
    flexDirection: "row",
  },
  keyboardMain: {
    flex: 1,
  },
  keyboardRow: {
    flexDirection: "row",
  },
  keyboardKey: {
    flex: 1,
    height: 72,
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  keyboardKeyWide: {
    flex: 2,
  },
  keyboardKeyText: {
    fontSize: 32,
    fontWeight: "500",
    fontVariant: ["tabular-nums"],
  },
  keyboardSideColumn: {
    width: 102,
  },
  keyboardBackspaceKey: {
    alignItems: "center",
    justifyContent: "center",
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  keyboardSubmitKey: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 216,
  },
  keyboardSubmitText: {
    fontSize: 21,
    fontWeight: "600",
  },
  footerBar: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerSubmitButton: {
    minHeight: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  footerSubmitText: {
    fontSize: 20,
    fontWeight: "600",
  },
})

type NumericKeyboardInput = `${number}` | "." | "backspace"

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

function NumericKeyboardKey(props: {
  label: NumericKeyboardInput
  onPress: (value: NumericKeyboardInput) => void
  textColor: string
  backgroundColor: string
  borderColor: string
  rowHeight: number
  flex?: number
}) {
  return (
    <Pressable
      onPress={() => props.onPress(props.label)}
      style={[
        styles.keyboardKey,
        props.flex === 2 ? styles.keyboardKeyWide : null,
        {
          backgroundColor: props.backgroundColor,
          borderColor: props.borderColor,
          flex: props.flex ?? 1,
          height: props.rowHeight,
        },
      ]}
    >
      <Text style={[styles.keyboardKeyText, { color: props.textColor }]}>{props.label}</Text>
    </Pressable>
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

function applyNumericKeyboardInput(currentValue: string, key: NumericKeyboardInput) {
  if (key === "backspace") {
    return currentValue.slice(0, -1)
  }

  if (key === ".") {
    if (currentValue.includes(".")) {
      return currentValue
    }

    return currentValue ? `${currentValue}.` : "0."
  }

  if (currentValue === "0" && !currentValue.includes(".")) {
    return key === "0" ? currentValue : key
  }

  const nextValue = parseDecimalInput(`${currentValue}${key}`)
  return nextValue.startsWith(".") ? `0${nextValue}` : nextValue
}
