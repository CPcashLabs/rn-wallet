import React from "react"

import { ScrollView, StyleSheet, Text } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { PageEmpty, PrimaryButton, SectionCard } from "@/features/transfer/components/TransferUi"
import { HomeScaffold } from "@/features/home/components/HomeScaffold"
import { useTransferDraftStore } from "@/features/transfer/store/useTransferDraftStore"
import { useAppTheme } from "@/shared/theme/useAppTheme"

import type { TransferStackParamList } from "@/app/navigation/types"

type Props = NativeStackScreenProps<TransferStackParamList, "SendEntryScreen">

export function SendEntryScreen({ navigation, route }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const latestOrderSn = useTransferDraftStore(state => state.latestOrderSn)
  const orderSn = route.params?.orderSn ?? latestOrderSn

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("transfer.send.entryTitle")} scroll={false}>
      <ScrollView bounces={false} contentContainerStyle={styles.content}>
        <SectionCard>
          <Text style={[styles.title, { color: theme.colors.text }]}>{t("transfer.send.entryHeadline")}</Text>
          <Text style={[styles.body, { color: theme.colors.mutedText }]}>{t("transfer.send.entryBody")}</Text>
        </SectionCard>

        <PrimaryButton label={t("transfer.send.sendCode")} onPress={() => navigation.navigate("SendCodeScreen")} />
        <PrimaryButton label={t("transfer.send.sendToken")} onPress={() => navigation.navigate("SendTokenScreen")} />

        {orderSn ? (
          <PrimaryButton
            label={t("transfer.send.continueLatest")}
            onPress={() =>
              navigation.navigate("SendCodeDetailScreen", {
                orderSn,
              })
            }
          />
        ) : (
          <PageEmpty body={t("transfer.send.noRecentBody")} title={t("transfer.send.noRecentTitle")} />
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
  title: {
    fontSize: 16,
    fontWeight: "700",
  },
  body: {
    fontSize: 13,
    lineHeight: 20,
  },
})
