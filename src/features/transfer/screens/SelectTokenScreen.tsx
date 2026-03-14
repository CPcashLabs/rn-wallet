import React, { useCallback, useMemo, useState } from "react"

import { useFocusEffect } from "@react-navigation/native"
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { HomeScaffold } from "@/features/home/components/HomeScaffold"
import { getTransferChannels } from "@/features/transfer/services/transferApi"
import { useTransferDraftStore } from "@/features/transfer/store/useTransferDraftStore"
import { getBoolean, setBoolean } from "@/shared/storage/kvStorage"
import { KvStorageKeys } from "@/shared/storage/sessionKeys"
import { useWalletStore } from "@/shared/store/useWalletStore"
import { useAppTheme } from "@/shared/theme/useAppTheme"

import type { TransferStackParamList } from "@/app/navigation/types"

type Props = NativeStackScreenProps<TransferStackParamList, "SelectTokenScreen">

type ChannelItem = Awaited<ReturnType<typeof getTransferChannels>>[number]

export function SelectTokenScreen({ navigation, route }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const intent = route.params?.intent ?? "transfer"
  const chainId = useWalletStore(state => state.chainId)
  const selectedChannel = useTransferDraftStore(state => state.selectedChannel)
  const recipientAddress = useTransferDraftStore(state => state.recipientAddress)
  const setSelectedChannel = useTransferDraftStore(state => state.setSelectedChannel)
  const [keyword, setKeyword] = useState("")
  const [channels, setChannels] = useState<ChannelItem[]>([])
  const [loading, setLoading] = useState(true)
  const copouchAddress = route.params?.copouch ?? route.params?.cowallet

  const loadChannels = useCallback(async () => {
    setLoading(true)

    try {
      const result = await getTransferChannels(chainId, intent)
      setChannels(result)
      setBoolean(KvStorageKeys.SelectTokenPageReload, false)
    } catch (error) {
      console.error("[select-token][loadChannels]", error)
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
          console.error("[select-token][focusReload]", error)
        })
      }

      return () => {
        setBoolean(KvStorageKeys.SelectTokenPageReload, true)
      }
    }, [channels.length, loadChannels]),
  )

  const filteredChannels = useMemo(() => {
    const normalized = keyword.trim().toLowerCase()
    if (!normalized) {
      return channels
    }

    return channels.filter(item => {
      return (
        item.title.toLowerCase().includes(normalized) ||
        item.subtitle.toLowerCase().includes(normalized) ||
        item.receiveChainName.toLowerCase().includes(normalized)
      )
    })
  }, [channels, keyword])

  const handleSelectChannel = useCallback(
    (item: ChannelItem) => {
      if (intent === "receive") {
        ;(navigation.getParent() as any)?.navigate("ReceiveStack", {
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

      const initialAddress = selectedChannel?.key === item.key ? recipientAddress : ""

      setSelectedChannel(item)

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
    [copouchAddress, intent, navigation, recipientAddress, route.params?.multisigWalletId, selectedChannel?.key, setSelectedChannel],
  )

  return (
    <HomeScaffold
      canGoBack
      onBack={navigation.goBack}
      title={intent === "receive" ? t("receive.select.title") : t("transfer.selectToken.title")}
      scroll={false}
    >
      <ScrollView bounces={false} contentContainerStyle={styles.content}>
        <View style={[styles.tipCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.tipTitle, { color: theme.colors.text }]}>
            {intent === "receive" ? t("receive.select.tipTitle") : t("transfer.selectToken.tipTitle")}
          </Text>
          <Text style={[styles.tipBody, { color: theme.colors.mutedText }]}>
            {intent === "receive" ? t("receive.select.tipBody") : t("transfer.selectToken.tipBody")}
          </Text>
        </View>

        <View style={[styles.searchCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <TextInput
            autoCapitalize="none"
            onChangeText={setKeyword}
            placeholder={intent === "receive" ? t("receive.select.searchPlaceholder") : t("transfer.selectToken.searchPlaceholder")}
            placeholderTextColor={theme.colors.mutedText}
            style={[styles.searchInput, { color: theme.colors.text }]}
            value={keyword}
          />
        </View>

        <View style={[styles.listCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          {loading ? (
            <EmptyState body={t("transfer.selectToken.loading")} title={t("common.loading")} />
          ) : filteredChannels.length === 0 ? (
            <EmptyState
              body={intent === "receive" ? t("receive.select.emptyBody") : t("transfer.selectToken.emptyBody")}
              title={intent === "receive" ? t("receive.select.emptyTitle") : t("transfer.selectToken.emptyTitle")}
            />
          ) : (
            filteredChannels.map(item => (
              <ChannelRow
                item={item}
                key={item.key}
                onPress={() => handleSelectChannel(item)}
                selected={selectedChannel?.key === item.key}
              />
            ))
          )}
        </View>
      </ScrollView>
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

  return (
    <Pressable
      onPress={props.onPress}
      style={[
        styles.row,
        props.selected
          ? {
              backgroundColor: theme.isDark ? "#0B2530" : "#ECFDF5",
            }
          : null,
      ]}
    >
      <View style={styles.rowLeft}>
        {props.item.receiveChainLogo ? (
          <View style={[styles.logoShell, { borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}>
            <Text style={[styles.logoText, { color: theme.colors.text }]}>{props.item.title.slice(0, 2).toUpperCase()}</Text>
          </View>
        ) : (
          <View
            style={[
              styles.channelDot,
              { backgroundColor: props.item.receiveChainColor || theme.colors.primary },
            ]}
          />
        )}
        <View style={styles.rowMeta}>
          <View style={styles.titleRow}>
            <Text style={[styles.rowTitle, { color: theme.colors.text }]}>{props.item.title}</Text>
            {props.item.isRebate ? (
              <View style={styles.rebateBadge}>
                <Text style={styles.rebateBadgeText}>{t("transfer.selectToken.rebate")}</Text>
              </View>
            ) : null}
            {props.selected ? (
              <View style={[styles.selectedBadge, { borderColor: theme.colors.primary }]}>
                <Text style={[styles.selectedBadgeText, { color: theme.colors.primary }]}>
                  {t("transfer.selectToken.selected")}
                </Text>
              </View>
            ) : null}
          </View>
          <Text style={[styles.rowSubtitle, { color: theme.colors.mutedText }]}>{props.item.subtitle}</Text>
        </View>
      </View>
      <Text style={[styles.rowArrow, { color: theme.colors.mutedText }]}>›</Text>
    </Pressable>
  )
}

function EmptyState(props: { title: string; body: string }) {
  const theme = useAppTheme()

  return (
    <View style={styles.emptyState}>
      <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>{props.title}</Text>
      <Text style={[styles.emptyBody, { color: theme.colors.mutedText }]}>{props.body}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 12,
  },
  tipCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 14,
    gap: 6,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  tipBody: {
    fontSize: 13,
    lineHeight: 20,
  },
  searchCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingHorizontal: 12,
  },
  searchInput: {
    minHeight: 44,
    fontSize: 14,
  },
  listCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    overflow: "hidden",
  },
  row: {
    minHeight: 72,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#CBD5E133",
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  channelDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  logoShell: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontSize: 12,
    fontWeight: "700",
  },
  rowMeta: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  rowSubtitle: {
    fontSize: 13,
  },
  rebateBadge: {
    borderRadius: 999,
    backgroundColor: "#FFF1E9",
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  rebateBadgeText: {
    fontSize: 11,
    color: "#E37318",
    fontWeight: "700",
  },
  selectedBadge: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  selectedBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  rowArrow: {
    fontSize: 18,
  },
  emptyState: {
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  emptyBody: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
})
