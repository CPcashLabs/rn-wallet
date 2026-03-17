import React, { useEffect, useState } from "react"

import { useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Pressable, Text, View } from "react-native"

import { CopouchScaffold } from "@/plugins/copouch/components/CopouchScaffold"
import { COPOUCH_WALLET_BG_PALETTE } from "@/plugins/copouch/screens/copouchPalette"
import type { CopouchStackScreenProps } from "@/plugins/copouch/screens/copouchScreenProps"
import {
  AvatarBadge,
  WalletGuard,
  isCopouchForbiddenError,
  styles,
  useCopouchWalletDetail,
} from "@/plugins/copouch/screens/copouchOperationShared"
import {
  invalidateCopouchQueries,
  useCopouchOwnersQuery,
} from "@/plugins/copouch/queries/copouchQueries"
import {
  updateCopouchWallet,
  type CopouchOwner,
} from "@/plugins/copouch/services/copouchApi"
import { formatAddress } from "@/shared/utils/format"
import { ActionRow } from "@/shared/ui/WalletCommonUi"
import { PrimaryButton, SectionCard } from "@/shared/ui/AppFlowUi"
import { ApiError } from "@/shared/errors"
import { useErrorPresenter } from "@/shared/errors/useErrorPresenter"
import { useToast } from "@/shared/toast/useToast"
import { useAppTheme } from "@/shared/theme/useAppTheme"
import { AppTextField } from "@/shared/ui/AppTextField"

export function CopouchSettingScreen({ navigation, route }: CopouchStackScreenProps<"CopouchSettingScreen">) {
  const { t } = useTranslation()
  const { presentError } = useErrorPresenter()
  const { detail, error: detailError, loading, invalidAccess } = useCopouchWalletDetail(route.params.id)
  const ownersQuery = useCopouchOwnersQuery(route.params.id)
  const owners = (ownersQuery.data ?? []) as CopouchOwner[]
  const ownersLoading = ownersQuery.isLoading
  const screenInvalidAccess = invalidAccess || isCopouchForbiddenError(ownersQuery.error)

  useEffect(() => {
    if (detailError && !isCopouchForbiddenError(detailError)) {
      presentError(detailError, {
        fallbackKey: "copouch.setting.loadFailed",
      })
    }
  }, [detailError, presentError])

  useEffect(() => {
    if (ownersQuery.error && !isCopouchForbiddenError(ownersQuery.error)) {
      presentError(ownersQuery.error, {
        fallbackKey: "copouch.setting.loadFailed",
      })
    }
  }, [ownersQuery.error, presentError])

  return (
    <CopouchScaffold canGoBack onBack={navigation.goBack} title={t("copouch.setting.title")}>
      <WalletGuard
        invalidBody={t("copouch.setting.invalidBody")}
        invalidTitle={t("copouch.setting.invalidTitle")}
        invalidAccess={screenInvalidAccess}
        loading={loading || ownersLoading}
        loadingBody={t("copouch.setting.loading")}
      >
        {detail ? (
          <>
            <View style={[styles.heroCard, { backgroundColor: (COPOUCH_WALLET_BG_PALETTE[detail.walletBgColor] ?? COPOUCH_WALLET_BG_PALETTE[1]).card }]}>
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
                onPress={() => navigation.navigate("CopouchMemberScreen", { id: route.params.id })}
              />
              <ActionRow
                body={t("copouch.setting.remindBody", { count: detail.eventMessageCount })}
                label={t("copouch.setting.reminders")}
                onPress={() => navigation.navigate("CopouchRemindScreen", { id: route.params.id })}
              />
              <ActionRow
                body={t("copouch.setting.billBody")}
                label={t("copouch.setting.bills")}
                onPress={() => navigation.navigate("CopouchBillListScreen", { id: route.params.id })}
              />
              <ActionRow
                body={t("copouch.setting.balanceBody")}
                label={t("copouch.setting.balance")}
                onPress={() => navigation.navigate("CopouchBalanceScreen", { id: route.params.id })}
              />
            </SectionCard>

            {detail.isCreator ? (
              <SectionCard>
                <ActionRow
                  body={detail.walletName || t("copouch.home.unnamedWallet")}
                  label={t("copouch.setting.walletName")}
                  onPress={() => navigation.navigate("CopouchSetNameScreen", { id: route.params.id })}
                />
                <ActionRow
                  body={t("copouch.setting.backgroundBody")}
                  label={t("copouch.setting.background")}
                  onPress={() => navigation.navigate("CopouchBgSettingScreen", { id: route.params.id })}
                />
              </SectionCard>
            ) : null}
          </>
        ) : null}
      </WalletGuard>
    </CopouchScaffold>
  )
}

export function CopouchSetNameScreen({ navigation, route }: CopouchStackScreenProps<"CopouchSetNameScreen">) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const { presentError, presentMessage } = useErrorPresenter()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const { detail, loading, invalidAccess, reload } = useCopouchWalletDetail(route.params.id)
  const [name, setName] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void reload()
      .then(wallet => {
        setName(wallet?.walletName ?? "")
      })
      .catch(error => {
        presentError(error, {
          fallbackKey: "copouch.setting.loadFailed",
        })
      })
  }, [presentError, reload])

  const disabled = !name.trim() || name.trim() === (detail?.walletName ?? "") || saving

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateCopouchWallet(route.params.id, {
        walletName: name.trim(),
      })
      await invalidateCopouchQueries(queryClient)
      showToast({ message: t("copouch.setting.nameSaved"), tone: "success" })
      navigation.goBack()
    } catch (error) {
      const message = error instanceof ApiError && String(error.code ?? "") === "40009" ? t("copouch.setting.errors.nameExists") : t("copouch.setting.errors.nameSaveFailed")
      presentMessage(message, {
        mode: "toast",
      })
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
          <AppTextField
            backgroundTone="background"
            maxLength={10}
            onChangeText={setName}
            placeholder={t("copouch.setting.namePlaceholder")}
            value={name}
          />
        </SectionCard>

        <PrimaryButton disabled={disabled} label={saving ? t("common.loading") : t("copouch.setting.save")} onPress={() => void handleSave()} />
      </WalletGuard>
    </CopouchScaffold>
  )
}

export function CopouchBgSettingScreen({ navigation, route }: CopouchStackScreenProps<"CopouchBgSettingScreen">) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const { presentError, presentMessage } = useErrorPresenter()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const { detail, loading, invalidAccess, reload } = useCopouchWalletDetail(route.params.id)
  const [selectedColor, setSelectedColor] = useState(1)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void reload()
      .then(wallet => {
        setSelectedColor(wallet?.walletBgColor ?? 1)
      })
      .catch(error => {
        presentError(error, {
          fallbackKey: "copouch.setting.loadFailed",
        })
      })
  }, [presentError, reload])

  const disabled = selectedColor === (detail?.walletBgColor ?? 1) || saving

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateCopouchWallet(route.params.id, {
        walletBgColor: selectedColor,
      })
      await invalidateCopouchQueries(queryClient)
      showToast({ message: t("copouch.setting.backgroundSaved"), tone: "success" })
      navigation.goBack()
    } catch (error) {
      presentError(error, {
        fallbackKey: "copouch.setting.errors.backgroundSaveFailed",
        mode: "toast",
      })
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
            {Object.entries(COPOUCH_WALLET_BG_PALETTE).map(([id, palette]) => {
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
                      borderColor: active ? theme.colors.success : "transparent",
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
