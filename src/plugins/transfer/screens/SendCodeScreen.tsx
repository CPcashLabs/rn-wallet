import React, { useEffect, useMemo, useState } from "react"

import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { PrimaryButton, SectionCard } from "@/shared/ui/AppFlowUi"
import { createSendCodeOrder, getTransferOrderOptions, type TransferOrderOption } from "@/plugins/transfer/services/transferApi"
import { useTransferDraftStore } from "@/plugins/transfer/store/useTransferDraftStore"
import { parseDecimalInput } from "@/plugins/transfer/utils/order"
import { HomeScaffold } from "@/features/home/components/HomeScaffold"
import { resolveChainNameById } from "@/shared/api/walletAssets"
import { useWalletStore } from "@/shared/store/useWalletStore"
import { useAppTheme } from "@/shared/theme/useAppTheme"
import { AppTextField } from "@/shared/ui/AppTextField"

import type { TransferStackParamList } from "@/app/navigation/types"

type Props = NativeStackScreenProps<TransferStackParamList, "SendCodeScreen">

export function SendCodeScreen({ navigation }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const chainId = useWalletStore(state => state.chainId)
  const selectedChannel = useTransferDraftStore(state => state.selectedChannel)
  const appendSendHistory = useTransferDraftStore(state => state.appendSendHistory)
  const setLatestOrderSn = useTransferDraftStore(state => state.setLatestOrderSn)
  const [options, setOptions] = useState<TransferOrderOption[]>([])
  const [selectedCode, setSelectedCode] = useState("")
  const [amount, setAmount] = useState("")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const selectedOption = useMemo(() => options.find(item => item.sendCoinCode === selectedCode) ?? options[0] ?? null, [options, selectedCode])

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
          sendChainName: resolveChainNameById(chainId),
          receiveChainName: selectedChannel.receiveChainName,
          channelType: selectedChannel.channelType,
        })

        if (mounted) {
          setOptions(result.options.filter(item => item.recvCoinCode))
          setSelectedCode(result.options[0]?.sendCoinCode ?? "")
        }
      } catch {
        if (mounted) {
          Alert.alert(t("common.errorTitle"), t("transfer.send.loadFailed"))
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
  }, [chainId, selectedChannel, t])

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("transfer.send.sendCode")} scroll={false}>
      <ScrollView bounces={false} contentContainerStyle={styles.content}>
        <SectionCard>
          <Text style={[styles.label, { color: theme.colors.text }]}>{t("transfer.send.pickAsset")}</Text>
          <View style={styles.optionList}>
            {options.map(item => (
              <Pressable
                key={`${item.sendCoinCode}-${item.recvCoinCode}`}
                onPress={() => setSelectedCode(item.sendCoinCode)}
                style={[
                  styles.option,
                  {
                    borderColor: selectedOption?.sendCoinCode === item.sendCoinCode ? theme.colors.primary : theme.colors.border,
                    backgroundColor: theme.colors.background,
                  },
                ]}
              >
                <Text style={[styles.optionTitle, { color: theme.colors.text }]}>{item.sendCoinSymbol}</Text>
                <Text style={[styles.optionBody, { color: theme.colors.mutedText }]}>
                  {item.recvCoinSymbol || item.recvCoinCode}
                </Text>
              </Pressable>
            ))}
          </View>
        </SectionCard>

        <SectionCard>
          <Text style={[styles.label, { color: theme.colors.text }]}>{t("transfer.send.amount")}</Text>
          <AppTextField
            backgroundTone="background"
            keyboardType="decimal-pad"
            onChangeText={value => setAmount(parseDecimalInput(value))}
            placeholder={t("transfer.send.amountPlaceholder")}
            value={amount}
          />
        </SectionCard>

        <PrimaryButton
          label={submitting ? t("common.loading") : t("common.next")}
          onPress={() => {
            if (!selectedOption || !amount) {
              Alert.alert(t("common.errorTitle"), t("transfer.send.createMissing"))
              return
            }

            void (async () => {
              setSubmitting(true)
              try {
                const result = await createSendCodeOrder({
                  sellerId: selectedOption.sellerId,
                  recvCoinCode: selectedOption.recvCoinCode,
                  sendCoinCode: selectedOption.sendCoinCode,
                  sendAmount: Number(amount),
                })

                setLatestOrderSn(result.orderSn)
                appendSendHistory({
                  orderSn: result.orderSn,
                  kind: "sendCode",
                })
                navigation.replace("SendCodeDetailScreen", {
                  orderSn: result.orderSn,
                })
              } catch {
                Alert.alert(t("common.errorTitle"), t("transfer.send.createFailed"))
              } finally {
                setSubmitting(false)
              }
            })()
          }}
          disabled={loading || submitting || !selectedOption || !amount}
        />
      </ScrollView>
    </HomeScaffold>
  )
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
  },
  optionList: {
    gap: 10,
  },
  option: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 12,
    gap: 4,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  optionBody: {
    fontSize: 12,
  },
  input: {
    minHeight: 52,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 20,
    fontWeight: "700",
  },
})
