import React, { useEffect, useState } from "react"

import { ActivityIndicator, Pressable, Text } from "react-native"
import { useTranslation } from "react-i18next"

import { HomeScaffold } from "@/features/home/components/HomeScaffold"
import { getChainList, getExchangeRates, type ExchangeRateItem } from "@/features/settings/services/settingsApi"
import { getCurrentLanguage, setLanguage } from "@/shared/i18n"
import { getJson, getNumber, setJson, setNumber } from "@/shared/storage/kvStorage"
import { KvStorageKeys } from "@/shared/storage/sessionKeys"
import { useBalanceStore } from "@/shared/store/useBalanceStore"
import { DEFAULT_WALLET_CHAIN_ID, useWalletStore } from "@/shared/store/useWalletStore"
import { resetRpcProvider } from "@/shared/web3/balanceService"

import { Card, DEFAULT_RATES, LOCAL_NODE_MAP, Row, type StackProps, styles } from "@/features/settings/screens/settingsShared"

type SelectedCurrency = {
  currency: string
  symbol: string
}

export function LanguageScreen({ navigation }: StackProps<"LanguageScreen">) {
  const { t } = useTranslation()
  const currentLanguage = getCurrentLanguage()

  const handleSelect = async (language: "zh-CN" | "en-US") => {
    await setLanguage(language)
    navigation.goBack()
  }

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("settingsHub.language.title")}>
      <Card>
        <Row detail={currentLanguage === "zh-CN" ? t("settingsHub.language.selected") : undefined} label={t("settingsHub.language.zhCN")} onPress={() => void handleSelect("zh-CN")} />
        <Row detail={currentLanguage === "en-US" ? t("settingsHub.language.selected") : undefined} label={t("settingsHub.language.enUS")} onPress={() => void handleSelect("en-US")} />
      </Card>
    </HomeScaffold>
  )
}

export function UnitScreen({ navigation }: StackProps<"UnitScreen">) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [rates, setRates] = useState<ExchangeRateItem[]>(DEFAULT_RATES)
  const [selectedCurrency, setSelectedCurrency] = useState<SelectedCurrency>(() => getJson<SelectedCurrency>(KvStorageKeys.SelectedCurrency) ?? { currency: "USD", symbol: "$" })

  useEffect(() => {
    void (async () => {
      try {
        const nextRates = await getExchangeRates()
        if (nextRates.length > 0) {
          setRates(nextRates)
        }
      } catch {
        setRates(DEFAULT_RATES)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const handleSave = () => {
    setJson(KvStorageKeys.SelectedCurrency, selectedCurrency)
    navigation.goBack()
  }

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} right={<Pressable onPress={handleSave}><Text style={styles.headerLink}>{t("settingsHub.common.save")}</Text></Pressable>} title={t("settingsHub.unit.title")}>
      {loading ? <ActivityIndicator /> : null}
      <Card>
        {rates.map(item => (
          <Row detail={selectedCurrency.currency === item.currency ? t("settingsHub.language.selected") : undefined} key={item.currency} label={`${item.currency} (${item.symbol})`} onPress={() => setSelectedCurrency(item)} />
        ))}
      </Card>
    </HomeScaffold>
  )
}

export function NodeSetupScreen({ navigation }: StackProps<"NodeSetupScreen">) {
  const { t } = useTranslation()
  const walletChainId = useWalletStore(state => state.chainId) ?? DEFAULT_WALLET_CHAIN_ID
  const loadCoins = useBalanceStore(state => state.loadCoins)
  const clearBalance = useBalanceStore(state => state.clear)
  const [nodes, setNodes] = useState<string[]>(LOCAL_NODE_MAP[String(walletChainId)] ?? LOCAL_NODE_MAP["199"])
  const [selectedIndex, setSelectedIndex] = useState(getNumber(KvStorageKeys.WalletRpcIndex) ?? 0)

  useEffect(() => {
    void (async () => {
      try {
        const chains = await getChainList()
        const current = chains.find(item => item.chainId === String(walletChainId))
        if (current?.rpcUrls?.length) {
          setNodes(current.rpcUrls)
        }
      } catch {
        setNodes(LOCAL_NODE_MAP[String(walletChainId)] ?? LOCAL_NODE_MAP["199"])
      }
    })()
  }, [walletChainId])

  const handleSelect = (index: number) => {
    setSelectedIndex(index)
    setNumber(KvStorageKeys.WalletRpcIndex, index)
    resetRpcProvider(walletChainId)
    clearBalance()
    void loadCoins(walletChainId)
  }

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("settingsHub.node.title")}>
      <Card>
        <Text style={styles.sectionLabel}>{t("settingsHub.node.description")}</Text>
        {nodes.map((node, index) => (
          <Row detail={selectedIndex === index ? t("settingsHub.language.selected") : t("settingsHub.node.nodeDetail", { index: index + 1 })} key={node} label={node} onPress={() => handleSelect(index)} />
        ))}
      </Card>
    </HomeScaffold>
  )
}
