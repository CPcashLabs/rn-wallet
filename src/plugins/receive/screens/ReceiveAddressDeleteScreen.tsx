import React, { useEffect, useState } from "react"

import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import type { ReceiveStackParamList } from "@/app/navigation/types"
import { HomeScaffold } from "@/features/home/components/HomeScaffold"
import { batchExpireReceiveOrders, getRecentReceiveOrders, type ReceiveOrder } from "@/plugins/receive/services/receiveApi"
import { SectionCard } from "@/shared/ui/AppFlowUi"
import { useToast } from "@/shared/toast/useToast"
import { useAppTheme } from "@/shared/theme/useAppTheme"
import { AppButton } from "@/shared/ui/AppButton"

type Props = NativeStackScreenProps<ReceiveStackParamList, "ReceiveAddressDeleteScreen">

export function ReceiveAddressDeleteScreen({ navigation, route }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const { showToast } = useToast()
  const params = route.params
  const [items, setItems] = useState<ReceiveOrder[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!params?.sendCoinCode || !params?.recvCoinCode) {
      return
    }

    const sendCoinCode = params.sendCoinCode
    const recvCoinCode = params.recvCoinCode

    void (async () => {
      try {
        const next = await getRecentReceiveOrders({
          orderType: params.orderType ?? "TRACE",
          sendCoinCode,
          recvCoinCode,
          multisigWalletId: params.multisigWalletId,
        })
        setItems(next)
      } catch {
        Alert.alert(t("common.errorTitle"), t("receive.addressDelete.loadFailed"))
      }
    })()
  }, [params, t])

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("receive.addressDelete.title")} scroll={false}>
      <View style={styles.page}>
        <ScrollView contentContainerStyle={styles.content}>
          {items.map(item => {
            const active = selected.includes(item.orderSn)

            return (
              <Pressable
                key={item.orderSn}
                onPress={() =>
                  setSelected(prev => (prev.includes(item.orderSn) ? prev.filter(value => value !== item.orderSn) : [...prev, item.orderSn]))
                }
              >
                <SectionCard>
                  <View style={styles.row}>
                    <View style={styles.meta}>
                      <Text style={[styles.title, { color: theme.colors.text }]}>{item.remarkName || item.address}</Text>
                      <Text style={[styles.body, { color: theme.colors.mutedText }]}>{item.address}</Text>
                    </View>
                    <View style={[styles.checkbox, { borderColor: active ? theme.colors.primary : theme.colors.border, backgroundColor: active ? theme.colors.primary : "transparent" }]} />
                  </View>
                </SectionCard>
              </Pressable>
            )
          })}
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: theme.colors.border, backgroundColor: theme.colors.background }]}>
          <AppButton
            disabled={submitting || selected.length === 0}
            label={submitting ? t("common.loading") : t("receive.addressDelete.confirm")}
            onPress={() => {
              void (async () => {
                setSubmitting(true)
                try {
                  await batchExpireReceiveOrders({
                    orderSnList: selected,
                  })
                  showToast({ message: t("receive.addressDelete.deleteSuccess"), tone: "success" })
                  navigation.goBack()
                } catch {
                  showToast({ message: t("receive.addressDelete.deleteFailed"), tone: "error" })
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
  content: { padding: 16, gap: 12 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  meta: {
    flex: 1,
    gap: 4,
  },
  title: { fontSize: 15, fontWeight: "700" },
  body: { fontSize: 12, lineHeight: 18 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 999,
    borderWidth: 2,
  },
  footer: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
})
