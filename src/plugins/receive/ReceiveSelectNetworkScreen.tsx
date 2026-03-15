import React, { useCallback, useMemo, useState } from "react"

import { useFocusEffect } from "@react-navigation/native"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"
import { Alert, FlatList, StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"

import { HomeScaffold } from "@/features/home/components/HomeScaffold"
import { getTransferChannels } from "@/shared/exchange/services/exchangeApi"
import { useDeferredValueCompat } from "@/shared/hooks/useDeferredValueCompat"
import { getBoolean, setBoolean } from "@/shared/storage/kvStorage"
import { KvStorageKeys } from "@/shared/storage/sessionKeys"
import { useWalletStore } from "@/shared/store/useWalletStore"
import { useAppTheme } from "@/shared/theme/useAppTheme"
import { AppEmptyState } from "@/shared/ui/AppEmptyState"
import { AppListRow } from "@/shared/ui/AppList"
import { AppTextField } from "@/shared/ui/AppTextField"

import type { ReceiveStackParamList } from "@/app/navigation/types"

type Props = NativeStackScreenProps<ReceiveStackParamList, "ReceiveSelectNetworkScreen">
type ChannelItem = Awaited<ReturnType<typeof getTransferChannels>>[number]

export function ReceiveSelectNetworkScreen({ navigation, route }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const chainId = useWalletStore(state => state.chainId)
  const [keyword, setKeyword] = useState("")
  const deferredKeyword = useDeferredValueCompat(keyword)
  const [channels, setChannels] = useState<ChannelItem[]>([])
  const [loading, setLoading] = useState(true)

  const loadChannels = useCallback(async () => {
    setLoading(true)

    try {
      const result = await getTransferChannels(chainId, "receive")
      setChannels(result)
      setBoolean(KvStorageKeys.SelectTokenPageReload, false)
    } catch (error) {
      console.error("[receive-plugin][select-network][loadChannels]", error)
      setChannels([])
      Alert.alert(t("common.errorTitle"), t("transfer.selectToken.loadFailed"))
    } finally {
      setLoading(false)
    }
  }, [chainId, t])

  useFocusEffect(
    useCallback(() => {
      const shouldReload = getBoolean(KvStorageKeys.SelectTokenPageReload) ?? true

      if (shouldReload || channels.length === 0) {
        void loadChannels().catch(error => {
          console.error("[receive-plugin][select-network][focusReload]", error)
        })
      }

      return () => {
        setBoolean(KvStorageKeys.SelectTokenPageReload, true)
      }
    }, [channels.length, loadChannels]),
  )

  const filteredChannels = useMemo(() => {
    const normalized = deferredKeyword.trim().toLowerCase()
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
  }, [channels, deferredKeyword])

  const handleSelectChannel = useCallback(
    (item: ChannelItem) => {
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

  const renderChannel = useCallback(
    ({ item, index }: { item: ChannelItem; index: number }) => (
      <ChannelRow item={item} last={index === filteredChannels.length - 1} onPress={() => handleSelectChannel(item)} />
    ),
    [filteredChannels.length, handleSelectChannel],
  )

  return (
    <HomeScaffold title={t("receive.select.title")} scroll={false}>
      <View style={styles.page}>
        <View style={[styles.tipCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.tipTitle, { color: theme.colors.text }]}>{t("receive.select.tipTitle")}</Text>
          <Text style={[styles.tipBody, { color: theme.colors.mutedText }]}>{t("receive.select.tipBody")}</Text>
        </View>

        <AppTextField
          autoCapitalize="none"
          backgroundTone="surface"
          containerStyle={styles.searchField}
          onChangeText={setKeyword}
          placeholder={t("receive.select.searchPlaceholder")}
          value={keyword}
        />

        <FlatList
          data={filteredChannels}
          initialNumToRender={12}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          keyExtractor={item => item.key}
          ListEmptyComponent={
            loading ? (
              <AppEmptyState body={t("transfer.selectToken.loading")} title={t("common.loading")} />
            ) : (
              <AppEmptyState body={t("receive.select.emptyBody")} title={t("receive.select.emptyTitle")} />
            )
          }
          maxToRenderPerBatch={16}
          removeClippedSubviews
          renderItem={renderChannel}
          showsVerticalScrollIndicator={false}
          style={[styles.listCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          windowSize={8}
          contentContainerStyle={filteredChannels.length === 0 ? styles.listCardEmptyContent : undefined}
        />
      </View>
    </HomeScaffold>
  )
}

function ChannelRow(props: {
  item: ChannelItem
  onPress: () => void
  last: boolean
}) {
  const theme = useAppTheme()

  return (
    <AppListRow
      hideDivider={props.last}
      left={
        props.item.receiveChainLogo ? (
          <View style={[styles.logoShell, { borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}>
            <Text style={[styles.logoText, { color: theme.colors.text }]}>{props.item.title.slice(0, 2).toUpperCase()}</Text>
          </View>
        ) : (
          <View style={[styles.channelDot, { backgroundColor: props.item.receiveChainColor || theme.colors.primary }]} />
        )
      }
      onPress={props.onPress}
    >
      <View style={styles.titleRow}>
        <Text style={[styles.rowTitle, { color: theme.colors.text }]}>{props.item.title}</Text>
      </View>
      <Text style={[styles.rowSubtitle, { color: theme.colors.mutedText }]}>{props.item.subtitle}</Text>
    </AppListRow>
  )
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
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
  searchField: {
    backgroundColor: "transparent",
  },
  listCard: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
  },
  listCardEmptyContent: {
    flexGrow: 1,
  },
  logoShell: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  logoText: {
    fontSize: 12,
    fontWeight: "700",
  },
  channelDot: {
    width: 14,
    height: 14,
    borderRadius: 999,
    marginHorizontal: 13,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  rowSubtitle: {
    fontSize: 12,
    lineHeight: 18,
  },
})
