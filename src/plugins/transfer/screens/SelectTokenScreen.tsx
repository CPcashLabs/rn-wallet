import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { useFocusEffect } from "@react-navigation/native"
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { navigateRoot } from "@/app/navigation/navigationRef"
import { HomeScaffold } from "@/features/home/components/HomeScaffold"
import { writeCachedReceiveChainColor } from "@/plugins/receive/services/receiveColorCache"
import { useTransferDraftStore } from "@/plugins/transfer/store/useTransferDraftStore"
import { resolveTransferChainType } from "@/plugins/transfer/utils/address"
import { getTransferChannels } from "@/shared/exchange/services/exchangeApi"
import { logErrorSafely } from "@/shared/logging/safeConsole"
import { useHomeBackAction } from "@/shared/navigation/useHomeBackAction"
import { getBoolean, setBoolean } from "@/shared/storage/kvStorage"
import { KvStorageKeys } from "@/shared/storage/sessionKeys"
import { useWalletStore } from "@/shared/store/useWalletStore"
import { useAppTheme } from "@/shared/theme/useAppTheme"
import { useToast } from "@/shared/toast/useToast"
import { AppEmptyState } from "@/shared/ui/AppEmptyState"
import { AppGlyph } from "@/shared/ui/AppGlyph"
import { NetworkLogo } from "@/shared/ui/NetworkLogo"

import type { TransferStackParamList } from "@/app/navigation/types"

type Props = NativeStackScreenProps<TransferStackParamList, "SelectTokenScreen">

type ChannelItem = Awaited<ReturnType<typeof getTransferChannels>>[number]
type ChannelSection = {
  key: "normal" | "bridge"
  title: string
  infoMessage: string
  items: ChannelItem[]
}

export function SelectTokenScreen({ navigation, route }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const toast = useToast()
  const intent = route.params?.intent ?? "transfer"
  const chainId = useWalletStore(state => state.chainId)
  const selectedChannel = useTransferDraftStore(state => state.selectedChannel)
  const recipientAddress = useTransferDraftStore(state => state.recipientAddress)
  const setSelectedChannel = useTransferDraftStore(state => state.setSelectedChannel)
  const setRecipientAddress = useTransferDraftStore(state => state.setRecipientAddress)
  const clearOrderDraft = useTransferDraftStore(state => state.clearOrderDraft)
  const handleBack = useHomeBackAction(navigation)
  const [channels, setChannels] = useState<ChannelItem[]>([])
  const [loading, setLoading] = useState(true)
  const copouchAddress = route.params?.copouch ?? route.params?.cowallet
  const preferredChainType = route.params?.preferredChainType
  const prefilledRecipientAddress = route.params?.prefilledRecipientAddress?.trim() ?? ""
  const autoAdvanceToOrder = intent === "transfer" && route.params?.autoAdvanceToOrder === true && Boolean(prefilledRecipientAddress)
  const autoSelectFirstMatching = route.params?.autoSelectFirstMatching === true
  const autoSelectedRef = useRef(false)

  const loadChannels = useCallback(async () => {
    setLoading(true)

    try {
      const result = await getTransferChannels(chainId, intent)
      setChannels(result)
      setBoolean(KvStorageKeys.SelectTokenPageReload, false)
    } catch (error) {
      logErrorSafely("[select-token][loadChannels]", error)
      setChannels([])
      Alert.alert(t("common.errorTitle"), t("transfer.selectToken.loadFailed"))
    } finally {
      setLoading(false)
    }
  }, [chainId, intent, t])

  useFocusEffect(
    useCallback(() => {
      const shouldReload = getBoolean(KvStorageKeys.SelectTokenPageReload) ?? true

      if (shouldReload || channels.length === 0) {
        void loadChannels().catch(error => {
          logErrorSafely("[select-token][focusReload]", error)
        })
      }

      return () => {
        setBoolean(KvStorageKeys.SelectTokenPageReload, true)
      }
    }, [channels.length, loadChannels]),
  )

  const visibleChannels = useMemo(() => {
    if (!preferredChainType) {
      return channels
    }

    return channels.filter(item => resolveTransferChainType(item.receiveChainName) === preferredChainType)
  }, [channels, preferredChainType])

  const sections = useMemo<ChannelSection[]>(() => {
    const normalChannels = visibleChannels.filter(item => item.channelType === "normal")
    const bridgeChannels = visibleChannels.filter(item => item.channelType === "bridge")
    const result: ChannelSection[] = []
    const titlePrefix = intent === "receive" ? "receive.select" : "transfer.selectToken"

    if (normalChannels.length > 0) {
      result.push({
        key: "normal",
        title: t(`${titlePrefix}.normalSectionTitle`),
        infoMessage: t(`${titlePrefix}.normalSectionMessage`),
        items: normalChannels,
      })
    }

    if (bridgeChannels.length > 0) {
      result.push({
        key: "bridge",
        title: t(`${titlePrefix}.bridgeSectionTitle`),
        infoMessage: t(`${titlePrefix}.bridgeSectionMessage`),
        items: bridgeChannels,
      })
    }

    return result
  }, [intent, t, visibleChannels])

  const flatVisibleChannels = useMemo(() => sections.flatMap(section => section.items), [sections])

  const handleSelectChannel = useCallback(
    (item: ChannelItem) => {
      if (intent === "receive") {
        writeCachedReceiveChainColor({
          payChain: item.receiveChainName,
          color: item.receiveChainColor,
        })

        navigateRoot("ReceiveStack", {
          screen: "ReceiveHomeScreen",
          params: {
            payChain: item.receiveChainName,
            chainColor: item.receiveChainColor,
            copouch: copouchAddress,
            multisigWalletId: route.params?.multisigWalletId,
            receiveMode: item.channelType === "normal" ? "normal" : "trace",
          },
        })
        return
      }

      setSelectedChannel(item)

      if (autoAdvanceToOrder) {
        clearOrderDraft()
        setRecipientAddress(prefilledRecipientAddress, "scan")
        navigation.navigate(item.channelType === "normal" ? "TransferOrderNormalScreen" : "TransferOrderScreen")
        return
      }

      const initialAddress = prefilledRecipientAddress || (selectedChannel?.key === item.key ? recipientAddress : "")

      navigation.navigate("TransferAddressScreen", {
        receiveChainName: item.receiveChainName,
        receiveChainFullName: item.receiveChainFullName,
        receiveChainColor: item.receiveChainColor,
        receiveChainLogo: item.receiveChainLogo,
        addressRegexes: item.addressRegexes,
        channelType: item.channelType,
        title: item.title,
        isRebate: item.isRebate,
        initialAddress,
      })
    },
    [
      autoAdvanceToOrder,
      clearOrderDraft,
      copouchAddress,
      intent,
      navigation,
      prefilledRecipientAddress,
      recipientAddress,
      route.params?.multisigWalletId,
      selectedChannel?.key,
      setRecipientAddress,
      setSelectedChannel,
    ],
  )

  useEffect(() => {
    if (!autoSelectFirstMatching || autoSelectedRef.current || loading || flatVisibleChannels.length === 0) {
      return
    }

    autoSelectedRef.current = true
    handleSelectChannel(flatVisibleChannels[0] as ChannelItem)
  }, [autoSelectFirstMatching, flatVisibleChannels, handleSelectChannel, loading])

  const handleShowInfo = useCallback(
    (message: string) => {
      toast.showToast({
        message,
        duration: 2600,
      })
    },
    [toast],
  )

  return (
    <HomeScaffold
      backgroundColor={theme.colors.surfaceElevated ?? theme.colors.background}
      hideHeader
      scroll={false}
      title={intent === "receive" ? t("receive.select.title") : t("transfer.selectToken.title")}
    >
      <View style={styles.page}>
        <View style={styles.header}>
          <Pressable hitSlop={10} onPress={handleBack} style={styles.backButton}>
            <Text style={[styles.backButtonText, { color: theme.colors.text }]}>‹</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            {intent === "receive" ? t("receive.select.title") : t("transfer.selectToken.title")}
          </Text>
        </View>

        {loading && sections.length === 0 ? (
          <View style={styles.stateCard}>
            <AppEmptyState body={t("transfer.selectToken.loading")} title={t("common.loading")} />
          </View>
        ) : sections.length === 0 ? (
          <View style={styles.stateCard}>
            <AppEmptyState
              body={intent === "receive" ? t("receive.select.emptyBody") : t("transfer.selectToken.emptyBody")}
              title={intent === "receive" ? t("receive.select.emptyTitle") : t("transfer.selectToken.emptyTitle")}
            />
          </View>
        ) : (
          <ScrollView
            bounces={false}
            contentContainerStyle={styles.scrollContent}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View
              style={[
                styles.tipCard,
                {
                  backgroundColor: theme.colors.surfaceMuted ?? theme.colors.surface,
                  borderColor: theme.isDark ? theme.colors.border : "transparent",
                },
              ]}
            >
              <View style={styles.tipHeader}>
                <AppGlyph backgroundColor="transparent" name="info" size={26} tintColor={theme.colors.text} />
                <Text style={[styles.tipTitle, { color: theme.colors.text }]}>
                  {intent === "receive" ? t("receive.select.tipTitle") : t("transfer.selectToken.tipTitle")}
                </Text>
              </View>
              <Text style={[styles.tipBody, { color: theme.colors.mutedText }]}>
                {intent === "receive" ? t("receive.select.tipBody") : t("transfer.selectToken.tipBody")}
              </Text>
            </View>

            {sections.map(section => (
              <View key={section.key} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.mutedText }]}>{section.title}</Text>
                  <Pressable hitSlop={8} onPress={() => handleShowInfo(section.infoMessage)} style={styles.sectionInfoButton}>
                    <AppGlyph backgroundColor="transparent" name="info" size={24} tintColor={theme.colors.mutedText} />
                  </Pressable>
                </View>

                <View style={styles.sectionList}>
                  {section.items.map(item => (
                    <ChannelRow
                      key={item.key}
                      item={item}
                      onPress={() => handleSelectChannel(item)}
                      selected={selectedChannel?.key === item.key}
                    />
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </HomeScaffold>
  )
}

function ChannelRow(props: {
  item: ChannelItem
  selected: boolean
  onPress: () => void
}) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const title = props.item.channelType === "normal" ? "CPcash" : props.item.receiveChainName
  const logoUri = props.item.channelType === "normal" ? undefined : props.item.receiveChainLogo

  return (
    <Pressable
      onPress={props.onPress}
      style={({ pressed }) => [
        styles.channelRow,
        {
          backgroundColor: pressed ? theme.colors.surfaceMuted ?? theme.colors.backgroundMuted : "transparent",
        },
      ]}
    >
      <View style={styles.channelRowContent}>
        <NetworkLogo
          chainColor={props.item.receiveChainColor}
          chainName={props.item.receiveChainName}
          fallbackMode={props.item.channelType === "normal" ? "cpcash" : "initials"}
          logoUri={logoUri}
        />

        <View style={styles.channelMain}>
          <View style={styles.titleRow}>
            <Text style={[styles.channelTitle, { color: theme.colors.text }]}>{title}</Text>
            {props.item.isRebate ? (
              <View style={[styles.rebateBadge, { backgroundColor: theme.colors.warningSoft }]}>
                <Text style={[styles.rebateBadgeText, { color: theme.colors.warning }]}>{t("transfer.selectToken.rebate")}</Text>
              </View>
            ) : null}
            {props.selected ? (
              <View style={[styles.selectedBadge, { borderColor: theme.colors.primary, backgroundColor: theme.colors.primarySoft }]}>
                <Text style={[styles.selectedBadgeText, { color: theme.colors.primary }]}>{t("transfer.selectToken.selected")}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  header: {
    minHeight: 56,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  backButton: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 44,
    height: 44,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  backButtonText: {
    fontSize: 34,
    lineHeight: 34,
    fontWeight: "300",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  stateCard: {
    flex: 1,
    justifyContent: "center",
  },
  scrollContent: {
    paddingBottom: 28,
    gap: 28,
  },
  tipCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 22,
    gap: 16,
  },
  tipHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  tipTitle: {
    fontSize: 17,
    fontWeight: "500",
  },
  tipBody: {
    fontSize: 16,
    lineHeight: 24,
  },
  section: {
    gap: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "400",
  },
  sectionInfoButton: {
    marginTop: 1,
  },
  sectionList: {
    gap: 18,
  },
  channelRow: {
    borderRadius: 18,
    marginHorizontal: -8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  channelRowContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  channelMain: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  channelTitle: {
    fontSize: 21,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  rebateBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  rebateBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  selectedBadge: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  selectedBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
})
