import React, { useEffect, useState } from "react"

import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { HomeScaffold } from "@/features/home/components/HomeScaffold"
import { getMessageList, markAllMessagesRead, markMessageRead, type MessageItem } from "@/features/messages/services/messageApi"
import { PageEmpty, SectionCard } from "@/features/transfer/components/TransferUi"
import { formatAddress } from "@/features/home/utils/format"
import { useSocketStore } from "@/shared/store/useSocketStore"
import { useAppTheme } from "@/shared/theme/useAppTheme"

import type { MessageStackParamList } from "@/app/navigation/types"

type Props = NativeStackScreenProps<MessageStackParamList, "MessageScreen">

export function MessageScreen({ navigation }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const socketEvent = useSocketStore(state => state.lastEvent)
  const [items, setItems] = useState<MessageItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const loadMessages = async (nextPage = 1, mode: "replace" | "append" = "replace") => {
    if (mode === "append") {
      setLoadingMore(true)
    } else if (items.length > 0) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      const response = await getMessageList({ page: nextPage, perPage: 10 })
      setItems(current => (mode === "append" ? [...current, ...response.data] : response.data))
      setPage(response.page)
      setHasMore(response.data.length >= response.perPage)
    } catch {
      Alert.alert(t("common.errorTitle"), t("message.loadFailed"))
    } finally {
      setLoading(false)
      setRefreshing(false)
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    void loadMessages(1, "replace")
  }, [])

  useEffect(() => {
    if (socketEvent?.type !== "messageRefresh") {
      return
    }

    void loadMessages(1, "replace")
  }, [socketEvent?.at, socketEvent?.type])

  const handleOpenItem = async (item: MessageItem) => {
    try {
      if (item.status === 0) {
        await markMessageRead(item.id)
        setItems(current => current.map(entry => (entry.id === item.id ? { ...entry, status: 1 } : entry)))
      }
    } catch {
      Alert.alert(t("common.errorTitle"), t("message.readFailed"))
      return
    }

    const rootNavigation = navigation.getParent()?.getParent() as any

    if (item.type === "OWNER_REMOVED" || item.type === "RE_ALLOCATE") {
      Alert.alert(t("common.infoTitle"), t("message.copouchPending"))
      return
    }

    if (!item.orderSn) {
      Alert.alert(t("common.infoTitle"), t("message.orderMissing"))
      return
    }

    rootNavigation?.navigate("OrdersStack", {
      screen: "OrderDetailScreen",
      params: {
        orderSn: item.orderSn,
        source: "message",
      },
    })
  }

  const handleReadAll = async () => {
    try {
      await markAllMessagesRead()
      setItems(current => current.map(item => ({ ...item, status: 1 })))
      Alert.alert(t("common.infoTitle"), t("message.readAllSuccess"))
    } catch {
      Alert.alert(t("common.errorTitle"), t("message.readAllFailed"))
    }
  }

  return (
    <HomeScaffold
      canGoBack
      onBack={navigation.goBack}
      title={t("message.title")}
      scroll={false}
      right={
        <Pressable onPress={handleReadAll} style={styles.headerButton}>
          <Text style={[styles.headerButtonText, { color: theme.colors.primary }]}>{t("message.readAll")}</Text>
        </Pressable>
      }
    >
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <SectionCard>
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={theme.colors.primary} />
              <Text style={[styles.body, { color: theme.colors.mutedText }]}>{t("message.loading")}</Text>
            </View>
          </SectionCard>
        ) : null}

        {!loading && items.length === 0 ? <PageEmpty title={t("message.emptyTitle")} body={t("message.emptyBody")} /> : null}

        {items.map(item => (
          <Pressable
            key={item.id}
            onPress={() => void handleOpenItem(item)}
            style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          >
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{resolveMessageTitle(item, t)}</Text>
              <Text style={[styles.cardTime, { color: theme.colors.mutedText }]}>{formatRelativeTime(item.createdAt, t)}</Text>
            </View>

            <View style={styles.amountRow}>
              <Text style={[styles.amount, { color: theme.colors.text }]}>
                {resolveAmount(item)} {resolveCoin(item)}
              </Text>
              {item.status === 0 ? <View style={[styles.unreadDot, { backgroundColor: "#DC2626" }]} /> : null}
            </View>

            <Text style={[styles.body, { color: theme.colors.mutedText }]}>{resolveMessageBody(item, t)}</Text>
          </Pressable>
        ))}

        {!loading && hasMore ? (
          <Pressable
            disabled={loadingMore}
            onPress={() => void loadMessages(page + 1, "append")}
            style={[styles.loadMoreButton, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
          >
            <Text style={[styles.loadMoreText, { color: theme.colors.text }]}>
              {loadingMore ? t("common.loading") : t("message.loadMore")}
            </Text>
          </Pressable>
        ) : null}

        {refreshing ? <Text style={[styles.refreshingText, { color: theme.colors.mutedText }]}>{t("message.refreshing")}</Text> : null}
      </ScrollView>
    </HomeScaffold>
  )
}

function resolveMessageTitle(item: MessageItem, t: (key: string, options?: Record<string, unknown>) => string) {
  if (item.type === "OWNER_REMOVED") {
    return t("message.types.ownerRemoved")
  }

  if (item.type === "RE_ALLOCATE") {
    return t("message.types.reallocate")
  }

  const map: Record<string, string> = {
    RECEIPT: "message.types.receipt",
    RECEIPT_FIXED: "message.types.receipt",
    RECEIPT_NORMAL: "message.types.receipt",
    TRACE: "message.types.receipt",
    TRACE_LONG_TERM: "message.types.receipt",
    TRACE_CHILD: "message.types.receipt",
    PAYMENT: "message.types.payment",
    PAYMENT_NORMAL: "message.types.payment",
    SEND: "message.types.send",
    SEND_RECEIVE: "message.types.sendReceive",
    NATIVE: "message.types.native",
  }

  return t(map[item.orderType] ?? "message.types.default")
}

function resolveMessageBody(item: MessageItem, t: (key: string, options?: Record<string, unknown>) => string) {
  if (item.type === "OWNER_REMOVED") {
    return t("message.ownerRemovedBody", {
      walletName: item.multisigWalletName || "CoPouch",
    })
  }

  if (item.type === "RE_ALLOCATE") {
    return t("message.reallocateBody", {
      operator: item.operatorNickname || "--",
      walletName: item.multisigWalletName || "CoPouch",
    })
  }

  const isReceive = ["RECEIPT", "RECEIPT_FIXED", "RECEIPT_NORMAL", "TRACE", "TRACE_LONG_TERM", "TRACE_CHILD", "SEND_RECEIVE"].includes(
    item.orderType,
  )
  const targetAddress = isReceive ? item.paymentAddress || item.receiveAddress : item.receiveAddress || item.transferAddress

  return t(isReceive ? "message.fromAddress" : "message.toAddress", {
    address: targetAddress ? formatAddress(targetAddress) : "--",
  })
}

function resolveAmount(item: MessageItem) {
  const amount = item.sendAmount || item.recvAmount || item.sendActualAmount || item.recvActualAmount
  return Number.isFinite(amount) ? String(amount) : "0"
}

function resolveCoin(item: MessageItem) {
  return item.sendCoinName || item.recvCoinName || "USDT"
}

function formatRelativeTime(timestamp: number | null, t: (key: string, options?: Record<string, unknown>) => string) {
  if (!timestamp) {
    return "--"
  }

  const diff = Math.max(0, Date.now() - timestamp)
  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour

  if (diff < hour) {
    return t("message.time.minutesAgo", { count: Math.max(1, Math.floor(diff / minute) || 1) })
  }

  if (diff < day) {
    return t("message.time.hoursAgo", { count: Math.floor(diff / hour) })
  }

  return t("message.time.daysAgo", { count: Math.floor(diff / day) })
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 12,
  },
  headerButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  headerButtonText: {
    fontSize: 13,
    fontWeight: "700",
  },
  loadingWrap: {
    minHeight: 120,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
  },
  cardTime: {
    fontSize: 12,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  amount: {
    fontSize: 20,
    fontWeight: "800",
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  body: {
    fontSize: 13,
    lineHeight: 20,
  },
  loadMoreButton: {
    minHeight: 44,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: "600",
  },
  refreshingText: {
    textAlign: "center",
    fontSize: 12,
  },
})
