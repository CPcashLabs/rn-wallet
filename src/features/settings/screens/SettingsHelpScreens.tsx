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
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("settingsHub.help.title")}>
      <Card>
        <Text style={styles.sectionLabel}>{t("settingsHub.help.needHelp")}</Text>
        <PrimaryButton label="Telegram" onPress={() => void openExternalUrl("https://t.me/CPcashWallet")} />
        <Text style={styles.emailValue}>support@cp.cash</Text>
      </Card>
      <Card>
        <Row label={t("settingsHub.help.faq")} onPress={() => navigation.navigate("FAQScreen")} />
        <Row label={t("settingsHub.help.userGuide")} onPress={() => navigation.navigate("UserGuideScreen")} />
      </Card>
    </HomeScaffold>
  )
}

export function FAQScreen({ navigation }: StackProps<"FAQScreen">) {
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
          <Text style={styles.questionTitle}>{item.title}</Text>
          <Text style={styles.answerText}>{item.body}</Text>
        </Card>
      ))}
      <PrimaryButton label={t("settingsHub.faq.receiveDiff")} onPress={() => navigation.navigate("ReceiveDiffScreen")} />
    </HomeScaffold>
  )
}

export function ReceiveDiffScreen({ navigation }: StackProps<"ReceiveDiffScreen">) {
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
        <Text style={styles.sectionLabel}>{t("settingsHub.receiveDiff.subtitle")}</Text>
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
    { title: t("settingsHub.about.privacy"), url: "https://support-cpcash.tawk.help/article/privacy-policy-crosspay" },
    { title: t("settingsHub.about.terms"), url: "https://support-cpcash.tawk.help/article/terms-of-services" },
    { title: t("settingsHub.about.website"), url: "https://cp.cash/" },
    { title: t("settingsHub.about.version"), url: "https://cpcash-1.gitbook.io/cpcash-wallet/announcement/version-update" },
  ]

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("settingsHub.about.title")}>
      <Card>
        <Text style={styles.brandTitle}>CPcash Wallet</Text>
      </Card>
      <Card>
        {links.map(item => (
          <Row key={item.title} label={item.title} onPress={() => void openExternalUrl(item.url)} />
        ))}
        <Row label={t("settingsHub.about.feedback")} onPress={() => navigation.navigate("FeedbackScreen")} />
        <Row label={t("settingsHub.about.licenses")} onPress={() => navigation.navigate("LicensesScreen")} />
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
      Alert.alert(t("common.infoTitle"), t("settingsHub.feedback.success"))
    } catch {
      Alert.alert(t("common.errorTitle"), t("settingsHub.feedback.failed"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("settingsHub.feedback.title")}>
      <Card>
        <TextInput multiline onChangeText={setContent} placeholder={t("settingsHub.feedback.placeholder")} placeholderTextColor={theme.colors.mutedText} style={[styles.textarea, { color: theme.colors.text, borderColor: theme.colors.border }]} value={content} />
      </Card>
      <PrimaryButton disabled={!content.trim()} label={t("settingsHub.feedback.submit")} loading={loading} onPress={() => void handleSubmit()} />
    </HomeScaffold>
  )
}

export function LicensesScreen({ navigation }: StackProps<"LicensesScreen">) {
  const { t } = useTranslation()

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("settingsHub.about.licenses")}>
      <Card>
        <Text style={styles.answerText}>{t("settingsHub.licenses.body")}</Text>
      </Card>
    </HomeScaffold>
  )
}

export function UserGuideScreen({ navigation }: StackProps<"UserGuideScreen">) {
  const { t } = useTranslation()

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("settingsHub.guide.title")}>
      <Card>
        <Row label={t("settingsHub.guide.wallet")} onPress={() => navigation.navigate("WalletGuideDetailScreen")} />
        <Row label={t("settingsHub.guide.faq")} onPress={() => navigation.navigate("FAQGuideDetailScreen")} />
        <Row label={t("settingsHub.guide.knowledge")} onPress={() => navigation.navigate("KnowledgeGuideDetailScreen")} />
        <Row label={t("settingsHub.guide.safety")} onPress={() => navigation.navigate("SafetyGuideDetailScreen")} />
      </Card>
      <PrimaryButton label={t("settingsHub.help.title")} onPress={() => navigation.navigate("HelpCenterScreen")} />
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
  return <GuideListScreen {...props} section="wallet" titleKey="settingsHub.guide.wallet" />
}

export function FAQGuideDetailScreen(props: StackProps<"FAQGuideDetailScreen">) {
  return <GuideListScreen {...props} section="faq" titleKey="settingsHub.guide.faq" />
}

export function KnowledgeGuideDetailScreen(props: StackProps<"KnowledgeGuideDetailScreen">) {
  return <GuideListScreen {...props} section="knowledge" titleKey="settingsHub.guide.knowledge" />
}

export function SafetyGuideDetailScreen(props: StackProps<"SafetyGuideDetailScreen">) {
  return <GuideListScreen {...props} section="safety" titleKey="settingsHub.guide.safety" />
}
