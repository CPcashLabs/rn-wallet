import React, { useCallback, useEffect, useState } from "react"

import type { NativeStackScreenProps } from "@react-navigation/native-stack"
import { useTranslation } from "react-i18next"
import { Alert, Pressable, Text, TextInput, View } from "react-native"

import type { CowalletStackParamList } from "@/app/navigation/types"
import { CopouchScaffold } from "@/features/copouch/components/CopouchScaffold"
import {
  AvatarBadge,
  WalletGuard,
  bgPalette,
  loadCopouchOwnersWithGuard,
  styles,
  useCopouchWalletDetail,
} from "@/features/copouch/screens/copouchOperationShared"
import {
  updateCopouchWallet,
  type CopouchOwner,
} from "@/features/copouch/services/copouchApi"
import { useCowalletStore } from "@/features/copouch/store/useCowalletStore"
import { formatAddress } from "@/features/home/utils/format"
import { ActionRow } from "@/features/orders/components/OrdersUi"
import { PrimaryButton, SectionCard } from "@/features/transfer/components/TransferUi"
import { ApiError } from "@/shared/errors"
import { useAppTheme } from "@/shared/theme/useAppTheme"

type StackProps<T extends keyof CowalletStackParamList> = NativeStackScreenProps<CowalletStackParamList, T>

export function CowalletSettingScreen({ navigation, route }: StackProps<"CowalletSettingScreen">) {
  const { t } = useTranslation()
  const { detail, loading, invalidAccess, reload, setDetail } = useCopouchWalletDetail(route.params.id)
  const [owners, setOwners] = useState<CopouchOwner[]>([])
  const [ownersLoading, setOwnersLoading] = useState(true)

  const loadOwners = useCallback(async () => {
    setOwnersLoading(true)
    try {
      const nextOwners = await loadCopouchOwnersWithGuard(route.params.id, () => setDetail(null))
      setOwners(nextOwners)
    } finally {
      setOwnersLoading(false)
    }
  }, [route.params.id, setDetail])

  const loadAll = useCallback(async () => {
    await Promise.all([reload(), loadOwners()])
  }, [loadOwners, reload])

  useEffect(() => {
    void loadAll().catch(() => {
      Alert.alert(t("common.errorTitle"), t("copouch.setting.loadFailed"))
    })
  }, [loadAll, t])

  return (
    <CopouchScaffold canGoBack onBack={navigation.goBack} title={t("copouch.setting.title")}>
      <WalletGuard
        invalidBody={t("copouch.setting.invalidBody")}
        invalidTitle={t("copouch.setting.invalidTitle")}
        invalidAccess={invalidAccess}
        loading={loading || ownersLoading}
        loadingBody={t("copouch.setting.loading")}
      >
        {detail ? (
          <>
            <View style={[styles.heroCard, { backgroundColor: (bgPalette[detail.walletBgColor] ?? bgPalette[1]).card }]}>
              <Text style={styles.walletHeroTitle}>{detail.walletName || t("copouch.home.unnamedWallet")}</Text>
              <Text style={styles.walletHeroSub}>{formatAddress(detail.walletAddress, 10, 6)}</Text>
              <View style={styles.avatarRow}>
                {owners.slice(0, 5).map(owner => (
                  <AvatarBadge
                    key={owner.userId || owner.walletAddress}
                    avatarText={(owner.nickname || owner.walletAddress || "?").slice(0, 1).toUpperCase()}
                    label={owner.nickname || t("copouch.member.unknown")}
                  />
                ))}
              </View>
            </View>

            <SectionCard>
              <ActionRow
                body={t("copouch.setting.memberCount", { count: detail.ownerCount })}
                label={t("copouch.setting.members")}
                onPress={() => navigation.navigate("CowalletMemberScreen", { id: route.params.id })}
              />
              <ActionRow
                body={t("copouch.setting.remindBody", { count: detail.eventMessageCount })}
                label={t("copouch.setting.reminders")}
                onPress={() => navigation.navigate("CowalletRemindScreen", { id: route.params.id })}
              />
              <ActionRow
                body={t("copouch.setting.billBody")}
                label={t("copouch.setting.bills")}
                onPress={() => navigation.navigate("CowalletBillListScreen", { id: route.params.id })}
              />
              <ActionRow
                body={t("copouch.setting.balanceBody")}
                label={t("copouch.setting.balance")}
                onPress={() => navigation.navigate("CowalletBalanceScreen", { id: route.params.id })}
              />
            </SectionCard>

            {detail.isCreator ? (
              <SectionCard>
                <ActionRow
                  body={detail.walletName || t("copouch.home.unnamedWallet")}
                  label={t("copouch.setting.walletName")}
                  onPress={() => navigation.navigate("CowalletSetNameScreen", { id: route.params.id })}
                />
                <ActionRow
                  body={t("copouch.setting.backgroundBody")}
                  label={t("copouch.setting.background")}
                  onPress={() => navigation.navigate("CowalletBgSettingScreen", { id: route.params.id })}
                />
              </SectionCard>
            ) : null}
          </>
        ) : null}
      </WalletGuard>
    </CopouchScaffold>
  )
}

export function CowalletSetNameScreen({ navigation, route }: StackProps<"CowalletSetNameScreen">) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const { detail, loading, invalidAccess, reload } = useCopouchWalletDetail(route.params.id)
  const [name, setName] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void reload()
      .then(wallet => {
        setName(wallet?.walletName ?? "")
      })
      .catch(() => {
        Alert.alert(t("common.errorTitle"), t("copouch.setting.loadFailed"))
      })
  }, [reload, t])

  const disabled = !name.trim() || name.trim() === (detail?.walletName ?? "") || saving

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateCopouchWallet(route.params.id, {
        walletName: name.trim(),
      })
      await useCowalletStore.getState().refreshOverview().catch(() => null)
      Alert.alert(t("common.infoTitle"), t("copouch.setting.nameSaved"))
      navigation.goBack()
    } catch (error) {
      const message = error instanceof ApiError && String(error.code ?? "") === "40009" ? t("copouch.setting.errors.nameExists") : t("copouch.setting.errors.nameSaveFailed")
      Alert.alert(t("common.errorTitle"), message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <CopouchScaffold canGoBack onBack={navigation.goBack} title={t("copouch.setting.walletName")}>
      <WalletGuard
        invalidBody={t("copouch.setting.invalidBody")}
        invalidTitle={t("copouch.setting.invalidTitle")}
        invalidAccess={invalidAccess}
        loading={loading}
        loadingBody={t("copouch.setting.loading")}
      >
        <SectionCard>
          <Text style={[styles.inputLabel, { color: theme.colors.text }]}>{t("copouch.setting.nameLabel")}</Text>
          <TextInput
            maxLength={10}
            onChangeText={setName}
            placeholder={t("copouch.setting.namePlaceholder")}
            placeholderTextColor={theme.colors.mutedText}
            style={[styles.textInput, { borderColor: theme.colors.border, color: theme.colors.text }]}
            value={name}
          />
        </SectionCard>

        <PrimaryButton disabled={disabled} label={saving ? t("common.loading") : t("copouch.setting.save")} onPress={() => void handleSave()} />
      </WalletGuard>
    </CopouchScaffold>
  )
}

export function CowalletBgSettingScreen({ navigation, route }: StackProps<"CowalletBgSettingScreen">) {
  const { t } = useTranslation()
  const { detail, loading, invalidAccess, reload } = useCopouchWalletDetail(route.params.id)
  const [selectedColor, setSelectedColor] = useState(1)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void reload()
      .then(wallet => {
        setSelectedColor(wallet?.walletBgColor ?? 1)
      })
      .catch(() => {
        Alert.alert(t("common.errorTitle"), t("copouch.setting.loadFailed"))
      })
  }, [reload, t])

  const disabled = selectedColor === (detail?.walletBgColor ?? 1) || saving

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateCopouchWallet(route.params.id, {
        walletBgColor: selectedColor,
      })
      await useCowalletStore.getState().refreshOverview().catch(() => null)
      Alert.alert(t("common.infoTitle"), t("copouch.setting.backgroundSaved"))
      navigation.goBack()
    } catch {
      Alert.alert(t("common.errorTitle"), t("copouch.setting.errors.backgroundSaveFailed"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <CopouchScaffold canGoBack onBack={navigation.goBack} title={t("copouch.setting.background")}>
      <WalletGuard
        invalidBody={t("copouch.setting.invalidBody")}
        invalidTitle={t("copouch.setting.invalidTitle")}
        invalidAccess={invalidAccess}
        loading={loading}
        loadingBody={t("copouch.setting.loading")}
      >
        <SectionCard>
          <View style={styles.paletteColumn}>
            {Object.entries(bgPalette).map(([id, palette]) => {
              const numericId = Number(id)
              const active = numericId === selectedColor

              return (
                <Pressable
                  key={id}
                  onPress={() => setSelectedColor(numericId)}
                  style={[
                    styles.backgroundCard,
                    {
                      backgroundColor: palette.card,
                      borderColor: active ? "#0F766E" : "transparent",
                    },
                  ]}
                >
                  <Text style={styles.backgroundCardText}>{active ? t("copouch.setting.selected") : t("copouch.setting.tapToSelect")}</Text>
                </Pressable>
              )
            })}
          </View>
        </SectionCard>

        <PrimaryButton disabled={disabled} label={saving ? t("common.loading") : t("copouch.setting.save")} onPress={() => void handleSave()} />
      </WalletGuard>
    </CopouchScaffold>
  )
}
