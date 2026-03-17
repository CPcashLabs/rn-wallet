import React, { useEffect, useState } from "react"

import { Alert, ScrollView, StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import type { ReceiveStackParamList } from "@/app/navigation/types"
import { mapWalletReceiveShareFields } from "@/domains/wallet/shared/presentation/orderFields"
import { HomeScaffold } from "@/shared/ui/HomeScaffold"
import { ReceiveOrderCard } from "@/domains/wallet/receive/components/ReceiveUi"
import { getReceiveShareDetail } from "@/domains/wallet/receive/services/receiveApi"
import { buildQrCodeDataUrl, buildQrMatrix, stripDataUrlPrefix, type QrMatrix } from "@/domains/wallet/receive/utils/qrcode"
import { logErrorSafely } from "@/shared/logging/safeConsole"
import { FieldRow, SectionCard } from "@/shared/ui/AppFlowUi"
import { fileAdapter, shareAdapter } from "@/shared/native"
import { useToast } from "@/shared/toast/useToast"
import { useAppTheme } from "@/shared/theme/useAppTheme"
import { AppButton } from "@/shared/ui/AppButton"

type Props = NativeStackScreenProps<ReceiveStackParamList, "ReceiveShareScreen">

export function ReceiveShareScreen({ navigation, route }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const { showToast } = useToast()
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof getReceiveShareDetail>> | null>(null)
  const fields = mapWalletReceiveShareFields(t, detail, route.params.orderSn)
  const [sharing, setSharing] = useState(false)
  const [qrMatrix, setQrMatrix] = useState<QrMatrix | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const next = await getReceiveShareDetail(route.params.orderSn)
        setDetail(next)
        if (next.address) {
          setQrMatrix(buildQrMatrix(next.address))
        }
      } catch {
        Alert.alert(t("common.errorTitle"), t("receive.share.loadFailed"))
      }
    })()
  }, [route.params.orderSn, t])

  async function saveQrImage() {
    if (!detail?.address || !detail.orderSn) {
      return
    }

    try {
      const dataUrl = await buildQrCodeDataUrl(detail.address)
      const result = await fileAdapter.saveImage({
        filename: `receive-${detail.orderSn}.png`,
        base64: stripDataUrlPrefix(dataUrl),
      })

      if (!result.ok) {
        showToast({ message: t("receive.share.saveFailed"), tone: "error" })
        return
      }

      showToast({ message: t("receive.share.saveSuccess"), tone: "success" })
    } catch (error) {
      logErrorSafely("[receive][share][qr][save]", error, {
        forwardToConsole: false,
      })
      showToast({ message: t("receive.share.saveFailed"), tone: "error" })
    }
  }

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("receive.share.title")} scroll={false}>
      <ScrollView contentContainerStyle={styles.content}>
        {detail?.address ? (
          <ReceiveOrderCard
            title={t("receive.share.title")}
            subtitle={detail.sendChainName || "-"}
            address={detail.address}
            amountLabel={t("receive.share.link")}
            extra={detail.shareUrl || "-"}
            qrMatrix={qrMatrix}
          />
        ) : null}

        <SectionCard>
          <Text style={[styles.headline, { color: theme.colors.text }]}>{t("receive.share.headline")}</Text>
          <Text style={[styles.body, { color: theme.colors.mutedText }]}>{t("receive.share.body")}</Text>
          <FieldRow label={fields.orderSn.label} value={fields.orderSn.value} />
          <FieldRow label={fields.address.label} value={fields.address.value} />
          <FieldRow label={fields.shareUrl.label} value={fields.shareUrl.value} />
        </SectionCard>

        <View style={styles.buttonRow}>
          <AppButton
            disabled={!detail?.address || !detail?.orderSn}
            label={t("receive.share.saveImage")}
            onPress={() => {
              if (!detail?.address || !detail?.orderSn) {
                return
              }

              void saveQrImage()
            }}
            style={styles.buttonFlex}
            variant="secondary"
          />
          <AppButton
            disabled={sharing || !detail?.shareUrl}
            label={sharing ? t("common.loading") : t("receive.share.shareNow")}
            onPress={() => {
              if (!detail?.shareUrl) {
                return
              }

              void (async () => {
                setSharing(true)
                try {
                  const result = await shareAdapter.share({
                    title: t("receive.share.headline"),
                    message: detail.shareUrl,
                    url: detail.shareUrl,
                  })

                  if (!result.ok) {
                    showToast({ message: t("receive.share.shareFailed"), tone: "error" })
                  }
                } finally {
                  setSharing(false)
                }
              })()
            }}
            style={styles.buttonFlex}
          />
        </View>
      </ScrollView>
    </HomeScaffold>
  )
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  headline: { fontSize: 16, fontWeight: "700" },
  body: { fontSize: 13, lineHeight: 20 },
  qrWrap: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    padding: 16,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
  },
  buttonFlex: {
    flex: 1,
  },
})
