import React, { useEffect, useState } from "react"

import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import type { ReceiveStackParamList } from "@/app/navigation/types"
import { HomeScaffold } from "@/features/home/components/HomeScaffold"
import { SegmentedTabs } from "@/domains/wallet/receive/components/ReceiveUi"
import { createReceiveOrder, getRareAddressPage, type RareAddressItem } from "@/domains/wallet/receive/services/receiveApi"
import { SectionCard } from "@/shared/ui/AppFlowUi"
import { useToast } from "@/shared/toast/useToast"
import { useAppTheme } from "@/shared/theme/useAppTheme"

type Props = NativeStackScreenProps<ReceiveStackParamList, "RareAddressScreen">

export function RareAddressScreen({ navigation, route }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const { showToast } = useToast()
  const params = route.params
  const [tab, setTab] = useState<"digit" | "letter">("digit")
  const [digit, setDigit] = useState(4)
  const [items, setItems] = useState<RareAddressItem[]>([])
  const [activeAddress, setActiveAddress] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!params?.payChain) {
      return
    }

    const chainName = params.payChain

    void (async () => {
      try {
        const next = await getRareAddressPage({
          chainName,
          digit,
          type: tab,
        })
        setItems(next)
        setActiveAddress(next[0]?.address ?? "")
      } catch {
        Alert.alert(t("common.errorTitle"), t("receive.rare.loadFailed"))
      }
    })()
  }, [digit, params, t, tab])

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("receive.rare.title")} scroll={false}>
      <View style={styles.page}>
        <ScrollView contentContainerStyle={styles.content}>
          <SegmentedTabs
            value={tab}
            options={[
              { value: "digit", label: t("receive.rare.repeatingDigits") },
              { value: "letter", label: t("receive.rare.repeatingLetters") },
            ]}
            onChange={setTab}
          />

          <View style={styles.filterRow}>
            {[4, 5, 6, 7].map(value => {
              const active = value === digit
              return (
                <Pressable
                  key={value}
                  onPress={() => setDigit(value)}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.filterText, { color: active ? "#FFFFFF" : theme.colors.text }]}>{value}D</Text>
                </Pressable>
              )
            })}
          </View>

          {items.map(item => {
            const active = item.address === activeAddress
            return (
              <Pressable
                key={item.address}
                onPress={() => setActiveAddress(item.address)}
                style={[
                  styles.item,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: active ? theme.colors.primary : theme.colors.border,
                  },
                ]}
              >
                <Text style={[styles.itemText, { color: theme.colors.text }]}>{item.address}</Text>
              </Pressable>
            )
          })}

          {items.length === 0 ? (
            <SectionCard>
              <Text style={[styles.itemText, { color: theme.colors.text }]}>{t("receive.rare.empty")}</Text>
            </SectionCard>
          ) : null}
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: theme.colors.border, backgroundColor: theme.colors.background }]}>
          <Pressable
            disabled={
              submitting ||
              !activeAddress ||
              !params?.sendCoinCode ||
              !params?.recvCoinCode ||
              !params?.sellerId
            }
            onPress={() => {
              if (!activeAddress || !params?.sendCoinCode || !params?.recvCoinCode || !params?.sellerId) {
                return
              }

              const sellerId = params.sellerId
              const sendCoinCode = params.sendCoinCode
              const recvCoinCode = params.recvCoinCode
              const multisigWalletId = params.multisigWalletId

              void (async () => {
                setSubmitting(true)
                try {
                  await createReceiveOrder({
                    variant: "long",
                    sellerId,
                    recvAmount: 10,
                    recvAddress: activeAddress,
                    sendCoinCode,
                    recvCoinCode,
                    multisigWalletId,
                  })
                  showToast({ message: t("receive.rare.createSuccess"), tone: "success" })
                } catch {
                  Alert.alert(t("common.errorTitle"), t("receive.rare.createFailed"))
                } finally {
                  setSubmitting(false)
                }
              })()
            }}
            style={[styles.submitButton, { backgroundColor: theme.colors.primary, opacity: submitting ? 0.6 : 1 }]}
          >
            <Text style={styles.submitText}>{submitting ? t("common.loading") : t("receive.rare.confirm")}</Text>
          </Pressable>
        </View>
      </View>
    </HomeScaffold>
  )
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterChip: {
    minWidth: 56,
    minHeight: 36,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  filterText: {
    fontSize: 13,
    fontWeight: "700",
  },
  item: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 14,
  },
  itemText: {
    fontSize: 14,
    fontWeight: "600",
  },
  footer: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  submitButton: {
    minHeight: 46,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
})
