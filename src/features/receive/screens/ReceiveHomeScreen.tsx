import React, { useEffect, useMemo, useRef, useState } from "react"

import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  LayoutAnimation,
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
import { resolveChainNameById } from "@/features/home/services/homeApi"
import { useReceiveStore } from "@/features/receive/store/useReceiveStore"
import { buildQrCodeDataUrl, buildQrMatrix, stripDataUrlPrefix, type QrMatrix } from "@/features/receive/utils/qrcode"
import { fileAdapter, shareAdapter } from "@/shared/native"
import { useAuthStore } from "@/shared/store/useAuthStore"
import { useUserStore } from "@/shared/store/useUserStore"
import { useWalletStore } from "@/shared/store/useWalletStore"
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

export function ReceiveHomeScreen({ navigation, route }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
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
  const [expandedCard, setExpandedCard] = useState<CollapseKey>(route.params?.collapse ?? "individuals")
  const [qrMatrix, setQrMatrix] = useState<QrMatrix | null>(null)
  const [countdownText, setCountdownText] = useState("--:--:--")
  const autoCreateAttemptedRef = useRef(false)
  const receiveAddress = route.params?.cowallet || profile?.address || session?.address || walletAddress || ""
  const isNormalReceive = route.params?.receiveMode === "normal"
  const currentOrder = expandedCard === "individuals" ? personalOrder : businessOrder
  const currentVariant = expandedCard === "individuals" ? "short" : "long"
  const currentOrderType = expandedCard === "individuals" ? "TRACE" : "TRACE_LONG_TERM"
  const dynamicColor = config?.payChainColor || route.params?.chainColor || theme.colors.primary
  const surfaceColor = "#F4F4F1"
  const qrSource = isNormalReceive ? receiveAddress : currentOrder?.address || receiveAddress

  useEffect(() => {
    if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true)
    }
  }, [])

  function resolveLoadHomeMessage(error: unknown) {
    if (!(error instanceof Error) || !error.message) {
      return t("receive.home.loadFailed")
    }

    if (error.message.startsWith("receive_config_missing")) {
      return t("receive.home.configMissing")
    }

    return `${t("receive.home.loadFailed")}\n${error.message}`
  }

  function resolveCreateOrderMessage(error: unknown) {
    if (!(error instanceof Error) || !error.message) {
      return t("receive.home.createFailed")
    }

    return `${t("receive.home.createFailed")}\n${error.message}`
  }

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

  useEffect(() => {
    if (isNormalReceive) {
      return
    }

    void loadHome({
      payChain: route.params?.payChain ?? resolveChainNameById(chainId),
      chainId,
      walletAddress: receiveAddress,
      multisigWalletId: route.params?.multisigWalletId,
    }).catch(error => {
      Alert.alert(t("common.errorTitle"), resolveLoadHomeMessage(error))
    })
  }, [chainId, isNormalReceive, loadHome, receiveAddress, route.params?.multisigWalletId, route.params?.payChain, t])

  useEffect(() => {
    if (!qrSource) {
      setQrMatrix(null)
      return
    }

    try {
      setQrMatrix(buildQrMatrix(qrSource))
    } catch (error) {
      console.error("[receive][qr][matrix]", error)
      setQrMatrix(null)
    }
  }, [qrSource])

  useEffect(() => {
    if (isNormalReceive || loading || creating || !config || !receiveAddress) {
      return
    }

    if (personalOrder || autoCreateAttemptedRef.current) {
      return
    }

    autoCreateAttemptedRef.current = true

    void createOrder({
      variant: "short",
      walletAddress: receiveAddress,
      multisigWalletId: route.params?.multisigWalletId,
    }).catch(error => {
      autoCreateAttemptedRef.current = false
      Alert.alert(t("common.errorTitle"), resolveCreateOrderMessage(error))
    })
  }, [config, createOrder, creating, isNormalReceive, loading, personalOrder, receiveAddress, route.params?.multisigWalletId, t])

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
        Alert.alert(t("common.errorTitle"), t("receive.home.saveQrFailed"))
        return
      }

      Alert.alert(t("common.infoTitle"), t("receive.home.saveQrSuccess"))
    } catch (error) {
      console.error("[receive][qr][save]", error)
      Alert.alert(t("common.errorTitle"), t("receive.home.saveQrFailed"))
    }
  }

  function handleMoreMenu() {
    const menuItems = [
      {
        label: t("receive.home.logs"),
        action: () => {
          if (!currentOrder?.orderSn) {
            Alert.alert(t("common.infoTitle"), t("receive.home.emptyBody"))
            return
          }

          navigation.navigate("ReceiveTxlogsScreen", {
            orderSn: currentOrder.orderSn,
            orderType: currentOrderType,
          })
        },
      },
      {
        label: t("receive.home.addresses"),
        action: () => {
          if (!config) {
            Alert.alert(t("common.infoTitle"), t("receive.home.emptyBody"))
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
            collapse: expandedCard,
            sellerId: config?.sellerId,
            sendCoinCode: config?.sendCoinCode,
            recvCoinCode: config?.recvCoinCode,
          }),
      },
      {
        label: t("receive.home.saveQr"),
        action: () => {
          if (!qrSource) {
            Alert.alert(t("common.infoTitle"), t("receive.home.qrUnavailable"))
            return
          }

          const suffix = currentOrder?.orderSn || route.params?.payChain || expandedCard
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
        Alert.alert(t("common.infoTitle"), t("receive.home.qrUnavailable"))
        return
      }

      void shareAdapter.share({
        title: t("receive.home.title"),
        message: qrSource,
      })
      return
    }

    if (!currentOrder?.orderSn) {
      Alert.alert(t("common.infoTitle"), t("receive.home.emptyBody"))
      return
    }

    navigation.navigate("ReceiveShareScreen", {
      orderSn: currentOrder.orderSn,
    })
  }

  function handleCopy() {
    if (!qrSource) {
      return
    }

    Alert.alert(t("common.infoTitle"), qrSource)
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
          Alert.alert(t("common.infoTitle"), t("receive.home.createSuccess"))
        }
      })
      .catch(error => {
        Alert.alert(t("common.errorTitle"), resolveCreateOrderMessage(error))
      })
  }

  function handleToggleCard(kind: CollapseKey) {
    if (expandedCard === kind) {
      return
    }

    setExpandedCard(kind)
  }

  function renderCardContent(kind: CollapseKey) {
    const active = expandedCard === kind
    if (!active) {
      return null
    }

    const showingNormal = isNormalReceive && kind === "individuals"
    const showingTrace = !isNormalReceive && currentOrder && kind === expandedCard
    const cardOrder = kind === "individuals" ? personalOrder : businessOrder
    const activeAddress = showingNormal ? receiveAddress : cardOrder?.address || receiveAddress

    if (loading && !showingNormal) {
      return (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={dynamicColor} />
          <Text style={[styles.loadingText, { color: "#5F6672" }]}>{t("receive.home.loading")}</Text>
        </View>
      )
    }

    if (!showingNormal && !showingTrace) {
      return (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>{t("receive.home.emptyTitle")}</Text>
          <Text style={styles.emptyBody}>{t("receive.home.emptyBody")}</Text>
          {!isNormalReceive ? (
            <Pressable style={[styles.pillAction, { backgroundColor: dynamicColor }]} onPress={handleRefreshCurrent}>
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
        <Text style={styles.supportText}>{subtitle}</Text>
        <View style={styles.qrOuter}>
          {qrMatrix ? <QrPreview matrix={qrMatrix} /> : <Text style={styles.addressText}>{activeAddress || "-"}</Text>}
        </View>
        {!showingNormal ? (
          <View style={styles.countdownRow}>
            <Text style={styles.countdownIcon}>◷</Text>
            <Text style={styles.countdownText}>{countdownText}</Text>
          </View>
        ) : null}
        <View style={[styles.addressPanel, { backgroundColor: surfaceColor }]}>
          <Text style={styles.addressLabel}>{t("receive.home.addressField")}</Text>
          <Text style={styles.addressValue}>{formatAddressMultiline(activeAddress || "-")}</Text>
        </View>
        <View style={styles.actionRow}>
          <ActionButton label={t("receive.home.share")} onPress={handleShare} />
          <ActionButton label={t("receive.home.copy")} onPress={handleCopy} />
        </View>
        <View style={styles.depositRow}>
          <Text style={styles.depositLabel}>{t("receive.home.minimumDeposit")}</Text>
          <Text style={styles.depositValue}>{minimumDepositText}</Text>
        </View>
        <Pressable
          style={styles.recordRow}
          onPress={() => {
            if (!cardOrder?.orderSn) {
              Alert.alert(t("common.infoTitle"), t("receive.home.emptyBody"))
              return
            }

            navigation.navigate("ReceiveTxlogsScreen", {
              orderSn: cardOrder.orderSn,
              orderType: kind === "individuals" ? "TRACE" : "TRACE_LONG_TERM",
            })
          }}
        >
          <Text style={styles.recordIcon}>▣</Text>
          <Text style={styles.recordText}>{t("receive.home.logs")}</Text>
          <Text style={styles.recordArrow}>›</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <HomeScaffold
      canGoBack
      onBack={navigation.goBack}
      title={t("receive.home.title")}
      backgroundColor={dynamicColor}
      headerBackgroundColor={dynamicColor}
      headerTintColor="#FFFFFF"
      right={
        <Pressable onPress={handleMoreMenu} style={styles.moreButton}>
          <Text style={styles.moreButtonText}>•••</Text>
        </Pressable>
      }
      contentContainerStyle={styles.scaffoldContent}
    >
      <View style={styles.page}>
        <CollapseCard
          title={t("receive.home.individuals")}
          expanded={expandedCard === "individuals"}
          onPress={() => handleToggleCard("individuals")}
        >
          {renderCardContent("individuals")}
        </CollapseCard>

        <CollapseCard
          title={t("receive.home.business")}
          expanded={expandedCard === "business"}
          onPress={() => handleToggleCard("business")}
        >
          {renderCardContent("business")}
        </CollapseCard>
      </View>
    </HomeScaffold>
  )
}

function CollapseCard(props: {
  title: string
  expanded: boolean
  onPress: () => void
  children?: React.ReactNode
}) {
  const rotate = useRef(new Animated.Value(props.expanded ? 1 : 0)).current
  const progress = useRef(new Animated.Value(props.expanded ? 1 : 0)).current
  const [shouldRenderBody, setShouldRenderBody] = useState(props.expanded)
  const [cachedChildren, setCachedChildren] = useState<React.ReactNode>(props.children)

  useEffect(() => {
    if (props.expanded && props.children != null) {
      setCachedChildren(props.children)
    }
  }, [props.children, props.expanded])

  useEffect(() => {
    if (props.expanded) {
      LayoutAnimation.configureNext({
        duration: 220,
        create: {
          type: LayoutAnimation.Types.easeInEaseOut,
          property: LayoutAnimation.Properties.opacity,
        },
        update: {
          type: LayoutAnimation.Types.easeInEaseOut,
        },
      })
      setShouldRenderBody(true)
    }

    const animation = Animated.parallel([
      Animated.timing(rotate, {
        toValue: props.expanded ? 1 : 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(progress, {
        toValue: props.expanded ? 1 : 0,
        duration: props.expanded ? 320 : 220,
        easing: props.expanded ? Easing.out(Easing.cubic) : Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    ])

    animation.start(({ finished }) => {
      if (finished && !props.expanded) {
        LayoutAnimation.configureNext({
          duration: 180,
          update: {
            type: LayoutAnimation.Types.easeInEaseOut,
          },
          delete: {
            type: LayoutAnimation.Types.easeInEaseOut,
            property: LayoutAnimation.Properties.opacity,
          },
        })
        setShouldRenderBody(false)
      }
    })

    return () => {
      animation.stop()
    }
  }, [progress, props.expanded, rotate])

  const arrowRotate = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  })
  const drawerOpacity = progress.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0, 0.35, 1],
  })
  const drawerScaleY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1],
  })
  const drawerTranslateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-14, 0],
  })
  const bodyContent = props.expanded ? props.children : cachedChildren

  return (
    <View style={[styles.collapseCard, props.expanded ? styles.collapseCardExpanded : null]}>
      <Pressable onPress={props.onPress} style={styles.collapseHeader}>
        <View style={styles.collapseTitleRow}>
          <Text style={styles.collapseIcon}>{props.expanded ? "▣" : "◫"}</Text>
          <Text style={styles.collapseTitle}>{props.title}</Text>
        </View>
        <Animated.Text style={[styles.collapseArrow, { transform: [{ rotate: arrowRotate }] }]}>⌃</Animated.Text>
      </Pressable>
      {shouldRenderBody ? (
        <Animated.View
          style={[
            styles.drawerFrame,
            {
              opacity: drawerOpacity,
              transform: [{ translateY: drawerTranslateY }, { scaleY: drawerScaleY }],
            },
          ]}
          pointerEvents={props.expanded ? "auto" : "none"}
        >
          <View style={styles.collapseBody}>{bodyContent}</View>
        </Animated.View>
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
  const scale = useRef(new Animated.Value(1)).current

  return (
    <Pressable
      style={styles.actionButtonPressable}
      onPressIn={() => {
        Animated.spring(scale, {
          toValue: 0.97,
          friction: 8,
          tension: 120,
          useNativeDriver: true,
        }).start()
      }}
      onPressOut={() => {
        Animated.spring(scale, {
          toValue: 1,
          friction: 8,
          tension: 120,
          useNativeDriver: true,
        }).start()
      }}
      onPress={props.onPress}
    >
      <Animated.View
        style={[
          styles.actionButton,
          {
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
            transform: [{ scale }],
          },
        ]}
      >
        <Text style={styles.actionButtonText}>{props.label}</Text>
      </Animated.View>
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
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  moreButtonText: {
    color: "#FFFFFF",
    fontSize: FONT.bodyLarge,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  collapseCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    paddingHorizontal: SPACE.md,
    paddingVertical: SPACE.md,
    shadowColor: "#7A5A00",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  collapseCardExpanded: {
    shadowOpacity: 0.12,
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
  collapseIcon: {
    fontSize: FONT.title,
    color: "#1F2937",
  },
  collapseTitle: {
    fontSize: FONT.title,
    fontWeight: "600",
    color: "#121926",
  },
  collapseArrow: {
    fontSize: FONT.title,
    color: "#8B9098",
  },
  collapseBody: {
    marginTop: SPACE.sm,
    paddingTop: SPACE.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#DFE3E8",
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
    color: "#232B37",
  },
  qrOuter: {
    alignSelf: "center",
    borderWidth: 1,
    borderColor: "#C7CCD3",
    borderRadius: 24,
    padding: SPACE.md,
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F172A",
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
  },
  countdownIcon: {
    fontSize: FONT.bodyLarge,
    color: "#212121",
  },
  countdownText: {
    fontSize: FONT.title,
    fontWeight: "700",
    color: "#212121",
    letterSpacing: 0.8,
  },
  addressPanel: {
    borderRadius: 20,
    paddingHorizontal: SPACE.md,
    paddingVertical: SPACE.md,
    gap: SPACE.xs,
  },
  addressLabel: {
    fontSize: FONT.footnote,
    color: "#8B9098",
  },
  addressValue: {
    fontSize: FONT.bodyLarge,
    lineHeight: 24,
    fontWeight: "600",
    color: "#2E3137",
  },
  addressText: {
    fontSize: FONT.bodyLarge,
    lineHeight: 24,
    color: "#2E3137",
    textAlign: "center",
  },
  actionRow: {
    flexDirection: "row",
    gap: SPACE.sm,
  },
  actionButtonPressable: {
    flex: 1,
  },
  actionButton: {
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACE.sm,
  },
  actionButtonText: {
    fontSize: FONT.subhead,
    color: "#111111",
    fontWeight: "600",
  },
  depositRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  depositLabel: {
    fontSize: FONT.subhead,
    color: "#8B9098",
  },
  depositValue: {
    fontSize: FONT.subhead,
    color: "#111111",
    fontWeight: "600",
  },
  recordRow: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E7EB",
    gap: SPACE.sm,
    paddingTop: SPACE.md,
  },
  recordIcon: {
    fontSize: FONT.title,
    color: "#242B36",
  },
  recordText: {
    flex: 1,
    fontSize: FONT.title,
    color: "#111111",
    fontWeight: "500",
  },
  recordArrow: {
    fontSize: FONT.headline,
    color: "#8B9098",
  },
  emptyWrap: {
    gap: SPACE.sm,
    alignItems: "center",
    paddingVertical: SPACE.sm,
  },
  emptyTitle: {
    fontSize: FONT.bodyLarge,
    fontWeight: "700",
    color: "#111827",
  },
  emptyBody: {
    fontSize: FONT.body,
    lineHeight: 22,
    textAlign: "center",
    color: "#68707D",
  },
  pillAction: {
    minHeight: 46,
    borderRadius: 999,
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
