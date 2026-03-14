import React, { useEffect, useState } from "react"

import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import type { ReceiveStackParamList } from "@/app/navigation/types"
import { HomeScaffold } from "@/features/home/components/HomeScaffold"
import { InfoRow } from "@/plugins/receive/components/ReceiveUi"
import {
  getTraceChildLogs,
  getTraceChildStatistics,
  getTraceDetail,
  type ReceiveLog,
  type ReceiveOrder,
  type ReceiveTraceStatistics,
} from "@/plugins/receive/services/receiveApi"
import { SectionCard } from "@/shared/ui/AppFlowUi"
import { getJson, setJson } from "@/shared/storage/kvStorage"
import { KvStorageKeys } from "@/shared/storage/sessionKeys"
import { useAppTheme } from "@/shared/theme/useAppTheme"

type Props = NativeStackScreenProps<ReceiveStackParamList, "ReceiveTxlogsScreen">

export function ReceiveTxlogsScreen({ navigation, route }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const orderSn = route.params?.orderSn
  const [detail, setDetail] = useState<ReceiveOrder | null>(null)
  const [logs, setLogs] = useState<ReceiveLog[]>([])
  const [stats, setStats] = useState<ReceiveTraceStatistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null)
  const [newLogKeys, setNewLogKeys] = useState<string[]>([])

  useEffect(() => {
    if (!orderSn) {
      return
    }

    let active = true

    const load = async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      try {
        const [nextDetail, nextLogs, nextStats] = await Promise.all([
          getTraceDetail(orderSn),
          getTraceChildLogs({ orderSn }),
          getTraceChildStatistics({ orderSn }),
        ])

        if (!active) {
          return
        }

        const currentSeenMap = getJson<Record<string, string[]>>(KvStorageKeys.ReceiveShowedList) ?? {}
        const seenKeys = new Set(currentSeenMap[orderSn] ?? [])
        const incomingKeys = nextLogs.map(buildLogKey)
        const freshKeys = incomingKeys.filter(key => !seenKeys.has(key))

        currentSeenMap[orderSn] = Array.from(new Set([...(currentSeenMap[orderSn] ?? []), ...incomingKeys])).slice(-200)
        setJson(KvStorageKeys.ReceiveShowedList, currentSeenMap)

        setDetail(nextDetail)
        setLogs(nextLogs)
        setStats(nextStats)
        setNewLogKeys(freshKeys)
        setLastUpdatedAt(Date.now())
      } catch {
        if (!isRefresh && active) {
          Alert.alert(t("common.errorTitle"), t("receive.logs.loadFailed"))
        }
      } finally {
        if (!active) {
          return
        }

        setLoading(false)
        setRefreshing(false)
      }
    }

    void load()
    const timer = setInterval(() => {
      void load(true)
    }, 5000)

    return () => {
      active = false
      clearInterval(timer)
    }
  }, [orderSn, t])

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("receive.logs.title")} scroll={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <SectionCard>
          <InfoRow label="Order SN" value={orderSn || "-"} />
          <InfoRow label={t("receive.logs.address")} value={detail?.address || "-"} />
          <InfoRow label={t("receive.logs.mode")} value={route.params?.orderType || detail?.orderType || "-"} />
          <InfoRow
            label={t("receive.logs.refreshStatus")}
            value={
              refreshing
                ? t("receive.logs.refreshing")
                : lastUpdatedAt
                  ? t("receive.logs.updatedAt", { at: new Date(lastUpdatedAt).toLocaleTimeString() })
                  : "-"
            }
          />
        </SectionCard>

        <SectionCard>
          <Text style={[styles.title, { color: theme.colors.text }]}>{t("receive.logs.stats")}</Text>
          <InfoRow label={t("receive.logs.orderCount")} value={String(stats?.orderCount ?? 0)} />
          <InfoRow label={t("receive.logs.receiptAmount")} value={String(stats?.receiptAmount ?? 0)} />
          <InfoRow label={t("receive.logs.recvActualAmount")} value={String(stats?.recvActualAmount ?? 0)} />
          <InfoRow label={t("receive.logs.sendActualFeeAmount")} value={String(stats?.sendActualFeeAmount ?? 0)} />
        </SectionCard>

        {loading ? (
          <SectionCard>
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={theme.colors.primary} />
              <Text style={[styles.body, { color: theme.colors.mutedText }]}>{t("receive.logs.loading")}</Text>
            </View>
          </SectionCard>
        ) : null}

        {logs.map(item => {
          const logKey = buildLogKey(item)
          return (
            <SectionCard key={logKey}>
              <View style={styles.logHeader}>
                <Text style={[styles.title, { color: theme.colors.text }]}>{item.statusName || t("receive.logs.pending")}</Text>
                {newLogKeys.includes(logKey) ? (
                  <View style={[styles.newBadge, { backgroundColor: theme.colors.primary }]}>
                    <Text style={styles.newBadgeText}>{t("receive.logs.new")}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.body, { color: theme.colors.mutedText }]}>
                {item.amount} {item.coinName}
              </Text>
              <Text style={[styles.body, { color: theme.colors.mutedText }]}>{item.fromAddress || item.txid || "-"}</Text>
            </SectionCard>
          )
        })}

        {!loading && logs.length === 0 ? (
          <SectionCard>
            <Text style={[styles.title, { color: theme.colors.text }]}>{t("receive.logs.emptyTitle")}</Text>
            <Text style={[styles.body, { color: theme.colors.mutedText }]}>{t("receive.logs.emptyBody")}</Text>
          </SectionCard>
        ) : null}
      </ScrollView>
    </HomeScaffold>
  )
}

function buildLogKey(item: ReceiveLog) {
  return `${item.orderSn}:${item.txid || item.createdAt || item.amount}:${item.status}`
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
  },
  body: {
    fontSize: 13,
    lineHeight: 20,
  },
  loadingWrap: {
    minHeight: 100,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  logHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  newBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  newBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
})
