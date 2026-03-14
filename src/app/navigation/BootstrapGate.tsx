import React, { useEffect } from "react"

import { useNavigation } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"

import { readAuthSession } from "@/shared/api/auth-session"
import { hydrateI18n } from "@/shared/i18n"
import { getString } from "@/shared/storage/kvStorage"
import { KvStorageKeys } from "@/shared/storage/sessionKeys"
import { hydrateThemePreference } from "@/shared/theme/themePersistence"
import { useAuthStore } from "@/shared/store/useAuthStore"
import { DEFAULT_WALLET_CHAIN_ID, useWalletStore } from "@/shared/store/useWalletStore"

import type { RootStackParamList } from "@/app/navigation/types"
import { BootScreen } from "@/app/screens/BootScreen"
import { resolveSupportRoute } from "@/features/support/utils/supportRoutes"

type Navigation = NativeStackNavigationProp<RootStackParamList, "BootstrapGate">

export function BootstrapGate() {
  const navigation = useNavigation<Navigation>()

  useEffect(() => {
    let mounted = true

    const bootstrap = async () => {
      try {
        await Promise.all([hydrateI18n(), hydrateThemePreference()])

        const session = await readAuthSession()
        const persistedChainId = getString(KvStorageKeys.WalletChainId) ?? DEFAULT_WALLET_CHAIN_ID
        if (!mounted) return

        const authStore = useAuthStore.getState()
        if (session?.accessToken) {
          authStore.setSession(session)
          useWalletStore.getState().setWalletState({
            status: session.address ? "connected" : "idle",
            address: session.address ?? null,
            chainId: persistedChainId,
          })
          navigation.reset({
            index: 0,
            routes: [{ name: "MainTabs", params: { screen: "HomeTab" } }],
          })
          return
        }

        authStore.clearSession()
        useWalletStore.getState().setWalletState({
          status: "idle",
          address: null,
          chainId: persistedChainId,
        })
        navigation.reset({
          index: 0,
          routes: [{ name: "AuthStack", params: { screen: "LoginScreen" } }],
        })
      } catch {
        if (!mounted) return
        useAuthStore.getState().clearSession()
        useWalletStore.getState().setWalletState({
          status: "idle",
          address: null,
          chainId: getString(KvStorageKeys.WalletChainId) ?? DEFAULT_WALLET_CHAIN_ID,
        })
        const supportRoute = resolveSupportRoute("bootstrap_failed")
        navigation.reset({
          index: 0,
          routes: [{ name: "SupportStack", params: supportRoute }],
        })
      } finally {
        if (mounted) {
          useAuthStore.getState().setBootstrapped(true)
        }
      }
    }

    void bootstrap()

    return () => {
      mounted = false
    }
  }, [navigation])

  return <BootScreen />
}
