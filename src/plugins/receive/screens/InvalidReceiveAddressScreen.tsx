import React, { useEffect, useState } from "react"

import { Alert, ScrollView, StyleSheet, Text } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import type { ReceiveStackParamList } from "@/app/navigation/types"
import { HomeScaffold } from "@/features/home/components/HomeScaffold"
import { getInvalidReceiveOrders, type ReceiveOrder } from "@/plugins/receive/services/receiveApi"
import { SectionCard } from "@/shared/ui/AppFlowUi"
import { useAppTheme } from "@/shared/theme/useAppTheme"

type Props = NativeStackScreenProps<ReceiveStackParamList, "InvalidReceiveAddressScreen">

export function InvalidReceiveAddressScreen({ navigation, route }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const [items, setItems] = useState<ReceiveOrder[]>([])

  useEffect(() => {
    void (async () => {
      try {
        const next = await getInvalidReceiveOrders({
          sendCoinCode: route.params?.sendCoinCode,
          recvCoinCode: route.params?.recvCoinCode,
          multisigWalletId: route.params?.multisigWalletId,
        })
        setItems(next)
      } catch {
        Alert.alert(t("common.errorTitle"), t("receive.invalid.loadFailed"))
      }
    })()
  }, [route.params?.multisigWalletId, route.params?.recvCoinCode, route.params?.sendCoinCode, t])

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("receive.invalid.title")} scroll={false}>
      <ScrollView contentContainerStyle={styles.content}>
        {items.map(item => (
          <SectionCard key={`${item.orderSn}-${item.address}`}>
            <Text style={[styles.title, { color: theme.colors.text }]}>{item.remarkName || item.address}</Text>
            <Text style={[styles.body, { color: theme.colors.mutedText }]}>{item.address}</Text>
          </SectionCard>
        ))}

        {items.length === 0 ? (
          <SectionCard>
            <Text style={[styles.title, { color: theme.colors.text }]}>{t("receive.invalid.emptyTitle")}</Text>
            <Text style={[styles.body, { color: theme.colors.mutedText }]}>{t("receive.invalid.emptyBody")}</Text>
          </SectionCard>
        ) : null}
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
    fontSize: 15,
    fontWeight: "700",
  },
  body: {
    fontSize: 13,
    lineHeight: 20,
  },
})
