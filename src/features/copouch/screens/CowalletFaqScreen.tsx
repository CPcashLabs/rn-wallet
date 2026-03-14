import React from "react"

import { StyleSheet, Text, View } from "react-native"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"
import { useTranslation } from "react-i18next"

import { CopouchScaffold } from "@/features/copouch/components/CopouchScaffold"
import { SectionCard } from "@/features/transfer/components/TransferUi"
import { useAppTheme } from "@/shared/theme/useAppTheme"

import type { CowalletStackParamList } from "@/app/navigation/types"

type Props = NativeStackScreenProps<CowalletStackParamList, "CowalletFaqScreen">

export function CowalletFaqScreen({ navigation }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()

  const sections = [
    {
      title: t("copouch.faq.whatIsTitle"),
      body: t("copouch.faq.whatIsBody"),
    },
    {
      title: t("copouch.faq.managerTitle"),
      body: t("copouch.faq.managerBody"),
    },
    {
      title: t("copouch.faq.memberTitle"),
      body: t("copouch.faq.memberBody"),
    },
    {
      title: t("copouch.faq.createTitle"),
      body: t("copouch.faq.createBody"),
    },
  ]

  return (
    <CopouchScaffold canGoBack onBack={navigation.goBack} title={t("copouch.faq.title")}>
      {sections.map(section => (
        <SectionCard key={section.title}>
          <View style={styles.section}>
            <Text style={[styles.title, { color: theme.colors.text }]}>{section.title}</Text>
            <Text style={[styles.body, { color: theme.colors.mutedText }]}>{section.body}</Text>
          </View>
        </SectionCard>
      ))}
    </CopouchScaffold>
  )
}

const styles = StyleSheet.create({
  section: {
    gap: 8,
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
