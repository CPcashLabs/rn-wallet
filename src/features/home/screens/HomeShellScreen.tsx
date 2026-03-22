import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { Alert, Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { bindInviteCode } from "@/features/auth/services/authApi"
import { UserAvatar } from "@/features/home/components/UserAvatar"
import { useProfileSync } from "@/features/home/hooks/useProfileSync"
import { buildHomeBalanceCacheKey, readHomeBalanceCache, writeHomeBalanceCache } from "@/features/home/services/homeBalanceCache"
import { getInviteBindingMessage } from "@/features/auth/utils/authMessages"
import { HomeScaffold } from "@/features/home/components/HomeScaffold"
import { formatCurrency } from "@/features/home/utils/format"
import { HomeMessagePreview } from "@/features/messages/components/HomeMessagePreview"
import { openCopouchHome } from "@/app/navigation/copouchNavigation"
import { resolveTransferAddressFromUnknownChain } from "@/domains/wallet/transfer/utils/address"
import { openReceiveModule, openScannedTransferModule, openTransferModule } from "@/app/navigation/coreModuleNavigation"
import { navigateRoot } from "@/app/navigation/navigationRef"
import { NativeCapabilityUnavailableError } from "@/shared/errors"
import { errorCodeOf, resolveErrorMessage } from "@/shared/errors/presentation"
import { scannerAdapter } from "@/shared/native"
import { buildWalletBalanceKey, resolveBalanceQueryError, useWalletBalanceQuery } from "@/shared/queries/balanceQueries"
import { getBoolean, setBoolean } from "@/shared/storage/kvStorage"
import { KvStorageKeys } from "@/shared/storage/sessionKeys"
import { useUserStore } from "@/shared/store/useUserStore"
import { useWalletStore } from "@/shared/store/useWalletStore"
import { useToast } from "@/shared/toast/useToast"
import { useAppTheme } from "@/shared/theme/useAppTheme"
import { AppGlyph } from "@/shared/ui/AppGlyph"

import type { HomeTabStackParamList } from "@/app/navigation/types"

type Props = NativeStackScreenProps<HomeTabStackParamList, "HomeShellScreen">

function isCancelledNativeAction(error: unknown) {
  if (!(error instanceof Error)) {
    return false
  }

  const code = Reflect.get(error, "code")
  if (typeof code === "string" && code.toLowerCase().includes("cancel")) {
    return true
  }

  return error.name.toLowerCase().includes("cancel")
}

function resolveHomeScanErrorMessage(error: Error, t: (key: string) => string) {
  return resolveErrorMessage(t, error, {
    fallbackKey: "transfer.address.scanFailed",
    codeMap: {
      permission_denied: "transfer.address.scanPermissionDenied",
      multiple_codes: "transfer.address.scanMultiple",
      image_parse_failed: "transfer.address.scanImageParseFailed",
    },
    preferApiMessage: false,
    preferErrorMessage: false,
    customResolver: currentError => {
      const code = errorCodeOf(currentError)
      if (code === "no_code") {
        return t("transfer.address.scanNoCode")
      }

      return undefined
    },
  })
}

export function HomeShellScreen({ navigation, route }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const { showToast } = useToast()
  const { profile } = useProfileSync()
  const avatarVersion = useUserStore(state => state.avatarVersion)
  const walletAddress = useWalletStore(state => state.address)
  const walletChainId = useWalletStore(state => state.chainId)
  const balanceQuery = useWalletBalanceQuery({
    address: walletAddress,
    chainId: walletChainId,
  })
  const [showBalance, setShowBalance] = useState(true)
  const mountedRef = useRef(true)
  const inviteHandledRef = useRef(false)
  const balanceValueAnim = useRef(new Animated.Value(0)).current
  const displayedBalanceValueRef = useRef(0)
  const hasAppliedLiveValueRef = useRef(false)
  const [displayedBalanceValue, setDisplayedBalanceValue] = useState(0)
  const balanceWalletKey = balanceQuery.data?.walletKey ?? buildWalletBalanceKey({
    address: walletAddress,
    chainId: walletChainId,
  })
  const coins = balanceQuery.data?.coins ?? []
  const balances = balanceQuery.data?.balances ?? {}
  const balanceError = useMemo(
    () => resolveBalanceQueryError(balanceQuery.error, balanceQuery.isRefetchError),
    [balanceQuery.error, balanceQuery.isRefetchError],
  )
  const displayName = profile?.nickname || t("home.shell.defaultNickname")
  const profileAddress = walletAddress ?? profile?.address ?? ""
  const avatar = profile?.avatar

  useEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false
    }
  }, [])

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
    const listenerId = balanceValueAnim.addListener(({ value }) => {
      if (!mountedRef.current) {
        return
      }

      displayedBalanceValueRef.current = value
      setDisplayedBalanceValue(value)
    })

    return () => {
      balanceValueAnim.stopAnimation()
      balanceValueAnim.removeListener(listenerId)
    }
  }, [balanceValueAnim])

  useEffect(() => {
    hasAppliedLiveValueRef.current = false
    const cachedValue = balanceCacheKey ? readHomeBalanceCache(balanceCacheKey)?.totalAssetValue ?? 0 : 0

    if (!mountedRef.current) {
      return
    }

    balanceValueAnim.stopAnimation()
    balanceValueAnim.setValue(cachedValue)
    displayedBalanceValueRef.current = cachedValue
    setDisplayedBalanceValue(cachedValue)
  }, [balanceCacheKey, balanceValueAnim])

  useEffect(() => {
    if (
      !mountedRef.current
      || !balanceCacheKey
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
    }).start(({ finished }) => {
      if (!finished || !mountedRef.current) {
        return
      }

      displayedBalanceValueRef.current = nextValue
    })
  }, [balanceCacheKey, balanceValueAnim, balanceWalletKey, coins.length, totalAssetValue])

  useEffect(() => {
    if (!route.params?.inviteCode || inviteHandledRef.current) {
      return
    }

    inviteHandledRef.current = true

    let cancelled = false

    void (async () => {
      try {
        await bindInviteCode(route.params?.inviteCode as string)

        if (cancelled || !mountedRef.current) {
          return
        }

        showToast({ message: t("home.shell.inviteBound"), tone: "success" })
      } catch (error) {
        if (cancelled || !mountedRef.current) {
          return
        }

        Alert.alert(t("common.errorTitle"), getInviteBindingMessage(error))
      }
    })()

    return () => {
      cancelled = true
    }
  }, [route.params?.inviteCode, showToast, t])

  const handleToggleBalance = () => {
    const next = !showBalance
    setShowBalance(next)
    setBoolean(KvStorageKeys.ShowBalance, next)
  }

  const handleOpenTransfer = () => {
    openTransferModule({
      intent: "transfer",
    })
  }

  const handleOpenReceive = () => {
    openReceiveModule()
  }

  const handleOpenCopouch = () => {
    openCopouchHome()
  }

  const handleOpenMessages = () => {
    navigateRoot("MessageStack", {
      screen: "MessageScreen",
    })
  }

  const handleOpenProfile = useCallback(() => {
    navigateRoot("MainTabs", {
      screen: "MeTab",
      params: {
        screen: "PersonalScreen",
      },
    })
  }, [])

  const handleScan = useCallback(async () => {
    const capability = scannerAdapter.getCapability("camera")
    if (!capability.supported) {
      showToast({ message: t("transfer.address.scanUnavailable"), tone: "warning" })
      return
    }

    const result = await scannerAdapter.scan()

    if (!mountedRef.current) {
      return
    }

    if (!result.ok) {
      if (isCancelledNativeAction(result.error)) {
        return
      }

      if (result.error instanceof NativeCapabilityUnavailableError) {
        showToast({ message: t("transfer.address.scanUnavailable"), tone: "warning" })
        return
      }

      showToast({ message: resolveHomeScanErrorMessage(result.error, t), tone: "error" })
      return
    }

    const resolvedAddress = resolveTransferAddressFromUnknownChain(result.data.value)
    if (!resolvedAddress) {
      showToast({ message: t("home.shell.scanUnsupportedQr"), tone: "warning" })
      return
    }

    openScannedTransferModule({
      scannedAddress: resolvedAddress.address,
      scannedChainType: resolvedAddress.chainType,
      autoAdvanceToOrder: true,
      autoSelectFirstMatching: resolvedAddress.chainType === "TRON",
    })
  }, [showToast, t])

  return (
    <HomeScaffold contentContainerStyle={styles.contentStack} hideHeader title={t("home.shell.title")}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityLabel={`${t("home.me.personal")} ${displayName}`}
          accessibilityRole="button"
          onPress={handleOpenProfile}
          style={({ pressed }) => [styles.profileHero, pressed ? styles.profileHeroPressed : null]}
        >
          <View
            style={[
              styles.profileHeroAvatarShell,
              {
                backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface,
                borderColor: theme.colors.glassBorder,
              },
            ]}
          >
            <UserAvatar accountKey={profileAddress} cacheVersion={avatarVersion} label={displayName} size={48} uri={avatar} />
          </View>
          <Text numberOfLines={1} style={[styles.profileHeroName, { color: theme.colors.text }]}>
            {displayName}
          </Text>
        </Pressable>

        <Pressable
          accessibilityLabel={t("home.shell.scan")}
          hitSlop={10}
          onPress={() => void handleScan()}
          style={[
            styles.topBarAction,
            {
              backgroundColor: theme.colors.glass,
              borderColor: theme.colors.glassBorder,
              shadowColor: theme.colors.shadow,
              shadowOpacity: theme.isDark ? 0.14 : 0.06,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 8 },
              elevation: 2,
            },
          ]}
        >
          <AppGlyph backgroundColor="transparent" name="scan" size={18} tintColor={theme.colors.text} />
        </Pressable>
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

        <Text numberOfLines={1} style={[styles.balanceValue, { color: theme.colors.text }]}>
          {showBalance ? formatCurrency(displayedBalanceValue) : "*****"}
        </Text>
        {balanceError ? (
          <Text style={[styles.balanceStatus, { color: theme.colors.danger }]}>
            {t(balanceError.kind === "refresh" ? "home.totalAssets.refreshFailed" : "home.totalAssets.loadFailed")}
          </Text>
        ) : null}

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
      <Text adjustsFontSizeToFit minimumFontScale={0.82} numberOfLines={1} style={[styles.actionLabel, { color: theme.colors.text }]}>
        {props.label}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  contentStack: {
    gap: 14,
    paddingTop: 6,
    paddingBottom: 28,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  profileHero: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 6,
  },
  profileHeroPressed: {
    opacity: 0.9,
  },
  profileHeroAvatarShell: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  profileHeroName: {
    flex: 1,
    minWidth: 0,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "800",
    letterSpacing: -0.72,
  },
  topBarAction: {
    width: 44,
    height: 44,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  balanceCard: {
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingVertical: 22,
    gap: 14,
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
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",
    letterSpacing: -0.1,
  },
  balanceToggle: {
    minHeight: 34,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  balanceToggleText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600",
  },
  balanceValue: {
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -1.2,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  balanceStatus: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  totalAssetsButton: {
    alignSelf: "flex-start",
    marginTop: 2,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  totalAssetsButtonText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",
    letterSpacing: -0.1,
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
  },
  actionGrid: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    minWidth: 0,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 26,
    minHeight: 116,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  actionButtonPressed: {
    transform: [{ scale: 0.985 }],
  },
  actionIconShell: {
    width: 50,
    height: 50,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  actionSymbol: {
    fontSize: 24,
    fontWeight: "600",
  },
  actionLabel: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "700",
    letterSpacing: -0.12,
    textAlign: "center",
  },
})
