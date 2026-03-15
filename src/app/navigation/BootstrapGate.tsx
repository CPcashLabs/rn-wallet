import React, { useEffect } from "react"

import { useNavigation } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"

import { readAuthSession } from "@/shared/api/auth-session"
import { hydrateI18n } from "@/shared/i18n"
import { purgeLegacyLocalKeyMaterial } from "@/shared/native/localAuthVault"
import { getString } from "@/shared/storage/kvStorage"
import { KvStorageKeys } from "@/shared/storage/sessionKeys"
import { hydrateThemePreference } from "@/shared/theme/themePersistence"
import { useAuthStore } from "@/shared/store/useAuthStore"
import { DEFAULT_WALLET_CHAIN_ID, useWalletStore } from "@/shared/store/useWalletStore"

import type { RootStackParamList } from "@/app/navigation/types"
import { BootScreen } from "@/app/screens/BootScreen"
import { syncCurrentUserProfile } from "@/features/home/hooks/useProfileSync"
import { resolveSupportRoute } from "@/features/support/utils/supportRoutes"

type Navigation = NativeStackNavigationProp<RootStackParamList, "BootstrapGate">

export function BootstrapGate() {
  const navigation = useNavigation<Navigation>()

  useEffect(() => {
    let mounted = true

    const bootstrap = async () => {
      const { clearSession, setBootstrapped, setSession } = useAuthStore.getState()
      const { setWalletState } = useWalletStore.getState()
      const persistedChainId = getString(KvStorageKeys.WalletChainId) ?? DEFAULT_WALLET_CHAIN_ID

      try {
        await Promise.all([hydrateI18n(), hydrateThemePreference(), purgeLegacyLocalKeyMaterial()])

        const session = await readAuthSession()
        if (!mounted) return

        if (session?.accessToken) {
          setSession(session)
          setWalletState({
            status: session.address ? "connected" : "idle",
            address: session.address ?? null,
            chainId: persistedChainId,
          })
          void syncCurrentUserProfile()
          navigation.reset({
            index: 0,
            routes: [{ name: "MainTabs", params: { screen: "HomeTab" } }],
          })
        } else {
          clearSession()
          setWalletState({
            status: "idle",
            address: null,
            chainId: persistedChainId,
          })
          navigation.reset({
            index: 0,
            routes: [{ name: "AuthStack", params: { screen: "LoginScreen" } }],
          })
        }
      } catch {
        if (mounted) {
          clearSession()
          setWalletState({
            status: "idle",
            address: null,
            chainId: persistedChainId,
          })
          const supportRoute = resolveSupportRoute("bootstrap_failed")
          navigation.reset({
            index: 0,
            routes: [{ name: "SupportStack", params: supportRoute }],
          })
        }
      } finally {
        if (mounted) {
          setBootstrapped(true)
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
