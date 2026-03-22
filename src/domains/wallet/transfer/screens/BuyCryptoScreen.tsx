import React, { useEffect, useMemo, useState } from "react"

import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import type { TransferStackParamList } from "@/app/navigation/types"
import { HomeScaffold } from "@/shared/ui/HomeScaffold"
import { createNativeOrder, getReceiveConfig } from "@/shared/receive/services/receiveEntryApi"
import { FieldRow, SectionCard } from "@/shared/ui/AppFlowUi"
import { getCoinList, resolveChainNameById, type WalletChainName, type WalletCoin } from "@/shared/api/walletAssets"
import { useWalletBalanceQuery } from "@/shared/queries/balanceQueries"
import { useWalletStore } from "@/shared/store/useWalletStore"
import { useToast } from "@/shared/toast/useToast"
import { useAppTheme } from "@/shared/theme/useAppTheme"
import { AppButton } from "@/shared/ui/AppButton"
import { AppTextField } from "@/shared/ui/AppTextField"

type Props = NativeStackScreenProps<TransferStackParamList, "BuyCryptoScreen">

export function BuyCryptoScreen({ navigation, route }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const { showToast } = useToast()
  const chainId = useWalletStore(state => state.chainId)
  const walletAddress = useWalletStore(state => state.address)
  const balanceQuery = useWalletBalanceQuery({
    address: walletAddress,
    chainId,
  })
  const [amount, setAmount] = useState("")
  const [address, setAddress] = useState(route.params?.recvAddress ?? walletAddress ?? "")
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sellerId, setSellerId] = useState(route.params?.sellerId ?? "")
  const [coins, setCoins] = useState<WalletCoin[]>([])
  const [sendCoinCode, setSendCoinCode] = useState(route.params?.sendCoinCode ?? "")
  const [recvCoinCode, setRecvCoinCode] = useState(route.params?.recvCoinCode ?? "")
  const quickAmounts = [10, 50, 100]
  const balances = balanceQuery.data?.balances ?? {}

  useEffect(() => {
    let active = true

    void (async () => {
      setLoading(true)
      try {
        const payChain = route.params?.payChain ?? resolveChainNameById(chainId)
        const [config, chainCoins] = await Promise.all([
          getReceiveConfig({
            payChain,
            chainId,
          }),
          getCoinList(payChain as WalletChainName),
        ])

        if (!active) {
          return
        }

        setCoins(chainCoins)
        setSellerId(route.params?.sellerId || config.sellerId)
        setSendCoinCode(route.params?.sendCoinCode || config.sendCoinCode || chainCoins[0]?.code || "")
        setRecvCoinCode(route.params?.recvCoinCode || config.recvCoinCode || chainCoins[0]?.code || "")
      } catch {
        if (active) {
          Alert.alert(t("common.errorTitle"), t("receive.buy.loadFailed"))
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    })()

    return () => {
      active = false
    }
  }, [chainId, route.params?.payChain, route.params?.recvCoinCode, route.params?.sellerId, route.params?.sendCoinCode, t])

  const sendCoin = useMemo(() => coins.find(item => item.code === sendCoinCode) ?? null, [coins, sendCoinCode])
  const recvCoin = useMemo(() => coins.find(item => item.code === recvCoinCode) ?? null, [coins, recvCoinCode])
  const sendBalance = sendCoinCode ? balances[sendCoinCode] ?? 0 : 0

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("receive.buy.title")} scroll={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <SectionCard>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t("receive.buy.orderInfo")}</Text>
          <FieldRow label={t("receive.buy.payChain")} value={route.params?.payChain ?? resolveChainNameById(chainId)} />
          <FieldRow label={t("receive.buy.payAsset")} value={sendCoin?.symbol || sendCoinCode || "-"} />
          <FieldRow label={t("receive.buy.receiveAsset")} value={recvCoin?.symbol || recvCoinCode || "-"} />
          <FieldRow label={t("receive.buy.balance")} value={`${sendBalance} ${sendCoin?.symbol || sendCoinCode || ""}`.trim() || "-"} />
        </SectionCard>

        <SectionCard>
          <Text style={[styles.label, { color: theme.colors.text }]}>{t("receive.buy.amount")}</Text>
          <AppTextField
            backgroundTone="background"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="10"
          />
          <View style={styles.quickRow}>
            {quickAmounts.map(item => (
              <Pressable
                key={item}
                onPress={() => setAmount(String(item))}
                style={[styles.quickButton, { borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
              >
                <Text style={[styles.quickText, { color: theme.colors.text }]}>{item}</Text>
              </Pressable>
            ))}
          </View>
        </SectionCard>

        <SectionCard>
          <Text style={[styles.label, { color: theme.colors.text }]}>{t("receive.buy.payAsset")}</Text>
          <View style={styles.chipWrap}>
            {coins.map(item => {
              const active = item.code === sendCoinCode
              return (
                <Pressable
                  key={`send-${item.code}`}
                  onPress={() => setSendCoinCode(item.code)}
                  style={[
                    styles.chip,
                    {
                      borderColor: active ? theme.colors.primary : theme.colors.border,
                      backgroundColor: active ? theme.colors.primary : theme.colors.background,
                    },
                  ]}
                >
                  <Text style={[styles.chipText, { color: active ? "#FFFFFF" : theme.colors.text }]}>{item.symbol || item.code}</Text>
                </Pressable>
              )
            })}
          </View>
        </SectionCard>

        <SectionCard>
          <Text style={[styles.label, { color: theme.colors.text }]}>{t("receive.buy.receiveAsset")}</Text>
          <View style={styles.chipWrap}>
            {coins.map(item => {
              const active = item.code === recvCoinCode
              return (
                <Pressable
                  key={`recv-${item.code}`}
                  onPress={() => setRecvCoinCode(item.code)}
                  style={[
                    styles.chip,
                    {
                      borderColor: active ? theme.colors.primary : theme.colors.border,
                      backgroundColor: active ? theme.colors.primary : theme.colors.background,
                    },
                  ]}
                >
                  <Text style={[styles.chipText, { color: active ? "#FFFFFF" : theme.colors.text }]}>{item.symbol || item.code}</Text>
                </Pressable>
              )
            })}
          </View>
        </SectionCard>

        <SectionCard>
          <Text style={[styles.label, { color: theme.colors.text }]}>{t("receive.buy.address")}</Text>
          <AppTextField
            backgroundTone="background"
            value={address}
            onChangeText={setAddress}
            placeholder={t("receive.buy.addressPlaceholder")}
          />
        </SectionCard>

        <AppButton
          disabled={loading || submitting || !amount || !address || !sellerId || !sendCoinCode || !recvCoinCode}
          label={submitting ? t("common.loading") : t("receive.buy.submit")}
          onPress={() => {
            void (async () => {
              setSubmitting(true)
              try {
                const result = await createNativeOrder({
                  amount: Number(amount),
                  recvAddress: address,
                  recvCoinCode,
                  sendCoinCode,
                  sellerId,
                })
                showToast({ message: t("receive.buy.createSuccess", { orderSn: result.orderSn || "-" }), tone: "success" })
              } catch {
                showToast({ message: t("receive.buy.createFailed"), tone: "error" })
              } finally {
                setSubmitting(false)
              }
            })()
          }}
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
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
  },
  quickRow: {
    flexDirection: "row",
    gap: 8,
  },
  quickButton: {
    minWidth: 60,
    minHeight: 36,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  quickText: {
    fontSize: 13,
    fontWeight: "700",
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    minHeight: 36,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "700",
  },
})
