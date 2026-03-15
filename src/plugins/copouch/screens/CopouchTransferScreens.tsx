import React, { useEffect, useMemo, useState } from "react"

import type { NativeStackScreenProps } from "@react-navigation/native-stack"
import { useTranslation } from "react-i18next"
import { Text, View } from "react-native"

import type { CopouchStackParamList } from "@/app/navigation/types"
import { navigateRoot } from "@/app/navigation/navigationRef"
import { CopouchScaffold } from "@/plugins/copouch/components/CopouchScaffold"
import {
  AvatarBadge,
  LoadingCard,
  WalletGuard,
  styles,
  useCopouchWalletDetail,
} from "@/plugins/copouch/screens/copouchOperationShared"
import {
  getCopouchAssetBreakdown,
  type CopouchAssetItem,
} from "@/plugins/copouch/services/copouchApi"
import { formatAddress } from "@/features/home/utils/format"
import { FilterChip } from "@/features/orders/components/OrdersUi"
import {
  createBridgeTransferOrder,
  createNormalTransferOrder,
} from "@/shared/exchange/services/orderCreationApi"
import { TransferConfirmModal, type TransferConfirmSuccess, type TransferConfirmVariant } from "@/plugins/transfer/components/TransferConfirmPanel"
import { TransferOrderCreatingOverlay } from "@/plugins/transfer/components/TransferOrderCreatingOverlay"
import {
  getTransferChannels,
  getTransferGasEstimate,
  getTransferOrderOptions,
  getTransferQuote,
  type TransferChannel,
  type TransferOrderOption,
} from "@/shared/exchange/services/exchangeApi"
import { FieldRow, PrimaryButton, SectionCard } from "@/shared/ui/AppFlowUi"
import { formatAmount, parseDecimalInput } from "@/shared/exchange/utils/order"
import { resolveChainNameById } from "@/shared/api/walletAssets"
import { useErrorPresenter } from "@/shared/errors/useErrorPresenter"
import { useBalanceStore } from "@/shared/store/useBalanceStore"
import { useUserStore } from "@/shared/store/useUserStore"
import { useWalletStore } from "@/shared/store/useWalletStore"
import { useAppTheme } from "@/shared/theme/useAppTheme"
import { AppTextField } from "@/shared/ui/AppTextField"

type StackProps<T extends keyof CopouchStackParamList> = NativeStackScreenProps<CopouchStackParamList, T>
type TransferMode = "withdraw" | "deposit"

function CopouchTransferScreen(props: {
  mode: TransferMode
  navigation: StackProps<"CopouchSendSelfScreen">["navigation"] | StackProps<"CopouchReceiveScreen">["navigation"]
  route: StackProps<"CopouchSendSelfScreen">["route"] | StackProps<"CopouchReceiveScreen">["route"]
}) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const { presentError, presentMessage } = useErrorPresenter()
  const chainId = useWalletStore(state => state.chainId)
  const walletAddress = useWalletStore(state => state.address)
  const profile = useUserStore(state => state.profile)
  const balances = useBalanceStore(state => state.balances)
  const loadCoins = useBalanceStore(state => state.loadCoins)
  const currentChainName = resolveChainNameById(chainId)
  const { detail, loading, invalidAccess, reload } = useCopouchWalletDetail(props.route.params.id)
  const [safeAssets, setSafeAssets] = useState<CopouchAssetItem[]>([])
  const [assetLoading, setAssetLoading] = useState(false)
  const [channels, setChannels] = useState<TransferChannel[]>([])
  const [channelLoading, setChannelLoading] = useState(true)
  const [selectedChannelKey, setSelectedChannelKey] = useState("")
  const [options, setOptions] = useState<TransferOrderOption[]>([])
  const [optionsLoading, setOptionsLoading] = useState(false)
  const [selectedOptionCode, setSelectedOptionCode] = useState("")
  const [amount, setAmount] = useState("")
  const [note, setNote] = useState("")
  const [gasLimit, setGasLimit] = useState(0)
  const [quotedOption, setQuotedOption] = useState<TransferOrderOption | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [confirmOrder, setConfirmOrder] = useState<{ orderSn: string; variant: TransferConfirmVariant } | null>(null)
  const [confirmVisible, setConfirmVisible] = useState(false)

  useEffect(() => {
    void reload().catch(() => null)
    if (props.mode === "deposit") {
      void loadCoins(chainId).catch(() => null)
    }
  }, [chainId, loadCoins, props.mode, reload])

  useEffect(() => {
    if (props.mode !== "withdraw") {
      return
    }

    setAssetLoading(true)
    void getCopouchAssetBreakdown({
      walletId: props.route.params.id,
      chainId,
    })
      .then(response => {
        setSafeAssets(response.assets)
      })
      .catch(error => {
        presentError(error, {
          fallbackKey: "copouch.transfer.loadFailed",
        })
      })
      .finally(() => {
        setAssetLoading(false)
      })
  }, [chainId, presentError, props.mode, props.route.params.id])

  useEffect(() => {
    setChannelLoading(true)
    void getTransferChannels(chainId, "transfer")
      .then(nextChannels => {
        setChannels(nextChannels)
        const cpCashChannel = nextChannels.find(ch => ch.channelType === "normal")
        setSelectedChannelKey((cpCashChannel ?? nextChannels[0])?.key ?? "")
      })
      .catch(error => {
        presentError(error, {
          fallbackKey: "copouch.transfer.channelLoadFailed",
        })
      })
      .finally(() => {
        setChannelLoading(false)
      })
  }, [chainId, presentError])

  const selectedChannel = useMemo(() => channels.find(channel => channel.key === selectedChannelKey) ?? channels[0] ?? null, [channels, selectedChannelKey])

  useEffect(() => {
    if (!selectedChannel) {
      setOptions([])
      return
    }

    setOptionsLoading(true)
    void getTransferOrderOptions({
      sendChainName: currentChainName,
      receiveChainName: selectedChannel.receiveChainName,
      channelType: selectedChannel.channelType,
    })
      .then(response => {
        setOptions(response.options)
        setSelectedOptionCode(response.options[0]?.sendCoinCode ?? "")
      })
      .catch(error => {
        presentError(error, {
          fallbackKey: "copouch.transfer.optionLoadFailed",
        })
      })
      .finally(() => {
        setOptionsLoading(false)
      })
  }, [currentChainName, presentError, selectedChannel])

  const selectedOption = useMemo(() => options.find(option => option.sendCoinCode === selectedOptionCode) ?? options[0] ?? null, [options, selectedOptionCode])
  const numericAmount = Number(amount || 0)
  const sourceBalances = useMemo(() => {
    if (props.mode === "withdraw") {
      return safeAssets.reduce<Record<string, number>>((acc, asset) => {
        acc[asset.coinCode] = asset.balance
        return acc
      }, {})
    }

    return balances
  }, [balances, props.mode, safeAssets])

  const availableBalance = selectedOption ? sourceBalances[selectedOption.sendCoinCode] ?? 0 : 0

  useEffect(() => {
    if (!selectedOption?.sendCoinContract || !selectedChannel) {
      setGasLimit(0)
      return
    }

    void getTransferGasEstimate({
      chainName: currentChainName,
      contractAddress: selectedOption.sendCoinContract,
    })
      .then(response => {
        setGasLimit(response.gasLimit)
      })
      .catch(() => {
        setGasLimit(0)
      })
  }, [currentChainName, selectedChannel, selectedOption?.sendCoinContract])

  useEffect(() => {
    if (!selectedOption || !numericAmount || numericAmount <= 0) {
      setQuotedOption(null)
      return
    }

    void getTransferQuote({
      sendCoinCode: selectedOption.sendCoinCode,
      recvCoinCode: selectedOption.recvCoinCode,
      recvAmount: numericAmount,
    })
      .then(quote => {
        setQuotedOption({
          ...selectedOption,
          sellerId: String(quote.sellerId ?? selectedOption.sellerId),
          feeAmount: quote.feeValue,
          recvEstimateAmount: quote.recvAmount,
          sendMinAmount: quote.sendMinAmount,
        })
      })
      .catch(() => {
        setQuotedOption(null)
      })
  }, [numericAmount, selectedOption])

  const resolvedOption = quotedOption && selectedOption && quotedOption.sendCoinCode === selectedOption.sendCoinCode ? quotedOption : selectedOption
  const destinationAddress = props.mode === "withdraw" ? walletAddress ?? "" : detail?.walletAddress ?? ""
  const destinationTitle =
    props.mode === "withdraw" ? profile?.nickname || t("copouch.transfer.me") : detail?.walletName || t("copouch.home.unnamedWallet")

  const validationMessage = useMemo(() => {
    if (!detail) {
      return t("copouch.transfer.walletMissing")
    }

    if (!destinationAddress) {
      return t("copouch.transfer.addressMissing")
    }

    if (!selectedChannel) {
      return t("copouch.transfer.channelMissing")
    }

    if (!resolvedOption) {
      return t("copouch.transfer.optionMissing")
    }

    if (!amount) {
      return t("copouch.transfer.amountRequired")
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return t("copouch.transfer.amountInvalid")
    }

    if (resolvedOption.sendMinAmount > 0 && numericAmount < resolvedOption.sendMinAmount) {
      return t("copouch.transfer.amountTooSmall", { amount: formatAmount(resolvedOption.sendMinAmount) })
    }

    if (numericAmount > availableBalance) {
      return t("copouch.transfer.balanceInsufficient")
    }

    return ""
  }, [amount, availableBalance, destinationAddress, detail, numericAmount, resolvedOption, selectedChannel, t])

  useEffect(() => {
    setConfirmOrder(null)
    setConfirmVisible(false)
  }, [amount, destinationAddress, note, resolvedOption?.recvCoinCode, resolvedOption?.sendCoinCode, selectedChannel?.key])

  const handleSubmit = async () => {
    if (validationMessage) {
      presentMessage(validationMessage)
      return
    }

    if (confirmOrder) {
      setConfirmVisible(true)
      return
    }

    if (!resolvedOption || !selectedChannel) {
      return
    }

    setSubmitting(true)
    try {
      const order =
        selectedChannel.channelType === "normal"
          ? await createNormalTransferOrder({
              coinCode: resolvedOption.sendCoinCode,
              amount: numericAmount,
              recvAddress: destinationAddress,
              note,
              multisigWalletId: props.route.params.id,
            })
          : await createBridgeTransferOrder({
              sellerId: resolvedOption.sellerId ? Number(resolvedOption.sellerId) : undefined,
              recvAddress: destinationAddress,
              recvCoinCode: resolvedOption.recvCoinCode,
              sendCoinCode: resolvedOption.sendCoinCode,
              sendAmount: numericAmount,
              note,
              multisigWalletId: props.route.params.id,
            })

      setConfirmOrder({
        orderSn: order.orderSn,
        variant: selectedChannel.channelType === "normal" ? "normal" : "default",
      })
      setConfirmVisible(true)
    } catch (error) {
      presentError(error, {
        fallbackKey: "copouch.transfer.submitFailed",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirmCompleted = ({ orderSn, walletId }: TransferConfirmSuccess) => {
    setConfirmVisible(false)
    setConfirmOrder(null)
    navigateRoot("TransferStack", {
      screen: "TxPayStatusScreen",
      params: {
        orderSn,
        pay: true,
        walletId,
      },
    })
  }

  return (
    <View style={{ flex: 1 }}>
      <CopouchScaffold
        canGoBack
        onBack={props.navigation.goBack}
        title={props.mode === "withdraw" ? t("copouch.transfer.withdrawTitle") : t("copouch.transfer.depositTitle")}
      >
        <WalletGuard
          invalidBody={t("copouch.transfer.invalidBody")}
          invalidTitle={t("copouch.transfer.invalidTitle")}
          invalidAccess={invalidAccess}
          loading={loading}
          loadingBody={t("copouch.transfer.loading")}
        >
          <SectionCard>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>{t("copouch.transfer.destination")}</Text>
            <View style={styles.destinationCard}>
              <AvatarBadge
                avatarText={(destinationTitle || destinationAddress || "?").slice(0, 1).toUpperCase()}
                label={destinationTitle}
                sublabel={formatAddress(destinationAddress)}
              />
            </View>
          </SectionCard>

          <SectionCard>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>{t("copouch.transfer.assetLabel")}</Text>
            {optionsLoading || assetLoading ? (
              <LoadingCard body={t("copouch.transfer.assetLoading")} />
            ) : (
              <View style={styles.filterWrap}>
                {options.map(option => (
                  <FilterChip
                    key={`${option.sendCoinCode}:${option.recvCoinCode}`}
                    active={selectedOptionCode === option.sendCoinCode}
                    label={option.sendCoinCode}
                    onPress={() => setSelectedOptionCode(option.sendCoinCode)}
                  />
                ))}
              </View>
            )}
            <Text style={[styles.helperText, { color: theme.colors.mutedText }]}>
              {t("copouch.transfer.availableBalance", {
                amount: formatAmount(availableBalance),
                symbol: selectedOption?.sendCoinCode || "--",
              })}
            </Text>
          </SectionCard>

          <SectionCard>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>{t("copouch.transfer.amountLabel")}</Text>
            <AppTextField
              backgroundTone="background"
              keyboardType="decimal-pad"
              onChangeText={value => setAmount(parseDecimalInput(value))}
              placeholder={t("copouch.transfer.amountPlaceholder")}
              value={amount}
            />
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>{t("copouch.transfer.noteLabel")}</Text>
            <AppTextField
              backgroundTone="background"
              multiline
              onChangeText={setNote}
              placeholder={t("copouch.transfer.notePlaceholder")}
              value={note}
            />
            <FieldRow label={t("copouch.transfer.estimate")} value={formatAmount(resolvedOption?.recvEstimateAmount ?? numericAmount)} />
            <FieldRow label={t("copouch.transfer.gasLimit")} value={gasLimit > 0 ? String(gasLimit) : "--"} />
            <FieldRow
              label={t("copouch.transfer.direction")}
              value={props.mode === "withdraw" ? t("copouch.transfer.directionOut") : t("copouch.transfer.directionIn")}
            />
            {validationMessage ? <Text style={[styles.helperText, { color: theme.colors.danger }]}>{validationMessage}</Text> : null}
          </SectionCard>

          <PrimaryButton
            disabled={Boolean(validationMessage) || submitting}
            label={submitting ? t("common.loading") : t("copouch.transfer.next")}
            onPress={() => void handleSubmit()}
          />
        </WalletGuard>
      </CopouchScaffold>

      <TransferOrderCreatingOverlay visible={submitting} />
      {confirmOrder && confirmVisible ? (
        <TransferConfirmModal
          visible
          onClose={() => setConfirmVisible(false)}
          onCompleted={handleConfirmCompleted}
          orderSn={confirmOrder.orderSn}
          variant={confirmOrder.variant}
        />
      ) : null}
    </View>
  )
}

export function CopouchSendSelfScreen(props: StackProps<"CopouchSendSelfScreen">) {
  return <CopouchTransferScreen mode="withdraw" navigation={props.navigation} route={props.route} />
}

export function CopouchReceiveScreen(props: StackProps<"CopouchReceiveScreen">) {
  return <CopouchTransferScreen mode="deposit" navigation={props.navigation} route={props.route} />
}
