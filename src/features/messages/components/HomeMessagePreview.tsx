import React, { useEffect, useRef, useState } from "react"

import { Animated, Pressable, StyleSheet, Text, View } from "react-native"
import { useFocusEffect } from "@react-navigation/native"
import { useTranslation } from "react-i18next"

import { getMessageList, type MessageItem } from "@/features/messages/services/messageApi"
import { diffHomeMessagePreviewIds, pruneHomeMessagePreviewRecord } from "@/features/messages/components/homeMessagePreviewState"
import {
  formatRelativeTime,
  resolveMessageAmount,
  resolveMessageCoin,
  resolveMessageTitle,
} from "@/features/messages/utils/messagePresentation"
import { createLatestTaskController } from "@/shared/async/taskController"
import { SectionCard } from "@/shared/ui/AppFlowUi"
import { useSocketStore } from "@/shared/store/useSocketStore"
import { useAppTheme } from "@/shared/theme/useAppTheme"

const PREVIEW_LIMIT = 2
const ROW_HEIGHT = 44
const PREVIEW_BODY_HEIGHT = PREVIEW_LIMIT * ROW_HEIGHT

type RowAnimationState = {
  opacity: Animated.Value
  translateY: Animated.Value
  height: Animated.Value
}

export function HomeMessagePreview(props: { onPress: () => void }) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const socketEvent = useSocketStore(state => state.lastEvent)
  const [items, setItems] = useState<MessageItem[]>([])
  const [ready, setReady] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const hasHydratedRef = useRef(false)
  const itemIdsRef = useRef<string[]>([])
  const rowAnimationsRef = useRef<Record<string, RowAnimationState>>({})
  const mountedRef = useRef(true)
  const loadTaskControllerRef = useRef(createLatestTaskController())
  const animationFrameRef = useRef<number | null>(null)

  const resolveRowAnimation = React.useCallback((id: string) => {
    const existing = rowAnimationsRef.current[id]
    if (existing) {
      return existing
    }

    const created = {
      opacity: new Animated.Value(1),
      translateY: new Animated.Value(0),
      height: new Animated.Value(ROW_HEIGHT),
    }
    rowAnimationsRef.current[id] = created
    return created
  }, [])

  const clearPendingAnimationFrame = React.useCallback(() => {
    if (animationFrameRef.current === null) {
      return
    }

    cancelAnimationFrame(animationFrameRef.current)
    animationFrameRef.current = null
  }, [])

  const stopRowAnimation = React.useCallback((animation: RowAnimationState) => {
    animation.opacity.stopAnimation()
    animation.translateY.stopAnimation()
    animation.height.stopAnimation()
  }, [])

  const pruneRowAnimations = React.useCallback(
    (nextIds: string[]) => {
      const { removedIds } = diffHomeMessagePreviewIds(itemIdsRef.current, nextIds, hasHydratedRef.current)

      for (const id of removedIds) {
        const animation = rowAnimationsRef.current[id]
        if (animation) {
          stopRowAnimation(animation)
        }
      }

      pruneHomeMessagePreviewRecord(rowAnimationsRef.current, nextIds)
    },
    [stopRowAnimation],
  )

  const animateInsertedRows = React.useCallback(
    (insertedIds: string[]) => {
      if (insertedIds.length === 0) {
        return
      }

      clearPendingAnimationFrame()

      insertedIds.forEach(id => {
        const animation = {
          opacity: new Animated.Value(0),
          translateY: new Animated.Value(-10),
          height: new Animated.Value(0),
        }
        rowAnimationsRef.current[id] = animation
      })

      animationFrameRef.current = requestAnimationFrame(() => {
        animationFrameRef.current = null

        if (!mountedRef.current) {
          return
        }

        insertedIds.forEach(id => {
          const animation = rowAnimationsRef.current[id]
          if (!animation) {
            return
          }

          Animated.parallel([
            Animated.timing(animation.opacity, {
              toValue: 1,
              duration: 220,
              useNativeDriver: false,
            }),
            Animated.timing(animation.translateY, {
              toValue: 0,
              duration: 220,
              useNativeDriver: false,
            }),
            Animated.timing(animation.height, {
              toValue: ROW_HEIGHT,
              duration: 240,
              useNativeDriver: false,
            }),
          ]).start()
        })
      })
    },
    [clearPendingAnimationFrame],
  )

  const loadPreview = React.useCallback(async () => {
    const run = loadTaskControllerRef.current.begin()

    try {
      const response = await getMessageList({ page: 1, perPage: PREVIEW_LIMIT })

      if (!run.isCurrent() || !mountedRef.current) {
        return
      }

      const nextItems = response.data.slice(0, PREVIEW_LIMIT)
      const nextIds = nextItems.map(item => item.id)
      const { insertedIds } = diffHomeMessagePreviewIds(itemIdsRef.current, nextIds, hasHydratedRef.current)

      pruneRowAnimations(nextIds)
      itemIdsRef.current = nextIds
      setLoadFailed(false)
      setItems(nextItems)
      animateInsertedRows(insertedIds)
      hasHydratedRef.current = true
    } catch {
      if (!run.isCurrent() || !mountedRef.current) {
        return
      }

      if (!hasHydratedRef.current && itemIdsRef.current.length === 0) {
        setLoadFailed(true)
      }
    } finally {
      if (run.isCurrent() && mountedRef.current) {
        setReady(true)
      }
    }
  }, [animateInsertedRows, pruneRowAnimations])

  useEffect(() => {
    return () => {
      mountedRef.current = false
      clearPendingAnimationFrame()
      loadTaskControllerRef.current.cancel()

      Object.values(rowAnimationsRef.current).forEach(stopRowAnimation)
      rowAnimationsRef.current = {}
      itemIdsRef.current = []
    }
  }, [clearPendingAnimationFrame, stopRowAnimation])

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
  const previewContent =
    ready && loadFailed ? (
      <View style={styles.stateWrap}>
        <Text style={[styles.stateTitle, { color: theme.colors.text }]}>{t("message.preview.loadFailedTitle")}</Text>
        <Text style={[styles.stateBody, { color: theme.colors.mutedText }]}>{t("message.preview.loadFailedBody")}</Text>
      </View>
    ) : ready && items.length === 0 ? (
      <View style={styles.stateWrap}>
        <Text style={[styles.stateTitle, { color: theme.colors.text }]}>{t("message.preview.emptyTitle")}</Text>
        <Text style={[styles.stateBody, { color: theme.colors.mutedText }]}>{t("message.preview.emptyBody")}</Text>
      </View>
    ) : (
      <View style={styles.rowsWrap}>
        {items.map((item, index) => (
          <Animated.View
            key={item.id}
            style={[
              styles.rowWrap,
              {
                opacity: resolveRowAnimation(item.id).opacity,
                transform: [{ translateY: resolveRowAnimation(item.id).translateY }],
                height: resolveRowAnimation(item.id).height,
              },
            ]}
          >
            <Pressable
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
          </Animated.View>
        ))}
      </View>
    )

  return (
    <SectionCard>
      <View style={styles.header}>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{t("message.preview.title")}</Text>
          {hasUnread ? <View style={[styles.unreadDot, { backgroundColor: theme.colors.danger }]} /> : null}
        </View>
        <Pressable onPress={props.onPress} style={styles.headerAction}>
          <Text style={[styles.headerActionText, { color: theme.colors.primary }]}>{t("message.preview.openAll")}</Text>
        </Pressable>
      </View>
      {previewContent}
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
  },
  stateWrap: {
    minHeight: PREVIEW_BODY_HEIGHT,
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
  rowWrap: {
    overflow: "hidden",
  },
  rowsWrap: {
    minHeight: PREVIEW_BODY_HEIGHT,
    justifyContent: "flex-start",
  },
  row: {
    height: ROW_HEIGHT,
    borderBottomWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
  },
  rowLast: {
    borderBottomWidth: 0,
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
