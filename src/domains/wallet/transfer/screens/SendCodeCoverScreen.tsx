import React, { useEffect, useState } from "react"

import { Alert, ScrollView, StyleSheet, Text } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { mapWalletTransferShareFields } from "@/domains/wallet/shared/presentation/orderFields"
import { FieldRow, PrimaryButton, SectionCard } from "@/shared/ui/AppFlowUi"
import { getSendShareDetail } from "@/domains/wallet/transfer/services/transferApi"
import { HomeScaffold } from "@/shared/ui/HomeScaffold"
import { shareAdapter } from "@/shared/native/shareAdapter"
import { useToast } from "@/shared/toast/useToast"
import { useAppTheme } from "@/shared/theme/useAppTheme"

import type { TransferStackParamList } from "@/app/navigation/types"

type Props = NativeStackScreenProps<TransferStackParamList, "SendCodeCoverScreen">

export function SendCodeCoverScreen({ navigation, route }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const { showToast } = useToast()
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof getSendShareDetail>> | null>(null)
  const fields = mapWalletTransferShareFields(t, detail, route.params.orderSn)
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
          <FieldRow label={fields.orderSn.label} value={fields.orderSn.value} />
          <FieldRow label={fields.shareUrl.label} value={fields.shareUrl.value} />
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
                  showToast({ message: t("transfer.send.shareUnavailable"), tone: "warning" })
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
