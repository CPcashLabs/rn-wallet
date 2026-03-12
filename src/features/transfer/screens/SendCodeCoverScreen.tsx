import React, { useEffect, useState } from "react"

import { Alert, ScrollView, StyleSheet, Text } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { FieldRow, PrimaryButton, SectionCard } from "@/features/transfer/components/TransferUi"
import { getSendShareDetail } from "@/features/transfer/services/transferApi"
import { HomeScaffold } from "@/features/home/components/HomeScaffold"
import { shareAdapter } from "@/shared/native/shareAdapter"
import { useAppTheme } from "@/shared/theme/useAppTheme"

import type { TransferStackParamList } from "@/app/navigation/types"

type Props = NativeStackScreenProps<TransferStackParamList, "SendCodeCoverScreen">

export function SendCodeCoverScreen({ navigation, route }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof getSendShareDetail>> | null>(null)
  const [sharing, setSharing] = useState(false)

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
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("transfer.send.coverTitle")} scroll={false}>
      <ScrollView bounces={false} contentContainerStyle={styles.content}>
        <SectionCard>
          <Text style={[styles.title, { color: theme.colors.text }]}>{t("transfer.send.coverHeadline")}</Text>
          <Text style={[styles.body, { color: theme.colors.mutedText }]}>{t("transfer.send.coverBody")}</Text>
          <FieldRow label={t("transfer.send.orderSn")} value={detail?.orderSn || route.params.orderSn} />
          <FieldRow label={t("transfer.send.shareUrl")} value={detail?.shareUrl || "-"} />
        </SectionCard>

        <PrimaryButton
          label={sharing ? t("common.loading") : t("transfer.send.shareNow")}
          onPress={() => {
            if (!detail?.shareUrl) {
              Alert.alert(t("common.errorTitle"), t("transfer.send.shareUnavailable"))
              return
            }

            void (async () => {
              setSharing(true)
              try {
                const result = await shareAdapter.share({
                  title: t("transfer.send.coverHeadline"),
                  message: detail.shareUrl,
                  url: detail.shareUrl,
                })

                if (!result.ok) {
                  Alert.alert(t("common.infoTitle"), t("transfer.send.shareUnavailable"))
                }
              } finally {
                setSharing(false)
              }
            })()
          }}
          disabled={sharing}
        />
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
    fontSize: 16,
    fontWeight: "700",
  },
  body: {
    fontSize: 13,
    lineHeight: 20,
  },
})
