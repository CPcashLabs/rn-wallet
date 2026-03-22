import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { Alert, ScrollView, StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { TransferConfirmModal, type TransferConfirmSuccess, type TransferConfirmVariant } from "@/domains/wallet/transfer/components/TransferConfirmPanel"
import { TransferOrderCreatingOverlay } from "@/domains/wallet/transfer/components/TransferOrderCreatingOverlay"
import { FieldRow, PageEmpty, PrimaryButton, SectionCard, SecondaryButton } from "@/shared/ui/AppFlowUi"
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
import { HomeScaffold } from "@/shared/ui/HomeScaffold"
import { resolveChainNameById } from "@/shared/api/walletAssets"
import { formatAmount, parseDecimalInput } from "@/shared/exchange/utils/order"
import { useWalletBalanceQuery } from "@/shared/queries/balanceQueries"
import { useWalletStore } from "@/shared/store/useWalletStore"
import { useAppTheme } from "@/shared/theme/useAppTheme"
import { AppTextField } from "@/shared/ui/AppTextField"

import type { TransferStackParamList } from "@/app/navigation/types"

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

  if (!selectedChannel) {
    return (
      <HomeScaffold canGoBack onBack={navigation.goBack} title={t("transfer.order.title")}>
        <PageEmpty body={t("transfer.order.channelMissingBody")} title={t("transfer.order.channelMissingTitle")} />
      </HomeScaffold>
    )
  }

  return (
    <View style={styles.screenRoot}>
      <HomeScaffold canGoBack onBack={navigation.goBack} title={t("transfer.order.title")} scroll={false}>
        <ScrollView bounces={false} contentContainerStyle={styles.content}>
          <SectionCard>
            <FieldRow label={t("transfer.order.network")} value={selectedChannel.receiveChainFullName} emphasized />
            <FieldRow label={t("transfer.order.address")} value={recipientAddress} />
          </SectionCard>

          <SectionCard>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>{t("transfer.order.amountLabel")}</Text>
            <AppTextField
              backgroundTone="background"
              error={inputValidationMessage || (quoteFailed ? quoteValidationMessage : null)}
              keyboardType="decimal-pad"
              onChangeText={value => setOrderDraft({ sendAmount: parseDecimalInput(value) })}
              placeholder={t("transfer.order.amountPlaceholder")}
              value={sendAmount}
            />
            <FieldRow
              label={t("transfer.order.available")}
              value={`${formatAmount(availableBalance)} ${selectedOption?.sendCoinSymbol ?? ""}`.trim()}
            />
            <FieldRow
              label={t("transfer.order.receiveEstimate")}
              value={
                quoteRequired
                  ? hasCurrentQuote && resolvedOption?.recvCoinSymbol
                    ? `${formatAmount(resolvedOption.recvEstimateAmount)} ${resolvedOption.recvCoinSymbol}`
                    : "--"
                  : selectedOption?.recvCoinSymbol
                    ? `${formatAmount(resolvedOption?.recvEstimateAmount ?? 0)} ${selectedOption.recvCoinSymbol}`
                  : `${formatAmount(numericAmount)} ${selectedOption?.sendCoinSymbol ?? ""}`.trim()
              }
            />
          </SectionCard>

          <SectionCard>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>{t("transfer.order.noteLabel")}</Text>
            <AppTextField
              backgroundTone="background"
              multiline
              onChangeText={value => setOrderDraft({ note: value.slice(0, 50) })}
              placeholder={t("transfer.order.notePlaceholder")}
              value={note}
            />
          </SectionCard>

          <View style={styles.footerButtons}>
            <SecondaryButton label={t("common.cancel")} onPress={navigation.goBack} disabled={submitting} />
            <PrimaryButton
              label={submitting ? t("common.loading") : t("common.next")}
              onPress={() => void handleSubmit()}
              disabled={submitting || Boolean(validationMessage) || loading || options.length === 0}
            />
          </View>
        </ScrollView>
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
  content: {
    padding: 16,
    gap: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  amountInput: {
    minHeight: 52,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 20,
    fontWeight: "700",
  },
  noteInput: {
    minHeight: 96,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlignVertical: "top",
    fontSize: 14,
  },
  errorText: {
    fontSize: 12,
    lineHeight: 18,
  },
  footerButtons: {
    gap: 10,
    marginTop: 4,
    marginBottom: 24,
  },
})
