import React, { useEffect, useState } from "react"

import { Alert, ScrollView, StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { FieldRow, PrimaryButton, SecondaryButton, SectionCard } from "@/shared/ui/AppFlowUi"
import { getSendShareDetail } from "@/plugins/transfer/services/transferApi"
import { HomeScaffold } from "@/features/home/components/HomeScaffold"
import { formatDateTime } from "@/features/home/utils/format"
import { useAppTheme } from "@/shared/theme/useAppTheme"

import type { TransferStackParamList } from "@/app/navigation/types"

type Props = NativeStackScreenProps<TransferStackParamList, "SendCodeDetailScreen">

export function SendCodeDetailScreen({ navigation, route }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof getSendShareDetail>> | null>(null)

  useEffect(() => {
    let mounted = true

    void (async () => {
      try {
        const result = await getSendShareDetail(route.params.orderSn)
        if (mounted) {
          setDetail(result)
        }
      } catch {
        if (mounted) {
          Alert.alert(t("common.errorTitle"), t("transfer.send.detailLoadFailed"))
        }
      }
    })()

    return () => {
      mounted = false
    }
  }, [route.params.orderSn, t])

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("transfer.send.detailTitle")} scroll={false}>
      <ScrollView bounces={false} contentContainerStyle={styles.content}>
        <SectionCard>
          <Text style={[styles.amount, { color: theme.colors.text }]}>
            {detail ? `${detail.sendAmount} ${detail.sendCoinName || detail.sendCoinCode}` : t("common.loading")}
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.mutedText }]}>{detail?.statusName || route.params.orderSn}</Text>
        </SectionCard>

        <SectionCard>
          <FieldRow label={t("transfer.send.orderSn")} value={detail?.orderSn || route.params.orderSn} />
          <FieldRow label={t("transfer.send.shareUrl")} value={detail?.shareUrl || "-"} />
          <FieldRow label={t("transfer.send.receiveAddress")} value={detail?.receiveAddress || "-"} />
          <FieldRow label={t("transfer.send.paymentAddress")} value={detail?.paymentAddress || "-"} />
          <FieldRow label={t("transfer.send.orderType")} value={detail?.orderType || "-"} />
          <FieldRow label={t("transfer.send.expiredAt")} value={detail?.expiredAt ? formatDateTime(detail.expiredAt) : "-"} />
        </SectionCard>

        <View style={styles.actions}>
          <PrimaryButton
            label={t("transfer.send.openPaymentInfo")}
            onPress={() =>
              navigation.navigate("SendPaymentInfoScreen", {
                orderSn: route.params.orderSn,
              })
            }
          />
          <PrimaryButton
            label={t("transfer.send.openCover")}
            onPress={() =>
              navigation.navigate("SendCodeCoverScreen", {
                orderSn: route.params.orderSn,
              })
            }
          />
          <SecondaryButton label={t("transfer.send.openLogs")} onPress={() => navigation.navigate("SendCodeLogsScreen")} />
        </View>
      </ScrollView>
    </HomeScaffold>
  )
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 12,
  },
  amount: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    fontSize: 12,
  },
  actions: {
    gap: 10,
    marginBottom: 24,
  },
})
