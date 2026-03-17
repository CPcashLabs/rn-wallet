import React from "react"

import { Pressable, ScrollView, StyleSheet, Text } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { formatWalletDateTime } from "@/domains/wallet/shared/utils/format"
import { PageEmpty, SectionCard } from "@/shared/ui/AppFlowUi"
import { HomeScaffold } from "@/features/home/components/HomeScaffold"
import { getSendOrderLogs } from "@/domains/wallet/transfer/services/transferApi"
import { useAppTheme } from "@/shared/theme/useAppTheme"
import { PrimaryButton } from "@/shared/ui/AppFlowUi"

import type { TransferStackParamList } from "@/app/navigation/types"

type Props = NativeStackScreenProps<TransferStackParamList, "SendCodeLogsScreen">

export function SendCodeLogsScreen({ navigation }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const [items, setItems] = React.useState<Awaited<ReturnType<typeof getSendOrderLogs>>["items"]>([])
  const [page, setPage] = React.useState(1)
  const [total, setTotal] = React.useState(0)
  const [loading, setLoading] = React.useState(true)

  const loadPage = React.useCallback(
    async (nextPage: number, replace = false) => {
      setLoading(true)
      try {
        const result = await getSendOrderLogs({
          page: nextPage,
          perPage: 10,
        })
        setPage(result.page)
        setTotal(result.total)
        setItems(current => (replace ? result.items : [...current, ...result.items]))
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  React.useEffect(() => {
    void loadPage(1, true)
  }, [loadPage])

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("transfer.send.logsTitle")} scroll={false}>
      <ScrollView bounces={false} contentContainerStyle={styles.content}>
        {items.length === 0 && !loading ? (
          <PageEmpty body={t("transfer.send.logsEmptyBody")} title={t("transfer.send.logsEmptyTitle")} />
        ) : (
          <>
            {items.map(item => (
              <Pressable
                key={item.orderSn}
                onPress={() =>
                  navigation.navigate("SendCodeDetailScreen", {
                    orderSn: item.orderSn,
                  })
                }
              >
                <SectionCard>
                  <Text style={[styles.title, { color: theme.colors.text }]}>{item.orderSn}</Text>
                  <Text style={[styles.body, { color: theme.colors.mutedText }]}>
                    {item.sendAmount} {item.sendCoinName} {"->"} {item.recvAmount} {item.recvCoinName}
                  </Text>
                  <Text style={[styles.body, { color: theme.colors.mutedText }]}>
                    {formatWalletDateTime(item.createdAt)} · {t("transfer.send.statusCode", { status: item.status })}
                  </Text>
                </SectionCard>
              </Pressable>
            ))}
            {items.length < total ? (
              <PrimaryButton
                label={loading ? t("common.loading") : t("transfer.send.loadMore")}
                onPress={() => void loadPage(page + 1)}
                disabled={loading}
              />
            ) : null}
          </>
        )}
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
    fontSize: 14,
    fontWeight: "700",
  },
  body: {
    fontSize: 12,
    lineHeight: 18,
  },
})
