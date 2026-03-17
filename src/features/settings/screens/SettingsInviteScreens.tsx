import React, { useEffect, useMemo, useState } from "react"

import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"

import { bindInviteCode } from "@/features/auth/services/authApi"
import { getInviteBindingMessage } from "@/features/auth/utils/authMessages"
import { HomeScaffold } from "@/features/home/components/HomeScaffold"
import { getInviteCodes, getInviteStats, validateInviteCode } from "@/features/invite/services/inviteApi"
import { buildInviteQrDataUrl } from "@/features/settings/utils/settingsHub"
import { useErrorPresenter } from "@/shared/errors/useErrorPresenter"
import { shareAdapter } from "@/shared/native/shareAdapter"
import { getNumber, setNumber } from "@/shared/storage/kvStorage"
import { KvStorageKeys } from "@/shared/storage/sessionKeys"
import { useUserStore } from "@/shared/store/useUserStore"
import { useToast } from "@/shared/toast/useToast"
import { AppTextField } from "@/shared/ui/AppTextField"

import { Card, ListCard, PrimaryButton, Row, type StackProps, styles } from "@/features/settings/screens/settingsShared"

export function InviteHomeScreen({ navigation }: StackProps<"InviteHomeScreen">) {
  const { t } = useTranslation()
  const { presentError, presentMessage } = useErrorPresenter()
  const { showToast } = useToast()
  const profile = useUserStore(state => state.profile)
  const [inviteCodes, setInviteCodes] = useState<Array<{ inviteCode: string; level: number }>>([])
  const [loading, setLoading] = useState(true)
  const [qrData, setQrData] = useState<string | null>(null)
  const [selectedLevel, setSelectedLevel] = useState(getNumber(KvStorageKeys.SelectedInviteLevel) ?? 1)

  useEffect(() => {
    void (async () => {
      try {
        setInviteCodes(await getInviteCodes())
      } catch (error) {
        setInviteCodes([])
        presentError(error, {
          fallbackKey: "settingsHub.invite.empty",
          mode: "toast",
          tone: "warning",
          preferApiMessage: false,
          preferErrorMessage: false,
        })
      } finally {
        setLoading(false)
      }
    })()
  }, [presentError])

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
      showToast({ message: t("settingsHub.invite.empty"), tone: "warning" })
      return
    }

    const result = await shareAdapter.share({
      title: t("settingsHub.invite.title"),
      message: `${t("settingsHub.invite.shareMessage")} ${selectedInviteCode}`,
      url: inviteUrl,
    })

    if (!result.ok) {
      presentMessage(t("settingsHub.invite.shareFailed"))
    }
  }

  return (
    <HomeScaffold canGoBack contentContainerStyle={localStyles.page} onBack={navigation.goBack} title={t("settingsHub.invite.title")}>
      <Card>
        <View style={localStyles.hero}>
          <Text numberOfLines={2} style={[styles.brandTitle, localStyles.heroTitle]}>
            {t("settingsHub.invite.hero")}
          </Text>
          <Text style={[styles.centerMuted, localStyles.levelLabel]}>{t("settingsHub.invite.levelLabel", { level: selectedLevel })}</Text>
        </View>
        {loading ? <ActivityIndicator /> : null}
        {!loading && inviteCodes.length === 0 ? <Text style={styles.helperText}>{t("settingsHub.invite.empty")}</Text> : null}
        <View style={styles.levelRow}>
          {(inviteCodes.length > 0 ? inviteCodes.map(item => item.level) : [1, 2, 3, 4, 5]).map(level => (
            <Pressable key={level} onPress={() => handleLevel(level)} style={[styles.levelChip, selectedLevel === level && styles.levelChipActive]}>
              <Text style={[styles.levelChipText, selectedLevel === level && styles.levelChipTextActive]}>{level}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={[styles.sectionLabel, localStyles.codeLabel]}>{t("settingsHub.invite.code")}</Text>
        <Text style={[styles.emailValue, localStyles.codeValue]}>{selectedInviteCode || "--"}</Text>
        <Text numberOfLines={3} style={[styles.helperText, localStyles.inviteUrl]}>
          {inviteUrl}
        </Text>
        {qrData ? <Image source={{ uri: qrData }} style={[styles.qrImage, localStyles.qrImage]} /> : null}
      </Card>
      <PrimaryButton label={t("settingsHub.invite.share")} onPress={() => void handleShare()} />
      <ListCard>
        <Row label={t("settingsHub.invite.bindCode")} onPress={() => navigation.navigate("InviteCodeScreen")} />
        <Row label={t("settingsHub.invite.promotion")} onPress={() => navigation.navigate("InvitePromotionScreen")} />
        <Row hideDivider label={t("settingsHub.invite.howItWorks")} onPress={() => navigation.navigate("InviteHowItWorksScreen")} />
      </ListCard>
    </HomeScaffold>
  )
}

export function InviteCodeScreen({ navigation }: StackProps<"InviteCodeScreen">) {
  const { t } = useTranslation()
  const { presentMessage } = useErrorPresenter()
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)

  const handleBind = async () => {
    try {
      setLoading(true)
      const valid = await validateInviteCode(code.trim())
      if (!valid) {
        presentMessage(t("settingsHub.invite.invalid"))
        return
      }

      await bindInviteCode(code.trim())
      useUserStore.getState().patchProfile({ inviteBound: true })
      navigation.navigate("InviteHomeScreen")
    } catch (error) {
      presentMessage(getInviteBindingMessage(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("settingsHub.invite.bindTitle")}>
      <Card>
        <AppTextField
          autoCapitalize="characters"
          maxLength={6}
          onChangeText={setCode}
          placeholder={t("settingsHub.invite.codePlaceholder")}
          value={code}
        />
      </Card>
      <PrimaryButton disabled={code.trim().length !== 6} label={t("common.confirm")} loading={loading} onPress={() => void handleBind()} />
    </HomeScaffold>
  )
}

export function InvitePromotionScreen({ navigation }: StackProps<"InvitePromotionScreen">) {
  const { t } = useTranslation()
  const { presentError } = useErrorPresenter()
  const [stats, setStats] = useState<Array<{ relationLevel: number; number: number; orderCount: number }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      try {
        setStats(await getInviteStats())
      } catch (error) {
        setStats([])
        presentError(error, {
          fallbackKey: "settingsHub.invite.promotionEmpty",
          mode: "toast",
          tone: "warning",
          preferApiMessage: false,
          preferErrorMessage: false,
        })
      } finally {
        setLoading(false)
      }
    })()
  }, [presentError])

  return (
    <HomeScaffold canGoBack contentContainerStyle={localStyles.page} onBack={navigation.goBack} title={t("settingsHub.invite.promotion")}>
      <Card>
        <View style={styles.tableHeader}>
          <Text style={styles.tableHeadCell}>{t("settingsHub.invite.level")}</Text>
          <Text style={styles.tableHeadCell}>{t("settingsHub.invite.memberCount")}</Text>
          <Text style={styles.tableHeadCell}>{t("settingsHub.invite.orderCount")}</Text>
        </View>
        {loading ? <ActivityIndicator /> : null}
        {!loading && stats.length === 0 ? <Text style={styles.helperText}>{t("settingsHub.invite.promotionEmpty")}</Text> : null}
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
  const bullets = [t("settingsHub.invite.rule1"), t("settingsHub.invite.rule2"), t("settingsHub.invite.rule3"), t("settingsHub.invite.rule4"), t("settingsHub.invite.rule5")]

  return (
    <HomeScaffold canGoBack contentContainerStyle={localStyles.page} onBack={navigation.goBack} title={t("settingsHub.invite.howItWorks")}>
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

const localStyles = StyleSheet.create({
  page: {
    gap: 16,
  },
  hero: {
    alignItems: "center",
    gap: 8,
  },
  heroTitle: {
    maxWidth: 280,
    fontSize: 19,
    lineHeight: 26,
    letterSpacing: -0.45,
  },
  levelLabel: {
    fontSize: 15,
    lineHeight: 20,
  },
  codeLabel: {
    textAlign: "center",
  },
  codeValue: {
    fontSize: 19,
    lineHeight: 24,
    letterSpacing: -0.3,
  },
  inviteUrl: {
    textAlign: "center",
    fontSize: 15,
    lineHeight: 21,
  },
  qrImage: {
    width: 168,
    height: 168,
    borderRadius: 18,
  },
})
