import React, { useMemo, useState } from "react"

import { Pressable, StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { AuthButton } from "@/features/auth/components/AuthButton"
import { AuthScaffold } from "@/features/auth/components/AuthScaffold"
import { PasskeyHistoryModal } from "@/features/auth/components/PasskeyHistoryModal"
import { bindInviteCode, saveRecentPasskey, signInWithMessageSignature, validateAddressExists } from "@/features/auth/services/authApi"
import { persistAuthenticatedSession } from "@/features/auth/services/authSessionOrchestrator"
import { getAuthErrorMessage, getInviteBindingMessage } from "@/features/auth/utils/authMessages"
import { resetToMainTabs } from "@/app/navigation/navigationRef"
import type { AuthStackParamList } from "@/app/navigation/types"
import { useErrorPresenter } from "@/shared/errors/useErrorPresenter"
import { passkeyAdapter, walletAdapter } from "@/shared/native"
import { useAuthStore } from "@/shared/store/useAuthStore"
import { useAppTheme } from "@/shared/theme/useAppTheme"
import { useWalletStore } from "@/shared/store/useWalletStore"
import type { PasskeyHistoryItem } from "@/shared/types/auth"

type Props = NativeStackScreenProps<AuthStackParamList, "LoginScreen">

export function LoginScreen({ navigation, route }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const { presentError, presentMessage } = useErrorPresenter()
  const inviteCode = route.params?.inviteCode
  const recentPasskeys = useAuthStore(state => state.recentPasskeys)
  const setWalletState = useWalletStore(state => state.setWalletState)
  const [loadingType, setLoadingType] = useState<"wallet" | "passkey" | null>(null)
  const [historyVisible, setHistoryVisible] = useState(false)

  const passkeyCapability = useMemo(() => passkeyAdapter.getCapability(), [])
  const walletCapability = useMemo(() => walletAdapter.getCapability(), [])

  const handleInviteCode = async () => {
    if (!inviteCode) {
      return
    }

    try {
      await bindInviteCode(inviteCode)
    } catch (error) {
      presentMessage(getInviteBindingMessage(error), {
        titleKey: "common.infoTitle",
      })
    }
  }

  const finishPasskeySignIn = async (payload: {
    address: string
    signature: string
    message: {
      address: string
      login_time: string
    }
    rawId: string
    credentialId: string
    displayName?: string
  }) => {
    const tokens = await signInWithMessageSignature({
      signature: payload.signature,
      address: payload.address,
      message: JSON.stringify(payload.message),
    })

    await persistAuthenticatedSession({
      ...tokens,
      address: payload.address,
      loginType: "passkey",
      passkeyRawId: payload.rawId,
    })

    saveRecentPasskey({
      credentialId: payload.credentialId,
      rawId: payload.rawId,
      name: payload.displayName ?? payload.address,
      address: payload.address,
    })

    await handleInviteCode()
    resetToMainTabs()
  }

  const authenticatePasskey = async (item?: PasskeyHistoryItem) => {
    setLoadingType("passkey")

    try {
      const result = await passkeyAdapter.authenticate(item?.rawId ? { rawId: item.rawId } : undefined)

      if (!result.ok) {
        throw result.error
      }

      await finishPasskeySignIn(result.data)
    } catch (error) {
      presentError(error, {
        fallbackKey: "auth.errors.passkeyAuthFailed",
      })
    } finally {
      setLoadingType(null)
      setHistoryVisible(false)
    }
  }

  const handlePasskeyLogin = async () => {
    if (!passkeyCapability.supported) {
      presentMessage(getAuthErrorMessage(new Error(passkeyCapability.reason), "auth.errors.passkeyUnsupported"))
      return
    }

    if (recentPasskeys.length > 0) {
      setHistoryVisible(true)
      return
    }

    await authenticatePasskey()
  }

  const handleWalletLogin = async () => {
    setLoadingType("wallet")

    try {
      const connection = await walletAdapter.connect()

      if (!connection.ok) {
        throw connection.error
      }

      setWalletState({
        status: "connected",
        address: connection.data.address,
        chainId: connection.data.chainId ?? null,
      })

      const validation = await validateAddressExists(connection.data.address)

      if (validation.passwordSet) {
        navigation.navigate("PasswordLoginScreen", {
          address: connection.data.address,
          inviteCode,
        })
        return
      }

      navigation.navigate("FirstSetPasswordScreen", {
        address: connection.data.address,
      })
    } catch (error) {
      presentError(error, {
        fallbackKey: walletCapability.supported ? "auth.errors.generic" : "auth.errors.walletUnavailable",
      })
    } finally {
      setLoadingType(null)
    }
  }

  return (
    <>
      <AuthScaffold
        title={t("auth.login.title")}
        subtitle={t("auth.login.subtitle")}
        footer={
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: theme.colors.mutedText }]}>
              {t("auth.login.needPasskey")}
            </Text>
            <Pressable onPress={() => navigation.navigate("PasskeySignupScreen", { inviteCode })}>
              <Text style={[styles.link, { color: theme.colors.primary }]}>
                {t("auth.login.signUp")}
              </Text>
            </Pressable>
          </View>
        }
      >
        <AuthButton label={t("auth.login.passkeyButton")} loading={loadingType === "passkey"} onPress={() => void handlePasskeyLogin()} />
        <AuthButton label={t("auth.login.walletButton")} loading={loadingType === "wallet"} onPress={() => void handleWalletLogin()} variant="secondary" />
        <AuthButton
          label={t("auth.login.importSecretButton")}
          onPress={() => navigation.navigate("ImportWalletLoginScreen", { inviteCode })}
          variant="secondary"
        />

        <Pressable onPress={() => navigation.navigate("PasswordLoginScreen", { inviteCode })} style={styles.textAction}>
          <Text style={[styles.link, { color: theme.colors.primary }]}>
            {t("auth.login.passwordEntry")}
          </Text>
        </Pressable>

        <Pressable onPress={() => navigation.navigate("PasskeyIntroScreen")} style={styles.textAction}>
          <Text style={[styles.link, { color: theme.colors.primary }]}>
            {t("auth.login.passkeyHelp")}
          </Text>
        </Pressable>
      </AuthScaffold>

      <PasskeyHistoryModal
        items={recentPasskeys}
        loading={loadingType === "passkey"}
        onClose={() => setHistoryVisible(false)}
        onSelect={item => void authenticatePasskey(item)}
        onSignUp={() => {
          setHistoryVisible(false)
          navigation.navigate("PasskeySignupScreen", {
            inviteCode,
          })
        }}
        visible={historyVisible}
      />
    </>
  )
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  footerText: {
    fontSize: 14,
  },
  textAction: {
    alignItems: "center",
  },
  link: {
    fontSize: 14,
    fontWeight: "700",
  },
})
