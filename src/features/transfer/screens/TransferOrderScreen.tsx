import React, { useCallback, useEffect, useMemo, useState } from "react"

import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { FieldRow, PageEmpty, PrimaryButton, SectionCard, SecondaryButton } from "@/features/transfer/components/TransferUi"
import {
  createPaymentOrder,
  getTransferGasEstimate,
  getTransferOrderOptions,
  getTransferQuote,
  type TransferOrderOption,
} from "@/features/transfer/services/transferApi"
import { useTransferDraftStore } from "@/features/transfer/store/useTransferDraftStore"
import { formatAmount, parseDecimalInput } from "@/features/transfer/utils/order"
import { HomeScaffold } from "@/features/home/components/HomeScaffold"
import { resolveChainNameById } from "@/shared/api/walletAssets"
import { useBalanceStore } from "@/shared/store/useBalanceStore"
import { useWalletStore } from "@/shared/store/useWalletStore"
import { useAppTheme } from "@/shared/theme/useAppTheme"

import type { TransferStackParamList } from "@/app/navigation/types"

type Props = NativeStackScreenProps<
  TransferStackParamList,
  "TransferOrderScreen" | "TransferOrderNormalScreen" | "TransferOrderCopouchScreen"
>

export function TransferOrderScreen({ navigation, route }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const chainId = useWalletStore(state => state.chainId)
  const selectedChannel = useTransferDraftStore(state => state.selectedChannel)
  const recipientAddress = useTransferDraftStore(state => state.recipientAddress)
  const sendAmount = useTransferDraftStore(state => state.sendAmount)
  const note = useTransferDraftStore(state => state.note)
  const selectedSendCoinCode = useTransferDraftStore(state => state.selectedSendCoinCode)
  const selectedRecvCoinCode = useTransferDraftStore(state => state.selectedRecvCoinCode)
  const setOrderDraft = useTransferDraftStore(state => state.setOrderDraft)
  const setLatestOrderSn = useTransferDraftStore(state => state.setLatestOrderSn)
  const balances = useBalanceStore(state => state.balances)
  const balanceCoins = useBalanceStore(state => state.coins)
  const loadCoins = useBalanceStore(state => state.loadCoins)
  const [options, setOptions] = useState<TransferOrderOption[]>([])
  const [selectedOptionCode, setSelectedOptionCode] = useState(selectedSendCoinCode)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [gasAmount, setGasAmount] = useState(0)
  const [quotedOption, setQuotedOption] = useState<TransferOrderOption | null>(null)

  const sendChainName = resolveChainNameById(chainId)
  const isNormalRoute = route.name === "TransferOrderNormalScreen"

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
  const gasBalance = balances[sendChainName] ?? balances.BTT ?? balances.BTT_TEST ?? 0

  const validationMessage = useMemo(() => {
    if (!recipientAddress) {
      return t("transfer.order.addressMissing")
    }

    if (!selectedOption) {
      return t("transfer.order.noOption")
    }

    if (!sendAmount) {
      return t("transfer.order.amountRequired")
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return t("transfer.order.amountInvalid")
    }

    if (selectedOption.sendMinAmount > 0 && numericAmount < selectedOption.sendMinAmount) {
      return t("transfer.order.amountTooSmall", { amount: formatAmount(selectedOption.sendMinAmount) })
    }

    if (numericAmount > availableBalance) {
      return t("transfer.order.balanceInsufficient")
    }

    if (gasAmount > 0 && gasBalance < gasAmount) {
      return t("transfer.order.gasInsufficient")
    }

    return ""
  }, [availableBalance, gasAmount, gasBalance, numericAmount, recipientAddress, selectedOption, sendAmount, t])

  useEffect(() => {
    void loadCoins(chainId)
  }, [chainId, loadCoins])

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
    let mounted = true

    if (!selectedOption?.sendCoinContract) {
      setGasAmount(0)
      return
    }

    void (async () => {
      try {
        const gas = await getTransferGasEstimate({
          chainName: sendChainName,
          contractAddress: selectedOption.sendCoinContract,
        })

        if (mounted) {
          setGasAmount(gas.gasAmount)
        }
      } catch {
        if (mounted) {
          setGasAmount(0)
        }
      }
    })()

    return () => {
      mounted = false
    }
  }, [selectedOption?.sendCoinContract, sendChainName])

  useEffect(() => {
    let mounted = true

    if (!selectedOption || !selectedOption.recvCoinCode || !numericAmount || numericAmount <= 0) {
      setQuotedOption(null)
      return
    }

    void (async () => {
      try {
        const quote = await getTransferQuote({
          sendCoinCode: selectedOption.sendCoinCode,
          recvCoinCode: selectedOption.recvCoinCode,
          recvAmount: numericAmount,
        })

        if (!mounted) {
          return
        }

        setQuotedOption({
          ...selectedOption,
          sellerId: String(quote.sellerId ?? selectedOption.sellerId),
          feeAmount: quote.feeValue,
          recvEstimateAmount: quote.recvAmount,
          sendMinAmount: quote.sendMinAmount,
        })
      } catch {
        if (mounted) {
          setQuotedOption(null)
        }
      }
    })()

    return () => {
      mounted = false
    }
  }, [numericAmount, selectedOption])

  const resolvedOption = quotedOption && selectedOption && quotedOption.sendCoinCode === selectedOption.sendCoinCode ? quotedOption : selectedOption

  const handleSubmit = useCallback(async () => {
    if (!resolvedOption || validationMessage) {
      Alert.alert(t("common.errorTitle"), validationMessage || t("transfer.order.noOption"))
      return
    }

    setSubmitting(true)

    try {
      const result = await createPaymentOrder({
        sellerId: resolvedOption.sellerId,
        recvCoinCode: resolvedOption.recvCoinCode,
        sendCoinCode: resolvedOption.sendCoinCode,
        sendAmount: numericAmount,
        recvAddress: recipientAddress,
        note,
      })

      setLatestOrderSn(result.orderSn)
      setOrderDraft({
        sendCoinCode: resolvedOption.sendCoinCode,
        recvCoinCode: resolvedOption.recvCoinCode,
      })

      navigation.navigate(isNormalRoute ? "TransferConfirmNormalScreen" : "TransferConfirmScreen", {
        orderSn: result.orderSn,
      })
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
    isNormalRoute,
    navigation,
    note,
    numericAmount,
    recipientAddress,
    resolvedOption,
    setLatestOrderSn,
    setOrderDraft,
    t,
    validationMessage,
  ])

  if (!selectedChannel) {
    return (
      <HomeScaffold canGoBack onBack={navigation.goBack} title={t("transfer.order.title")}>
        <PageEmpty body={t("transfer.order.channelMissingBody")} title={t("transfer.order.channelMissingTitle")} />
      </HomeScaffold>
    )
  }

  const selectedCoin = selectedOption ? balanceCoins.find(item => item.code === selectedOption.sendCoinCode) : null

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("transfer.order.title")} scroll={false}>
      <ScrollView bounces={false} contentContainerStyle={styles.content}>
        <SectionCard>
          <FieldRow label={t("transfer.order.network")} value={selectedChannel.receiveChainFullName} emphasized />
          <FieldRow label={t("transfer.order.address")} value={recipientAddress} />
        </SectionCard>

        <SectionCard>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t("transfer.order.coinTitle")}</Text>
          {loading ? (
            <Text style={[styles.helperText, { color: theme.colors.mutedText }]}>{t("transfer.order.loading")}</Text>
          ) : options.length === 0 ? (
            <Text style={[styles.helperText, { color: theme.colors.mutedText }]}>{t("transfer.order.empty")}</Text>
          ) : (
            <View style={styles.optionList}>
              {options.map(item => {
                const isSelected =
                  selectedOption?.sendCoinCode === item.sendCoinCode && selectedOption?.recvCoinCode === item.recvCoinCode

                return (
                  <Pressable
                    key={`${item.sendCoinCode}-${item.recvCoinCode || "same"}`}
                    onPress={() => {
                      setSelectedOptionCode(item.sendCoinCode)
                      setOrderDraft({
                        sendCoinCode: item.sendCoinCode,
                        recvCoinCode: item.recvCoinCode,
                      })
                    }}
                    style={[
                      styles.optionItem,
                      {
                        borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                        backgroundColor: isSelected ? (theme.isDark ? "#0B2530" : "#EFF6FF") : theme.colors.background,
                      },
                    ]}
                  >
                    <View style={styles.optionMeta}>
                      <Text style={[styles.optionTitle, { color: theme.colors.text }]}>{item.sendCoinSymbol}</Text>
                      <Text style={[styles.optionBody, { color: theme.colors.mutedText }]}>
                        {item.recvCoinSymbol
                          ? t("transfer.order.optionBody", {
                              send: item.sendCoinSymbol,
                              recv: item.recvCoinSymbol,
                            })
                          : t("transfer.order.optionBodyNormal", { send: item.sendCoinSymbol })}
                      </Text>
                    </View>
                    <Text style={[styles.optionBadge, { color: theme.colors.primary }]}>
                      {isSelected ? t("transfer.order.selected") : ""}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          )}
        </SectionCard>

        <SectionCard>
          <Text style={[styles.inputLabel, { color: theme.colors.text }]}>{t("transfer.order.amountLabel")}</Text>
          <TextInput
            keyboardType="decimal-pad"
            onChangeText={value => setOrderDraft({ sendAmount: parseDecimalInput(value) })}
            placeholder={t("transfer.order.amountPlaceholder")}
            placeholderTextColor={theme.colors.mutedText}
            style={[
              styles.amountInput,
              {
                color: theme.colors.text,
                borderColor: validationMessage ? "#DC2626" : theme.colors.border,
                backgroundColor: theme.colors.background,
              },
            ]}
            value={sendAmount}
          />
          <FieldRow
            label={t("transfer.order.available")}
            value={`${formatAmount(availableBalance)} ${selectedOption?.sendCoinSymbol ?? ""}`.trim()}
          />
          <FieldRow
            label={t("transfer.order.receiveEstimate")}
            value={
                  selectedOption?.recvCoinSymbol
                ? `${formatAmount((resolvedOption?.recvEstimateAmount || 0) || (numericAmount || 0))} ${selectedOption.recvCoinSymbol}`
                : `${formatAmount(numericAmount)} ${selectedOption?.sendCoinSymbol ?? ""}`.trim()
            }
          />
          <FieldRow
            label={t("transfer.order.gasEstimate")}
            value={`${formatAmount(gasAmount)} ${sendChainName}`.trim()}
          />
          {selectedCoin ? (
            <FieldRow label={t("transfer.order.assetChain")} value={`${selectedCoin.chainName} / ${selectedCoin.symbol}`} />
          ) : null}
          {validationMessage ? <Text style={styles.errorText}>{validationMessage}</Text> : null}
        </SectionCard>

        <SectionCard>
          <Text style={[styles.inputLabel, { color: theme.colors.text }]}>{t("transfer.order.noteLabel")}</Text>
          <TextInput
            multiline
            onChangeText={value => setOrderDraft({ note: value.slice(0, 50) })}
            placeholder={t("transfer.order.notePlaceholder")}
            placeholderTextColor={theme.colors.mutedText}
            style={[
              styles.noteInput,
              {
                color: theme.colors.text,
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.background,
              },
            ]}
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
  )
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  helperText: {
    fontSize: 13,
    lineHeight: 20,
  },
  optionList: {
    gap: 10,
  },
  optionItem: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  optionMeta: {
    flex: 1,
    gap: 4,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  optionBody: {
    fontSize: 12,
  },
  optionBadge: {
    fontSize: 12,
    fontWeight: "700",
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
    color: "#DC2626",
    fontSize: 12,
    lineHeight: 18,
  },
  footerButtons: {
    gap: 10,
    marginTop: 4,
    marginBottom: 24,
  },
})
