import React, { useEffect, useState } from "react"

import { Alert, ScrollView, StyleSheet, Text } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import type { ReceiveStackParamList } from "@/app/navigation/types"
import { HomeScaffold } from "@/features/home/components/HomeScaffold"
import { InfoRow } from "@/features/receive/components/ReceiveUi"
import { getTraceChildLogs, getTraceDetail, type ReceiveLog, type ReceiveOrder } from "@/features/receive/services/receiveApi"
import { SectionCard } from "@/features/transfer/components/TransferUi"
import { useAppTheme } from "@/shared/theme/useAppTheme"

type Props = NativeStackScreenProps<ReceiveStackParamList, "ReceiveTxlogsScreen">

export function ReceiveTxlogsScreen({ navigation, route }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const params = route.params
  const [detail, setDetail] = useState<ReceiveOrder | null>(null)
  const [logs, setLogs] = useState<ReceiveLog[]>([])

  useEffect(() => {
    if (!params?.orderSn) {
      return
    }

    void (async () => {
      try {
        const [nextDetail, nextLogs] = await Promise.all([
          getTraceDetail(params.orderSn),
          getTraceChildLogs({ orderSn: params.orderSn }),
        ])
        setDetail(nextDetail)
        setLogs(nextLogs)
      } catch {
        Alert.alert(t("common.errorTitle"), t("receive.logs.loadFailed"))
      }
    })()
  }, [params, t])

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("receive.logs.title")} scroll={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <SectionCard>
          <InfoRow label="Order SN" value={params?.orderSn || "-"} />
          <InfoRow label={t("receive.logs.address")} value={detail?.address || "-"} />
          <InfoRow label={t("receive.logs.mode")} value={params?.orderType || detail?.orderType || "-"} />
        </SectionCard>

        {logs.map(item => (
          <SectionCard key={`${item.orderSn}-${item.txid}-${item.createdAt ?? 0}`}>
            <Text style={[styles.title, { color: theme.colors.text }]}>{item.statusName || t("receive.logs.pending")}</Text>
            <Text style={[styles.body, { color: theme.colors.mutedText }]}>
              {item.amount} {item.coinName}
            </Text>
            <Text style={[styles.body, { color: theme.colors.mutedText }]}>{item.fromAddress || item.txid || "-"}</Text>
          </SectionCard>
        ))}

        {logs.length === 0 ? (
          <SectionCard>
            <Text style={[styles.title, { color: theme.colors.text }]}>{t("receive.logs.emptyTitle")}</Text>
            <Text style={[styles.body, { color: theme.colors.mutedText }]}>{t("receive.logs.emptyBody")}</Text>
          </SectionCard>
        ) : null}
      </ScrollView>
    </HomeScaffold>
  )
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
})
