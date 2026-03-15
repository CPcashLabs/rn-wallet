import React, { useEffect, useMemo, useState } from "react"

import { Alert, Modal, Pressable, StyleSheet, Text, View } from "react-native"
import { useFocusEffect } from "@react-navigation/native"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"
import { useTranslation } from "react-i18next"

import { describeCopouchEligibilityError } from "@/plugins/copouch/services/copouchApi"
import { navigateRoot } from "@/app/navigation/navigationRef"
import { HeaderTextAction } from "@/features/home/components/HomeScaffold"
import { useCopouchStore } from "@/plugins/copouch/store/useCopouchStore"
import { CopouchScaffold } from "@/plugins/copouch/components/CopouchScaffold"
import { formatCurrency } from "@/features/home/utils/format"
import { PageEmpty, PrimaryButton, SecondaryButton, SectionCard } from "@/shared/ui/AppFlowUi"
import { useErrorPresenter } from "@/shared/errors/useErrorPresenter"
import { getNumber, removeItem, setNumber } from "@/shared/storage/kvStorage"
import { KvStorageKeys } from "@/shared/storage/sessionKeys"
import { useSocketStore } from "@/shared/store/useSocketStore"
import { useToast } from "@/shared/toast/useToast"
import { useAppTheme } from "@/shared/theme/useAppTheme"
import { AppTextField } from "@/shared/ui/AppTextField"

import type { CopouchStackParamList } from "@/app/navigation/types"

const bgPalette = ["#DFF6F4", "#FFF1D6", "#E8EEFF", "#FCE7F3"]
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
  const wallets = useCopouchStore(state => state.wallets)
  const loading = useCopouchStore(state => state.loading)
  const refreshing = useCopouchStore(state => state.refreshing)
  const creating = useCopouchStore(state => state.creating)
  const sortByAmount = useCopouchStore(state => state.sortByAmount)
  const bttBalance = useCopouchStore(state => state.bttBalance)
  const walletLimit = useCopouchStore(state => state.walletLimit)
  const finishedCount = useCopouchStore(state => state.finishedCount)
  const loadOverview = useCopouchStore(state => state.loadOverview)
  const refreshOverview = useCopouchStore(state => state.refreshOverview)
  const toggleSortByAmount = useCopouchStore(state => state.toggleSortByAmount)
  const createWallet = useCopouchStore(state => state.createWallet)
  const lastEvent = useSocketStore(state => state.lastEvent)

  const [modalVisible, setModalVisible] = useState(false)
  const [walletName, setWalletName] = useState("")
  const [selectedBgColor, setSelectedBgColor] = useState(1)
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(() => readActiveCreateCooldownUntil())

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
    void loadOverview().catch(error => {
      presentError(error, {
        fallbackKey: "copouch.home.loadFailed",
      })
    })
  }, [loadOverview, presentError])

  useFocusEffect(
    React.useCallback(() => {
      setCooldownUntil(readActiveCreateCooldownUntil())
      void refreshOverview().catch(error => {
        presentError(error, {
          fallbackKey: "copouch.home.refreshFailed",
        })
      })
    }, [presentError, refreshOverview]),
  )

  useEffect(() => {
    if (!lastEvent?.type) {
      return
    }

    if (["MultisigWalletCreatedSuc", "MultisigWalletCreatedFail", "MultisigWalletMemberRemoved"].includes(lastEvent.type)) {
      void refreshOverview().catch(() => null)
    }
  }, [lastEvent, refreshOverview])

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
    try {
      const result = await createWallet({
        walletName: walletName.trim(),
        walletBgColor: selectedBgColor,
      })
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
            style={[styles.walletCard, { borderColor: theme.colors.border, backgroundColor: bgPalette[(wallet.walletBgColor - 1) % bgPalette.length] }]}
          >
            <View style={styles.walletHeader}>
              <Text style={styles.walletName}>{wallet.walletName || t("copouch.home.unnamedWallet")}</Text>
              <Text style={[styles.walletStatus, { color: wallet.status === 1 ? "#047857" : "#B45309" }]}>
                {wallet.status === 1 ? t("copouch.home.statusReady") : t("copouch.home.statusPending")}
              </Text>
            </View>
            <Text style={styles.walletBalance}>{formatCurrency(wallet.totalValue)}</Text>
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
              {bgPalette.map((color, index) => (
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
    gap: 8,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  summaryBody: {
    fontSize: 13,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sortText: {
    fontSize: 13,
    fontWeight: "700",
  },
  loadingText: {
    fontSize: 13,
  },
  walletCard: {
    borderRadius: 18,
    padding: 16,
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  walletHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  walletName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    flex: 1,
  },
  walletStatus: {
    fontSize: 12,
    fontWeight: "700",
  },
  walletBalance: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0F172A",
  },
  walletMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  walletMetaText: {
    fontSize: 12,
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
    padding: 16,
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  modalLabel: {
    fontSize: 13,
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
    fontSize: 12,
    lineHeight: 18,
  },
  modalActions: {
    gap: 10,
    marginTop: 4,
    marginBottom: 12,
  },
})
