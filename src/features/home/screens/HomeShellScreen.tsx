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
import { AppCard } from "@/shared/ui/AppCard"
import { SFSymbolIcon, type MaterialIconName, type SFSymbolName, type SFSymbolWeight } from "@/shared/ui/SFSymbolIcon"

import type { HomeTabStackParamList } from "@/app/navigation/types"

type Props = NativeStackScreenProps<HomeTabStackParamList, "HomeShellScreen">

type QuickActionIconSpec = {
  fallbackName: MaterialIconName
  name: SFSymbolName
  weight?: SFSymbolWeight
}

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

  const quickActions: Array<{ key: string; label: string; icon: QuickActionIconSpec; onPress: () => void }> = [
    {
      key: "scan",
      label: t("home.shell.scan"),
      icon: {
        fallbackName: "qrcode-scan",
        name: "qrcode.viewfinder",
        weight: "medium",
      },
      onPress: () => {
        void handleScan()
      },
    },
    {
      key: "transfer",
      label: t("home.actions.transfer"),
      icon: {
        fallbackName: "send",
        name: "paperplane.fill",
      },
      onPress: handleOpenTransfer,
    },
    {
      key: "receive",
      label: t("home.actions.receive"),
      icon: {
        fallbackName: "arrow-bottom-left",
        name: "arrow.down.left",
      },
      onPress: handleOpenReceive,
    },
    {
      key: "copouch",
      label: t("home.actions.copouch"),
      icon: {
        fallbackName: "view-grid",
        name: "square.grid.2x2.fill",
      },
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
                borderColor: theme.colors.border,
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
          <SFSymbolIcon color={theme.colors.primary} fallbackName="qrcode-scan" name="qrcode.viewfinder" size={28} weight="medium" />
        </Pressable>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => navigation.navigate("TotalAssetsScreen")}
        style={({ pressed }) => [styles.balanceCardPressable, pressed ? styles.balanceCardPressed : null]}
      >
        <AppCard
          backgroundColor={theme.colors.surfaceElevated ?? theme.colors.surface}
          borderColor={theme.colors.border}
          gap={theme.spacing.md}
          overflow="hidden"
          padding={theme.spacing.lg}
          radius={theme.radius.xxl}
          style={[styles.balanceCard, theme.shadows.floating]}
        >
          <View style={styles.balanceHeader}>
            <View style={styles.balanceTitleRow}>
              <Text style={[styles.balanceLabel, theme.typography.subheadlineEmphasized, { color: theme.colors.mutedText }]}>
                {t("home.shell.estimatedAssets")}
              </Text>
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
                  backgroundColor: theme.colors.surfaceMuted ?? theme.colors.background,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <ShieldBadgeIcon color={theme.colors.success} size={18} />
              <Text style={[styles.securityScoreText, theme.typography.footnoteEmphasized, { color: theme.colors.success }]}>
                {t("home.shell.securityScore", { score: 98 })}
              </Text>
            </View>
          </View>

          <Text numberOfLines={1} style={[styles.balanceValue, theme.typography.largeTitle, { color: theme.colors.text }]}>
            {showBalance ? formatCurrency(displayedBalanceValue) : "*****"}
          </Text>

          {balanceError ? (
            <Text style={[styles.balanceStatus, theme.typography.footnoteEmphasized, { color: theme.colors.danger }]}>
              {t(balanceError.kind === "refresh" ? "home.totalAssets.refreshFailed" : "home.totalAssets.loadFailed")}
            </Text>
          ) : (
            <View style={styles.auditRow}>
              <View style={[styles.auditDot, { backgroundColor: theme.colors.success }]} />
              <Text style={[styles.auditText, theme.typography.subheadline, { color: theme.colors.mutedText }]}>{t("home.shell.auditPassed")}</Text>
            </View>
          )}
        </AppCard>
      </Pressable>

      <View style={styles.actionGrid}>
        {quickActions.map(item => (
          <QuickActionButton key={item.key} icon={item.icon} label={item.label} onPress={item.onPress} />
        ))}
      </View>

      <AppCard
        backgroundColor={theme.colors.surfaceElevated ?? theme.colors.surface}
        borderColor={theme.colors.border}
        gap={theme.spacing.md}
        style={styles.securityPanel}
      >
        <View
          style={[
            styles.securityPanelBadge,
            {
              backgroundColor: theme.colors.successSoft,
              borderColor: theme.colors.successBorder,
            },
          ]}
        >
          <ShieldMark color={theme.colors.success} size={22} />
        </View>
        <View style={styles.securityPanelContent}>
          <Text style={[styles.securityPanelTitle, theme.typography.headline, { color: theme.colors.text }]}>{t("home.shell.securityCenterTitle")}</Text>
          <Text style={[styles.securityPanelBody, theme.typography.subheadline, { color: theme.colors.mutedText }]}>
            {t("home.shell.securityCenterBody")}
          </Text>
        </View>
      </AppCard>

      <HomeMessagePreview onPress={handleOpenMessages} />
    </HomeScaffold>
  )
}

function QuickActionButton(props: { label: string; onPress: () => void; icon: QuickActionIconSpec }) {
  const theme = useAppTheme()

  return (
    <Pressable
      accessibilityRole="button"
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
            backgroundColor: theme.colors.surfaceMuted ?? theme.colors.background,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <SFSymbolIcon
          color={theme.colors.primary}
          fallbackName={props.icon.fallbackName}
          name={props.icon.name}
          size={28}
          weight={props.icon.weight ?? "semibold"}
        />
      </View>
      <Text numberOfLines={2} style={[styles.actionLabel, theme.typography.footnoteEmphasized, { color: theme.colors.text }]}>
        {props.label}
      </Text>
    </Pressable>
  )
}

function EyeToggleIcon(props: { visible: boolean; color: string }) {
  return <SFSymbolIcon color={props.color} fallbackName={props.visible ? "eye" : "eye-off"} name={props.visible ? "eye.fill" : "eye.slash.fill"} size={18} />
}

function ShieldBadgeIcon(props: { color: string; size: number }) {
  return <SFSymbolIcon color={props.color} fallbackName="shield-check" name="checkmark.shield.fill" size={props.size} />
}

function ShieldMark(props: { color: string; size: number; opacity?: number }) {
  return (
    <SFSymbolIcon
      color={props.color}
      fallbackName="shield"
      name="shield.fill"
      size={props.size}
      style={{ opacity: props.opacity ?? 1 }}
      weight="regular"
    />
  )
}

const styles = StyleSheet.create({
  contentStack: {
    gap: 16,
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
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
    letterSpacing: -0.26,
  },
  topBarAction: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
  },
  balanceHeader: {
    flexDirection: "row",
    alignItems: "center",
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
  },
  eyeButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  securityScorePill: {
    minHeight: 36,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  securityScoreText: {
  },
  balanceValue: {
    fontVariant: ["tabular-nums"],
  },
  balanceStatus: {
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
  },
  actionGrid: {
    flexDirection: "row",
    gap: 12,
  },
  actionButtonWrap: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    gap: 8,
  },
  actionButtonWrapPressed: {
    opacity: 0.9,
  },
  actionIconCard: {
    width: "100%",
    aspectRatio: 1,
    maxWidth: 84,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    textAlign: "center",
  },
  securityPanel: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  securityPanelBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  securityPanelContent: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  securityPanelTitle: {
  },
  securityPanelBody: {
  },
})
