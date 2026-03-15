import React, { useEffect, useMemo, useState } from "react"

import { Pressable, StyleSheet, Text, View } from "react-native"
import { useFocusEffect } from "@react-navigation/native"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"
import { useTranslation } from "react-i18next"

import { navigateRoot } from "@/app/navigation/navigationRef"
import { getCopouchDetail, getCopouchOwners, markCopouchFirstEnterSeen, type CopouchDetail, type CopouchOwner } from "@/plugins/copouch/services/copouchApi"
import { CopouchScaffold } from "@/plugins/copouch/components/CopouchScaffold"
import { useCopouchStore } from "@/plugins/copouch/store/useCopouchStore"
import { formatAddress, formatCurrency } from "@/features/home/utils/format"
import { PageEmpty, PrimaryButton, SectionCard, SecondaryButton } from "@/shared/ui/AppFlowUi"
import { ApiError } from "@/shared/errors"
import { useErrorPresenter } from "@/shared/errors/useErrorPresenter"
import { getJson, setJson } from "@/shared/storage/kvStorage"
import { KvStorageKeys } from "@/shared/storage/sessionKeys"
import { useSocketStore } from "@/shared/store/useSocketStore"
import { useAppTheme } from "@/shared/theme/useAppTheme"

import type { CopouchStackParamList } from "@/app/navigation/types"

const bgPalette: Record<number, { card: string; page: string }> = {
  1: { card: "#DFF6F4", page: "#F4FBFA" },
  2: { card: "#FFF1D6", page: "#FFFBF2" },
  3: { card: "#E8EEFF", page: "#F6F8FF" },
  4: { card: "#FCE7F3", page: "#FFF5FA" },
}

type Props = NativeStackScreenProps<CopouchStackParamList, "CopouchDetailScreen">

export function CopouchDetailScreen({ navigation, route }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const { presentError } = useErrorPresenter()
  const refreshOverview = useCopouchStore(state => state.refreshOverview)
  const refreshWalletValue = useCopouchStore(state => state.refreshWalletValue)
  const wallets = useCopouchStore(state => state.wallets)
  const lastEvent = useSocketStore(state => state.lastEvent)
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<CopouchDetail | null>(null)
  const [owners, setOwners] = useState<CopouchOwner[]>([])
  const [invalidAccess, setInvalidAccess] = useState(false)
  const [guideDismissed, setGuideDismissed] = useState(false)

  const wallet = wallets.find(item => item.id === route.params.id)
  const walletTotalValue = wallet?.totalValue ?? detail?.totalValue ?? 0
  const palette = bgPalette[detail?.walletBgColor ?? route.params.walletBgColor ?? 1] ?? bgPalette[1]

  const loadDetail = React.useCallback(async () => {
    setLoading(true)

    try {
      const [nextDetail, nextOwners] = await Promise.all([getCopouchDetail(route.params.id), getCopouchOwners(route.params.id)])

      setDetail(nextDetail)
      setOwners(nextOwners)
      setInvalidAccess(false)

      const dismissedIds = getJson<string[]>(KvStorageKeys.CopouchGuideDismissedWalletIds) ?? []
      setGuideDismissed(dismissedIds.includes(route.params.id) || nextDetail.firstEnterStatus !== 1)

      await refreshWalletValue(nextDetail.id, nextDetail.walletAddress)
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        setInvalidAccess(true)
      } else {
        presentError(error, {
          fallbackKey: "copouch.detail.loadFailed",
        })
      }
    } finally {
      setLoading(false)
    }
  }, [presentError, refreshWalletValue, route.params.id])

  useEffect(() => {
    void loadDetail()
  }, [loadDetail])

  useFocusEffect(
    React.useCallback(() => {
      void refreshOverview().catch(() => null)
      void loadDetail()
    }, [loadDetail, refreshOverview]),
  )

  useEffect(() => {
    const type = lastEvent?.type

    if (!type) {
      return
    }

    if (["MultisigWalletMemberAddSuc", "MultisigWalletMemberDelSuc", "MultisigWalletMemberRemoved", "MultisigWalletCreatedSuc"].includes(type)) {
      void refreshOverview().catch(() => null)
      void loadDetail()
    }
  }, [lastEvent, loadDetail, refreshOverview])

  const ownerSummary = useMemo(() => {
    return owners.slice(0, 5)
  }, [owners])

  const dismissGuide = async () => {
    const dismissedIds = getJson<string[]>(KvStorageKeys.CopouchGuideDismissedWalletIds) ?? []
    const next = Array.from(new Set([...dismissedIds, route.params.id]))
    setJson(KvStorageKeys.CopouchGuideDismissedWalletIds, next)
    setGuideDismissed(true)

    try {
      await markCopouchFirstEnterSeen(route.params.id)
      setDetail(current =>
        current
          ? {
              ...current,
              firstEnterStatus: 0,
            }
          : current,
      )
    } catch (error) {
      presentError(error, {
        fallbackKey: "copouch.detail.guideDismissFailed",
      })
    }
  }

  if (!route.params.id) {
    return (
      <CopouchScaffold canGoBack onBack={navigation.goBack} title={t("copouch.detail.title")}>
        <PageEmpty title={t("copouch.detail.invalidTitle")} body={t("copouch.detail.invalidBody")} />
      </CopouchScaffold>
    )
  }

  if (invalidAccess) {
    return (
      <CopouchScaffold canGoBack onBack={navigation.goBack} title={t("copouch.detail.title")}>
        <PageEmpty title={t("copouch.detail.forbiddenTitle")} body={t("copouch.detail.forbiddenBody")} />
      </CopouchScaffold>
    )
  }

  return (
    <CopouchScaffold
      canGoBack
      onBack={navigation.goBack}
      title={detail?.walletName || t("copouch.detail.title")}
      backgroundColor={palette.page}
      headerBackgroundColor={palette.page}
      scroll={false}
    >
      <View style={styles.content}>
        {!guideDismissed && detail ? (
          <SectionCard>
            <Text style={[styles.guideTitle, { color: theme.colors.text }]}>{t("copouch.detail.guideTitle")}</Text>
            <Text style={[styles.guideBody, { color: theme.colors.mutedText }]}>{t("copouch.detail.guideBody")}</Text>
            <SecondaryButton label={t("copouch.detail.guideDismiss")} onPress={() => void dismissGuide()} />
          </SectionCard>
        ) : null}

        <View style={[styles.heroCard, { backgroundColor: palette.card }]}>
          <View style={styles.heroTop}>
            <Text style={styles.ownerPill}>{t("copouch.detail.ownerCount", { count: detail?.ownerCount ?? owners.length })}</Text>
            <Text style={styles.chainText}>{detail?.chainName || "-"}</Text>
          </View>
          <Text style={styles.balanceLabel}>{t("copouch.detail.totalAssets")}</Text>
          <Text style={styles.balanceText}>{loading ? t("common.loading") : formatCurrency(walletTotalValue)}</Text>
          <Text style={styles.addressText}>{formatAddress(detail?.walletAddress || "")}</Text>
        </View>

        <SectionCard>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t("copouch.detail.membersTitle")}</Text>
            <Pressable onPress={() => navigation.navigate("CopouchMemberScreen", { id: route.params.id })}>
              <Text style={[styles.linkText, { color: theme.colors.primary }]}>{t("copouch.detail.viewAll")}</Text>
            </Pressable>
          </View>
          <View style={styles.ownerRow}>
            {ownerSummary.map(owner => (
              <View key={owner.userId || owner.walletAddress} style={styles.ownerItem}>
                <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
                  <Text style={styles.avatarText}>{(owner.nickname || owner.walletAddress || "?").slice(0, 1).toUpperCase()}</Text>
                </View>
                <Text numberOfLines={1} style={[styles.ownerName, { color: theme.colors.text }]}>
                  {owner.nickname || formatAddress(owner.walletAddress)}
                </Text>
              </View>
            ))}
          </View>
        </SectionCard>

        <SectionCard>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t("copouch.detail.quickActionsTitle")}</Text>
            <Text style={[styles.eventText, { color: theme.colors.mutedText }]}>
              {t("copouch.detail.eventCount", { count: detail?.eventMessageCount ?? 0 })}
            </Text>
          </View>
          <View style={styles.actionGrid}>
            <ActionButton
              label={t("copouch.detail.transfer")}
              onPress={() =>
                navigateRoot("TransferStack", {
                  screen: "SelectTokenScreen",
                  params: {
                    intent: "transfer",
                    copouch: detail?.walletAddress,
                    multisigWalletId: route.params.id,
                  },
                })
              }
            />
            <ActionButton
              label={t("copouch.detail.receive")}
              onPress={() =>
                navigateRoot("TransferStack", {
                  screen: "SelectTokenScreen",
                  params: {
                    intent: "receive",
                    copouch: detail?.walletAddress,
                    multisigWalletId: route.params.id,
                  },
                })
              }
            />
            <ActionButton label={t("copouch.detail.bill")} onPress={() => navigation.navigate("CopouchBillListScreen", { id: route.params.id })} />
            <ActionButton
              label={t("copouch.detail.setting")}
              onPress={() => navigation.navigate("CopouchSettingScreen", { id: route.params.id })}
            />
          </View>
        </SectionCard>

        <View style={styles.footer}>
          <PrimaryButton label={t("copouch.detail.withdraw")} onPress={() => navigation.navigate("CopouchSendSelfScreen", { id: route.params.id })} />
          <SecondaryButton label={t("copouch.detail.deposit")} onPress={() => navigation.navigate("CopouchReceiveScreen", { id: route.params.id })} />
        </View>
      </View>
    </CopouchScaffold>
  )
}

function ActionButton(props: { label: string; onPress: () => void }) {
  const theme = useAppTheme()

  return (
    <Pressable onPress={props.onPress} style={[styles.actionButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <Text style={[styles.actionLabel, { color: theme.colors.text }]}>{props.label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  guideTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  guideBody: {
    fontSize: 13,
    lineHeight: 20,
  },
  heroCard: {
    borderRadius: 24,
    padding: 18,
    gap: 10,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ownerPill: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
    backgroundColor: "rgba(255,255,255,0.55)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chainText: {
    fontSize: 12,
    color: "#334155",
  },
  balanceLabel: {
    fontSize: 13,
    color: "#334155",
  },
  balanceText: {
    fontSize: 30,
    fontWeight: "800",
    color: "#0F172A",
  },
  addressText: {
    fontSize: 13,
    color: "#334155",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  linkText: {
    fontSize: 13,
    fontWeight: "700",
  },
  ownerRow: {
    flexDirection: "row",
    gap: 10,
  },
  ownerItem: {
    flex: 1,
    alignItems: "center",
    gap: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  ownerName: {
    fontSize: 12,
    textAlign: "center",
  },
  eventText: {
    fontSize: 12,
  },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  actionButton: {
    width: "47%",
    minHeight: 72,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  footer: {
    gap: 10,
    marginTop: "auto",
  },
})
