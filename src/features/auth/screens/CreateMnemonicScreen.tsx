import React, { useMemo, useState } from "react"

import * as bip39 from "bip39"
import { Wallet } from "ethers"
import { StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { AuthButton } from "@/features/auth/components/AuthButton"
import { AuthScaffold } from "@/features/auth/components/AuthScaffold"
import type { AuthStackParamList } from "@/app/navigation/types"
import { useErrorPresenter } from "@/shared/errors/useErrorPresenter"
import { walletAdapter } from "@/shared/native"
import { useWalletStore } from "@/shared/store/useWalletStore"
import { useAppTheme } from "@/shared/theme/useAppTheme"

type Props = NativeStackScreenProps<AuthStackParamList, "CreateMnemonicScreen">

function generateMnemonicSecret() {
  return bip39.generateMnemonic()
}

export function CreateMnemonicScreen({ navigation }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const { presentError, presentMessage } = useErrorPresenter()
  const setWalletState = useWalletStore(state => state.setWalletState)
  const walletCapability = useMemo(() => walletAdapter.getCapability(), [])
  const [mnemonic, setMnemonic] = useState(generateMnemonicSecret)
  const [submitting, setSubmitting] = useState(false)

  const words = useMemo(() => mnemonic.split(" "), [mnemonic])
  const previewAddress = useMemo(() => Wallet.fromPhrase(mnemonic).address, [mnemonic])

  const handleCreate = async () => {
    if (!walletCapability.supported) {
      presentMessage(walletCapability.reason ?? t("auth.errors.walletUnavailable"))
      return
    }

    setSubmitting(true)

    try {
      const imported = await walletAdapter.importSecret(mnemonic)

      if (!imported.ok) {
        throw imported.error
      }

      setWalletState({
        status: "connected",
        address: imported.data.address,
        chainId: imported.data.chainId ?? null,
      })

      navigation.navigate("FirstSetPasswordScreen", {
        address: imported.data.address,
      })
    } catch (error) {
      presentError(error, {
        fallbackKey: "auth.errors.createMnemonicFailed",
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthScaffold
      canGoBack
      onBack={navigation.goBack}
      title={t("auth.createMnemonic.title")}
      subtitle={t("auth.createMnemonic.subtitle")}
    >
      <View style={[styles.noticeCard, { backgroundColor: theme.colors.surfaceMuted ?? theme.colors.surface, borderColor: theme.colors.border }]}>
        <Text style={[styles.noticeTitle, { color: theme.colors.text }]}>
          {t("auth.createMnemonic.warningTitle")}
        </Text>
        <Text style={[styles.noticeBody, { color: theme.colors.mutedText }]}>
          {t("auth.createMnemonic.warningBody")}
        </Text>
      </View>

      <View style={styles.wordsGrid}>
        {words.map((word, index) => (
          <View
            key={`${word}-${index}`}
            style={[
              styles.wordCard,
              {
                backgroundColor: theme.colors.surfaceMuted ?? theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text style={[styles.wordIndex, { color: theme.colors.mutedText }]}>
              {index + 1}
            </Text>
            <Text style={[styles.wordText, { color: theme.colors.text }]}>
              {word}
            </Text>
          </View>
        ))}
      </View>

      <Text style={[styles.addressHint, { color: theme.colors.mutedText }]}>
        {t("auth.createMnemonic.addressHint", { address: previewAddress })}
      </Text>

      <AuthButton
        disabled={submitting}
        label={t("auth.createMnemonic.regenerate")}
        onPress={() => setMnemonic(generateMnemonicSecret())}
        variant="secondary"
      />
      <AuthButton
        label={t("auth.createMnemonic.submit")}
        loading={submitting}
        onPress={() => void handleCreate()}
      />
    </AuthScaffold>
  )
}

const styles = StyleSheet.create({
  noticeCard: {
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
    padding: 16,
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  noticeBody: {
    fontSize: 13,
    lineHeight: 20,
  },
  wordsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  wordCard: {
    width: "48%",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  wordIndex: {
    fontSize: 13,
    fontWeight: "700",
    minWidth: 18,
  },
  wordText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
  },
  addressHint: {
    fontSize: 13,
    lineHeight: 20,
  },
})
