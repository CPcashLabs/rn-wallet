import React, { useEffect, useRef } from "react"

import { Animated, Pressable, StyleSheet, Text, View } from "react-native"
import { useFocusEffect } from "@react-navigation/native"
import { useTranslation } from "react-i18next"

import { diffHomeMessagePreviewIds, pruneHomeMessagePreviewRecord } from "@/features/messages/components/homeMessagePreviewState"
import type { MessageItem } from "@/features/messages/services/messageApi"
import {
  formatRelativeTime,
  resolveMessageAmount,
  resolveMessageCoin,
  resolveMessageTitle,
} from "@/features/messages/utils/messagePresentation"
import { useMessagePreviewQuery } from "@/features/messages/queries/messageQueries"
import { SectionCard } from "@/shared/ui/AppFlowUi"
import { useSocketStore } from "@/shared/store/useSocketStore"
import { useWalletStore } from "@/shared/store/useWalletStore"
import { useAppTheme } from "@/shared/theme/useAppTheme"

const PREVIEW_LIMIT = 2
const ROW_HEIGHT = 52
const PREVIEW_BODY_HEIGHT = PREVIEW_LIMIT * ROW_HEIGHT

type RowAnimationState = {
  opacity: Animated.Value
  translateY: Animated.Value
  height: Animated.Value
}

export function HomeMessagePreview(props: { onPress: () => void }) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const walletAddress = useWalletStore(state => state.address)
  const chainId = useWalletStore(state => state.chainId)
  const messageRevision = useSocketStore(state => state.messageRevision)
  const hasHydratedRef = useRef(false)
  const itemIdsRef = useRef<string[]>([])
  const rowAnimationsRef = useRef<Record<string, RowAnimationState>>({})
  const animationFrameRef = useRef<number | null>(null)
  const query = useMessagePreviewQuery({ walletAddress, chainId }, PREVIEW_LIMIT)
  const items = query.data ?? []
  const ready = query.isFetched || query.isError
  const loadFailed = query.isError && items.length === 0

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

  useEffect(() => {
    return () => {
      clearPendingAnimationFrame()

      Object.values(rowAnimationsRef.current).forEach(stopRowAnimation)
      rowAnimationsRef.current = {}
      itemIdsRef.current = []
    }
  }, [clearPendingAnimationFrame, stopRowAnimation])

  useEffect(() => {
    const nextIds = items.map(item => item.id)
    const { insertedIds } = diffHomeMessagePreviewIds(itemIdsRef.current, nextIds, hasHydratedRef.current)

    pruneRowAnimations(nextIds)
    itemIdsRef.current = nextIds
    animateInsertedRows(insertedIds)
    hasHydratedRef.current = true
  }, [animateInsertedRows, items, pruneRowAnimations])

  useFocusEffect(
    React.useCallback(() => {
      void query.refetch()
    }, [query.refetch]),
  )

  useEffect(() => {
    if (messageRevision <= 0) {
      return
    }

    void query.refetch()
  }, [messageRevision, query.refetch])

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
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  headerAction: {
    paddingVertical: 6,
  },
  headerActionText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "700",
    letterSpacing: -0.1,
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
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "700",
  },
  stateBody: {
    fontSize: 14,
    lineHeight: 21,
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
    paddingVertical: 4,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowInline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    minWidth: 0,
  },
  rowSummary: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "600",
    letterSpacing: -0.12,
  },
  rowTime: {
    fontSize: 13,
    lineHeight: 18,
    flexShrink: 0,
  },
})
