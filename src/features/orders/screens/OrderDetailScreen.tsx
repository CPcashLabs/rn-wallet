import React, { useEffect, useState } from "react"

import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { HomeScaffold } from "@/features/home/components/HomeScaffold"
import { FieldRow, PageEmpty, PrimaryButton, SecondaryButton, SectionCard } from "@/features/transfer/components/TransferUi"
import { getOrderDetail, type OrderDetail } from "@/features/orders/services/ordersApi"
import { useAppTheme } from "@/shared/theme/useAppTheme"

import type { OrdersStackParamList } from "@/app/navigation/types"

type Props = NativeStackScreenProps<OrdersStackParamList, "OrderDetailScreen">

export function OrderDetailScreen({ navigation, route }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const orderSn = route.params.orderSn
  const [detail, setDetail] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    void (async () => {
      try {
        const response = await getOrderDetail(orderSn)
        if (active) {
          setDetail(response)
        }
      } catch {
        if (active) {
          Alert.alert(t("common.errorTitle"), t("orders.detail.loadFailed"))
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    })()

    return () => {
      active = false
    }
  }, [orderSn, t])

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("orders.detail.title")} scroll={false}>
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <SectionCard>
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={theme.colors.primary} />
              <Text style={[styles.body, { color: theme.colors.mutedText }]}>{t("orders.detail.loading")}</Text>
            </View>
          </SectionCard>
        ) : null}

        {!loading && !detail ? <PageEmpty title={t("orders.detail.emptyTitle")} body={t("orders.detail.emptyBody")} /> : null}

        {detail ? (
          <>
            <SectionCard>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t("orders.detail.summary")}</Text>
              <FieldRow label="Order SN" value={detail.orderSn || orderSn} />
              <FieldRow label={t("orders.detail.type")} value={detail.orderType || "--"} />
              <FieldRow label={t("orders.detail.status")} value={detail.statusName || String(detail.status || "--")} />
              <FieldRow label={t("orders.detail.send")} value={`${detail.sendAmount} ${detail.sendCoinName}`.trim()} />
              <FieldRow label={t("orders.detail.receive")} value={`${detail.recvAmount} ${detail.recvCoinName}`.trim()} />
            </SectionCard>

            <SectionCard>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t("orders.detail.addresses")}</Text>
              <FieldRow label={t("orders.detail.paymentAddress")} value={detail.paymentAddress || "--"} />
              <FieldRow label={t("orders.detail.receiveAddress")} value={detail.receiveAddress || "--"} />
              <FieldRow label={t("orders.detail.depositAddress")} value={detail.depositAddress || "--"} />
            </SectionCard>

            <SectionCard>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t("orders.detail.notes")}</Text>
              <Text style={[styles.body, { color: theme.colors.text }]}>{detail.note || t("orders.detail.noNotes")}</Text>
              {detail.notesImageUrl ? <Image source={{ uri: detail.notesImageUrl }} style={styles.previewImage} /> : null}
            </SectionCard>

            <PrimaryButton
              label={t("orders.detail.editTags")}
              onPress={() =>
                navigation.navigate("TagsNotesScreen", {
                  orderSn,
                })
              }
            />

            <SecondaryButton label={t("orders.detail.manageLabels")} onPress={() => navigation.navigate("LabelManagementScreen")} />
          </>
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
  loadingWrap: {
    minHeight: 120,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  body: {
    fontSize: 13,
    lineHeight: 20,
  },
  previewImage: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    backgroundColor: "#E2E8F0",
  },
})
