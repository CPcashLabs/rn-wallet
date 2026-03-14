import React, { useEffect, useMemo, useState } from "react"

import { ActivityIndicator, Alert, Image, Pressable, Text, TextInput, View } from "react-native"
import { useTranslation } from "react-i18next"

import { bindInviteCode } from "@/features/auth/services/authApi"
import { getInviteBindingMessage } from "@/features/auth/utils/authMessages"
import { HomeScaffold } from "@/features/home/components/HomeScaffold"
import { getInviteCodes, getInviteStats, validateInviteCode } from "@/features/invite/services/inviteApi"
import { buildInviteQrDataUrl } from "@/features/settings/utils/settingsHub"
import { shareAdapter } from "@/shared/native/shareAdapter"
import { getNumber, setNumber } from "@/shared/storage/kvStorage"
import { KvStorageKeys } from "@/shared/storage/sessionKeys"
import { useUserStore } from "@/shared/store/useUserStore"

import { Card, PrimaryButton, Row, type StackProps, styles } from "@/features/settings/screens/settingsShared"

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
