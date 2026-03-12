import React, { useEffect, useState } from "react"

import { Alert, ScrollView, StyleSheet, Text, TextInput } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { FieldRow, PrimaryButton, SectionCard } from "@/features/transfer/components/TransferUi"
import { getSendShareDetail, updateSendReceiveAddress } from "@/features/transfer/services/transferApi"
import { HomeScaffold } from "@/features/home/components/HomeScaffold"
import { useAppTheme } from "@/shared/theme/useAppTheme"

import type { TransferStackParamList } from "@/app/navigation/types"

type Props = NativeStackScreenProps<TransferStackParamList, "SendPaymentInfoScreen">

export function SendPaymentInfoScreen({ navigation, route }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof getSendShareDetail>> | null>(null)
  const [address, setAddress] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let mounted = true

    void (async () => {
      try {
        const result = await getSendShareDetail(route.params.orderSn)
        if (mounted) {
          setDetail(result)
          setAddress(result.receiveAddress)
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
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("transfer.send.paymentInfoTitle")} scroll={false}>
      <ScrollView bounces={false} contentContainerStyle={styles.content}>
        <SectionCard>
          <FieldRow label={t("transfer.send.orderSn")} value={detail?.orderSn || route.params.orderSn} />
          <FieldRow
            label={t("transfer.send.shareAmount")}
            value={`${detail?.sendAmount ?? 0} ${detail?.sendCoinName || detail?.sendCoinCode || ""}`.trim()}
          />
          <FieldRow label={t("transfer.send.shareUrl")} value={detail?.shareUrl || "-"} />
          <FieldRow label={t("transfer.send.paymentAddress")} value={detail?.paymentAddress || "-"} />
          <FieldRow label={t("transfer.send.status")} value={detail?.statusName || String(detail?.status ?? "-")} />
        </SectionCard>

        <SectionCard>
          <Text style={[styles.label, { color: theme.colors.text }]}>{t("transfer.send.receiveAddress")}</Text>
          <TextInput
            autoCapitalize="none"
            onChangeText={setAddress}
            placeholder={t("transfer.send.receiveAddressPlaceholder")}
            placeholderTextColor={theme.colors.mutedText}
            style={[
              styles.input,
              {
                color: theme.colors.text,
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.background,
              },
            ]}
            value={address}
          />
          <PrimaryButton
            label={saving ? t("common.loading") : t("transfer.send.saveAddress")}
            onPress={() => {
              if (!address.trim()) {
                Alert.alert(t("common.errorTitle"), t("transfer.send.addressRequired"))
                return
              }

              void (async () => {
                setSaving(true)
                try {
                  await updateSendReceiveAddress({
                    orderSn: route.params.orderSn,
                    address: address.trim(),
                  })
                  Alert.alert(t("common.infoTitle"), t("transfer.send.addressSaved"))
                } catch {
                  Alert.alert(t("common.errorTitle"), t("transfer.send.addressSaveFailed"))
                } finally {
                  setSaving(false)
                }
              })()
            }}
            disabled={saving}
          />
        </SectionCard>
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
