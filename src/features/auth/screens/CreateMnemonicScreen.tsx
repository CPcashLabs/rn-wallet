import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"

import * as bip39 from "bip39"
import { Buffer } from "buffer"
import { Wallet } from "ethers"
import { InteractionManager, StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { AuthButton } from "@/features/auth/components/AuthButton"
import { AuthScaffold } from "@/features/auth/components/AuthScaffold"
import { SecureEntropyLoader } from "@/features/auth/components/SecureEntropyLoader"
import type { AuthStackParamList } from "@/app/navigation/types"
import { useErrorPresenter } from "@/shared/errors/useErrorPresenter"
import { walletAdapter } from "@/shared/native"
import { useWalletStore } from "@/shared/store/useWalletStore"
import { useAppTheme } from "@/shared/theme/useAppTheme"

type Props = NativeStackScreenProps<AuthStackParamList, "CreateMnemonicScreen">

function getSecureRandomBytes(size: number) {
  const cryptoObject = globalThis.crypto

  if (!cryptoObject?.getRandomValues) {
    throw new Error("crypto.getRandomValues must be defined")
  }

  const bytes = new Uint8Array(size)
  cryptoObject.getRandomValues(bytes)

  return Buffer.from(bytes)
}

function generateMnemonicSecret() {
  return bip39.generateMnemonic(128, size => getSecureRandomBytes(size))
}

function waitForInteractionFrame() {
  return new Promise<void>(resolve => {
    InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(() => resolve())
    })
  })
}

function waitForNextFrame() {
  return new Promise<void>(resolve => {
    requestAnimationFrame(() => resolve())
  })
}

export function CreateMnemonicScreen({ navigation }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const { presentError, presentMessage } = useErrorPresenter()
  const setWalletState = useWalletStore(state => state.setWalletState)
  const walletCapability = useMemo(() => walletAdapter.getCapability(), [])
  const mountedRef = useRef(true)
  const generationRequestIdRef = useRef(0)
  const [mnemonic, setMnemonic] = useState<string | null>(null)
  const [previewAddress, setPreviewAddress] = useState<string | null>(null)
  const [generating, setGenerating] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    return () => {
      mountedRef.current = false
      generationRequestIdRef.current += 1
    }
  }, [])

  const generateMnemonicBundle = useCallback(async () => {
    const requestId = generationRequestIdRef.current + 1
    generationRequestIdRef.current = requestId

    setGenerating(true)
    setMnemonic(null)
    setPreviewAddress(null)

    try {
      await waitForInteractionFrame()

      if (!mountedRef.current || generationRequestIdRef.current !== requestId) {
        return
      }

      const nextMnemonic = generateMnemonicSecret()
      setMnemonic(nextMnemonic)

      await waitForNextFrame()

      if (!mountedRef.current || generationRequestIdRef.current !== requestId) {
        return
      }

      const nextAddress = Wallet.fromPhrase(nextMnemonic).address

      if (!mountedRef.current || generationRequestIdRef.current !== requestId) {
        return
      }

      setPreviewAddress(nextAddress)
      setGenerating(false)
    } catch (error) {
      if (!mountedRef.current || generationRequestIdRef.current !== requestId) {
        return
      }

      setGenerating(false)
      presentError(error, {
        fallbackKey: "auth.errors.createMnemonicFailed",
      })
    }
  }, [presentError])

  useEffect(() => {
    void generateMnemonicBundle()
  }, [generateMnemonicBundle])

  const words = useMemo(() => (mnemonic ? mnemonic.split(" ") : []), [mnemonic])

  const handleCreate = async () => {
    if (!mnemonic || !previewAddress || generating) {
      return
    }

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

      {mnemonic ? (
        <>
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
            {previewAddress
              ? t("auth.createMnemonic.addressHint", { address: previewAddress })
              : t("auth.createMnemonic.addressPending")}
          </Text>
          <Text style={[styles.securityHint, { color: theme.colors.primary }]}>
            {t("auth.createMnemonic.securityHint")}
          </Text>
        </>
      ) : (
        <SecureEntropyLoader
          body={t("auth.createMnemonic.generatingBody")}
          hint={t("auth.createMnemonic.securityHint")}
          title={t("auth.createMnemonic.generatingTitle")}
        />
      )}

      <AuthButton
        disabled={submitting}
        label={t("auth.createMnemonic.regenerate")}
        loading={generating}
        onPress={() => {
          void generateMnemonicBundle()
        }}
        variant="secondary"
      />
      <AuthButton
        label={t("auth.createMnemonic.submit")}
        disabled={generating || !mnemonic || !previewAddress}
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
  securityHint: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
  },
})
