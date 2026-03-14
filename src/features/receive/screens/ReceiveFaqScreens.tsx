import React from "react"

import { Text, View } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { HomeScaffold } from "@/features/home/components/HomeScaffold"
import { Card, PrimaryButton, styles as settingsStyles } from "@/features/settings/screens/settingsShared"

import type { ReceiveStackParamList } from "@/app/navigation/types"

type ReceiveFaqProps = NativeStackScreenProps<ReceiveStackParamList, "ReceiveFaqScreen">
type ReceiveFaqDiffProps = NativeStackScreenProps<ReceiveStackParamList, "ReceiveFaqDiffScreen">

export function ReceiveFaqScreen({ navigation }: ReceiveFaqProps) {
  const { t } = useTranslation()
  const items = [
    { title: t("settingsHub.faq.crossChainTitle"), body: t("settingsHub.faq.crossChainBody") },
    { title: t("settingsHub.faq.paymentAddressTitle"), body: t("settingsHub.faq.paymentAddressBody") },
    { title: t("settingsHub.faq.validTimeTitle"), body: t("settingsHub.faq.validTimeBody") },
    { title: t("settingsHub.faq.expireTitle"), body: t("settingsHub.faq.expireBody") },
  ]

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("settingsHub.faq.title")}>
      {items.map(item => (
        <Card key={item.title}>
          <Text style={settingsStyles.questionTitle}>{item.title}</Text>
          <Text style={settingsStyles.answerText}>{item.body}</Text>
        </Card>
      ))}
      <PrimaryButton label={t("settingsHub.faq.receiveDiff")} onPress={() => navigation.navigate("ReceiveFaqDiffScreen")} />
    </HomeScaffold>
  )
}

export function ReceiveFaqDiffScreen({ navigation }: ReceiveFaqDiffProps) {
  const { t } = useTranslation()
  const rows = [
    [t("settingsHub.receiveDiff.purpose"), t("settingsHub.receiveDiff.individualTemporary"), t("settingsHub.receiveDiff.businessFixed")],
    [t("settingsHub.receiveDiff.feature"), t("settingsHub.receiveDiff.privacy"), t("settingsHub.receiveDiff.public")],
    [t("settingsHub.receiveDiff.validity"), t("settingsHub.receiveDiff.short"), t("settingsHub.receiveDiff.long")],
    [t("settingsHub.receiveDiff.cost"), t("settingsHub.receiveDiff.free"), t("settingsHub.receiveDiff.charge")],
  ]

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("settingsHub.receiveDiff.title")}>
      <Card>
        <Text style={settingsStyles.sectionLabel}>{t("settingsHub.receiveDiff.subtitle")}</Text>
        {rows.map(item => (
          <View key={item[0]} style={settingsStyles.diffRow}>
            <Text style={settingsStyles.diffCellLabel}>{item[0]}</Text>
            <Text style={settingsStyles.diffCell}>{item[1]}</Text>
            <Text style={settingsStyles.diffCell}>{item[2]}</Text>
          </View>
        ))}
      </Card>
    </HomeScaffold>
  )
}
