import React, { useEffect, useState } from "react"

import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native"
import { useFocusEffect } from "@react-navigation/native"
import { useTranslation } from "react-i18next"

import { getMessageList, type MessageItem } from "@/features/messages/services/messageApi"
import {
  formatRelativeTime,
  resolveMessageAmount,
  resolveMessageCoin,
  resolveMessageTitle,
} from "@/features/messages/utils/messagePresentation"
import { SectionCard } from "@/shared/ui/AppFlowUi"
import { useSocketStore } from "@/shared/store/useSocketStore"
import { useAppTheme } from "@/shared/theme/useAppTheme"

export function HomeMessagePreview(props: { onPress: () => void }) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const socketEvent = useSocketStore(state => state.lastEvent)
  const [items, setItems] = useState<MessageItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)

  const loadPreview = React.useCallback(async () => {
    setLoading(true)
    setLoadFailed(false)

    try {
      const response = await getMessageList({ page: 1, perPage: 2 })
      setItems(response.data.slice(0, 2))
    } catch {
      setLoadFailed(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(
    React.useCallback(() => {
      void loadPreview()
    }, [loadPreview]),
  )

  useEffect(() => {
    if (socketEvent?.type !== "messageRefresh") {
      return
    }

    void loadPreview()
  }, [loadPreview, socketEvent?.at, socketEvent?.type])

  const hasUnread = items.some(item => item.status === 0)

  return (
    <SectionCard>
      <View style={styles.header}>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{t("message.preview.title")}</Text>
          {hasUnread ? <View style={styles.unreadDot} /> : null}
        </View>
        <Pressable onPress={props.onPress} style={styles.headerAction}>
          <Text style={[styles.headerActionText, { color: theme.colors.primary }]}>{t("message.preview.openAll")}</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.stateWrap}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={[styles.stateBody, { color: theme.colors.mutedText }]}>{t("message.loading")}</Text>
        </View>
      ) : null}

      {!loading && loadFailed ? (
        <View style={styles.stateWrap}>
          <Text style={[styles.stateTitle, { color: theme.colors.text }]}>{t("message.preview.loadFailedTitle")}</Text>
          <Text style={[styles.stateBody, { color: theme.colors.mutedText }]}>{t("message.preview.loadFailedBody")}</Text>
        </View>
      ) : null}

      {!loading && !loadFailed && items.length === 0 ? (
        <View style={styles.stateWrap}>
          <Text style={[styles.stateTitle, { color: theme.colors.text }]}>{t("message.emptyTitle")}</Text>
          <Text style={[styles.stateBody, { color: theme.colors.mutedText }]}>{t("message.emptyBody")}</Text>
        </View>
      ) : null}

      {!loading && !loadFailed
        ? items.map((item, index) => (
            <Pressable
              key={item.id}
              onPress={props.onPress}
              style={[
                styles.row,
                {
                  borderBottomColor: theme.colors.border,
                },
                index === items.length - 1 ? styles.rowLast : null,
              ]}
            >
              <View style={styles.rowInline}>
                <Text numberOfLines={1} style={[styles.rowSummary, { color: theme.colors.text }]}>
                  {buildPreviewSummary(item, t)}
                </Text>
                <Text style={[styles.rowTime, { color: theme.colors.mutedText }]}>{formatRelativeTime(item.createdAt, t)}</Text>
              </View>
            </Pressable>
          ))
        : null}
    </SectionCard>
  )
}

function buildPreviewSummary(item: MessageItem, t: ReturnType<typeof useTranslation>["t"]) {
  const title = resolveMessageTitle(item, t)
  const amount = resolveMessageAmount(item)
  const coin = resolveMessageCoin(item)
  const hasAmount = [item.sendAmount, item.recvAmount, item.sendActualAmount, item.recvActualAmount].some(value => value > 0)

  return hasAmount ? `${title} ${amount}${coin}` : title
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  headerTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  headerAction: {
    paddingVertical: 4,
  },
  headerActionText: {
    fontSize: 13,
    fontWeight: "700",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#DC2626",
  },
  stateWrap: {
    minHeight: 96,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  stateTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  stateBody: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
  row: {
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  rowInline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  rowSummary: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
  },
  rowTime: {
    fontSize: 12,
    flexShrink: 0,
  },
})
