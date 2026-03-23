import React, { useEffect, useRef } from "react"

import { useNavigation } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"

import { readAuthSession } from "@/shared/api/auth-session"
import { createLatestTaskController } from "@/shared/async/taskController"
import { hydrateI18n } from "@/shared/i18n"
import { getString } from "@/shared/storage/kvStorage"
import { KvStorageKeys } from "@/shared/storage/sessionKeys"
import { hydrateThemePreference } from "@/shared/theme/themePersistence"
import { useAuthStore } from "@/shared/store/useAuthStore"
import { DEFAULT_WALLET_CHAIN_ID, useWalletStore } from "@/shared/store/useWalletStore"

import type { RootStackParamList } from "@/app/navigation/types"
import { BootScreen } from "@/app/screens/BootScreen"
import { syncCurrentUserProfile } from "@/features/home"
import { resolveSupportRoute } from "@/features/support"

type Navigation = NativeStackNavigationProp<RootStackParamList, "BootstrapGate">

export function BootstrapGate() {
  const navigation = useNavigation<Navigation>()
  const bootstrapControllerRef = useRef(createLatestTaskController())

  useEffect(() => {
    const run = bootstrapControllerRef.current.begin()
    const isCurrentRun = run.isCurrent

    const bootstrap = async () => {
      const { clearSession, setBootstrapped, setSession } = useAuthStore.getState()
      const { setWalletState } = useWalletStore.getState()
      const persistedChainId = getString(KvStorageKeys.WalletChainId) ?? DEFAULT_WALLET_CHAIN_ID
      const { signal } = run

      try {
        await Promise.all([hydrateI18n(signal), hydrateThemePreference(signal)])
        if (!isCurrentRun()) {
          return
        }

        const session = await readAuthSession(signal)
        if (!isCurrentRun()) {
          return
        }

        if (session?.accessToken) {
          if (!isCurrentRun()) {
            return
          }

          setSession(session)
          setWalletState({
            status: session.address ? "connected" : "idle",
            address: session.address ?? null,
            chainId: persistedChainId,
          })

          if (!isCurrentRun()) {
            return
          }

          // Let profile sync continue after BootstrapGate resets away.
          void syncCurrentUserProfile(false)
          navigation.reset({
            index: 0,
            routes: [{ name: "MainTabs", params: { screen: "HomeTab" } }],
          })
        } else {
          if (!isCurrentRun()) {
            return
          }

          clearSession()
          setWalletState({
            status: "idle",
            address: null,
            chainId: persistedChainId,
          })

          if (!isCurrentRun()) {
            return
          }

          navigation.reset({
            index: 0,
            routes: [{ name: "AuthStack", params: { screen: "LoginScreen" } }],
          })
        }
      } catch {
        if (!isCurrentRun()) {
          return
        }

        clearSession()
        setWalletState({
          status: "idle",
          address: null,
          chainId: persistedChainId,
        })

        if (!isCurrentRun()) {
          return
        }

        const supportRoute = resolveSupportRoute("bootstrap_failed")
        navigation.reset({
          index: 0,
          routes: [{ name: "SupportStack", params: supportRoute }],
        })
      } finally {
        if (isCurrentRun()) {
          setBootstrapped(true)
        }
      }
    }

    void bootstrap()

    return () => {
      run.cancel()
    }
  }, [navigation])

  return <BootScreen />
}
