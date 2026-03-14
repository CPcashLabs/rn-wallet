import React, { useState } from "react"

import { Alert, Text, TextInput, View } from "react-native"
import { useTranslation } from "react-i18next"

import { HomeScaffold } from "@/features/home/components/HomeScaffold"
import { sendFeedback } from "@/features/settings/services/settingsApi"
import { getGuideLinks, openExternalUrl } from "@/features/settings/utils/settingsHub"
import { useAppTheme } from "@/shared/theme/useAppTheme"

import { Card, type GuideListScreenProps, PrimaryButton, Row, type StackProps, styles } from "@/features/settings/screens/settingsShared"

export function HelpCenterScreen({ navigation }: StackProps<"HelpCenterScreen">) {
  const { t } = useTranslation()

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("wp09.help.title")}>
      <Card>
        <Text style={styles.sectionLabel}>{t("wp09.help.needHelp")}</Text>
        <PrimaryButton label="Telegram" onPress={() => void openExternalUrl("https://t.me/CPcashWallet")} />
        <Text style={styles.emailValue}>support@cp.cash</Text>
      </Card>
      <Card>
        <Row label={t("wp09.help.faq")} onPress={() => navigation.navigate("FAQScreen")} />
        <Row label={t("wp09.help.userGuide")} onPress={() => navigation.navigate("UserGuideScreen")} />
      </Card>
    </HomeScaffold>
  )
}

export function FAQScreen({ navigation }: StackProps<"FAQScreen">) {
  const { t } = useTranslation()
  const items = [
    { title: t("wp09.faq.crossChainTitle"), body: t("wp09.faq.crossChainBody") },
    { title: t("wp09.faq.paymentAddressTitle"), body: t("wp09.faq.paymentAddressBody") },
    { title: t("wp09.faq.validTimeTitle"), body: t("wp09.faq.validTimeBody") },
    { title: t("wp09.faq.expireTitle"), body: t("wp09.faq.expireBody") },
  ]

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("wp09.faq.title")}>
      {items.map(item => (
        <Card key={item.title}>
          <Text style={styles.questionTitle}>{item.title}</Text>
          <Text style={styles.answerText}>{item.body}</Text>
        </Card>
      ))}
      <PrimaryButton label={t("wp09.faq.receiveDiff")} onPress={() => navigation.navigate("ReceiveDiffScreen")} />
    </HomeScaffold>
  )
}

export function ReceiveDiffScreen({ navigation }: StackProps<"ReceiveDiffScreen">) {
  const { t } = useTranslation()
  const rows = [
    [t("wp09.receiveDiff.purpose"), t("wp09.receiveDiff.individualTemporary"), t("wp09.receiveDiff.businessFixed")],
    [t("wp09.receiveDiff.feature"), t("wp09.receiveDiff.privacy"), t("wp09.receiveDiff.public")],
    [t("wp09.receiveDiff.validity"), t("wp09.receiveDiff.short"), t("wp09.receiveDiff.long")],
    [t("wp09.receiveDiff.cost"), t("wp09.receiveDiff.free"), t("wp09.receiveDiff.charge")],
  ]

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("wp09.receiveDiff.title")}>
      <Card>
        <Text style={styles.sectionLabel}>{t("wp09.receiveDiff.subtitle")}</Text>
        {rows.map(item => (
          <View key={item[0]} style={styles.diffRow}>
            <Text style={styles.diffCellLabel}>{item[0]}</Text>
            <Text style={styles.diffCell}>{item[1]}</Text>
            <Text style={styles.diffCell}>{item[2]}</Text>
          </View>
        ))}
      </Card>
    </HomeScaffold>
  )
}

export function AboutScreen({ navigation }: StackProps<"AboutScreen">) {
  const { t } = useTranslation()
  const links = [
    { title: t("wp09.about.privacy"), url: "https://support-cpcash.tawk.help/article/privacy-policy-crosspay" },
    { title: t("wp09.about.terms"), url: "https://support-cpcash.tawk.help/article/terms-of-services" },
    { title: t("wp09.about.website"), url: "https://cp.cash/" },
    { title: t("wp09.about.version"), url: "https://cpcash-1.gitbook.io/cpcash-wallet/announcement/version-update" },
  ]

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("wp09.about.title")}>
      <Card>
        <Text style={styles.brandTitle}>CPcash Wallet</Text>
      </Card>
      <Card>
        {links.map(item => (
          <Row key={item.title} label={item.title} onPress={() => void openExternalUrl(item.url)} />
        ))}
        <Row label={t("wp09.about.feedback")} onPress={() => navigation.navigate("FeedbackScreen")} />
        <Row label={t("wp09.about.licenses")} onPress={() => navigation.navigate("LicensesScreen")} />
      </Card>
    </HomeScaffold>
  )
}

export function FeedbackScreen({ navigation }: StackProps<"FeedbackScreen">) {
  const { t } = useTranslation()
  const theme = useAppTheme()
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    try {
      setLoading(true)
      await sendFeedback(content.trim())
      setContent("")
      Alert.alert(t("common.infoTitle"), t("wp09.feedback.success"))
    } catch {
      Alert.alert(t("common.errorTitle"), t("wp09.feedback.failed"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("wp09.feedback.title")}>
      <Card>
        <TextInput multiline onChangeText={setContent} placeholder={t("wp09.feedback.placeholder")} placeholderTextColor={theme.colors.mutedText} style={[styles.textarea, { color: theme.colors.text, borderColor: theme.colors.border }]} value={content} />
      </Card>
      <PrimaryButton disabled={!content.trim()} label={t("wp09.feedback.submit")} loading={loading} onPress={() => void handleSubmit()} />
    </HomeScaffold>
  )
}

export function LicensesScreen({ navigation }: StackProps<"LicensesScreen">) {
  const { t } = useTranslation()

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("wp09.about.licenses")}>
      <Card>
        <Text style={styles.answerText}>{t("wp09.licenses.body")}</Text>
      </Card>
    </HomeScaffold>
  )
}

export function UserGuideScreen({ navigation }: StackProps<"UserGuideScreen">) {
  const { t } = useTranslation()

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("wp09.guide.title")}>
      <Card>
        <Row label={t("wp09.guide.wallet")} onPress={() => navigation.navigate("WalletGuideDetailScreen")} />
        <Row label={t("wp09.guide.faq")} onPress={() => navigation.navigate("FAQGuideDetailScreen")} />
        <Row label={t("wp09.guide.knowledge")} onPress={() => navigation.navigate("KnowledgeGuideDetailScreen")} />
        <Row label={t("wp09.guide.safety")} onPress={() => navigation.navigate("SafetyGuideDetailScreen")} />
      </Card>
      <PrimaryButton label={t("wp09.help.title")} onPress={() => navigation.navigate("HelpCenterScreen")} />
    </HomeScaffold>
  )
}

function GuideListScreen(props: GuideListScreenProps) {
  const { t } = useTranslation()
  const links = getGuideLinks(props.section)

  return (
    <HomeScaffold canGoBack onBack={props.navigation.goBack} title={t(props.titleKey)}>
      <Card>
        {links.map(item => (
          <Row key={item.url} label={item.title} onPress={() => void openExternalUrl(item.url)} />
        ))}
      </Card>
    </HomeScaffold>
  )
}

export function WalletGuideDetailScreen(props: StackProps<"WalletGuideDetailScreen">) {
  return <GuideListScreen {...props} section="wallet" titleKey="wp09.guide.wallet" />
}

export function FAQGuideDetailScreen(props: StackProps<"FAQGuideDetailScreen">) {
  return <GuideListScreen {...props} section="faq" titleKey="wp09.guide.faq" />
}

export function KnowledgeGuideDetailScreen(props: StackProps<"KnowledgeGuideDetailScreen">) {
  return <GuideListScreen {...props} section="knowledge" titleKey="wp09.guide.knowledge" />
}

export function SafetyGuideDetailScreen(props: StackProps<"SafetyGuideDetailScreen">) {
  return <GuideListScreen {...props} section="safety" titleKey="wp09.guide.safety" />
}
