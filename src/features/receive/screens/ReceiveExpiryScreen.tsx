import React, { useEffect, useState } from "react"

import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import type { ReceiveStackParamList } from "@/app/navigation/types"
import { HomeScaffold } from "@/features/home/components/HomeScaffold"
import { getReceiveExpireOptions, markReceiveExpireDuration, type ReceiveExpireOption } from "@/features/receive/services/receiveApi"
import { useReceiveStore } from "@/features/receive/store/useReceiveStore"
import { SectionCard } from "@/features/transfer/components/TransferUi"
import { useWalletStore } from "@/shared/store/useWalletStore"
import { useToast } from "@/shared/toast/useToast"
import { useAppTheme } from "@/shared/theme/useAppTheme"
import { AppButton } from "@/shared/ui/AppButton"

type Props = NativeStackScreenProps<ReceiveStackParamList, "ReceiveExpiryScreen">

function formatExpireLabel(seconds: number, t: ReturnType<typeof useTranslation>["t"]) {
  if (seconds >= 30 * 24 * 60 * 60) {
    return `${Math.round(seconds / (30 * 24 * 60 * 60))}${t("receive.expiry.month")}`
  }
  if (seconds >= 7 * 24 * 60 * 60) {
    return `${Math.round(seconds / (7 * 24 * 60 * 60))}${t("receive.expiry.week")}`
  }
  if (seconds >= 24 * 60 * 60) {
    return `${Math.round(seconds / (24 * 60 * 60))}${t("receive.expiry.day")}`
  }

  return `${Math.round(seconds / 3600)}${t("receive.expiry.hour")}`
}

export function ReceiveExpiryScreen({ navigation, route }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const { showToast } = useToast()
  const walletAddress = useWalletStore(state => state.address)
  const createOrder = useReceiveStore(state => state.createOrder)
  const [items, setItems] = useState<ReceiveExpireOption[]>([])
  const [selected, setSelected] = useState<number>(0)
  const [initial, setInitial] = useState<number>(0)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    void (async () => {
      try {
        const next = await getReceiveExpireOptions()
        setItems(next)
        const current = next.find(item => item.userMarked) ?? next.find(item => item.systemDefault) ?? next[0]
        setSelected(current?.expireDuration ?? 0)
        setInitial(current?.expireDuration ?? 0)
      } catch {
        Alert.alert(t("common.errorTitle"), t("receive.expiry.loadFailed"))
      }
    })()
  }, [t])

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("receive.expiry.title")} scroll={false}>
      <View style={styles.page}>
        <ScrollView contentContainerStyle={styles.content}>
          {items.map(item => {
            const active = item.expireDuration === selected
            return (
              <Pressable key={item.expireDuration} onPress={() => setSelected(item.expireDuration)}>
                <SectionCard>
                  <View style={styles.row}>
                    <Text style={[styles.title, { color: theme.colors.text }]}>{formatExpireLabel(item.expireDuration, t)}</Text>
                    <View
                      style={[
                        styles.radio,
                        {
                          borderColor: active ? theme.colors.primary : theme.colors.border,
                          backgroundColor: active ? theme.colors.primary : "transparent",
                        },
                      ]}
                    />
                  </View>
                </SectionCard>
              </Pressable>
            )
          })}
          <Text style={[styles.tip, { color: theme.colors.mutedText }]}>{t("receive.expiry.tip")}</Text>
          <Text style={[styles.tip, { color: theme.colors.mutedText }]}>{t("receive.expiry.saveAndApply")}</Text>
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: theme.colors.border, backgroundColor: theme.colors.background }]}>
          <AppButton
            disabled={submitting || selected === initial}
            label={submitting ? t("common.loading") : t("common.confirm")}
            onPress={() => {
              void (async () => {
                setSubmitting(true)
                try {
                  await markReceiveExpireDuration({
                    expireDuration: selected,
                    multisigWalletId: route.params?.multisigWalletId,
                  })

                  if (route.params?.sellerId && route.params?.sendCoinCode && route.params?.recvCoinCode && walletAddress) {
                    await createOrder({
                      variant: route.params?.collapse === "business" ? "long" : "short",
                      walletAddress,
                      multisigWalletId: route.params?.multisigWalletId,
                    })
                  }

                  showToast({ message: t("receive.expiry.saveSuccess"), tone: "success" })
                  navigation.goBack()
                } catch {
                  showToast({ message: t("receive.expiry.saveFailed"), tone: "error" })
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
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontSize: 15, fontWeight: "700" },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 999,
    borderWidth: 2,
  },
  tip: {
    fontSize: 13,
    lineHeight: 20,
  },
  footer: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
})
