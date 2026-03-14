import React, { useEffect, useState } from "react"

import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { HeaderTextAction, HomeScaffold } from "@/features/home/components/HomeScaffold"
import { getMessageList, markAllMessagesRead, markMessageRead, type MessageItem } from "@/features/messages/services/messageApi"
import {
  formatRelativeTime,
  resolveMessageAmount,
  resolveMessageBody,
  resolveMessageCoin,
  resolveMessageTarget,
  resolveMessageTitle,
} from "@/features/messages/utils/messagePresentation"
import { PageEmpty, SectionCard } from "@/shared/ui/AppFlowUi"
import { useErrorPresenter } from "@/shared/errors/useErrorPresenter"
import { useSocketStore } from "@/shared/store/useSocketStore"
import { useToast } from "@/shared/toast/useToast"
import { useAppTheme } from "@/shared/theme/useAppTheme"

import type { MessageStackParamList } from "@/app/navigation/types"

type Props = NativeStackScreenProps<MessageStackParamList, "MessageScreen">

export function MessageScreen({ navigation }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const { presentError, presentMessage } = useErrorPresenter()
  const { showToast } = useToast()
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
    } catch (error) {
      presentError(error, {
        fallbackKey: "message.loadFailed",
      })
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
    } catch (error) {
      presentError(error, {
        fallbackKey: "message.readFailed",
        mode: "toast",
      })
      return
    }

    const rootNavigation = navigation.getParent() as any
    const target = resolveMessageTarget(item)

    if (target.kind === "missingOrder") {
      showToast({ message: t("message.orderMissing"), tone: "warning" })
      return
    }

    if (target.kind === "copouchHome") {
      rootNavigation?.navigate("CopouchStack", {
        screen: "CopouchHomeScreen",
      })
      return
    }

    if (target.kind === "copouchAllocation") {
      rootNavigation?.navigate("CopouchStack", {
        screen: "CopouchViewAllocationScreen",
        params: {
          id: target.walletId,
          orderSn: target.orderSn,
        },
      })
      return
    }

    rootNavigation?.navigate("OrdersStack", {
      screen: "OrderDetailScreen",
      params: {
        orderSn: target.orderSn,
        source: "message",
      },
    })
  }

  const handleReadAll = async () => {
    try {
      await markAllMessagesRead()
      setItems(current => current.map(item => ({ ...item, status: 1 })))
      showToast({ message: t("message.readAllSuccess"), tone: "success" })
    } catch (error) {
      presentError(error, {
        fallbackKey: "message.readAllFailed",
        mode: "toast",
      })
    }
  }

  return (
    <HomeScaffold
      canGoBack
      onBack={navigation.goBack}
      title={t("message.title")}
      scroll={false}
      right={<HeaderTextAction label={t("message.readAll")} onPress={handleReadAll} />}
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
                {resolveMessageAmount(item)} {resolveMessageCoin(item)}
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

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 12,
  },
  loadingWrap: {
    minHeight: 120,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    padding: 16,
    gap: 10,
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
