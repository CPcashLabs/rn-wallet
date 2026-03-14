import React, { useEffect, useMemo, useState } from "react"

import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import type { SettingsStackParamList } from "@/app/navigation/types"
import { usePersistentCountdown } from "@/features/auth/hooks/usePersistentCountdown"
import { bindInviteCode } from "@/features/auth/services/authApi"
import { getInviteBindingMessage } from "@/features/auth/utils/authMessages"
import { HomeScaffold } from "@/features/home/components/HomeScaffold"
import { getCurrentUserProfile } from "@/features/home/services/homeApi"
import { getInviteCodes, getInviteStats, validateInviteCode } from "@/features/invite/services/inviteApi"
import {
  bindEmail,
  getChainList,
  getExchangeRates,
  sendBindEmailCaptcha,
  sendFeedback,
  sendUnbindEmailCaptcha,
  unbindEmail,
  updateBackupWalletNotification,
  updateReceiptEmailNotification,
  updateRewardEmailNotification,
  updateTransferEmailNotification,
  type ExchangeRateItem,
} from "@/features/settings/services/settingsApi"
import { buildInviteQrDataUrl, getGuideLinks, openExternalUrl, type GuideSection } from "@/features/settings/utils/settingsHub"
import { getCurrentLanguage, setLanguage } from "@/shared/i18n"
import { shareAdapter } from "@/shared/native/shareAdapter"
import { getJson, getNumber, setJson, setNumber } from "@/shared/storage/kvStorage"
import { KvStorageKeys } from "@/shared/storage/sessionKeys"
import { useBalanceStore } from "@/shared/store/useBalanceStore"
import { useUserStore } from "@/shared/store/useUserStore"
import { DEFAULT_WALLET_CHAIN_ID, useWalletStore } from "@/shared/store/useWalletStore"
import { useAppTheme } from "@/shared/theme/useAppTheme"
import { resetRpcProvider } from "@/shared/web3/balanceService"

type StackProps<T extends keyof SettingsStackParamList> = NativeStackScreenProps<SettingsStackParamList, T>

type GuideScreenName =
  | "WalletGuideDetailScreen"
  | "FAQGuideDetailScreen"
  | "KnowledgeGuideDetailScreen"
  | "SafetyGuideDetailScreen"

type GuideListScreenProps = NativeStackScreenProps<SettingsStackParamList, GuideScreenName> & {
  section: GuideSection
  titleKey: string
}

const DEFAULT_RATES: ExchangeRateItem[] = [
  { currency: "USD", value: "1", symbol: "$" },
  { currency: "CNY", value: "7.2", symbol: "¥" },
  { currency: "EUR", value: "0.92", symbol: "€" },
]

const LOCAL_NODE_MAP: Record<string, string[]> = {
  "199": ["https://rpc.bt.io/", "https://rpc.bittorrentchain.io"],
  "1029": ["https://pre-rpc.bt.io/", "https://pre-rpc.bittorrentchain.io/"],
}

function Card(props: { children: React.ReactNode }) {
  const theme = useAppTheme()
  return <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>{props.children}</View>
}

function Row(props: { label: string; detail?: string; onPress?: () => void; children?: React.ReactNode }) {
  const theme = useAppTheme()

  return (
    <Pressable disabled={!props.onPress} onPress={props.onPress} style={styles.row}>
      <View style={styles.rowMain}>
        <Text style={[styles.rowLabel, { color: theme.colors.text }]}>{props.label}</Text>
        {props.detail ? <Text style={[styles.rowDetail, { color: theme.colors.mutedText }]}>{props.detail}</Text> : null}
      </View>
      {props.children ?? (props.onPress ? <Text style={[styles.rowArrow, { color: theme.colors.mutedText }]}>›</Text> : null)}
    </Pressable>
  )
}

function PrimaryButton(props: { label: string; disabled?: boolean; loading?: boolean; onPress: () => void }) {
  return (
    <Pressable disabled={props.disabled || props.loading} onPress={props.onPress} style={[styles.primaryButton, (props.disabled || props.loading) && styles.buttonDisabled]}>
      {props.loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>{props.label}</Text>}
    </Pressable>
  )
}

function useProfileRefresh() {
  const mergeRemoteProfile = useUserStore(state => state.mergeRemoteProfile)

  return async () => {
    const profile = await getCurrentUserProfile()
    mergeRemoteProfile(profile)
    return profile
  }
}

export function EmailNotificationScreen({ navigation }: StackProps<"EmailNotificationScreen">) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const profile = useUserStore(state => state.profile)
  const patchProfile = useUserStore(state => state.patchProfile)
  const refreshProfile = useProfileRefresh()

  const toggleActions = {
    transfer: updateTransferEmailNotification,
    receipt: updateReceiptEmailNotification,
    backup: updateBackupWalletNotification,
    reward: updateRewardEmailNotification,
  }

  const togglePatches = {
    transfer: (value: boolean) => ({ transferEmailNotifyEnable: value }),
    receipt: (value: boolean) => ({ receiptEmailNotifyEnable: value }),
    backup: (value: boolean) => ({ backupWalletNotifyEnable: value }),
    reward: (value: boolean) => ({ rewardEmailNotifyEnable: value }),
  }

  const handleToggle = async (field: keyof typeof toggleActions, nextValue: boolean) => {
    try {
      await toggleActions[field](nextValue)
      patchProfile(togglePatches[field](nextValue))
      await refreshProfile()
    } catch {
      Alert.alert(t("common.errorTitle"), t("wp09.common.saveFailed"))
    }
  }

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("wp09.email.notificationTitle")}>
      <Card>
        <Row label={t("wp09.email.transferNotify")}>
          <Switch onValueChange={value => void handleToggle("transfer", value)} thumbColor="#FFFFFF" trackColor={{ false: "#CBD5E1", true: theme.colors.primary }} value={Boolean(profile?.transferEmailNotifyEnable)} />
        </Row>
        <Row label={t("wp09.email.receiptNotify")}>
          <Switch onValueChange={value => void handleToggle("receipt", value)} thumbColor="#FFFFFF" trackColor={{ false: "#CBD5E1", true: theme.colors.primary }} value={Boolean(profile?.receiptEmailNotifyEnable)} />
        </Row>
        <Row label={t("wp09.email.backupNotify")}>
          <Switch onValueChange={value => void handleToggle("backup", value)} thumbColor="#FFFFFF" trackColor={{ false: "#CBD5E1", true: theme.colors.primary }} value={Boolean(profile?.backupWalletNotifyEnable)} />
        </Row>
        <Row label={t("wp09.email.rewardNotify")}>
          <Switch onValueChange={value => void handleToggle("reward", value)} thumbColor="#FFFFFF" trackColor={{ false: "#CBD5E1", true: theme.colors.primary }} value={Boolean(profile?.rewardEmailNotifyEnable)} />
        </Row>
      </Card>
    </HomeScaffold>
  )
}

export function EmailHomeScreen({ navigation }: StackProps<"EmailHomeScreen">) {
  const { t } = useTranslation()
  const profile = useUserStore(state => state.profile)
  const [email, setEmail] = useState(profile?.email ?? "")
  const [loading, setLoading] = useState(false)
  const emailValid = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)

  if (profile?.email) {
    return (
      <HomeScaffold canGoBack onBack={navigation.goBack} title={t("wp09.email.title")}>
        <Card>
          <Text style={styles.centerMuted}>{t("wp09.email.currentBound")}</Text>
          <Text style={styles.emailValue}>{profile.email}</Text>
        </Card>
        <PrimaryButton label={t("wp09.email.unbindAction")} onPress={() => navigation.navigate("EmailUnbindScreen")} />
      </HomeScaffold>
    )
  }

  const handleNext = async () => {
    try {
      setLoading(true)
      await sendBindEmailCaptcha(email.trim())
      setNumber(KvStorageKeys.EmailBindCountdownEndAt, Date.now() + 60_000)
      navigation.navigate("VerifyEmailScreen", { email: email.trim() })
    } catch {
      Alert.alert(t("common.errorTitle"), t("wp09.email.sendCodeFailed"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("wp09.email.title")}>
      <Card>
        <Text style={styles.sectionLabel}>{t("wp09.email.inputLabel")}</Text>
        <TextInput autoCapitalize="none" keyboardType="email-address" onChangeText={setEmail} placeholder={t("wp09.email.placeholder")} style={styles.input} value={email} />
        {!emailValid && email.length > 0 ? <Text style={styles.errorText}>{t("wp09.email.invalid")}</Text> : null}
      </Card>
      <PrimaryButton disabled={!emailValid} label={t("common.next")} loading={loading} onPress={() => void handleNext()} />
    </HomeScaffold>
  )
}

export function EmailBindedScreen({ navigation }: StackProps<"EmailBindedScreen">) {
  const { t } = useTranslation()
  const profile = useUserStore(state => state.profile)

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("wp09.email.title")}>
      <Card>
        <Text style={styles.centerMuted}>{t("wp09.email.currentBound")}</Text>
        <Text style={styles.emailValue}>{profile?.email}</Text>
      </Card>
      <PrimaryButton label={t("wp09.email.unbindAction")} onPress={() => navigation.navigate("EmailUnbindScreen")} />
    </HomeScaffold>
  )
}

export function EmailUnbindScreen({ navigation }: StackProps<"EmailUnbindScreen">) {
  const { t } = useTranslation()
  const profile = useUserStore(state => state.profile)
  const refreshProfile = useProfileRefresh()
  const [code, setCode] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [sending, setSending] = useState(false)
  const countdown = usePersistentCountdown(KvStorageKeys.EmailUnbindCountdownEndAt, 60_000)

  const handleSend = async () => {
    try {
      setSending(true)
      await sendUnbindEmailCaptcha(profile?.email ?? "")
      countdown.start()
      Alert.alert(t("common.infoTitle"), t("wp09.email.codeSent"))
    } catch {
      Alert.alert(t("common.errorTitle"), t("wp09.email.sendCodeFailed"))
    } finally {
      setSending(false)
    }
  }

  const handleConfirm = async () => {
    try {
      setSubmitting(true)
      await unbindEmail({ email: profile?.email ?? "", captcha: code.trim() })
      await refreshProfile()
      navigation.navigate("SettingsHomeScreen")
    } catch {
      Alert.alert(t("common.errorTitle"), t("wp09.email.unbindFailed"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("wp09.email.unbindTitle")}>
      <Card>
        <Text style={styles.centerMuted}>{t("wp09.email.currentBound")}</Text>
        <Text style={styles.emailValue}>{profile?.email}</Text>
        <TextInput keyboardType="number-pad" maxLength={6} onChangeText={setCode} placeholder={t("wp09.email.codePlaceholder")} style={styles.input} value={code} />
        <Pressable disabled={countdown.isActive || sending} onPress={() => void handleSend()} style={styles.inlineTextButton}>
          <Text style={styles.inlineTextButtonLabel}>{countdown.isActive ? t("wp09.email.resendCountdown", { sec: countdown.secondsLeft }) : t("wp09.email.sendCode")}</Text>
        </Pressable>
      </Card>
      <PrimaryButton disabled={code.length !== 6} label={t("common.confirm")} loading={submitting} onPress={() => void handleConfirm()} />
    </HomeScaffold>
  )
}

export function VerifyEmailScreen({ navigation, route }: StackProps<"VerifyEmailScreen">) {
  const { t } = useTranslation()
  const refreshProfile = useProfileRefresh()
  const [code, setCode] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [sending, setSending] = useState(false)
  const countdown = usePersistentCountdown(KvStorageKeys.EmailBindCountdownEndAt, 60_000)

  const handleSubmit = async () => {
    try {
      setSubmitting(true)
      await bindEmail({ email: route.params.email, captcha: code.trim() })
      await refreshProfile()
      navigation.navigate("SettingsHomeScreen")
    } catch {
      Alert.alert(t("common.errorTitle"), t("wp09.email.bindFailed"))
    } finally {
      setSubmitting(false)
    }
  }

  const handleResend = async () => {
    try {
      setSending(true)
      await sendBindEmailCaptcha(route.params.email)
      countdown.start()
      Alert.alert(t("common.infoTitle"), t("wp09.email.codeSent"))
    } catch {
      Alert.alert(t("common.errorTitle"), t("wp09.email.sendCodeFailed"))
    } finally {
      setSending(false)
    }
  }

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("wp09.email.verifyTitle")}>
      <Card>
        <Text style={styles.sectionLabel}>{t("wp09.email.verifySentTo")}</Text>
        <Text style={styles.emailValue}>{route.params.email}</Text>
        <TextInput keyboardType="number-pad" maxLength={6} onChangeText={setCode} placeholder={t("wp09.email.codePlaceholder")} style={styles.input} value={code} />
        <Pressable disabled={countdown.isActive || sending} onPress={() => void handleResend()} style={styles.inlineTextButton}>
          <Text style={styles.inlineTextButtonLabel}>{countdown.isActive ? t("wp09.email.resendCountdown", { sec: countdown.secondsLeft }) : t("wp09.email.resend")}</Text>
        </Pressable>
      </Card>
      <PrimaryButton disabled={code.length !== 6} label={t("common.confirm")} loading={submitting} onPress={() => void handleSubmit()} />
    </HomeScaffold>
  )
}

export function LanguageScreen({ navigation }: StackProps<"LanguageScreen">) {
  const { t } = useTranslation()
  const currentLanguage = getCurrentLanguage()

  const handleSelect = async (language: "zh-CN" | "en-US") => {
    await setLanguage(language)
    navigation.goBack()
  }

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("wp09.language.title")}>
      <Card>
        <Row detail={currentLanguage === "zh-CN" ? t("wp09.language.selected") : undefined} label={t("home.settings.languageOptions.zh-CN")} onPress={() => void handleSelect("zh-CN")} />
        <Row detail={currentLanguage === "en-US" ? t("wp09.language.selected") : undefined} label={t("home.settings.languageOptions.en-US")} onPress={() => void handleSelect("en-US")} />
      </Card>
    </HomeScaffold>
  )
}

export function UnitScreen({ navigation }: StackProps<"UnitScreen">) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [rates, setRates] = useState<ExchangeRateItem[]>(DEFAULT_RATES)
  const [selectedCurrency, setSelectedCurrency] = useState<ExchangeRateItem>(() => getJson<ExchangeRateItem>(KvStorageKeys.SelectedCurrency) ?? DEFAULT_RATES[0])

  useEffect(() => {
    void (async () => {
      try {
        const response = await getExchangeRates()
        if (response.length > 0) {
          setRates(response)
        }
      } catch {
        setRates(DEFAULT_RATES)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const handleSave = () => {
    setJson(KvStorageKeys.SelectedCurrency, selectedCurrency)
    navigation.goBack()
  }

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} right={<Pressable onPress={handleSave}><Text style={styles.headerLink}>{t("wp09.common.save")}</Text></Pressable>} title={t("wp09.unit.title")}>
      {loading ? <ActivityIndicator /> : null}
      <Card>
        {rates.map(item => (
          <Row detail={selectedCurrency.currency === item.currency ? t("wp09.language.selected") : undefined} key={item.currency} label={`${item.currency} (${item.symbol})`} onPress={() => setSelectedCurrency(item)} />
        ))}
      </Card>
    </HomeScaffold>
  )
}

export function NodeSetupScreen({ navigation }: StackProps<"NodeSetupScreen">) {
  const { t } = useTranslation()
  const walletChainId = useWalletStore(state => state.chainId) ?? DEFAULT_WALLET_CHAIN_ID
  const loadCoins = useBalanceStore(state => state.loadCoins)
  const clearBalance = useBalanceStore(state => state.clear)
  const [nodes, setNodes] = useState<string[]>(LOCAL_NODE_MAP[String(walletChainId)] ?? LOCAL_NODE_MAP["199"])
  const [selectedIndex, setSelectedIndex] = useState(getNumber(KvStorageKeys.WalletRpcIndex) ?? 0)

  useEffect(() => {
    void (async () => {
      try {
        const chains = await getChainList()
        const current = chains.find(item => item.chainId === String(walletChainId))
        if (current?.rpcUrls?.length) {
          setNodes(current.rpcUrls)
        }
      } catch {
        setNodes(LOCAL_NODE_MAP[String(walletChainId)] ?? LOCAL_NODE_MAP["199"])
      }
    })()
  }, [walletChainId])

  const handleSelect = (index: number) => {
    setSelectedIndex(index)
    setNumber(KvStorageKeys.WalletRpcIndex, index)
    resetRpcProvider(walletChainId)
    clearBalance()
    void loadCoins(walletChainId)
  }

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("wp09.node.title")}>
      <Card>
        <Text style={styles.sectionLabel}>{t("wp09.node.description")}</Text>
        {nodes.map((node, index) => (
          <Row detail={selectedIndex === index ? t("wp09.language.selected") : t("wp09.node.nodeDetail", { index: index + 1 })} key={node} label={node} onPress={() => handleSelect(index)} />
        ))}
      </Card>
    </HomeScaffold>
  )
}

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

export function InviteHomeScreen({ navigation }: StackProps<"InviteHomeScreen">) {
  const { t } = useTranslation()
  const profile = useUserStore(state => state.profile)
  const [inviteCodes, setInviteCodes] = useState<Array<{ inviteCode: string; level: number }>>([])
  const [loading, setLoading] = useState(true)
  const [qrData, setQrData] = useState<string | null>(null)
  const [selectedLevel, setSelectedLevel] = useState(getNumber(KvStorageKeys.SelectedInviteLevel) ?? 1)

  useEffect(() => {
    void (async () => {
      try {
        setInviteCodes(await getInviteCodes())
      } catch {
        setInviteCodes([])
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  useEffect(() => {
    if (inviteCodes.length === 0) {
      return
    }

    if (inviteCodes.some(item => item.level === selectedLevel)) {
      return
    }

    const nextLevel = inviteCodes[0]?.level ?? 1
    setSelectedLevel(nextLevel)
    setNumber(KvStorageKeys.SelectedInviteLevel, nextLevel)
  }, [inviteCodes, selectedLevel])

  const selectedInviteCode = useMemo(() => {
    return inviteCodes.find(item => item.level === selectedLevel)?.inviteCode ?? inviteCodes[0]?.inviteCode ?? ""
  }, [inviteCodes, selectedLevel])

  const inviteUrl = useMemo(() => {
    return `https://cp.cash/invite?inviter=${encodeURIComponent(profile?.nickname ?? "CPCash")}&code=${encodeURIComponent(selectedInviteCode)}`
  }, [profile?.nickname, selectedInviteCode])

  useEffect(() => {
    if (!selectedInviteCode) {
      setQrData(null)
      return
    }

    void buildInviteQrDataUrl(inviteUrl).then(setQrData).catch(() => setQrData(null))
  }, [inviteUrl, selectedInviteCode])

  const handleLevel = (level: number) => {
    setSelectedLevel(level)
    setNumber(KvStorageKeys.SelectedInviteLevel, level)
  }

  const handleShare = async () => {
    if (!selectedInviteCode) {
      Alert.alert(t("common.infoTitle"), t("wp09.invite.empty"))
      return
    }

    const result = await shareAdapter.share({
      title: t("wp09.invite.title"),
      message: `${t("wp09.invite.shareMessage")} ${selectedInviteCode}`,
      url: inviteUrl,
    })

    if (!result.ok) {
      Alert.alert(t("common.errorTitle"), t("wp09.invite.shareFailed"))
    }
  }

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("wp09.invite.title")}>
      <Card>
        <Text style={styles.brandTitle}>{t("wp09.invite.hero")}</Text>
        <Text style={styles.centerMuted}>{t("wp09.invite.levelLabel", { level: selectedLevel })}</Text>
        {loading ? <ActivityIndicator /> : null}
        {!loading && inviteCodes.length === 0 ? <Text style={styles.helperText}>{t("wp09.invite.empty")}</Text> : null}
        <View style={styles.levelRow}>
          {(inviteCodes.length > 0 ? inviteCodes.map(item => item.level) : [1, 2, 3, 4, 5]).map(level => (
            <Pressable key={level} onPress={() => handleLevel(level)} style={[styles.levelChip, selectedLevel === level && styles.levelChipActive]}>
              <Text style={[styles.levelChipText, selectedLevel === level && styles.levelChipTextActive]}>{level}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.sectionLabel}>{t("wp09.invite.code")}</Text>
        <Text style={styles.emailValue}>{selectedInviteCode || "--"}</Text>
        <Text style={styles.helperText}>{inviteUrl}</Text>
        {qrData ? <Image source={{ uri: qrData }} style={styles.qrImage} /> : null}
      </Card>
      <PrimaryButton label={t("wp09.invite.share")} onPress={() => void handleShare()} />
      <Card>
        <Row label={t("wp09.invite.bindCode")} onPress={() => navigation.navigate("InviteCodeScreen")} />
        <Row label={t("wp09.invite.promotion")} onPress={() => navigation.navigate("InvitePromotionScreen")} />
        <Row label={t("wp09.invite.howItWorks")} onPress={() => navigation.navigate("InviteHowItWorksScreen")} />
      </Card>
    </HomeScaffold>
  )
}

export function InviteCodeScreen({ navigation }: StackProps<"InviteCodeScreen">) {
  const { t } = useTranslation()
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)

  const handleBind = async () => {
    try {
      setLoading(true)
      const valid = await validateInviteCode(code.trim())
      if (!valid) {
        Alert.alert(t("common.errorTitle"), t("wp09.invite.invalid"))
        return
      }

      await bindInviteCode(code.trim())
      useUserStore.getState().patchProfile({ inviteBound: true })
      navigation.navigate("InviteHomeScreen")
    } catch (error) {
      Alert.alert(t("common.errorTitle"), getInviteBindingMessage(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("wp09.invite.bindTitle")}>
      <Card>
        <TextInput autoCapitalize="characters" maxLength={6} onChangeText={setCode} placeholder={t("wp09.invite.codePlaceholder")} style={styles.input} value={code} />
      </Card>
      <PrimaryButton disabled={code.trim().length !== 6} label={t("common.confirm")} loading={loading} onPress={() => void handleBind()} />
    </HomeScaffold>
  )
}

export function InvitePromotionScreen({ navigation }: StackProps<"InvitePromotionScreen">) {
  const { t } = useTranslation()
  const [stats, setStats] = useState<Array<{ relationLevel: number; number: number; orderCount: number }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      try {
        setStats(await getInviteStats())
      } catch {
        setStats([])
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("wp09.invite.promotion")}>
      <Card>
        <View style={styles.tableHeader}>
          <Text style={styles.tableHeadCell}>{t("wp09.invite.level")}</Text>
          <Text style={styles.tableHeadCell}>{t("wp09.invite.memberCount")}</Text>
          <Text style={styles.tableHeadCell}>{t("wp09.invite.orderCount")}</Text>
        </View>
        {loading ? <ActivityIndicator /> : null}
        {!loading && stats.length === 0 ? <Text style={styles.helperText}>{t("wp09.invite.promotionEmpty")}</Text> : null}
        {stats.map(item => (
          <View key={item.relationLevel} style={styles.tableRow}>
            <Text style={styles.tableCell}>{item.relationLevel}</Text>
            <Text style={styles.tableCell}>{item.number}</Text>
            <Text style={styles.tableCell}>{item.orderCount}</Text>
          </View>
        ))}
      </Card>
    </HomeScaffold>
  )
}

export function InviteHowItWorksScreen({ navigation }: StackProps<"InviteHowItWorksScreen">) {
  const { t } = useTranslation()
  const bullets = [t("wp09.invite.rule1"), t("wp09.invite.rule2"), t("wp09.invite.rule3"), t("wp09.invite.rule4"), t("wp09.invite.rule5")]

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("wp09.invite.howItWorks")}>
      <Card>
        {bullets.map(item => (
          <View key={item} style={styles.bulletRow}>
            <Text style={styles.bulletDot}>•</Text>
            <Text style={styles.answerText}>{item}</Text>
          </View>
        ))}
      </Card>
    </HomeScaffold>
  )
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  row: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  rowMain: {
    flex: 1,
    gap: 4,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  rowDetail: {
    fontSize: 12,
  },
  rowArrow: {
    fontSize: 18,
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: "#0F766E",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
  },
  input: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#CBD5E1",
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#0F172A",
    backgroundColor: "#FFFFFF",
  },
  textarea: {
    minHeight: 140,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    textAlignVertical: "top",
    backgroundColor: "#FFFFFF",
  },
  errorText: {
    color: "#DC2626",
    fontSize: 12,
  },
  helperText: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 18,
  },
  centerMuted: {
    textAlign: "center",
    fontSize: 13,
    color: "#64748B",
  },
  emailValue: {
    textAlign: "center",
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
  },
  inlineTextButton: {
    alignSelf: "flex-end",
  },
  inlineTextButtonLabel: {
    color: "#0F766E",
    fontWeight: "700",
  },
  headerLink: {
    color: "#0F766E",
    fontWeight: "700",
    fontSize: 14,
  },
  questionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  answerText: {
    fontSize: 14,
    lineHeight: 22,
    color: "#334155",
    flex: 1,
  },
  diffRow: {
    flexDirection: "row",
    gap: 8,
  },
  diffCellLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
  },
  diffCell: {
    flex: 1,
    fontSize: 13,
    color: "#334155",
  },
  brandTitle: {
    textAlign: "center",
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
  },
  levelRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  levelChip: {
    minWidth: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  levelChipActive: {
    backgroundColor: "#0F766E",
    borderColor: "#0F766E",
  },
  levelChipText: {
    color: "#0F172A",
    fontWeight: "700",
  },
  levelChipTextActive: {
    color: "#FFFFFF",
  },
  qrImage: {
    alignSelf: "center",
    width: 180,
    height: 180,
    borderRadius: 12,
  },
  tableHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#CBD5E1",
  },
  tableHeadCell: {
    flex: 1,
    textAlign: "center",
    fontWeight: "700",
    color: "#475569",
  },
  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E2E8F0",
  },
  tableCell: {
    flex: 1,
    textAlign: "center",
    color: "#0F172A",
  },
  bulletRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
  },
  bulletDot: {
    fontSize: 18,
    lineHeight: 22,
    color: "#0F766E",
  },
})
