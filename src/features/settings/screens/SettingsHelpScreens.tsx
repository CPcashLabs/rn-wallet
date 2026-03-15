import React, { useState } from "react"

import { Text, View } from "react-native"
import { useTranslation } from "react-i18next"

import { HomeScaffold } from "@/features/home/components/HomeScaffold"
import { sendFeedback } from "@/features/settings/services/settingsApi"
import { getGuideLinks, openExternalUrl } from "@/features/settings/utils/settingsHub"
import { useErrorPresenter } from "@/shared/errors/useErrorPresenter"
import { useAppTheme } from "@/shared/theme/useAppTheme"
import { useToast } from "@/shared/toast/useToast"
import { AppleBrandMark } from "@/shared/ui/AppleBrandMark"
import { AppTextField } from "@/shared/ui/AppTextField"

import {
  Card,
  type GuideListScreenProps,
  type HelpStackProps,
  ListCard,
  PrimaryButton,
  Row,
  type StackProps,
  styles,
} from "@/features/settings/screens/settingsShared"

export function HelpCenterScreen({ navigation }: HelpStackProps<"HelpCenterScreen">) {
  const { t } = useTranslation()
  const theme = useAppTheme()

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("settingsHub.help.title")}>
      <Card>
        <Text style={[styles.sectionLabel, { color: theme.colors.mutedText }]}>{t("settingsHub.help.needHelp")}</Text>
        <PrimaryButton label="Telegram" onPress={() => void openExternalUrl("https://t.me/CPcashWallet")} />
        <Text style={[styles.emailValue, { color: theme.colors.text }]}>support@cp.cash</Text>
      </Card>
      <ListCard>
        <Row icon="help" label={t("settingsHub.help.faq")} onPress={() => navigation.navigate("FAQScreen")} />
        <Row hideDivider icon="book" label={t("settingsHub.help.userGuide")} onPress={() => navigation.navigate("UserGuideScreen")} />
      </ListCard>
    </HomeScaffold>
  )
}

export function FAQScreen({ navigation }: HelpStackProps<"FAQScreen">) {
  const { t } = useTranslation()
  const theme = useAppTheme()
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
          <Text style={[styles.questionTitle, { color: theme.colors.text }]}>{item.title}</Text>
          <Text style={[styles.answerText, { color: theme.colors.mutedText }]}>{item.body}</Text>
        </Card>
      ))}
      <PrimaryButton label={t("settingsHub.faq.receiveDiff")} onPress={() => navigation.navigate("ReceiveDiffScreen")} />
    </HomeScaffold>
  )
}

export function ReceiveDiffScreen({ navigation }: HelpStackProps<"ReceiveDiffScreen">) {
  const { t } = useTranslation()
  const theme = useAppTheme()
  const rows = [
    [t("settingsHub.receiveDiff.purpose"), t("settingsHub.receiveDiff.individualTemporary"), t("settingsHub.receiveDiff.businessFixed")],
    [t("settingsHub.receiveDiff.feature"), t("settingsHub.receiveDiff.privacy"), t("settingsHub.receiveDiff.public")],
    [t("settingsHub.receiveDiff.validity"), t("settingsHub.receiveDiff.short"), t("settingsHub.receiveDiff.long")],
    [t("settingsHub.receiveDiff.cost"), t("settingsHub.receiveDiff.free"), t("settingsHub.receiveDiff.charge")],
  ]

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("settingsHub.receiveDiff.title")}>
      <Card>
        <Text style={[styles.sectionLabel, { color: theme.colors.mutedText }]}>{t("settingsHub.receiveDiff.subtitle")}</Text>
        {rows.map(item => (
          <View key={item[0]} style={styles.diffRow}>
            <Text style={[styles.diffCellLabel, { color: theme.colors.text }]}>{item[0]}</Text>
            <Text style={[styles.diffCell, { color: theme.colors.mutedText }]}>{item[1]}</Text>
            <Text style={[styles.diffCell, { color: theme.colors.mutedText }]}>{item[2]}</Text>
          </View>
        ))}
      </Card>
    </HomeScaffold>
  )
}

export function AboutScreen({ navigation }: StackProps<"AboutScreen">) {
  const { t } = useTranslation()
  const theme = useAppTheme()
  const links = [
    { title: t("settingsHub.about.privacy"), url: "https://support-cpcash.tawk.help/article/privacy-policy-crosspay" },
    { title: t("settingsHub.about.terms"), url: "https://support-cpcash.tawk.help/article/terms-of-services" },
    { title: t("settingsHub.about.website"), url: "https://cp.cash/" },
    { title: t("settingsHub.about.version"), url: "https://cpcash-1.gitbook.io/cpcash-wallet/announcement/version-update" },
  ]

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("settingsHub.about.title")}>
      <Card>
        <View style={localStyles.brandCard}>
          <AppleBrandMark size={60} tone="light" />
          <Text style={[styles.brandTitle, { color: theme.colors.text }]}>CPcash Wallet</Text>
          <Text style={[localStyles.brandBody, { color: theme.colors.mutedText }]}>Apple-style wallet workspace</Text>
        </View>
      </Card>
      <ListCard>
        {links.map(item => (
          <Row icon="info" key={item.title} label={item.title} onPress={() => void openExternalUrl(item.url)} />
        ))}
        <Row icon="edit" label={t("settingsHub.about.feedback")} onPress={() => navigation.navigate("FeedbackScreen")} />
        <Row hideDivider icon="book" label={t("settingsHub.about.licenses")} onPress={() => navigation.navigate("LicensesScreen")} />
      </ListCard>
    </HomeScaffold>
  )
}

export function FeedbackScreen({ navigation }: StackProps<"FeedbackScreen">) {
  const { t } = useTranslation()
  const { presentError } = useErrorPresenter()
  const { showToast } = useToast()
  const theme = useAppTheme()
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    try {
      setLoading(true)
      await sendFeedback(content.trim())
      setContent("")
      showToast({ message: t("settingsHub.feedback.success"), tone: "success" })
    } catch (error) {
      presentError(error, {
        fallbackKey: "settingsHub.feedback.failed",
        mode: "toast",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("settingsHub.feedback.title")}>
      <Card>
        <AppTextField
          backgroundTone="background"
          multiline
          onChangeText={setContent}
          placeholder={t("settingsHub.feedback.placeholder")}
          value={content}
        />
      </Card>
      <Text style={[localStyles.feedbackHint, { color: theme.colors.mutedText }]}>iOS-style feedback card with concise, focused notes works best.</Text>
      <PrimaryButton disabled={!content.trim()} label={t("settingsHub.feedback.submit")} loading={loading} onPress={() => void handleSubmit()} />
    </HomeScaffold>
  )
}

export function LicensesScreen({ navigation }: StackProps<"LicensesScreen">) {
  const { t } = useTranslation()
  const theme = useAppTheme()

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("settingsHub.about.licenses")}>
      <Card>
        <Text style={[styles.answerText, { color: theme.colors.mutedText }]}>{t("settingsHub.licenses.body")}</Text>
      </Card>
    </HomeScaffold>
  )
}

export function UserGuideScreen({ navigation }: HelpStackProps<"UserGuideScreen">) {
  const { t } = useTranslation()

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("settingsHub.guide.title")}>
      <ListCard>
        <Row icon="wallet" label={t("settingsHub.guide.wallet")} onPress={() => navigation.navigate("WalletGuideDetailScreen")} />
        <Row icon="help" label={t("settingsHub.guide.faq")} onPress={() => navigation.navigate("FAQGuideDetailScreen")} />
        <Row icon="book" label={t("settingsHub.guide.knowledge")} onPress={() => navigation.navigate("KnowledgeGuideDetailScreen")} />
        <Row hideDivider icon="lock" label={t("settingsHub.guide.safety")} onPress={() => navigation.navigate("SafetyGuideDetailScreen")} />
      </ListCard>
      <PrimaryButton label={t("settingsHub.help.title")} onPress={() => navigation.navigate("HelpCenterScreen")} />
    </HomeScaffold>
  )
}

function GuideListScreen(props: GuideListScreenProps) {
  const { t } = useTranslation()
  const links = getGuideLinks(props.section)

  return (
    <HomeScaffold canGoBack onBack={props.navigation.goBack} title={t(props.titleKey)}>
      <ListCard>
        {links.map(item => (
          <Row hideDivider={item.url === links[links.length - 1]?.url} icon="book" key={item.url} label={item.title} onPress={() => void openExternalUrl(item.url)} />
        ))}
      </ListCard>
    </HomeScaffold>
  )
}

export function WalletGuideDetailScreen(props: HelpStackProps<"WalletGuideDetailScreen">) {
  return <GuideListScreen {...props} section="wallet" titleKey="settingsHub.guide.wallet" />
}

export function FAQGuideDetailScreen(props: HelpStackProps<"FAQGuideDetailScreen">) {
  return <GuideListScreen {...props} section="faq" titleKey="settingsHub.guide.faq" />
}

export function KnowledgeGuideDetailScreen(props: HelpStackProps<"KnowledgeGuideDetailScreen">) {
  return <GuideListScreen {...props} section="knowledge" titleKey="settingsHub.guide.knowledge" />
}

export function SafetyGuideDetailScreen(props: HelpStackProps<"SafetyGuideDetailScreen">) {
  return <GuideListScreen {...props} section="safety" titleKey="settingsHub.guide.safety" />
}

const localStyles = {
  brandCard: {
    alignItems: "center" as const,
    gap: 12,
    paddingVertical: 8,
  },
  brandBody: {
    fontSize: 13,
    lineHeight: 20,
  },
  feedbackHint: {
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: 4,
  },
}
