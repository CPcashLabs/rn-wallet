import React, { useEffect, useMemo, useState } from "react"

import { Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native"
import { useFocusEffect } from "@react-navigation/native"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"
import { useTranslation } from "react-i18next"

import { describeCopouchEligibilityError } from "@/features/copouch/services/copouchApi"
import { useCowalletStore } from "@/features/copouch/store/useCowalletStore"
import { HomeScaffold } from "@/features/home/components/HomeScaffold"
import { formatCurrency } from "@/features/home/utils/format"
import { PageEmpty, PrimaryButton, SecondaryButton, SectionCard } from "@/features/transfer/components/TransferUi"
import { useAppTheme } from "@/shared/theme/useAppTheme"

import type { CowalletStackParamList } from "@/app/navigation/types"

const bgPalette = ["#DFF6F4", "#FFF1D6", "#E8EEFF", "#FCE7F3"]

type Props = NativeStackScreenProps<CowalletStackParamList, "CowalletHomeScreen">

export function CowalletHomeScreen({ navigation }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const wallets = useCowalletStore(state => state.wallets)
  const loading = useCowalletStore(state => state.loading)
  const refreshing = useCowalletStore(state => state.refreshing)
  const creating = useCowalletStore(state => state.creating)
  const sortByAmount = useCowalletStore(state => state.sortByAmount)
  const bttBalance = useCowalletStore(state => state.bttBalance)
  const walletLimit = useCowalletStore(state => state.walletLimit)
  const finishedCount = useCowalletStore(state => state.finishedCount)
  const loadOverview = useCowalletStore(state => state.loadOverview)
  const refreshOverview = useCowalletStore(state => state.refreshOverview)
  const toggleSortByAmount = useCowalletStore(state => state.toggleSortByAmount)
  const validateCreateEligibility = useCowalletStore(state => state.validateCreateEligibility)

  const [modalVisible, setModalVisible] = useState(false)
  const [walletName, setWalletName] = useState("")
  const [selectedBgColor, setSelectedBgColor] = useState(1)

  useEffect(() => {
    void loadOverview().catch(() => {
      Alert.alert(t("common.errorTitle"), t("copouch.home.loadFailed"))
    })
  }, [loadOverview, t])

  useFocusEffect(
    React.useCallback(() => {
      void refreshOverview().catch(() => {
        Alert.alert(t("common.errorTitle"), t("copouch.home.refreshFailed"))
      })
    }, [refreshOverview, t]),
  )

  const creationSummary = useMemo(() => {
    return t("copouch.home.qualificationSummary", {
      finishedCount,
      walletLimit,
      bttBalance: bttBalance.toFixed(2),
    })
  }, [bttBalance, finishedCount, t, walletLimit])

  const handleOpenCreate = () => {
    if (wallets.length === 0 && finishedCount <= 0) {
      Alert.alert(t("common.infoTitle"), t("copouch.home.needFinishedOrder"))
      return
    }

    if (bttBalance < 1800) {
      Alert.alert(t("common.infoTitle"), t("copouch.home.needBtt"), [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("copouch.home.claimBtt"),
          onPress: () => {
            ;(navigation.getParent() as any)?.navigate("TransferStack", {
              screen: "BttClaimScreen",
            })
          },
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
      await validateCreateEligibility(walletName.trim())
      setModalVisible(false)
      Alert.alert(t("common.infoTitle"), t("copouch.home.createReady"))
    } catch (error) {
      if (error instanceof Error && error.message === "finishedCount") {
        Alert.alert(t("common.infoTitle"), t("copouch.home.needFinishedOrder"))
        return
      }

      if (error instanceof Error && error.message === "walletLimit") {
        Alert.alert(t("common.infoTitle"), t("copouch.home.walletLimitReached"))
        return
      }

      if (error instanceof Error && error.message === "bttBalance") {
        Alert.alert(t("common.infoTitle"), t("copouch.home.needBtt"))
        return
      }

      switch (describeCopouchEligibilityError(error)) {
        case "finishedCount":
          Alert.alert(t("common.infoTitle"), t("copouch.home.needFinishedOrder"))
          break
        case "walletLimit":
          Alert.alert(t("common.infoTitle"), t("copouch.home.walletLimitReached"))
          break
        case "ownerLimit":
          Alert.alert(t("common.infoTitle"), t("copouch.home.ownerLimitReached"))
          break
        default:
          Alert.alert(t("common.errorTitle"), t("copouch.home.preValidateFailed"))
      }
    }
  }

  return (
    <HomeScaffold
      title={t("copouch.home.title")}
      right={
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => {
              ;(navigation.getParent() as any)?.navigate("TransferStack", {
                screen: "BttClaimScreen",
              })
            }}
          >
            <Text style={[styles.headerActionText, { color: theme.colors.primary }]}>{t("copouch.home.claimBtt")}</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate("CowalletFaqScreen")}>
            <Text style={[styles.headerActionText, { color: theme.colors.primary }]}>{t("copouch.home.faq")}</Text>
          </Pressable>
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
              navigation.navigate("CowalletDetailScreen", {
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
        disabled={creating}
      />

      <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalMask}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>{t("copouch.home.createModalTitle")}</Text>
            <Text style={[styles.modalLabel, { color: theme.colors.mutedText }]}>{t("copouch.home.nameLabel")}</Text>
            <TextInput
              value={walletName}
              onChangeText={setWalletName}
              placeholder={t("copouch.home.namePlaceholder")}
              placeholderTextColor={theme.colors.mutedText}
              style={[
                styles.input,
                {
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                },
              ]}
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
    </HomeScaffold>
  )
}

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: "row",
    gap: 16,
  },
  headerActionText: {
    fontSize: 13,
    fontWeight: "700",
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
    borderRadius: 16,
    padding: 14,
    gap: 8,
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
