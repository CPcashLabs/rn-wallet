import React, { useEffect, useState } from "react"

import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import type { ReceiveStackParamList } from "@/app/navigation/types"
import { HomeScaffold } from "@/features/home/components/HomeScaffold"
import { InfoRow, SegmentedTabs } from "@/features/receive/components/ReceiveUi"
import { createReceiveOrder, getReceiveAddressLimit, getRecentReceiveOrders, type ReceiveOrder } from "@/features/receive/services/receiveApi"
import { SectionCard } from "@/features/transfer/components/TransferUi"
import { useWalletStore } from "@/shared/store/useWalletStore"
import { useAppTheme } from "@/shared/theme/useAppTheme"

type Props = NativeStackScreenProps<ReceiveStackParamList, "ReceiveAddressListScreen">

export function ReceiveAddressListScreen({ navigation, route }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const walletAddress = useWalletStore(state => state.address)
  const params = route.params
  const [tab, setTab] = useState<"TRACE" | "TRACE_LONG_TERM">(route.params?.orderType ?? "TRACE")
  const [items, setItems] = useState<ReceiveOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [limit, setLimit] = useState<number | null>(null)

  useEffect(() => {
    if (!params?.sendCoinCode || !params?.recvCoinCode) {
      return
    }

    const sendCoinCode = params.sendCoinCode
    const recvCoinCode = params.recvCoinCode
    const multisigWalletId = params.multisigWalletId

    void (async () => {
      setLoading(true)
      try {
        const next = await getRecentReceiveOrders({
          orderType: tab,
          sendCoinCode,
          recvCoinCode,
          multisigWalletId,
        })
        const max = await getReceiveAddressLimit({
          orderType: tab,
          sendCoinCode,
          recvCoinCode,
          multisigWalletId,
        })
        setItems(next)
        setLimit(max)
      } catch {
        Alert.alert(t("common.errorTitle"), t("receive.addressList.loadFailed"))
      } finally {
        setLoading(false)
      }
    })()
  }, [params, t, tab])

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("receive.addressList.title")} scroll={false}>
      <View style={styles.page}>
        <ScrollView contentContainerStyle={styles.content}>
          <SegmentedTabs
            value={tab}
            options={[
              { value: "TRACE", label: t("receive.home.individuals") },
              { value: "TRACE_LONG_TERM", label: t("receive.home.business") },
            ]}
            onChange={setTab}
          />

          <SectionCard>
            <InfoRow label={t("receive.addressList.currentMode")} value={tab === "TRACE" ? t("receive.home.individuals") : t("receive.home.business")} />
            <InfoRow label={t("receive.home.payChain")} value={params?.payChain || "-"} />
            <InfoRow label={t("receive.addressList.capacity")} value={`${items.length}/${limit ?? "-"}`} />
          </SectionCard>

          {items.map(item => (
            <Pressable
              key={`${item.orderSn}-${item.address}`}
              style={[styles.item, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              onPress={() =>
                navigation.navigate("ReceiveAddressCreateScreen", {
                  orderSn: item.orderSn,
                  address: item.address,
                  remarkName: item.remarkName,
                  multisigWalletId: params?.multisigWalletId,
                })
              }
            >
              <Text style={[styles.itemTitle, { color: theme.colors.text }]}>
                {item.remarkName || item.address || item.orderSn}
              </Text>
              <Text style={[styles.itemBody, { color: theme.colors.mutedText }]}>{item.address}</Text>
              <Text style={[styles.itemMeta, { color: theme.colors.mutedText }]}>
                {item.amount > 0 ? `${item.amount} ${item.coinName}` : t("receive.addressList.noFixedAmount")}
              </Text>
            </Pressable>
          ))}

          {!loading && items.length === 0 ? (
            <SectionCard>
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>{t("receive.addressList.emptyTitle")}</Text>
              <Text style={[styles.emptyBody, { color: theme.colors.mutedText }]}>{t("receive.addressList.emptyBody")}</Text>
            </SectionCard>
          ) : null}
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: theme.colors.border, backgroundColor: theme.colors.background }]}>
          <Pressable
            onPress={() => navigation.navigate("ReceiveAddressDeleteScreen", params)}
            style={[styles.lightButton, { borderColor: theme.colors.border }]}
          >
            <Text style={[styles.lightText, { color: theme.colors.text }]}>{t("receive.addressList.delete")}</Text>
          </Pressable>
          <Pressable
            disabled={creating || !walletAddress || !params?.sendCoinCode || !params?.recvCoinCode}
            onPress={() => {
              if (!walletAddress || !params?.sendCoinCode || !params?.recvCoinCode) {
                return
              }

              const sendCoinCode = params.sendCoinCode
              const recvCoinCode = params.recvCoinCode
              const multisigWalletId = params.multisigWalletId

              void (async () => {
                setCreating(true)
                try {
                  await createReceiveOrder({
                    variant: tab === "TRACE" ? "short" : "long",
                    sellerId: params.sellerId || "",
                    recvAmount: 10,
                    recvAddress: walletAddress,
                    sendCoinCode,
                    recvCoinCode,
                    multisigWalletId,
                  })
                  const next = await getRecentReceiveOrders({
                    orderType: tab,
                    sendCoinCode,
                    recvCoinCode,
                    multisigWalletId,
                  })
                  setItems(next)
                } catch {
                  Alert.alert(t("common.errorTitle"), t("receive.addressList.createFailed"))
                } finally {
                  setCreating(false)
                }
              })()
            }}
            style={[styles.primaryButton, { backgroundColor: theme.colors.primary, opacity: creating ? 0.6 : 1 }]}
          >
            <Text style={styles.primaryText}>{creating ? t("common.loading") : t("receive.addressList.addNew")}</Text>
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
  item: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 14,
    gap: 6,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  itemBody: {
    fontSize: 12,
    lineHeight: 18,
  },
  itemMeta: {
    fontSize: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  emptyBody: {
    fontSize: 13,
    lineHeight: 20,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: 16,
    flexDirection: "row",
    gap: 10,
  },
  lightButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  lightText: {
    fontSize: 14,
    fontWeight: "700",
  },
  primaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
})
