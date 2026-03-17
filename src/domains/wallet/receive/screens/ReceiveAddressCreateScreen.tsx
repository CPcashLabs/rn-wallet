import React, { useState } from "react"

import { StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import type { ReceiveStackParamList } from "@/app/navigation/types"
import { HomeScaffold } from "@/features/home/components/HomeScaffold"
import { editReceiveAddressRemark } from "@/domains/wallet/receive/services/receiveApi"
import { SectionCard } from "@/shared/ui/AppFlowUi"
import { AppButton } from "@/shared/ui/AppButton"
import { useToast } from "@/shared/toast/useToast"
import { useAppTheme } from "@/shared/theme/useAppTheme"
import { AppTextField } from "@/shared/ui/AppTextField"

type Props = NativeStackScreenProps<ReceiveStackParamList, "ReceiveAddressCreateScreen">

export function ReceiveAddressCreateScreen({ navigation, route }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const { showToast } = useToast()
  const params = route.params
  const [remarkName, setRemarkName] = useState(route.params?.remarkName ?? "")
  const [submitting, setSubmitting] = useState(false)

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("receive.addressEdit.title")} scroll={false}>
      <View style={styles.page}>
        <View style={styles.content}>
          <SectionCard>
            <Text style={[styles.label, { color: theme.colors.text }]}>{t("receive.addressEdit.address")}</Text>
            <Text style={[styles.address, { color: theme.colors.mutedText }]}>{route.params?.address || "-"}</Text>
          </SectionCard>

          <SectionCard>
            <AppTextField
              backgroundTone="background"
              label={t("receive.addressEdit.remark")}
              value={remarkName}
              onChangeText={setRemarkName}
              placeholder={t("receive.addressEdit.placeholder")}
            />
          </SectionCard>
        </View>

        <View style={[styles.footer, { borderTopColor: theme.colors.border, backgroundColor: theme.colors.background }]}>
          <AppButton
            disabled={submitting || !route.params?.orderSn || !route.params?.address}
            label={submitting ? t("common.loading") : t("receive.addressEdit.save")}
            onPress={() => {
              if (!params?.orderSn || !params?.address) {
                return
              }

              const orderSn = params.orderSn
              const address = params.address
              const multisigWalletId = params.multisigWalletId

              void (async () => {
                setSubmitting(true)
                try {
                  await editReceiveAddressRemark({
                    orderSn,
                    remarkName,
                    address,
                    multisigWalletId,
                  })
                  showToast({ message: t("receive.addressEdit.saveSuccess"), tone: "success" })
                  navigation.goBack()
                } catch {
                  showToast({ message: t("receive.addressEdit.saveFailed"), tone: "error" })
                } finally {
                  setSubmitting(false)
                }
              })()
            }}
          />
        </View>
      </View>
    </HomeScaffold>
  )
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { flex: 1, padding: 16, gap: 12 },
  label: { fontSize: 14, fontWeight: "700" },
  address: { fontSize: 13, lineHeight: 20 },
  footer: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
})
