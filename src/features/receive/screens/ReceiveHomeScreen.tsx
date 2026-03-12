import React, { useEffect, useMemo, useState } from "react"

import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import type { ReceiveStackParamList } from "@/app/navigation/types"
import { HomeScaffold } from "@/features/home/components/HomeScaffold"
import { resolveChainNameById } from "@/features/home/services/homeApi"
import { InfoRow, ReceiveOrderCard, SegmentedTabs } from "@/features/receive/components/ReceiveUi"
import { useReceiveStore } from "@/features/receive/store/useReceiveStore"
import { SectionCard } from "@/features/transfer/components/TransferUi"
import { useWalletStore } from "@/shared/store/useWalletStore"
import { useAppTheme } from "@/shared/theme/useAppTheme"

type Props = NativeStackScreenProps<ReceiveStackParamList, "ReceiveHomeScreen">

export function ReceiveHomeScreen({ navigation, route }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const walletAddress = useWalletStore(state => state.address)
  const chainId = useWalletStore(state => state.chainId)
  const loadHome = useReceiveStore(state => state.loadHome)
  const createOrder = useReceiveStore(state => state.createOrder)
  const config = useReceiveStore(state => state.config)
  const loading = useReceiveStore(state => state.loading)
  const creating = useReceiveStore(state => state.creating)
  const personalOrder = useReceiveStore(state => state.personalOrder)
  const businessOrder = useReceiveStore(state => state.businessOrder)
  const [activeTab, setActiveTab] = useState<"individuals" | "business">(route.params?.collapse ?? "individuals")

  useEffect(() => {
    void loadHome({
      payChain: route.params?.payChain ?? resolveChainNameById(chainId),
      chainId,
      walletAddress,
      multisigWalletId: route.params?.multisigWalletId,
    }).catch(() => {
      Alert.alert(t("common.errorTitle"), t("receive.home.loadFailed"))
    })
  }, [chainId, loadHome, route.params?.multisigWalletId, route.params?.payChain, t, walletAddress])

  const currentOrder = activeTab === "individuals" ? personalOrder : businessOrder
  const currentVariant = activeTab === "individuals" ? "short" : "long"
  const currentOrderType = activeTab === "individuals" ? "TRACE" : "TRACE_LONG_TERM"
  const subtitle = useMemo(() => {
    if (!config) {
      return t("receive.home.subtitlePending")
    }

    return t("receive.home.supportedNetwork", {
      chain: config.payChain,
      asset: config.sendCoinSymbol,
    })
  }, [config, t])

  return (
    <HomeScaffold
      canGoBack
      onBack={navigation.goBack}
      title={t("receive.home.title")}
      scroll={false}
    >
      <View style={styles.page}>
        <View style={styles.content}>
          <SegmentedTabs
            value={activeTab}
            options={[
              { value: "individuals", label: t("receive.home.individuals") },
              { value: "business", label: t("receive.home.business") },
            ]}
            onChange={setActiveTab}
          />

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={theme.colors.primary} />
              <Text style={[styles.loadingText, { color: theme.colors.mutedText }]}>{t("receive.home.loading")}</Text>
            </View>
          ) : currentOrder && config ? (
            <ReceiveOrderCard
              title={activeTab === "individuals" ? t("receive.home.individualCard") : t("receive.home.businessCard")}
              subtitle={subtitle}
              address={currentOrder.address || walletAddress || "-"}
              amountLabel={t("receive.home.minimumDeposit")}
              extra={`${config.receiveMinAmount || 0} ${config.sendCoinSymbol}`}
              orderSn={currentOrder.orderSn}
              accentColor={config.payChainColor}
              secondaryLabel={t("receive.home.addresses")}
              onSecondaryPress={() =>
                navigation.navigate("ReceiveAddressListScreen", {
                  orderType: currentOrderType,
                  sendCoinCode: config.sendCoinCode,
                  recvCoinCode: config.recvCoinCode,
                  payChain: config.payChain,
                  sellerId: config.sellerId,
                  multisigWalletId: route.params?.multisigWalletId,
                })
              }
              primaryLabel={t("receive.home.logs")}
              onPrimaryPress={() => navigation.navigate("ReceiveTxlogsScreen", { orderSn: currentOrder.orderSn, orderType: currentOrderType })}
            />
          ) : (
            <SectionCard>
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>{t("receive.home.emptyTitle")}</Text>
              <Text style={[styles.emptyBody, { color: theme.colors.mutedText }]}>{t("receive.home.emptyBody")}</Text>
            </SectionCard>
          )}

          <SectionCard>
            <InfoRow label={t("receive.home.payChain")} value={config?.payChainFullName || route.params?.payChain || "-"} />
            <InfoRow label={t("receive.home.assetPair")} value={config ? `${config.sendCoinSymbol}/${config.recvCoinSymbol}` : "-"} />
            <InfoRow
              label={t("receive.home.limit")}
              value={config ? `${config.receiveMinAmount} - ${config.receiveMaxAmount || "∞"} ${config.sendCoinSymbol}` : "-"}
            />
          </SectionCard>

          <SectionCard>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t("receive.home.more")}</Text>
            <View style={styles.quickGrid}>
              <QuickLink
                label={t("receive.home.rareAddress")}
                onPress={() =>
                  navigation.navigate("RareAddressScreen", {
                    payChain: config?.payChain,
                    sendCoinCode: config?.sendCoinCode,
                    recvCoinCode: config?.recvCoinCode,
                    sellerId: config?.sellerId,
                    multisigWalletId: route.params?.multisigWalletId,
                  })
                }
              />
              <QuickLink
                label={t("receive.home.buyCrypto")}
                onPress={() => (navigation.getParent() as any)?.navigate("TransferStack", { screen: "BuyCryptoScreen" })}
              />
              <QuickLink
                label={t("receive.home.bttClaim")}
                onPress={() => (navigation.getParent() as any)?.navigate("TransferStack", { screen: "BttClaimScreen" })}
              />
              <QuickLink
                label={t("receive.home.invalid")}
                onPress={() =>
                  navigation.navigate("InvalidReceiveAddressScreen", {
                    orderType: currentOrderType,
                    sendCoinCode: config?.sendCoinCode,
                    recvCoinCode: config?.recvCoinCode,
                    multisigWalletId: route.params?.multisigWalletId,
                  })
                }
              />
            </View>
          </SectionCard>
        </View>

        <View style={[styles.footer, { borderTopColor: theme.colors.border, backgroundColor: theme.colors.background }]}>
          <Pressable
            disabled={creating || !walletAddress || !config}
            onPress={() => {
              void createOrder({
                variant: currentVariant,
                walletAddress,
                multisigWalletId: route.params?.multisigWalletId,
              })
                .then(result => {
                  if (result?.orderSn) {
                    Alert.alert(t("common.infoTitle"), t("receive.home.createSuccess"))
                  }
                })
                .catch(() => {
                  Alert.alert(t("common.errorTitle"), t("receive.home.createFailed"))
                })
            }}
            style={[
              styles.submitButton,
              {
                backgroundColor: theme.colors.primary,
                opacity: creating || !walletAddress || !config ? 0.6 : 1,
              },
            ]}
          >
            <Text style={styles.submitText}>
              {creating ? t("common.loading") : activeTab === "individuals" ? t("receive.home.refreshIndividual") : t("receive.home.refreshBusiness")}
            </Text>
          </Pressable>
        </View>
      </View>
    </HomeScaffold>
  )
}

function QuickLink(props: { label: string; onPress: () => void }) {
  const theme = useAppTheme()

  return (
    <Pressable onPress={props.onPress} style={[styles.quickLink, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
      <Text style={[styles.quickText, { color: theme.colors.text }]}>{props.label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  loadingWrap: {
    paddingVertical: 48,
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  emptyBody: {
    fontSize: 13,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  quickLink: {
    width: "48%",
    minHeight: 64,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  quickText: {
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  submitButton: {
    minHeight: 48,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
})
