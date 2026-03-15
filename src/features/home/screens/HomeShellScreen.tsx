import React, { useEffect, useMemo, useRef, useState } from "react"

import { Alert, Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { bindInviteCode } from "@/features/auth/services/authApi"
import { buildHomeBalanceCacheKey, readHomeBalanceCache, writeHomeBalanceCache } from "@/features/home/services/homeBalanceCache"
import { getInviteBindingMessage } from "@/features/auth/utils/authMessages"
import { HomeScaffold } from "@/features/home/components/HomeScaffold"
import { formatAddress, formatCurrency } from "@/features/home/utils/format"
import { HomeMessagePreview } from "@/features/messages/components/HomeMessagePreview"
import { navigateRoot } from "@/app/navigation/navigationRef"
import { openPluginHost } from "@/shared/plugins/navigation"
import { getBoolean, setBoolean } from "@/shared/storage/kvStorage"
import { KvStorageKeys } from "@/shared/storage/sessionKeys"
import { useBalanceStore } from "@/shared/store/useBalanceStore"
import { useWalletStore } from "@/shared/store/useWalletStore"
import { useToast } from "@/shared/toast/useToast"
import { useAppTheme } from "@/shared/theme/useAppTheme"
import { AppleBrandMark } from "@/shared/ui/AppleBrandMark"

import type { HomeTabStackParamList } from "@/app/navigation/types"

type Props = NativeStackScreenProps<HomeTabStackParamList, "HomeShellScreen">

export function HomeShellScreen({ navigation, route }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const { showToast } = useToast()
  const walletAddress = useWalletStore(state => state.address)
  const walletChainId = useWalletStore(state => state.chainId)
  const balanceWalletKey = useBalanceStore(state => state.walletKey)
  const coins = useBalanceStore(state => state.coins)
  const balances = useBalanceStore(state => state.balances)
  const loadCoins = useBalanceStore(state => state.loadCoins)
  const [showBalance, setShowBalance] = useState(true)
  const inviteHandledRef = useRef(false)
  const balanceValueAnim = useRef(new Animated.Value(0)).current
  const displayedBalanceValueRef = useRef(0)
  const hasAppliedLiveValueRef = useRef(false)
  const [displayedBalanceValue, setDisplayedBalanceValue] = useState(0)

  const totalAssetValue = useMemo(() => {
    return coins.reduce((sum, coin) => {
      const balance = balances[coin.code] ?? 0
      return sum + balance * coin.price
    }, 0)
  }, [balances, coins])
  const balanceCacheKey = useMemo(
    () =>
      buildHomeBalanceCacheKey({
        address: walletAddress,
        chainId: walletChainId,
      }),
    [walletAddress, walletChainId],
  )

  useEffect(() => {
    const persisted = getBoolean(KvStorageKeys.ShowBalance)
    if (typeof persisted === "boolean") {
      setShowBalance(persisted)
    }
  }, [])

  useEffect(() => {
    void loadCoins(walletChainId)
  }, [loadCoins, walletAddress, walletChainId])

  useEffect(() => {
    const listenerId = balanceValueAnim.addListener(({ value }) => {
      displayedBalanceValueRef.current = value
      setDisplayedBalanceValue(value)
    })

    return () => {
      balanceValueAnim.removeListener(listenerId)
    }
  }, [balanceValueAnim])

  useEffect(() => {
    hasAppliedLiveValueRef.current = false
    const cachedValue = balanceCacheKey ? readHomeBalanceCache(balanceCacheKey)?.totalAssetValue ?? 0 : 0

    balanceValueAnim.stopAnimation()
    balanceValueAnim.setValue(cachedValue)
    displayedBalanceValueRef.current = cachedValue
    setDisplayedBalanceValue(cachedValue)
  }, [balanceCacheKey, balanceValueAnim])

  useEffect(() => {
    if (
      !balanceCacheKey
      || balanceWalletKey !== balanceCacheKey
      || coins.length === 0
      || !Number.isFinite(totalAssetValue)
    ) {
      return
    }

    writeHomeBalanceCache(balanceCacheKey, {
      totalAssetValue,
    })

    const currentValue = displayedBalanceValueRef.current
    const nextValue = totalAssetValue

    if (Math.abs(currentValue - nextValue) < 0.005) {
      hasAppliedLiveValueRef.current = true
      balanceValueAnim.stopAnimation()
      balanceValueAnim.setValue(nextValue)
      displayedBalanceValueRef.current = nextValue
      setDisplayedBalanceValue(nextValue)
      return
    }

    const duration = hasAppliedLiveValueRef.current ? 320 : 420
    hasAppliedLiveValueRef.current = true

    balanceValueAnim.stopAnimation()
    Animated.timing(balanceValueAnim, {
      toValue: nextValue,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start()
  }, [balanceCacheKey, balanceValueAnim, balanceWalletKey, coins.length, totalAssetValue])

  useEffect(() => {
    if (!route.params?.inviteCode || inviteHandledRef.current) {
      return
    }

    inviteHandledRef.current = true

    void (async () => {
      try {
        await bindInviteCode(route.params?.inviteCode as string)
        showToast({ message: t("home.shell.inviteBound"), tone: "success" })
      } catch (error) {
        Alert.alert(t("common.errorTitle"), getInviteBindingMessage(error))
      }
    })()
  }, [route.params?.inviteCode, t])

  const handleToggleBalance = () => {
    const next = !showBalance
    setShowBalance(next)
    setBoolean(KvStorageKeys.ShowBalance, next)
  }

  const handleOpenTransfer = () => {
    openPluginHost({ pluginId: "transfer" })
  }

  const handleOpenReceive = () => {
    openPluginHost({ pluginId: "receive" })
  }

  const handleOpenCopouch = () => {
    openPluginHost({ pluginId: "copouch" })
  }

  const handleOpenMessages = () => {
    navigateRoot("MessageStack", {
      screen: "MessageScreen",
    })
  }

  return (
    <HomeScaffold hideHeader title={t("home.shell.title")}>
      <View style={styles.heroRow}>
        <View
          style={[
            styles.brandPlate,
            {
              backgroundColor: theme.colors.glass,
              borderColor: theme.colors.glassBorder,
            },
          ]}
        >
          <AppleBrandMark size={50} tone="auto" />
          <View style={styles.brandMeta}>
            <Text style={[styles.brandTitle, { color: theme.colors.text }]}>
              {walletAddress ? formatAddress(walletAddress) : t("home.shell.defaultNickname")}
            </Text>
            <Text style={[styles.brandCaption, { color: theme.colors.mutedText }]}>
              {t("home.shell.walletBalance")}
            </Text>
          </View>
        </View>
      </View>

      <View
        style={[
          styles.balanceCard,
          {
            backgroundColor: theme.colors.glassStrong,
            borderColor: theme.colors.glassBorder,
            shadowColor: theme.colors.shadow,
            shadowOpacity: theme.isDark ? 0.18 : 0.08,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 10 },
            elevation: 3,
          },
        ]}
      >
        <View style={[styles.balanceGlow, styles.balanceGlowPrimary, { backgroundColor: theme.colors.primarySoft }]} />
        <View style={[styles.balanceGlow, styles.balanceGlowSecondary, { backgroundColor: theme.colors.glassOverlay }]} />
        <View style={styles.balanceHeader}>
          <Text style={[styles.balanceLabel, { color: theme.colors.mutedText }]}>{t("home.shell.walletBalance")}</Text>
          <Pressable
            onPress={handleToggleBalance}
            style={[styles.balanceToggle, { backgroundColor: theme.colors.primarySoft, borderColor: theme.colors.glassBorder }]}
          >
            <Text style={[styles.balanceToggleText, { color: theme.colors.primary }]}>{showBalance ? t("home.shell.hide") : t("home.shell.show")}</Text>
          </Pressable>
        </View>

        <Text style={[styles.balanceValue, { color: theme.colors.text }]}>{showBalance ? formatCurrency(displayedBalanceValue) : "*****"}</Text>

        <Pressable
          onPress={() => navigation.navigate("TotalAssetsScreen")}
          style={[styles.totalAssetsButton, { backgroundColor: theme.colors.glass, borderColor: theme.colors.glassBorder }]}
        >
          <Text style={[styles.totalAssetsButtonText, { color: theme.colors.text }]}>{t("home.shell.openTotalAssets")}</Text>
        </Pressable>
      </View>

      <View style={styles.actionGrid}>
        <ActionButton label={t("home.actions.transfer")} onPress={handleOpenTransfer} symbol="↑" />
        <ActionButton label={t("home.actions.receive")} onPress={handleOpenReceive} symbol="↓" />
        <ActionButton label={t("home.actions.copouch")} onPress={handleOpenCopouch} symbol="◉" />
      </View>

      <HomeMessagePreview onPress={handleOpenMessages} />
    </HomeScaffold>
  )
}

function ActionButton(props: { label: string; onPress: () => void; symbol: string }) {
  const theme = useAppTheme()

  return (
    <Pressable
      onPress={props.onPress}
      style={({ pressed }) => [
        styles.actionButton,
        {
          backgroundColor: theme.colors.glass,
          borderColor: theme.colors.glassBorder,
          shadowColor: theme.colors.shadow,
          shadowOpacity: theme.isDark ? 0.12 : 0.05,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 10 },
          elevation: 2,
        },
        pressed ? styles.actionButtonPressed : null,
      ]}
    >
      <View
        style={[
          styles.actionIconShell,
          {
            backgroundColor: theme.colors.primarySoft ?? `${theme.colors.primary}14`,
            borderColor: theme.colors.glassBorder,
          },
        ]}
      >
        <Text style={[styles.actionSymbol, { color: theme.colors.primary }]}>{props.symbol}</Text>
      </View>
      <Text style={[styles.actionLabel, { color: theme.colors.text }]}>{props.label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  brandPlate: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
  },
  brandCluster: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  brandMeta: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  brandTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  brandCaption: {
    fontSize: 13,
  },
  balanceCard: {
    borderRadius: 28,
    padding: 20,
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  balanceGlow: {
    position: "absolute",
    borderRadius: 999,
  },
  balanceGlowPrimary: {
    width: 220,
    height: 220,
    right: -80,
    top: -120,
    opacity: 0.7,
  },
  balanceGlowSecondary: {
    width: 140,
    height: 140,
    left: -40,
    bottom: -60,
    opacity: 0.9,
  },
  balanceHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  balanceLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  balanceToggle: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  balanceToggleText: {
    fontSize: 12,
    fontWeight: "600",
  },
  balanceValue: {
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -1,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  totalAssetsButton: {
    alignSelf: "flex-start",
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  totalAssetsButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
  },
  actionGrid: {
    flexDirection: "row",
    gap: 10,
  },
  actionButton: {
    flex: 1,
    minWidth: 0,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 24,
    minHeight: 108,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  actionButtonPressed: {
    transform: [{ scale: 0.985 }],
  },
  actionIconShell: {
    width: 46,
    height: 46,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  actionSymbol: {
    fontSize: 23,
    fontWeight: "600",
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
  },
})
