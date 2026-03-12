import React, { useState } from "react"

import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import type { ReceiveStackParamList } from "@/app/navigation/types"
import { HomeScaffold } from "@/features/home/components/HomeScaffold"
import { editReceiveAddressRemark } from "@/features/receive/services/receiveApi"
import { SectionCard } from "@/features/transfer/components/TransferUi"
import { useAppTheme } from "@/shared/theme/useAppTheme"

type Props = NativeStackScreenProps<ReceiveStackParamList, "ReceiveAddressCreateScreen">

export function ReceiveAddressCreateScreen({ navigation, route }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
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
            <Text style={[styles.label, { color: theme.colors.text }]}>{t("receive.addressEdit.remark")}</Text>
            <TextInput
              value={remarkName}
              onChangeText={setRemarkName}
              placeholder={t("receive.addressEdit.placeholder")}
              placeholderTextColor={theme.colors.mutedText}
              style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
            />
          </SectionCard>
        </View>

        <View style={[styles.footer, { borderTopColor: theme.colors.border, backgroundColor: theme.colors.background }]}>
          <Pressable
            disabled={submitting || !route.params?.orderSn || !route.params?.address}
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
                  Alert.alert(t("common.infoTitle"), t("receive.addressEdit.saveSuccess"))
                  navigation.goBack()
                } catch {
                  Alert.alert(t("common.errorTitle"), t("receive.addressEdit.saveFailed"))
                } finally {
                  setSubmitting(false)
                }
              })()
            }}
            style={[styles.button, { backgroundColor: theme.colors.primary, opacity: submitting ? 0.6 : 1 }]}
          >
            <Text style={styles.buttonText}>{submitting ? t("common.loading") : t("receive.addressEdit.save")}</Text>
          </Pressable>
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
  input: {
    minHeight: 48,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  footer: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  button: {
    minHeight: 48,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
})
