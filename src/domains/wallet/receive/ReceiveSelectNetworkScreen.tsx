import React, { useCallback, useMemo, useState } from "react"

import { useFocusEffect } from "@react-navigation/native"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"

import { useHomeBackAction } from "@/app/navigation/useHomeBackAction"
import { writeCachedReceiveChainColor } from "@/domains/wallet/receive/services/receiveColorCache"
import { getTransferChannels } from "@/shared/exchange/services/exchangeApi"
import { logErrorSafely } from "@/shared/logging/safeConsole"
import { getBoolean, setBoolean } from "@/shared/storage/kvStorage"
import { KvStorageKeys } from "@/shared/storage/sessionKeys"
import { useWalletStore } from "@/shared/store/useWalletStore"
import { useAppTheme } from "@/shared/theme/useAppTheme"
import { useToast } from "@/shared/toast/useToast"
import { AppEmptyState } from "@/shared/ui/AppEmptyState"
import { AppGlyph } from "@/shared/ui/AppGlyph"
import { HomeScaffold } from "@/shared/ui/HomeScaffold"
import { NetworkLogo } from "@/shared/ui/NetworkLogo"

import type { ReceiveStackParamList } from "@/app/navigation/types"

type Props = NativeStackScreenProps<ReceiveStackParamList, "ReceiveSelectNetworkScreen">
type ChannelItem = Awaited<ReturnType<typeof getTransferChannels>>[number]
type ChannelSection = {
  key: "normal" | "bridge"
  title: string
  infoMessage: string
  items: ChannelItem[]
}

export function ReceiveSelectNetworkScreen({ navigation, route }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const toast = useToast()
  const chainId = useWalletStore(state => state.chainId)
  const handleBack = useHomeBackAction(navigation)
  const [channels, setChannels] = useState<ChannelItem[]>([])
  const [loading, setLoading] = useState(true)

  const loadChannels = useCallback(async () => {
    setLoading(true)

    try {
      const result = await getTransferChannels(chainId, "receive")
      setChannels(result)
      setBoolean(KvStorageKeys.SelectTokenPageReload, false)
    } catch (error) {
      logErrorSafely("[receive][select-network][loadChannels]", error, {
        forwardToConsole: false,
      })
      setChannels([])
      Alert.alert(t("common.errorTitle"), t("receive.select.loadFailed"))
    } finally {
      setLoading(false)
    }
  }, [chainId, t])

  useFocusEffect(
    useCallback(() => {
      const shouldReload = getBoolean(KvStorageKeys.SelectTokenPageReload) ?? true

      if (shouldReload || channels.length === 0) {
        void loadChannels().catch(error => {
          logErrorSafely("[receive][select-network][focusReload]", error, {
            forwardToConsole: false,
          })
        })
      }

      return () => {
        setBoolean(KvStorageKeys.SelectTokenPageReload, true)
      }
    }, [channels.length, loadChannels]),
  )

  const sections = useMemo<ChannelSection[]>(() => {
    const normalChannels = channels.filter(item => item.channelType === "normal")
    const bridgeChannels = channels.filter(item => item.channelType === "bridge")
    const result: ChannelSection[] = []

    if (normalChannels.length > 0) {
      result.push({
        key: "normal",
        title: t("receive.select.normalSectionTitle"),
        infoMessage: t("receive.select.normalSectionMessage"),
        items: normalChannels,
      })
    }

    if (bridgeChannels.length > 0) {
      result.push({
        key: "bridge",
        title: t("receive.select.bridgeSectionTitle"),
        infoMessage: t("receive.select.bridgeSectionMessage"),
        items: bridgeChannels,
      })
    }

    return result
  }, [channels, t])

  const handleSelectChannel = useCallback(
    (item: ChannelItem) => {
      writeCachedReceiveChainColor({
        payChain: item.receiveChainName,
        color: item.receiveChainColor,
      })

      navigation.navigate("ReceiveHomeScreen", {
        payChain: item.receiveChainName,
        chainColor: item.receiveChainColor,
        copouch: route.params?.copouch,
        cowallet: route.params?.cowallet,
        multisigWalletId: route.params?.multisigWalletId,
        receiveMode: item.channelType === "normal" ? "normal" : "trace",
      })
    },
    [navigation, route.params?.copouch, route.params?.cowallet, route.params?.multisigWalletId],
  )

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
      title={t("receive.select.title")}
    >
      <View style={styles.page}>
        <View style={styles.header}>
          <Pressable hitSlop={10} onPress={handleBack} style={styles.backButton}>
            <Text style={[styles.backButtonText, { color: theme.colors.text }]}>‹</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{t("receive.select.title")}</Text>
        </View>

        {loading && sections.length === 0 ? (
          <View style={styles.stateCard}>
            <AppEmptyState body={t("receive.select.loading")} title={t("common.loading")} />
          </View>
        ) : sections.length === 0 ? (
          <View style={styles.stateCard}>
            <AppEmptyState body={t("receive.select.emptyBody")} title={t("receive.select.emptyTitle")} />
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
                <Text style={[styles.tipTitle, { color: theme.colors.text }]}>{t("receive.select.tipTitle")}</Text>
              </View>
              <Text style={[styles.tipBody, { color: theme.colors.mutedText }]}>{t("receive.select.tipBody")}</Text>
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
                    <ChannelRow key={item.key} item={item} onPress={() => handleSelectChannel(item)} />
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
  onPress: () => void
}) {
  const theme = useAppTheme()
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

        <Text style={[styles.channelTitle, { color: theme.colors.text }]}>{title}</Text>
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
  channelTitle: {
    fontSize: 21,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
})
