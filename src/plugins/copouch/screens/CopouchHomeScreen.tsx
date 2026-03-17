import React, { useEffect, useMemo, useState } from "react"

import { Alert, Modal, Pressable, StyleSheet, Text, View } from "react-native"
import { useFocusEffect } from "@react-navigation/native"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"
import { useTranslation } from "react-i18next"

import {
  createCopouchWallet,
  describeCopouchEligibilityError,
  preValidateCopouchCreate,
} from "@/plugins/copouch/services/copouchApi"
import { navigateRoot } from "@/app/navigation/navigationRef"
import { HeaderTextAction } from "@/shared/ui/HomeScaffold"
import { useCopouchOverviewQuery } from "@/plugins/copouch/queries/copouchQueries"
import { useCopouchStore } from "@/plugins/copouch/store/useCopouchStore"
import { CopouchScaffold } from "@/plugins/copouch/components/CopouchScaffold"
import { COPOUCH_WALLET_CARD_COLORS } from "@/plugins/copouch/screens/copouchPalette"
import { formatCurrency } from "@/shared/utils/format"
import { PageEmpty, PrimaryButton, SecondaryButton, SectionCard } from "@/shared/ui/AppFlowUi"
import { useErrorPresenter } from "@/shared/errors/useErrorPresenter"
import { getNumber, removeItem, setNumber } from "@/shared/storage/kvStorage"
import { KvStorageKeys } from "@/shared/storage/sessionKeys"
import { useSocketStore } from "@/shared/store/useSocketStore"
import { useToast } from "@/shared/toast/useToast"
import { useAppTheme } from "@/shared/theme/useAppTheme"
import { AppTextField } from "@/shared/ui/AppTextField"
import { useWalletStore } from "@/shared/store/useWalletStore"

import type { CopouchStackParamList } from "@/app/navigation/types"

const CREATE_COOLDOWN_MS = 3_000

function readActiveCreateCooldownUntil(now = Date.now()) {
  const storedValue = getNumber(KvStorageKeys.CopouchCreateCooldownUntil)
  return storedValue != null && storedValue > now ? storedValue : null
}

type Props = NativeStackScreenProps<CopouchStackParamList, "CopouchHomeScreen">

export function CopouchHomeScreen({ navigation }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const { presentError } = useErrorPresenter()
  const { showToast } = useToast()
  const sortByAmount = useCopouchStore(state => state.sortByAmount)
  const toggleSortByAmount = useCopouchStore(state => state.toggleSortByAmount)
  const walletAddress = useWalletStore(state => state.address)
  const chainId = useWalletStore(state => state.chainId)
  const copouchRevision = useSocketStore(state => state.copouchRevision)
  const overviewQuery = useCopouchOverviewQuery({ walletAddress, chainId }, sortByAmount)
  const wallets = overviewQuery.data?.wallets ?? []
  const bttBalance = overviewQuery.data?.bttBalance ?? 0
  const walletLimit = overviewQuery.data?.walletLimit ?? 0
  const finishedCount = overviewQuery.data?.finishedCount ?? 0
  const loading = overviewQuery.isLoading && !overviewQuery.data
  const refreshing = overviewQuery.isRefetching && !!overviewQuery.data

  const [modalVisible, setModalVisible] = useState(false)
  const [walletName, setWalletName] = useState("")
  const [selectedBgColor, setSelectedBgColor] = useState(1)
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(() => readActiveCreateCooldownUntil())
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (cooldownUntil == null) {
      removeItem(KvStorageKeys.CopouchCreateCooldownUntil)
      return
    }

    const now = Date.now()
    if (cooldownUntil <= now) {
      removeItem(KvStorageKeys.CopouchCreateCooldownUntil)
      setCooldownUntil(null)
      return
    }

    setNumber(KvStorageKeys.CopouchCreateCooldownUntil, cooldownUntil)
    const timer = setTimeout(() => {
      removeItem(KvStorageKeys.CopouchCreateCooldownUntil)
      setCooldownUntil(null)
    }, cooldownUntil - now)

    return () => {
      clearTimeout(timer)
    }
  }, [cooldownUntil])

  useEffect(() => {
    if (!overviewQuery.error) {
      return
    }

    presentError(overviewQuery.error, {
      fallbackKey: "copouch.home.loadFailed",
    })
  }, [overviewQuery.error, presentError])

  useFocusEffect(
    React.useCallback(() => {
      setCooldownUntil(readActiveCreateCooldownUntil())
    }, []),
  )

  useEffect(() => {
    if (copouchRevision <= 0) {
      return
    }

    void overviewQuery.refetch()
  }, [copouchRevision, overviewQuery.refetch])

  const creationSummary = useMemo(() => {
    return t("copouch.home.qualificationSummary", {
      finishedCount,
      walletLimit,
      bttBalance: bttBalance.toFixed(2),
    })
  }, [bttBalance, finishedCount, t, walletLimit])

  const openBttClaim = () => {
    navigateRoot("TransferStack", {
      screen: "BttClaimScreen",
    })
  }

  const openFaq = () => {
    navigation.navigate("CopouchFaqScreen")
  }

  const isCreateCoolingDown = cooldownUntil != null && cooldownUntil > Date.now()

  const handleOpenCreate = () => {
    if (isCreateCoolingDown) {
      showToast({ message: t("copouch.home.cooldown"), tone: "warning" })
      return
    }

    if (wallets.length === 0 && finishedCount <= 0) {
      showToast({ message: t("copouch.home.needFinishedOrder"), tone: "warning" })
      return
    }

    if (bttBalance < 1800) {
      Alert.alert(t("common.infoTitle"), t("copouch.home.needBtt"), [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("copouch.home.claimBtt"),
          onPress: openBttClaim,
        },
      ])
      return
    }

    setWalletName(t("copouch.home.defaultWalletName", { count: wallets.length + 1 }))
    setSelectedBgColor(1)
    setModalVisible(true)
  }

  const handleSubmitCreate = async () => {
    setCreating(true)

    try {
      if (finishedCount <= 0) {
        throw new Error("finishedCount")
      }

      if (wallets.length >= walletLimit) {
        throw new Error("walletLimit")
      }

      if (bttBalance < 1800) {
        throw new Error("bttBalance")
      }

      await preValidateCopouchCreate({
        chainId,
        walletName: walletName.trim(),
      })

      const result = await createCopouchWallet({
        chainId,
        walletName: walletName.trim(),
        walletBgColor: selectedBgColor,
      })

      await overviewQuery.refetch()
      setModalVisible(false)
      setCooldownUntil(Date.now() + CREATE_COOLDOWN_MS)
      showToast({ message: t("copouch.home.createSubmitted", { txHash: result.txHash.slice(0, 10) }), tone: "success" })
    } catch (error) {
      if (error instanceof Error && error.message === "finishedCount") {
        showToast({ message: t("copouch.home.needFinishedOrder"), tone: "warning" })
        return
      }

      if (error instanceof Error && error.message === "walletLimit") {
        showToast({ message: t("copouch.home.walletLimitReached"), tone: "warning" })
        return
      }

      if (error instanceof Error && error.message === "bttBalance") {
        showToast({ message: t("copouch.home.needBtt"), tone: "warning" })
        return
      }

      if (error instanceof Error && error.message === "unsupportedLoginType") {
        showToast({ message: t("copouch.home.needWalletLogin"), tone: "warning" })
        return
      }

      if (error instanceof Error && error.message === "walletMismatch") {
        showToast({ message: t("copouch.home.walletMismatch"), tone: "warning" })
        return
      }

      switch (describeCopouchEligibilityError(error)) {
        case "finishedCount":
          showToast({ message: t("copouch.home.needFinishedOrder"), tone: "warning" })
          break
        case "walletLimit":
          showToast({ message: t("copouch.home.walletLimitReached"), tone: "warning" })
          break
        case "ownerLimit":
          showToast({ message: t("copouch.home.ownerLimitReached"), tone: "warning" })
          break
        default:
          presentError(error, {
            fallbackKey: "copouch.home.createFailed",
            mode: "toast",
          })
      }
    } finally {
      setCreating(false)
    }
  }

  return (
    <CopouchScaffold
      title={t("copouch.home.title")}
      right={
        <View style={styles.headerActions}>
          <HeaderTextAction label={t("copouch.home.claimBtt")} onPress={openBttClaim} />
          <HeaderTextAction label={t("copouch.home.faq")} onPress={openFaq} />
        </View>
      }
    >
      <SectionCard>
        <Text style={[styles.summaryTitle, { color: theme.colors.text }]}>{t("copouch.home.summaryTitle")}</Text>
        <Text style={[styles.summaryBody, { color: theme.colors.mutedText }]}>{creationSummary}</Text>
      </SectionCard>

      <SectionCard>
        <View style={styles.sortRow}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t("copouch.home.listTitle")}</Text>
          <Pressable onPress={toggleSortByAmount}>
            <Text style={[styles.sortText, { color: sortByAmount ? theme.colors.primary : theme.colors.mutedText }]}>
              {sortByAmount ? t("copouch.home.sortByAmountOn") : t("copouch.home.sortByAmountOff")}
            </Text>
          </Pressable>
        </View>
        {loading && wallets.length === 0 ? (
          <Text style={[styles.loadingText, { color: theme.colors.mutedText }]}>{t("common.loading")}</Text>
        ) : null}
        {!loading && wallets.length === 0 ? (
          <PageEmpty title={t("copouch.home.emptyTitle")} body={t("copouch.home.emptyBody")} />
        ) : null}
        {wallets.map(wallet => (
          <Pressable
            key={wallet.id}
            onPress={() =>
              navigation.navigate("CopouchDetailScreen", {
                id: wallet.id,
                walletBgColor: wallet.walletBgColor,
              })
            }
            style={[styles.walletCard, { borderColor: theme.colors.border, backgroundColor: COPOUCH_WALLET_CARD_COLORS[(wallet.walletBgColor - 1) % COPOUCH_WALLET_CARD_COLORS.length] }]}
          >
            <View style={styles.walletHeader}>
              <Text adjustsFontSizeToFit minimumFontScale={0.8} numberOfLines={1} style={styles.walletName}>
                {wallet.walletName || t("copouch.home.unnamedWallet")}
              </Text>
              <View
                style={[
                  styles.walletStatusBadge,
                  {
                    backgroundColor: wallet.status === 1 ? "rgba(4,120,87,0.12)" : "rgba(180,83,9,0.12)",
                  },
                ]}
              >
                <Text style={[styles.walletStatus, { color: wallet.status === 1 ? "#047857" : "#B45309" }]}>
                  {wallet.status === 1 ? t("copouch.home.statusReady") : t("copouch.home.statusPending")}
                </Text>
              </View>
            </View>
            <Text adjustsFontSizeToFit minimumFontScale={0.82} numberOfLines={1} style={styles.walletBalance}>
              {formatCurrency(wallet.totalValue)}
            </Text>
            <View style={styles.walletMeta}>
              <Text style={[styles.walletMetaText, { color: theme.colors.mutedText }]}>
                {t("copouch.home.ownerCount", { count: wallet.ownerCount })}
              </Text>
              <Text style={[styles.walletMetaText, { color: theme.colors.mutedText }]}>
                {wallet.isCreator ? t("copouch.home.creator") : t("copouch.home.member")}
              </Text>
            </View>
          </Pressable>
        ))}
      </SectionCard>

      <PrimaryButton
        label={creating ? t("common.loading") : refreshing ? t("copouch.home.refreshing") : t("copouch.home.createButton")}
        onPress={handleOpenCreate}
        disabled={creating || isCreateCoolingDown}
        style={styles.createButton}
      />

      <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalMask}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>{t("copouch.home.createModalTitle")}</Text>
            <Text style={[styles.modalLabel, { color: theme.colors.mutedText }]}>{t("copouch.home.nameLabel")}</Text>
            <AppTextField
              backgroundTone="background"
              value={walletName}
              onChangeText={setWalletName}
              placeholder={t("copouch.home.namePlaceholder")}
            />
            <Text style={[styles.modalLabel, { color: theme.colors.mutedText }]}>{t("copouch.home.backgroundLabel")}</Text>
            <View style={styles.paletteRow}>
              {COPOUCH_WALLET_CARD_COLORS.map((color, index) => (
                <Pressable
                  key={color}
                  onPress={() => setSelectedBgColor(index + 1)}
                  style={[
                    styles.paletteItem,
                    {
                      backgroundColor: color,
                      borderColor: selectedBgColor === index + 1 ? theme.colors.primary : "transparent",
                    },
                  ]}
                />
              ))}
            </View>
            <Text style={[styles.helperText, { color: theme.colors.mutedText }]}>{t("copouch.home.createHelper")}</Text>
            <View style={styles.modalActions}>
              <SecondaryButton label={t("common.cancel")} onPress={() => setModalVisible(false)} disabled={creating} />
              <PrimaryButton
                label={creating ? t("common.loading") : t("common.confirm")}
                onPress={() => void handleSubmitCreate()}
                disabled={creating || !walletName.trim() || !selectedBgColor}
              />
            </View>
          </View>
        </View>
      </Modal>
    </CopouchScaffold>
  )
}

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: 10,
  },
  summaryTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "700",
    letterSpacing: -0.24,
  },
  summaryBody: {
    fontSize: 15,
    lineHeight: 24,
  },
  sectionTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sortText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",
    letterSpacing: -0.12,
  },
  loadingText: {
    fontSize: 14,
    lineHeight: 20,
  },
  walletCard: {
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  walletHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14,
  },
  walletName: {
    flex: 1,
    minWidth: 0,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
    letterSpacing: -0.32,
    color: "#0F172A",
  },
  walletStatusBadge: {
    minHeight: 30,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  walletStatus: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "700",
  },
  walletBalance: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "800",
    letterSpacing: -0.9,
    fontVariant: ["tabular-nums"],
    color: "#0F172A",
  },
  walletMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  walletMetaText: {
    fontSize: 14,
    lineHeight: 20,
  },
  createButton: {
    marginTop: 2,
  },
  modalMask: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15,23,42,0.48)",
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 20,
    gap: 14,
  },
  modalTitle: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "800",
    letterSpacing: -0.28,
  },
  modalLabel: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600",
  },
  input: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  paletteRow: {
    flexDirection: "row",
    gap: 12,
  },
  paletteItem: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
  },
  helperText: {
    fontSize: 13,
    lineHeight: 20,
  },
  modalActions: {
    gap: 10,
    marginTop: 4,
    marginBottom: 12,
  },
})
