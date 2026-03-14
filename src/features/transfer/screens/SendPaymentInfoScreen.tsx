import React, { useEffect, useState } from "react"

import { Alert, ScrollView, StyleSheet, Text } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { resetToSupportScreen } from "@/app/navigation/navigationRef"
import { FieldRow, PrimaryButton, SectionCard } from "@/features/transfer/components/TransferUi"
import { getSendShareDetail, updateSendReceiveAddress } from "@/features/transfer/services/transferApi"
import { HomeScaffold } from "@/features/home/components/HomeScaffold"
import { useToast } from "@/shared/toast/useToast"
import { useAppTheme } from "@/shared/theme/useAppTheme"
import { AppTextField } from "@/shared/ui/AppTextField"

import type { TransferStackParamList } from "@/app/navigation/types"

type Props = NativeStackScreenProps<TransferStackParamList, "SendPaymentInfoScreen">

export function SendPaymentInfoScreen({ navigation, route }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const { showToast } = useToast()
  const params = route.params as Partial<TransferStackParamList["SendPaymentInfoScreen"]> | undefined
  const orderSn = params?.orderSn
  const publicAccess = Boolean(params?.publicAccess)
  const publicBaseUrl = params?.publicBaseUrl
  const fallbackPath = publicBaseUrl && orderSn ? `${publicBaseUrl}/send?share=${orderSn}` : publicBaseUrl || "app://send"
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof getSendShareDetail>> | null>(null)
  const [address, setAddress] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!orderSn) {
      resetToSupportScreen("NotFoundScreen", {
        path: fallbackPath,
      })
      return
    }

    let mounted = true

    void (async () => {
      try {
        const result = await getSendShareDetail(orderSn, {
          publicAccess,
          publicBaseUrl,
        })
        if (mounted) {
          setDetail(result)
          setAddress(result.receiveAddress)
        }
      } catch {
        if (mounted) {
          if (publicAccess) {
            resetToSupportScreen("NotFoundScreen", {
              path: fallbackPath,
            })
          } else {
            Alert.alert(t("common.errorTitle"), t("transfer.send.detailLoadFailed"))
          }
        }
      }
    })()

    return () => {
      mounted = false
    }
  }, [fallbackPath, orderSn, publicAccess, publicBaseUrl, t])

  if (!orderSn) {
    return null
  }

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("transfer.send.paymentInfoTitle")} scroll={false}>
      <ScrollView bounces={false} contentContainerStyle={styles.content}>
        <SectionCard>
          <FieldRow label={t("transfer.send.orderSn")} value={detail?.orderSn || orderSn} />
          <FieldRow
            label={t("transfer.send.shareAmount")}
            value={`${detail?.sendAmount ?? 0} ${detail?.sendCoinName || detail?.sendCoinCode || ""}`.trim()}
          />
          <FieldRow label={t("transfer.send.shareUrl")} value={detail?.shareUrl || "-"} />
          <FieldRow label={t("transfer.send.paymentAddress")} value={detail?.paymentAddress || "-"} />
          <FieldRow label={t("transfer.send.status")} value={detail?.statusName || String(detail?.status ?? "-")} />
        </SectionCard>

        {publicAccess ? null : (
          <SectionCard>
            <Text style={[styles.label, { color: theme.colors.text }]}>{t("transfer.send.receiveAddress")}</Text>
            <AppTextField
              autoCapitalize="none"
              backgroundTone="background"
              onChangeText={setAddress}
              placeholder={t("transfer.send.receiveAddressPlaceholder")}
              value={address}
            />
            <PrimaryButton
              label={saving ? t("common.loading") : t("transfer.send.saveAddress")}
              onPress={() => {
                if (!address.trim()) {
                  showToast({ message: t("transfer.send.addressRequired"), tone: "warning" })
                  return
                }

                void (async () => {
                  setSaving(true)
                  try {
                    await updateSendReceiveAddress({
                      orderSn,
                      address: address.trim(),
                    })
                    showToast({ message: t("transfer.send.addressSaved"), tone: "success" })
                  } catch {
                    showToast({ message: t("transfer.send.addressSaveFailed"), tone: "error" })
                  } finally {
                    setSaving(false)
                  }
                })()
              }}
              disabled={saving}
            />
          </SectionCard>
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
  label: {
    fontSize: 14,
    fontWeight: "700",
  },
  input: {
    minHeight: 52,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 14,
  },
})
