import React, { useEffect, useState } from "react"

import { Alert, Pressable, StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import type { TransferStackParamList } from "@/app/navigation/types"
import { HomeScaffold } from "@/features/home/components/HomeScaffold"
import { checkBttClaim, claimBtt, type BttClaimStatus } from "@/features/receive/services/receiveApi"
import { SectionCard } from "@/features/transfer/components/TransferUi"
import { useWalletStore } from "@/shared/store/useWalletStore"
import { useAppTheme } from "@/shared/theme/useAppTheme"

type Props = NativeStackScreenProps<TransferStackParamList, "BttClaimScreen">

export function BttClaimScreen({ navigation }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const chainId = useWalletStore(state => state.chainId)
  const walletAddress = useWalletStore(state => state.address)
  const [status, setStatus] = useState<BttClaimStatus | null>(null)
  const [claiming, setClaiming] = useState(false)

  const refresh = async () => {
    const next = await checkBttClaim(chainId, walletAddress)
    setStatus(next)
  }

  useEffect(() => {
    void refresh().catch(() => {
      Alert.alert(t("common.errorTitle"), t("receive.btt.loadFailed"))
    })
  }, [chainId, t, walletAddress])

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("receive.btt.title")} scroll={false}>
      <View style={styles.content}>
        <SectionCard>
          <Text style={[styles.amountLabel, { color: theme.colors.mutedText }]}>{t("receive.btt.claimable")}</Text>
          <Text style={[styles.amountValue, { color: theme.colors.text }]}>{status?.claimAmount ?? 0}</Text>
          <Text style={[styles.reason, { color: theme.colors.mutedText }]}>
            {status?.eligible ? t("receive.btt.eligible") : t(`receive.btt.reason.${status?.reasonCode || "DEFAULT"}`)}
          </Text>
        </SectionCard>

        <SectionCard>
          <Text style={[styles.ruleTitle, { color: theme.colors.text }]}>{t("receive.btt.rules")}</Text>
          <Text style={[styles.ruleBody, { color: theme.colors.mutedText }]}>{t("receive.btt.rulesBody")}</Text>
        </SectionCard>

        <Pressable
          disabled={claiming || !status?.eligible}
          onPress={() => {
            void (async () => {
              setClaiming(true)
              try {
                await claimBtt(chainId, walletAddress)
                await refresh()
                Alert.alert(t("common.infoTitle"), t("receive.btt.claimSuccess"))
              } catch {
                Alert.alert(t("common.errorTitle"), t("receive.btt.claimFailed"))
              } finally {
                setClaiming(false)
              }
            })()
          }}
          style={[styles.button, { backgroundColor: theme.colors.primary, opacity: claiming || !status?.eligible ? 0.6 : 1 }]}
        >
          <Text style={styles.buttonText}>{claiming ? t("common.loading") : t("receive.btt.claimNow")}</Text>
        </Pressable>
      </View>
    </HomeScaffold>
  )
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  amountLabel: {
    fontSize: 14,
  },
  amountValue: {
    fontSize: 34,
    fontWeight: "800",
  },
  reason: {
    fontSize: 13,
    lineHeight: 20,
  },
  ruleTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  ruleBody: {
    fontSize: 13,
    lineHeight: 20,
  },
  button: {
    minHeight: 48,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
})
