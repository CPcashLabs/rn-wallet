import React, { useEffect, useMemo, useRef, useState } from "react"

import {
  ActivityIndicator,
  Alert,
  LayoutAnimation,
  type LayoutAnimationConfig,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
} from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import type { ReceiveStackParamList } from "@/app/navigation/types"
import { HomeScaffold } from "@/features/home/components/HomeScaffold"
import { buildReceiveAutoCreateKey, shouldAttemptReceiveAutoCreate } from "@/domains/wallet/receive/screens/receiveAutoCreate"
import {
  readCachedReceiveChainColor,
  resolvePreferredReceiveChainColor,
  shouldPrimeReceiveChainColorFromRoute,
  writeCachedReceiveChainColor,
} from "@/domains/wallet/receive/services/receiveColorCache"
import { useReceiveStore } from "@/domains/wallet/receive/store/useReceiveStore"
import { buildQrCodeDataUrl, buildQrMatrix, stripDataUrlPrefix, type QrMatrix } from "@/domains/wallet/receive/utils/qrcode"
import { resolveChainNameById } from "@/shared/api/walletAssets"
import { useErrorPresenter } from "@/shared/errors/useErrorPresenter"
import { logErrorSafely } from "@/shared/logging/safeConsole"
import { clipboardAdapter, fileAdapter, shareAdapter } from "@/shared/native"
import { useAuthStore } from "@/shared/store/useAuthStore"
import { useUserStore } from "@/shared/store/useUserStore"
import { useWalletStore } from "@/shared/store/useWalletStore"
import { useToast } from "@/shared/toast/useToast"
import { useAppTheme } from "@/shared/theme/useAppTheme"

type Props = NativeStackScreenProps<ReceiveStackParamList, "ReceiveHomeScreen">
type CollapseKey = "individuals" | "business"

const FONT = {
  caption: 12,
  footnote: 13,
  body: 14,
  subhead: 15,
  bodyLarge: 16,
  title: 17,
  headline: 28,
} as const

const SPACE = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
} as const

const COLLAPSE_LAYOUT_ANIMATION: LayoutAnimationConfig = {
  duration: 220,
  create: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,
  },
  update: {
    type: LayoutAnimation.Types.easeInEaseOut,
  },
  delete: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,
  },
}

const CAN_USE_COLLAPSE_LAYOUT_ANIMATION = Platform.OS === "android"

if (CAN_USE_COLLAPSE_LAYOUT_ANIMATION && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

export function ReceiveHomeScreen({ navigation, route }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const { presentError } = useErrorPresenter()
  const { showToast } = useToast()
  const session = useAuthStore(state => state.session)
  const profile = useUserStore(state => state.profile)
  const walletAddress = useWalletStore(state => state.address)
  const chainId = useWalletStore(state => state.chainId)
  const loadHome = useReceiveStore(state => state.loadHome)
  const createOrder = useReceiveStore(state => state.createOrder)
  const config = useReceiveStore(state => state.config)
  const loading = useReceiveStore(state => state.loading)
  const creating = useReceiveStore(state => state.creating)
  const personalOrder = useReceiveStore(state => state.personalOrder)
  const businessOrder = useReceiveStore(state => state.businessOrder)
  const isNormalReceive = route.params?.receiveMode === "normal"
  const supportsBusinessReceive = !isNormalReceive
  const [expandedCard, setExpandedCard] = useState<CollapseKey>(
    route.params?.collapse === "business" && !supportsBusinessReceive ? "individuals" : route.params?.collapse ?? "individuals",
  )
  const [qrMatrix, setQrMatrix] = useState<QrMatrix | null>(null)
  const [countdownText, setCountdownText] = useState("--:--:--")
  const autoCreateAttemptKeyRef = useRef<string | null>(null)
  const receiveAddress = route.params?.copouch || route.params?.cowallet || profile?.address || session?.address || walletAddress || ""
  const activeCollapseKey: CollapseKey = supportsBusinessReceive ? expandedCard : "individuals"
  const currentOrder = activeCollapseKey === "individuals" ? personalOrder : businessOrder
  const currentVariant = activeCollapseKey === "individuals" ? "short" : "long"
  const currentOrderType = activeCollapseKey === "individuals" ? "TRACE" : "TRACE_LONG_TERM"
  const requestedPayChain = route.params?.payChain ?? resolveChainNameById(chainId)
  const routeChainColor = normalizeReceiveColor(route.params?.chainColor)
  const cachedChainColor = useMemo(() => normalizeReceiveColor(readCachedReceiveChainColor(requestedPayChain)), [requestedPayChain])
  const [dynamicColor, setDynamicColor] = useState(() =>
    resolvePreferredReceiveChainColor({
      cachedColor: cachedChainColor,
      routeColor: routeChainColor,
      fallbackColor: theme.colors.success,
    }),
  )
  const surfaceColor = theme.colors.glass
  const qrSource = isNormalReceive ? receiveAddress : currentOrder?.address || receiveAddress
  const pageBackgroundColor = useMemo(
    () => mixReceiveColor(dynamicColor, theme.colors.background, theme.isDark ? 0.68 : 0.9),
    [dynamicColor, theme.colors.background, theme.isDark],
  )
  const headerBackgroundColor = useMemo(
    () => mixReceiveColor(dynamicColor, theme.isDark ? "#101112" : "#FFFFFF", theme.isDark ? 0.14 : 0.06),
    [dynamicColor, theme.isDark],
  )
  const headerTintColor = useMemo(() => pickReadableTextColor(headerBackgroundColor, theme.colors.text), [headerBackgroundColor, theme.colors.text])
  const headerControlBackgroundColor = useMemo(
    () => buildAlphaColor(headerTintColor, theme.isDark ? 0.14 : 0.1) ?? theme.colors.glass,
    [headerTintColor, theme.colors.glass, theme.isDark],
  )
  const headerControlBorderColor = useMemo(
    () => buildAlphaColor(headerTintColor, theme.isDark ? 0.18 : 0.14) ?? theme.colors.glassBorder,
    [headerTintColor, theme.colors.glassBorder, theme.isDark],
  )

  const subtitle = useMemo(() => {
    if (isNormalReceive) {
      return t("receive.home.supportedNetwork", {
        chain: route.params?.payChain || "-",
        asset: route.params?.payChain || "-",
      })
    }

    if (!config) {
      return t("receive.home.subtitlePending")
    }

    return t("receive.home.supportedNetwork", {
      chain: config.payChain,
      asset: config.sendCoinSymbol,
    })
  }, [config, isNormalReceive, route.params?.payChain, t])

  const minimumDepositText = useMemo(() => {
    if (isNormalReceive) {
      return "-"
    }

    if (!config) {
      return "-"
    }

    return `${config.receiveMinAmount || 0} ${config.sendCoinSymbol}`
  }, [config, isNormalReceive])

  const autoCreateContextKey = useMemo(() => {
    if (isNormalReceive || !config || !receiveAddress) {
      return null
    }

    return buildReceiveAutoCreateKey({
      receiveAddress,
      multisigWalletId: route.params?.multisigWalletId,
      sellerId: config.sellerId,
      sendCoinCode: config.sendCoinCode,
      recvCoinCode: config.recvCoinCode,
    })
  }, [config, isNormalReceive, receiveAddress, route.params?.multisigWalletId])

  useEffect(() => {
    const nextColor = resolvePreferredReceiveChainColor({
      cachedColor: cachedChainColor,
      routeColor: routeChainColor,
      fallbackColor: theme.colors.success,
    })

    setDynamicColor(current => (current === nextColor ? current : nextColor))
  }, [cachedChainColor, routeChainColor, theme.colors.success])

  useEffect(() => {
    if (
      !requestedPayChain ||
      !shouldPrimeReceiveChainColorFromRoute({
        cachedColor: cachedChainColor,
        routeColor: routeChainColor,
      })
    ) {
      return
    }

    writeCachedReceiveChainColor({
      payChain: requestedPayChain,
      color: routeChainColor,
    })
  }, [cachedChainColor, requestedPayChain, routeChainColor])

  useEffect(() => {
    const backendPayChain = config?.payChain || requestedPayChain
    const backendColor = normalizeReceiveColor(config?.payChainColor)

    if (!backendPayChain || !backendColor) {
      return
    }

    writeCachedReceiveChainColor({
      payChain: backendPayChain,
      color: backendColor,
    })
    setDynamicColor(current => (current === backendColor ? current : backendColor))
  }, [config?.payChain, config?.payChainColor, requestedPayChain])

  useEffect(() => {
    if (isNormalReceive) {
      return
    }

    void loadHome({
      payChain: requestedPayChain,
      chainId,
      walletAddress: receiveAddress,
      multisigWalletId: route.params?.multisigWalletId,
    }).catch(error => {
      presentError(error, {
        fallbackKey: "receive.home.loadFailed",
        customResolver: currentError => {
          if (currentError instanceof Error && currentError.message.startsWith("receive_config_missing")) {
            return t("receive.home.configMissing")
          }

          return undefined
        },
      })
    })
  }, [chainId, isNormalReceive, loadHome, presentError, receiveAddress, requestedPayChain, route.params?.multisigWalletId, t])

  useEffect(() => {
    if (!qrSource) {
      setQrMatrix(null)
      return
    }

    try {
      setQrMatrix(buildQrMatrix(qrSource))
    } catch (error) {
      logErrorSafely("[receive][qr][matrix]", error)
      setQrMatrix(null)
    }
  }, [qrSource])

  useEffect(() => {
    if (isNormalReceive || loading || creating || !config || !receiveAddress) {
      return
    }

    if (
      !shouldAttemptReceiveAutoCreate({
        attemptedKey: autoCreateAttemptKeyRef.current,
        currentKey: autoCreateContextKey,
        hasPersonalOrder: Boolean(personalOrder),
      })
    ) {
      return
    }

    autoCreateAttemptKeyRef.current = autoCreateContextKey

    void createOrder({
      variant: "short",
      walletAddress: receiveAddress,
      multisigWalletId: route.params?.multisigWalletId,
    }).catch(error => {
      presentError(error, {
        fallbackKey: "receive.home.createFailed",
      })
    })
  }, [autoCreateContextKey, config, createOrder, creating, isNormalReceive, loading, personalOrder, presentError, receiveAddress, route.params?.multisigWalletId])

  useEffect(() => {
    const expiredAt = currentOrder?.expiredAt

    if (isNormalReceive || !expiredAt) {
      setCountdownText("--:--:--")
      return
    }

    const timer = setInterval(() => {
      const next = formatCountdown(expiredAt)
      setCountdownText(next)
    }, 1000)

    setCountdownText(formatCountdown(expiredAt))

    return () => {
      clearInterval(timer)
    }
  }, [currentOrder?.expiredAt, isNormalReceive])

  async function saveQrImage(input: { address: string; filename: string }) {
    try {
      const dataUrl = await buildQrCodeDataUrl(input.address)
      const result = await fileAdapter.saveImage({
        filename: input.filename,
        base64: stripDataUrlPrefix(dataUrl),
      })

      if (!result.ok) {
        showToast({ message: t("receive.home.saveQrFailed"), tone: "error" })
        return
      }

      showToast({ message: t("receive.home.saveQrSuccess"), tone: "success" })
    } catch (error) {
      logErrorSafely("[receive][qr][save]", error, {
        forwardToConsole: false,
      })
      showToast({ message: t("receive.home.saveQrFailed"), tone: "error" })
    }
  }

  function handleMoreMenu() {
    const menuItems = [
      {
        label: t("receive.home.logs"),
        action: () => {
          if (!currentOrder?.orderSn) {
            showToast({ message: t("receive.home.emptyBody"), tone: "warning" })
            return
          }

          navigation.navigate("ReceiveTxlogsScreen", {
            orderSn: currentOrder.orderSn,
            orderType: currentOrderType,
            personalOrderSn: personalOrder?.orderSn,
            businessOrderSn: businessOrder?.orderSn,
            payChain: config?.payChain || requestedPayChain,
          })
        },
      },
      {
        label: t("receive.home.addresses"),
        action: () => {
          if (!config) {
            showToast({ message: t("receive.home.emptyBody"), tone: "warning" })
            return
          }

          navigation.navigate("ReceiveAddressListScreen", {
            orderType: currentOrderType,
            sendCoinCode: config.sendCoinCode,
            recvCoinCode: config.recvCoinCode,
            payChain: config.payChain,
            sellerId: config.sellerId,
            multisigWalletId: route.params?.multisigWalletId,
          })
        },
      },
      {
        label: t("receive.home.expiry"),
        action: () =>
          navigation.navigate("ReceiveExpiryScreen", {
            payChain: config?.payChain,
            multisigWalletId: route.params?.multisigWalletId,
            collapse: activeCollapseKey,
            sellerId: config?.sellerId,
            sendCoinCode: config?.sendCoinCode,
            recvCoinCode: config?.recvCoinCode,
          }),
      },
      {
        label: t("receive.home.saveQr"),
        action: () => {
          if (!qrSource) {
            showToast({ message: t("receive.home.qrUnavailable"), tone: "warning" })
            return
          }

          const suffix = currentOrder?.orderSn || route.params?.payChain || activeCollapseKey
          void saveQrImage({
            address: qrSource,
            filename: `receive-${suffix}.png`,
          })
        },
      },
      {
        label: t("receive.home.invalid"),
        action: () =>
          navigation.navigate("InvalidReceiveAddressScreen", {
            orderType: currentOrderType,
            sendCoinCode: config?.sendCoinCode,
            recvCoinCode: config?.recvCoinCode,
            sellerId: config?.sellerId,
            multisigWalletId: route.params?.multisigWalletId,
          }),
      },
      {
        label: t("receive.home.faq"),
        action: () => navigation.navigate("ReceiveFaqScreen"),
      },
    ]

    Alert.alert(
      t("receive.home.more"),
      undefined,
      [
        ...menuItems.map(item => ({
          text: item.label,
          onPress: item.action,
        })),
        {
          text: t("common.cancel"),
          style: "cancel" as const,
        },
      ],
      { cancelable: true },
    )
  }

  function handleShare() {
    if (isNormalReceive) {
      if (!qrSource) {
        showToast({ message: t("receive.home.qrUnavailable"), tone: "warning" })
        return
      }

      void shareAdapter.share({
        title: t("receive.home.title"),
        message: qrSource,
      })
      return
    }

    if (!currentOrder?.orderSn) {
      showToast({ message: t("receive.home.emptyBody"), tone: "warning" })
      return
    }

    navigation.navigate("ReceiveShareScreen", {
      orderSn: currentOrder.orderSn,
    })
  }

  async function handleCopy() {
    if (!qrSource) {
      showToast({ message: t("receive.home.qrUnavailable"), tone: "warning" })
      return
    }

    const result = await clipboardAdapter.setString(qrSource)

    if (result.ok) {
      showToast({ message: t("receive.home.copySuccess"), tone: "success" })
      return
    }

    showToast({ message: t("receive.home.copyFailed"), tone: "error" })
  }

  function handleRefreshCurrent() {
    if (isNormalReceive || !receiveAddress || !config) {
      return
    }

    void createOrder({
      variant: currentVariant,
      walletAddress: receiveAddress,
      multisigWalletId: route.params?.multisigWalletId,
    })
      .then(result => {
        if (result?.orderSn) {
          showToast({ message: t("receive.home.createSuccess"), tone: "success" })
        }
      })
      .catch(error => {
        presentError(error, {
          fallbackKey: "receive.home.createFailed",
        })
      })
  }

  function handleToggleCard(kind: CollapseKey) {
    if (!supportsBusinessReceive && kind === "business") {
      return
    }

    if (activeCollapseKey === kind) {
      return
    }

    // Fabric on iOS is hitting a native strict-weak-ordering assertion here.
    if (CAN_USE_COLLAPSE_LAYOUT_ANIMATION) {
      LayoutAnimation.configureNext(COLLAPSE_LAYOUT_ANIMATION)
    }
    setExpandedCard(kind)
  }

  function renderCardContent(kind: CollapseKey) {
    const active = activeCollapseKey === kind
    if (!active) {
      return null
    }

    const showingNormal = isNormalReceive && kind === "individuals"
    const showingTrace = !isNormalReceive && currentOrder && kind === activeCollapseKey
    const cardOrder = kind === "individuals" ? personalOrder : businessOrder
    const activeAddress = showingNormal ? receiveAddress : cardOrder?.address || receiveAddress

    if (loading && !showingNormal) {
      return (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={dynamicColor} />
          <Text style={[styles.loadingText, { color: theme.colors.mutedText }]}>{t("receive.home.loading")}</Text>
        </View>
      )
    }

    if (!showingNormal && !showingTrace) {
      return (
        <View style={styles.emptyWrap}>
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>{t("receive.home.emptyTitle")}</Text>
          <Text style={[styles.emptyBody, { color: theme.colors.mutedText }]}>{t("receive.home.emptyBody")}</Text>
          {!isNormalReceive ? (
            <Pressable
              style={[
                styles.pillAction,
                {
                  backgroundColor: dynamicColor,
                  borderColor: theme.isDark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.52)",
                },
              ]}
              onPress={handleRefreshCurrent}
            >
              <Text style={styles.pillActionText}>
                {creating
                  ? t("common.loading")
                  : kind === "individuals"
                    ? t("receive.home.refreshIndividual")
                    : t("receive.home.refreshBusiness")}
              </Text>
            </Pressable>
          ) : null}
        </View>
      )
    }

    return (
      <View style={styles.detailWrap}>
        <Text style={[styles.supportText, { color: theme.colors.mutedText }]}>{subtitle}</Text>
        <View
          style={[
            styles.qrOuter,
            {
              borderColor: theme.colors.glassBorder,
              backgroundColor: theme.colors.glassStrong,
              shadowColor: theme.colors.shadow,
            },
          ]}
        >
          {qrMatrix ? <QrPreview matrix={qrMatrix} /> : <Text style={[styles.addressText, { color: theme.colors.text }]}>{activeAddress || "-"}</Text>}
        </View>
        {!showingNormal ? (
          <View style={[styles.countdownRow, { backgroundColor: theme.colors.glass, borderColor: theme.colors.glassBorder }]}>
            <Text style={[styles.countdownIcon, { color: dynamicColor }]}>◷</Text>
            <Text style={[styles.countdownText, { color: theme.colors.text }]}>{countdownText}</Text>
          </View>
        ) : null}
        <View
          style={[
            styles.addressPanel,
            {
              backgroundColor: surfaceColor,
              borderColor: theme.colors.glassBorder,
            },
          ]}
        >
          <Text style={[styles.addressLabel, { color: theme.colors.mutedText }]}>{t("receive.home.addressField")}</Text>
          <Text style={[styles.addressValue, { color: theme.colors.text }]}>{formatAddressMultiline(activeAddress || "-")}</Text>
        </View>
        <View style={styles.actionRow}>
          <ActionButton label={t("receive.home.share")} onPress={handleShare} />
          <ActionButton label={t("receive.home.copy")} onPress={() => void handleCopy()} />
        </View>
        <View style={[styles.depositRow, { backgroundColor: theme.colors.glass, borderColor: theme.colors.glassBorder }]}>
          <Text style={[styles.depositLabel, { color: theme.colors.mutedText }]}>{t("receive.home.minimumDeposit")}</Text>
          <Text style={[styles.depositValue, { color: theme.colors.text }]}>{minimumDepositText}</Text>
        </View>
        <Pressable
          style={[
            styles.recordRow,
            {
              backgroundColor: theme.colors.glass,
              borderColor: theme.colors.glassBorder,
            },
          ]}
          onPress={() => {
            if (!cardOrder?.orderSn) {
              showToast({ message: t("receive.home.emptyBody"), tone: "warning" })
              return
            }

            navigation.navigate("ReceiveTxlogsScreen", {
              orderSn: cardOrder.orderSn,
              orderType: kind === "individuals" ? "TRACE" : "TRACE_LONG_TERM",
              personalOrderSn: personalOrder?.orderSn,
              businessOrderSn: businessOrder?.orderSn,
              payChain: config?.payChain || requestedPayChain,
            })
          }}
        >
          <Text style={[styles.recordIcon, { color: dynamicColor }]}>▣</Text>
          <Text style={[styles.recordText, { color: theme.colors.text }]}>{t("receive.home.logs")}</Text>
          <Text style={[styles.recordArrow, { color: theme.colors.mutedText }]}>›</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <HomeScaffold
      backgroundColor={pageBackgroundColor}
      backTintColor={headerTintColor}
      canGoBack
      headerBackgroundColor={headerBackgroundColor}
      headerTintColor={headerTintColor}
      onBack={navigation.goBack}
      title={t("receive.home.title")}
      right={
        <Pressable
          onPress={handleMoreMenu}
          style={[styles.moreButton, { backgroundColor: headerControlBackgroundColor, borderColor: headerControlBorderColor }]}
        >
          <Text style={[styles.moreButtonText, { color: headerTintColor }]}>•••</Text>
        </Pressable>
      }
      contentContainerStyle={styles.scaffoldContent}
    >
      <View style={styles.page}>
        <CollapseCard
          accentColor={dynamicColor}
          title={t("receive.home.individuals")}
          expanded={activeCollapseKey === "individuals"}
          onPress={() => handleToggleCard("individuals")}
        >
          {renderCardContent("individuals")}
        </CollapseCard>

        {supportsBusinessReceive ? (
          <CollapseCard
            accentColor={dynamicColor}
            title={t("receive.home.business")}
            expanded={activeCollapseKey === "business"}
            onPress={() => handleToggleCard("business")}
          >
            {renderCardContent("business")}
          </CollapseCard>
        ) : null}
      </View>
    </HomeScaffold>
  )
}

function CollapseCard(props: {
  accentColor?: string
  title: string
  expanded: boolean
  onPress: () => void
  children?: React.ReactNode
}) {
  const theme = useAppTheme()
  const accentColor = props.accentColor || theme.colors.primary
  const accentSoftColor = buildAlphaColor(accentColor, theme.isDark ? 0.26 : 0.16) ?? theme.colors.primarySoft ?? theme.colors.glassOverlay

  return (
    <View
      style={[
        styles.collapseCard,
        {
          backgroundColor: theme.colors.glassStrong,
          borderColor: theme.colors.glassBorder,
          shadowColor: theme.colors.shadow,
          shadowOpacity: props.expanded ? (theme.isDark ? 0.2 : 0.08) : theme.isDark ? 0.14 : 0.05,
        },
        props.expanded ? styles.collapseCardExpanded : null,
      ]}
    >
      <Pressable onPress={props.onPress} style={styles.collapseHeader}>
        <View style={styles.collapseTitleRow}>
          <View
            style={[
              styles.collapseIconDot,
              {
                backgroundColor: props.expanded ? accentSoftColor : theme.colors.glassOverlay,
                borderColor: props.expanded ? accentColor : theme.colors.glassBorder,
              },
            ]}
          />
          <Text style={[styles.collapseTitle, { color: theme.colors.text }]}>{props.title}</Text>
        </View>
        <Text style={[styles.collapseArrow, { color: theme.colors.mutedText }, props.expanded ? styles.collapseArrowExpanded : null]}>⌃</Text>
      </Pressable>
      {props.expanded ? (
        <View style={styles.drawerFrame}>
          <View style={[styles.collapseBody, { borderTopColor: theme.colors.glassBorder }]}>{props.children}</View>
        </View>
      ) : null}
    </View>
  )
}

function QrPreview(props: { matrix: QrMatrix }) {
  const cellSize = Math.max(4, Math.floor(180 / props.matrix.size))

  return (
    <View style={styles.qrWrap}>
      {props.matrix.rows.map((row, rowIndex) => (
        <View key={`row-${rowIndex}`} style={styles.qrRow}>
          {row.map((filled, columnIndex) => (
            <View
              key={`cell-${rowIndex}-${columnIndex}`}
              style={[
                styles.qrCell,
                {
                  width: cellSize,
                  height: cellSize,
                  backgroundColor: filled ? "#000000" : "#FFFFFF",
                },
              ]}
            />
          ))}
        </View>
      ))}
    </View>
  )
}

function ActionButton(props: { label: string; onPress: () => void }) {
  const theme = useAppTheme()

  return (
    <Pressable
      style={({ pressed }) => [styles.actionButtonPressable, pressed ? styles.actionButtonPressablePressed : null]}
      onPress={props.onPress}
    >
      <View
        style={[
          styles.actionButton,
          {
            borderColor: theme.colors.glassBorder,
            backgroundColor: theme.colors.glass,
            shadowColor: theme.colors.shadow,
          },
        ]}
      >
        <Text style={[styles.actionButtonText, { color: theme.colors.text }]}>{props.label}</Text>
      </View>
    </Pressable>
  )
}

function formatCountdown(expiredAt: number) {
  const remainingSeconds = Math.max(0, Math.floor((expiredAt - Date.now()) / 1000))
  const hours = Math.floor(remainingSeconds / 3600)
  const minutes = Math.floor((remainingSeconds % 3600) / 60)
  const seconds = remainingSeconds % 60

  return [hours, minutes, seconds].map(part => String(part).padStart(2, "0")).join(":")
}

function formatAddressMultiline(address: string) {
  if (address.length <= 28) {
    return address
  }

  const pivot = Math.ceil(address.length / 2)
  return `${address.slice(0, pivot)}\n${address.slice(pivot)}`
}

type ParsedReceiveColor = {
  r: number
  g: number
  b: number
}

function normalizeReceiveColor(value?: string | null) {
  const normalized = value?.trim() || ""

  if (!normalized) {
    return ""
  }

  return parseReceiveColor(normalized) ? normalized : ""
}

function parseReceiveColor(value: string): ParsedReceiveColor | null {
  return parseReceiveHexColor(value) ?? parseReceiveRgbColor(value)
}

function parseReceiveHexColor(value: string): ParsedReceiveColor | null {
  const match = value.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i)

  if (!match) {
    return null
  }

  const [, rawHex] = match
  const hex = rawHex.length === 3 ? rawHex.split("").map(part => `${part}${part}`).join("") : rawHex.slice(0, 6)
  const r = Number.parseInt(hex.slice(0, 2), 16)
  const g = Number.parseInt(hex.slice(2, 4), 16)
  const b = Number.parseInt(hex.slice(4, 6), 16)

  if ([r, g, b].some(channel => Number.isNaN(channel))) {
    return null
  }

  return { r, g, b }
}

function parseReceiveRgbColor(value: string): ParsedReceiveColor | null {
  const match = value
    .trim()
    .match(/^rgba?\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})(?:\s*[,/]\s*(0|0?\.\d+|1(?:\.0+)?))?\s*\)$/i)

  if (!match) {
    return null
  }

  const r = Number.parseInt(match[1] ?? "", 10)
  const g = Number.parseInt(match[2] ?? "", 10)
  const b = Number.parseInt(match[3] ?? "", 10)

  if ([r, g, b].some(channel => Number.isNaN(channel) || channel < 0 || channel > 255)) {
    return null
  }

  return { r, g, b }
}

function mixReceiveColor(color: string, fallback: string, fallbackWeight: number) {
  const parsedColor = parseReceiveColor(color)
  const parsedFallback = parseReceiveColor(fallback)

  if (!parsedColor) {
    return fallback
  }

  if (!parsedFallback) {
    return color
  }

  const clampedWeight = Math.max(0, Math.min(1, fallbackWeight))
  const r = Math.round(parsedColor.r * (1 - clampedWeight) + parsedFallback.r * clampedWeight)
  const g = Math.round(parsedColor.g * (1 - clampedWeight) + parsedFallback.g * clampedWeight)
  const b = Math.round(parsedColor.b * (1 - clampedWeight) + parsedFallback.b * clampedWeight)

  return `rgb(${r}, ${g}, ${b})`
}

function buildAlphaColor(color: string, alpha: number) {
  const parsedColor = parseReceiveColor(color)

  if (!parsedColor) {
    return null
  }

  const clampedAlpha = Math.max(0, Math.min(1, alpha))
  return `rgba(${parsedColor.r}, ${parsedColor.g}, ${parsedColor.b}, ${clampedAlpha})`
}

function pickReadableTextColor(backgroundColor: string, fallback: string) {
  const parsedColor = parseReceiveColor(backgroundColor)

  if (!parsedColor) {
    return fallback
  }

  const normalizeChannel = (value: number) => {
    const ratio = value / 255
    return ratio <= 0.03928 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4
  }

  const luminance =
    0.2126 * normalizeChannel(parsedColor.r) + 0.7152 * normalizeChannel(parsedColor.g) + 0.0722 * normalizeChannel(parsedColor.b)

  return luminance > 0.56 ? "#111111" : "#FFFFFF"
}

const styles = StyleSheet.create({
  scaffoldContent: {
    paddingTop: 12,
    paddingBottom: 28,
  },
  page: {
    gap: SPACE.sm,
  },
  moreButton: {
    minWidth: 40,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  moreButtonText: {
    fontSize: FONT.bodyLarge,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  collapseCard: {
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: SPACE.md,
    paddingVertical: SPACE.md,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  collapseCardExpanded: {
    elevation: 6,
  },
  collapseHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 40,
  },
  collapseTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.sm,
  },
  collapseIconDot: {
    width: 14,
    height: 14,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  collapseTitle: {
    fontSize: FONT.title,
    fontWeight: "600",
  },
  collapseArrow: {
    fontSize: FONT.title,
    transform: [{ rotate: "0deg" }],
  },
  collapseArrowExpanded: {
    transform: [{ rotate: "180deg" }],
  },
  collapseBody: {
    marginTop: SPACE.sm,
    paddingTop: SPACE.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  drawerFrame: {
    overflow: "hidden",
  },
  detailWrap: {
    gap: SPACE.sm,
  },
  supportText: {
    fontSize: FONT.subhead,
    lineHeight: 21,
    textAlign: "center",
  },
  qrOuter: {
    alignSelf: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 24,
    padding: SPACE.md,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  qrWrap: {
    width: 180,
    height: 180,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
  },
  qrRow: {
    flexDirection: "row",
  },
  qrCell: {
    flexShrink: 0,
  },
  countdownRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACE.xs,
    alignSelf: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  countdownIcon: {
    fontSize: FONT.bodyLarge,
  },
  countdownText: {
    fontSize: FONT.title,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  addressPanel: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: SPACE.md,
    paddingVertical: SPACE.md,
    gap: SPACE.xs,
  },
  addressLabel: {
    fontSize: FONT.footnote,
  },
  addressValue: {
    fontSize: FONT.bodyLarge,
    lineHeight: 24,
    fontWeight: "600",
  },
  addressText: {
    fontSize: FONT.bodyLarge,
    lineHeight: 24,
    textAlign: "center",
  },
  actionRow: {
    flexDirection: "row",
    gap: SPACE.sm,
  },
  actionButtonPressable: {
    flex: 1,
  },
  actionButtonPressablePressed: {
    opacity: 0.8,
    transform: [{ scale: 0.985 }],
  },
  actionButton: {
    minHeight: 44,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACE.sm,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  actionButtonText: {
    fontSize: FONT.subhead,
    fontWeight: "600",
  },
  depositRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    paddingHorizontal: SPACE.md,
    paddingVertical: 12,
  },
  depositLabel: {
    fontSize: FONT.subhead,
  },
  depositValue: {
    fontSize: FONT.subhead,
    fontWeight: "600",
  },
  recordRow: {
    minHeight: 60,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    gap: SPACE.sm,
    paddingHorizontal: SPACE.md,
    paddingVertical: 14,
  },
  recordIcon: {
    fontSize: FONT.title,
  },
  recordText: {
    flex: 1,
    fontSize: FONT.title,
    fontWeight: "500",
  },
  recordArrow: {
    fontSize: FONT.headline,
  },
  emptyWrap: {
    gap: SPACE.sm,
    alignItems: "center",
    paddingVertical: SPACE.sm,
  },
  emptyTitle: {
    fontSize: FONT.bodyLarge,
    fontWeight: "700",
  },
  emptyBody: {
    fontSize: FONT.body,
    lineHeight: 22,
    textAlign: "center",
  },
  pillAction: {
    minHeight: 46,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACE.md,
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  pillActionText: {
    fontSize: FONT.bodyLarge,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  loadingWrap: {
    alignItems: "center",
    gap: SPACE.xs,
    paddingVertical: SPACE.xl,
  },
  loadingText: {
    fontSize: FONT.body,
  },
})
