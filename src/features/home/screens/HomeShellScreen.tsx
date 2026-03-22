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
    navigateRoot("SettingsStack", {
      screen: "PersonalScreen",
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

  const quickActions = [
    {
      key: "scan",
      label: t("home.shell.scan"),
      icon: "scan" as const,
      onPress: () => {
        void handleScan()
      },
    },
    {
      key: "transfer",
      label: t("home.actions.transfer"),
      icon: "transfer" as const,
      onPress: handleOpenTransfer,
    },
    {
      key: "receive",
      label: t("home.actions.receive"),
      icon: "receive" as const,
      onPress: handleOpenReceive,
    },
    {
      key: "copouch",
      label: t("home.actions.copouch"),
      icon: "grid" as const,
      onPress: handleOpenCopouch,
    },
  ]

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
          style={({ pressed }) => [styles.topBarAction, pressed ? styles.topBarActionPressed : null]}
        >
          <QuickActionIcon color={theme.colors.primary} kind="scan" size={28} />
        </Pressable>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => navigation.navigate("TotalAssetsScreen")}
        style={({ pressed }) => [styles.balanceCardPressable, pressed ? styles.balanceCardPressed : null]}
      >
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
          <View style={styles.balanceHeader}>
            <View style={styles.balanceTitleRow}>
              <Text style={[styles.balanceLabel, { color: theme.colors.text }]}>{t("home.shell.estimatedAssets")}</Text>
              <Pressable
                hitSlop={8}
                onPress={event => {
                  event.stopPropagation()
                  handleToggleBalance()
                }}
                style={styles.eyeButton}
              >
                <EyeToggleIcon color={theme.colors.text} visible={showBalance} />
              </Pressable>
            </View>

            <View
              style={[
                styles.securityScorePill,
                {
                  backgroundColor: theme.colors.successSoft,
                  borderColor: theme.colors.successBorder,
                },
              ]}
            >
              <ShieldBadgeIcon color={theme.colors.success} size={18} />
              <Text style={[styles.securityScoreText, { color: theme.colors.success }]}>
                {t("home.shell.securityScore", { score: 98 })}
              </Text>
            </View>
          </View>

          <Text numberOfLines={1} style={[styles.balanceValue, { color: theme.colors.text }]}>
            {showBalance ? formatCurrency(displayedBalanceValue) : "*****"}
          </Text>

          {balanceError ? (
            <Text style={[styles.balanceStatus, { color: theme.colors.danger }]}>
              {t(balanceError.kind === "refresh" ? "home.totalAssets.refreshFailed" : "home.totalAssets.loadFailed")}
            </Text>
          ) : (
            <View style={styles.auditRow}>
              <View style={[styles.auditDot, { backgroundColor: theme.colors.success }]} />
              <Text style={[styles.auditText, { color: theme.colors.mutedText }]}>{t("home.shell.auditPassed")}</Text>
            </View>
          )}
        </View>
      </Pressable>

      <View style={styles.actionGrid}>
        {quickActions.map(item => (
          <QuickActionButton key={item.key} icon={item.icon} label={item.label} onPress={item.onPress} />
        ))}
      </View>

      <View
        style={[
          styles.securityBanner,
          {
            backgroundColor: theme.colors.success,
            shadowColor: theme.colors.shadow,
            shadowOpacity: theme.isDark ? 0.2 : 0.1,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 10 },
            elevation: 3,
          },
        ]}
      >
        <View style={styles.securityBannerContent}>
          <Text style={[styles.securityBannerTitle, { color: theme.colors.brandInverse }]}>{t("home.shell.securityCenterTitle")}</Text>
          <Text style={[styles.securityBannerBody, { color: theme.isDark ? theme.colors.brandInverse : "rgba(255,255,255,0.74)" }]}>
            {t("home.shell.securityCenterBody")}
          </Text>
        </View>
        <ShieldMark color={theme.colors.brandInverse} opacity={0.18} size={60} />
      </View>

      <HomeMessagePreview onPress={handleOpenMessages} />
    </HomeScaffold>
  )
}

function QuickActionButton(props: { label: string; onPress: () => void; icon: "scan" | "transfer" | "receive" | "grid" }) {
  const theme = useAppTheme()

  return (
    <Pressable
      onPress={props.onPress}
      style={({ pressed }) => [
        styles.actionButtonWrap,
        pressed ? styles.actionButtonWrapPressed : null,
      ]}
    >
      <View
        style={[
          styles.actionIconCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.glassBorder,
            shadowColor: theme.colors.shadow,
            shadowOpacity: theme.isDark ? 0.12 : 0.04,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 8 },
            elevation: 2,
          },
        ]}
      >
        <QuickActionIcon color={theme.colors.primary} kind={props.icon} size={32} />
      </View>
      <Text adjustsFontSizeToFit minimumFontScale={0.82} numberOfLines={1} style={[styles.actionLabel, { color: theme.colors.text }]}>
        {props.label}
      </Text>
    </Pressable>
  )
}

function EyeToggleIcon(props: { visible: boolean; color: string }) {
  return (
    <View style={styles.eyeIcon}>
      <View style={[styles.eyeOutline, { borderColor: props.color }]} />
      <View style={[styles.eyePupil, { backgroundColor: props.visible ? props.color : "transparent", borderColor: props.color }]} />
      {!props.visible ? <View style={[styles.eyeSlash, { backgroundColor: props.color }]} /> : null}
    </View>
  )
}

function ShieldBadgeIcon(props: { color: string; size: number }) {
  return (
    <View style={[styles.shieldBadgeIcon, { width: props.size, height: props.size }]}>
      <View style={[styles.shieldBadgeBody, { borderColor: props.color }]} />
      <View style={[styles.shieldBadgeCheckStem, { backgroundColor: props.color }]} />
      <View style={[styles.shieldBadgeCheckArm, { backgroundColor: props.color }]} />
    </View>
  )
}

function ShieldMark(props: { color: string; size: number; opacity?: number }) {
  return (
    <View style={[styles.shieldMark, { width: props.size, height: props.size, opacity: props.opacity ?? 1 }]}>
      <View style={[styles.shieldMarkBody, { borderColor: props.color }]} />
      <View style={[styles.shieldMarkShardLeft, { backgroundColor: props.color }]} />
      <View style={[styles.shieldMarkShardRight, { backgroundColor: props.color }]} />
    </View>
  )
}

function QuickActionIcon(props: { kind: "scan" | "transfer" | "receive" | "grid"; color: string; size: number }) {
  const scale = props.size / 32

  return (
    <View style={[styles.quickIconCanvas, { width: props.size, height: props.size }]}>
      <View style={{ transform: [{ scale }] }}>
        {props.kind === "scan" ? <ScanGlyph color={props.color} /> : null}
        {props.kind === "transfer" ? <TransferGlyph color={props.color} /> : null}
        {props.kind === "receive" ? <ReceiveGlyph color={props.color} /> : null}
        {props.kind === "grid" ? <GridGlyph color={props.color} /> : null}
      </View>
    </View>
  )
}

function ScanGlyph(props: { color: string }) {
  return (
    <View style={styles.glyphBase}>
      <View style={[styles.scanCornerTopLeft, { borderTopColor: props.color, borderLeftColor: props.color }]} />
      <View style={[styles.scanCornerTopRight, { borderTopColor: props.color, borderRightColor: props.color }]} />
      <View style={[styles.scanCornerBottomLeft, { borderBottomColor: props.color, borderLeftColor: props.color }]} />
      <View style={[styles.scanCornerBottomRight, { borderBottomColor: props.color, borderRightColor: props.color }]} />
      <View style={[styles.scanCenterDot, { backgroundColor: props.color }]} />
    </View>
  )
}

function TransferGlyph(props: { color: string }) {
  return (
    <View style={styles.glyphBase}>
      <View style={[styles.transferArrowStem, { backgroundColor: props.color }]} />
      <View style={[styles.transferArrowHeadTop, { borderLeftColor: props.color }]} />
      <View style={[styles.transferArrowHeadBottom, { borderLeftColor: props.color }]} />
    </View>
  )
}

function ReceiveGlyph(props: { color: string }) {
  return (
    <View style={styles.glyphBase}>
      <View style={[styles.receiveArrowVertical, { backgroundColor: props.color }]} />
      <View style={[styles.receiveArrowHorizontal, { backgroundColor: props.color }]} />
      <View style={[styles.receiveArrowHeadLeft, { borderTopColor: props.color }]} />
      <View style={[styles.receiveArrowHeadRight, { borderLeftColor: props.color }]} />
    </View>
  )
}

function GridGlyph(props: { color: string }) {
  return (
    <View style={styles.glyphBase}>
      <View style={[styles.gridCell, styles.gridCellTopLeft, { backgroundColor: props.color }]} />
      <View style={[styles.gridCell, styles.gridCellTopRight, { backgroundColor: props.color }]} />
      <View style={[styles.gridCell, styles.gridCellBottomLeft, { backgroundColor: props.color }]} />
      <View style={[styles.gridCell, styles.gridCellBottomRight, { backgroundColor: props.color }]} />
    </View>
  )
}

const styles = StyleSheet.create({
  contentStack: {
    gap: 20,
    paddingTop: 4,
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
    alignItems: "center",
    justifyContent: "center",
  },
  topBarActionPressed: {
    opacity: 0.84,
  },
  balanceCardPressable: {
    borderRadius: 28,
  },
  balanceCardPressed: {
    transform: [{ scale: 0.992 }],
  },
  balanceCard: {
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingVertical: 20,
    gap: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  balanceHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  balanceTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexShrink: 1,
  },
  balanceLabel: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",
    letterSpacing: -0.1,
  },
  eyeButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  eyeIcon: {
    width: 22,
    height: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  eyeOutline: {
    position: "absolute",
    width: 22,
    height: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  eyePupil: {
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: StyleSheet.hairlineWidth,
  },
  eyeSlash: {
    position: "absolute",
    width: 24,
    height: 1.5,
    borderRadius: 999,
    transform: [{ rotate: "-24deg" }],
  },
  securityScorePill: {
    minHeight: 34,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  shieldBadgeIcon: {
    alignItems: "center",
    justifyContent: "center",
  },
  shieldBadgeBody: {
    position: "absolute",
    width: 14,
    height: 16,
    borderWidth: 1.5,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderBottomLeftRadius: 7,
    borderBottomRightRadius: 7,
    transform: [{ rotate: "180deg" }],
  },
  shieldBadgeCheckStem: {
    position: "absolute",
    width: 2.2,
    height: 5,
    borderRadius: 999,
    left: 6,
    top: 8,
    transform: [{ rotate: "-34deg" }],
  },
  shieldBadgeCheckArm: {
    position: "absolute",
    width: 2.2,
    height: 8,
    borderRadius: 999,
    left: 9,
    top: 6,
    transform: [{ rotate: "42deg" }],
  },
  securityScoreText: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "700",
    letterSpacing: -0.1,
  },
  balanceValue: {
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -1.4,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  balanceStatus: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  auditRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  auditDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  auditText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
  },
  actionGrid: {
    flexDirection: "row",
    gap: 12,
  },
  actionButtonWrap: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    gap: 10,
  },
  actionButtonWrapPressed: {
    opacity: 0.9,
  },
  actionIconCard: {
    width: "100%",
    aspectRatio: 1,
    maxWidth: 88,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "700",
    letterSpacing: -0.12,
    textAlign: "center",
  },
  securityBanner: {
    borderRadius: 26,
    paddingHorizontal: 22,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  securityBannerContent: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  securityBannerTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "800",
    letterSpacing: -0.24,
  },
  securityBannerBody: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
  },
  shieldMark: {
    alignItems: "center",
    justifyContent: "center",
  },
  shieldMarkBody: {
    position: "absolute",
    width: 38,
    height: 46,
    borderWidth: 3,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    transform: [{ rotate: "180deg" }],
  },
  shieldMarkShardLeft: {
    position: "absolute",
    width: 15,
    height: 28,
    left: 15,
    top: 14,
    transform: [{ skewY: "-22deg" }, { rotate: "-8deg" }],
  },
  shieldMarkShardRight: {
    position: "absolute",
    width: 15,
    height: 28,
    right: 15,
    top: 14,
    transform: [{ skewY: "22deg" }, { rotate: "8deg" }],
  },
  quickIconCanvas: {
    alignItems: "center",
    justifyContent: "center",
  },
  glyphBase: {
    width: 32,
    height: 32,
  },
  scanCornerTopLeft: {
    position: "absolute",
    top: 3,
    left: 3,
    width: 8,
    height: 8,
    borderTopWidth: 2.2,
    borderLeftWidth: 2.2,
    borderTopLeftRadius: 4,
  },
  scanCornerTopRight: {
    position: "absolute",
    top: 3,
    right: 3,
    width: 8,
    height: 8,
    borderTopWidth: 2.2,
    borderRightWidth: 2.2,
    borderTopRightRadius: 4,
  },
  scanCornerBottomLeft: {
    position: "absolute",
    bottom: 3,
    left: 3,
    width: 8,
    height: 8,
    borderBottomWidth: 2.2,
    borderLeftWidth: 2.2,
    borderBottomLeftRadius: 4,
  },
  scanCornerBottomRight: {
    position: "absolute",
    bottom: 3,
    right: 3,
    width: 8,
    height: 8,
    borderBottomWidth: 2.2,
    borderRightWidth: 2.2,
    borderBottomRightRadius: 4,
  },
  scanCenterDot: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    left: 12,
    top: 12,
  },
  transferArrowStem: {
    position: "absolute",
    left: 5,
    top: 14,
    width: 14,
    height: 3,
    borderRadius: 999,
  },
  transferArrowHeadTop: {
    position: "absolute",
    right: 5,
    top: 9,
    width: 0,
    height: 0,
    borderTopWidth: 6,
    borderBottomWidth: 0,
    borderLeftWidth: 12,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
  },
  transferArrowHeadBottom: {
    position: "absolute",
    right: 5,
    bottom: 9,
    width: 0,
    height: 0,
    borderTopWidth: 0,
    borderBottomWidth: 6,
    borderLeftWidth: 12,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
  },
  receiveArrowVertical: {
    position: "absolute",
    left: 8,
    top: 6,
    width: 3,
    height: 18,
    borderRadius: 999,
  },
  receiveArrowHorizontal: {
    position: "absolute",
    left: 8,
    bottom: 8,
    width: 16,
    height: 3,
    borderRadius: 999,
  },
  receiveArrowHeadLeft: {
    position: "absolute",
    left: 6,
    bottom: 8,
    width: 8,
    height: 8,
    borderTopWidth: 2.2,
    borderLeftWidth: 2.2,
    borderLeftColor: "transparent",
    transform: [{ rotate: "-45deg" }],
  },
  receiveArrowHeadRight: {
    position: "absolute",
    right: 7,
    bottom: 6,
    width: 0,
    height: 0,
    borderTopWidth: 0,
    borderBottomWidth: 9,
    borderLeftWidth: 9,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
  },
  gridCell: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  gridCellTopLeft: {
    left: 5,
    top: 5,
  },
  gridCellTopRight: {
    right: 5,
    top: 5,
  },
  gridCellBottomLeft: {
    left: 5,
    bottom: 5,
  },
  gridCellBottomRight: {
    right: 5,
    bottom: 5,
  },
})
