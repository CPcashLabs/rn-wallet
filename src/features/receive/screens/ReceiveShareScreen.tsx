import React, { useEffect, useState } from "react"

import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import type { ReceiveStackParamList } from "@/app/navigation/types"
import { HomeScaffold } from "@/features/home/components/HomeScaffold"
import { ReceiveOrderCard } from "@/features/receive/components/ReceiveUi"
import { getReceiveShareDetail } from "@/features/receive/services/receiveApi"
import { buildQrCodeDataUrl, buildQrMatrix, stripDataUrlPrefix, type QrMatrix } from "@/features/receive/utils/qrcode"
import { FieldRow, SectionCard } from "@/features/transfer/components/TransferUi"
import { fileAdapter, shareAdapter } from "@/shared/native"
import { useAppTheme } from "@/shared/theme/useAppTheme"

type Props = NativeStackScreenProps<ReceiveStackParamList, "ReceiveShareScreen">

export function ReceiveShareScreen({ navigation, route }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof getReceiveShareDetail>> | null>(null)
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
        Alert.alert(t("common.errorTitle"), t("receive.share.saveFailed"))
        return
      }

      Alert.alert(t("common.infoTitle"), t("receive.share.saveSuccess"))
    } catch (error) {
      console.error("[receive][share][qr][save]", error)
      Alert.alert(t("common.errorTitle"), t("receive.share.saveFailed"))
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
          <FieldRow label="Order SN" value={detail?.orderSn || route.params.orderSn} />
          <FieldRow label={t("receive.share.address")} value={detail?.address || "-"} />
          <FieldRow label={t("receive.share.link")} value={detail?.shareUrl || "-"} />
        </SectionCard>

        <View style={styles.buttonRow}>
          <Pressable
            disabled={!detail?.address || !detail?.orderSn}
            onPress={() => {
              if (!detail?.address || !detail?.orderSn) {
                return
              }

              void saveQrImage()
            }}
            style={[styles.secondaryButton, { borderColor: theme.colors.border, opacity: detail?.address && detail?.orderSn ? 1 : 0.6 }]}
          >
            <Text style={[styles.secondaryText, { color: theme.colors.text }]}>{t("receive.share.saveImage")}</Text>
          </Pressable>
          <Pressable
            disabled={sharing || !detail?.shareUrl}
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
                    Alert.alert(t("common.errorTitle"), t("receive.share.shareFailed"))
                  }
                } finally {
                  setSharing(false)
                }
              })()
            }}
            style={[styles.button, { backgroundColor: theme.colors.primary, opacity: sharing || !detail?.shareUrl ? 0.6 : 1 }]}
          >
            <Text style={styles.buttonText}>{sharing ? t("common.loading") : t("receive.share.shareNow")}</Text>
          </Pressable>
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
  button: {
    flex: 1,
    minHeight: 48,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryText: {
    fontSize: 15,
    fontWeight: "700",
  },
})
