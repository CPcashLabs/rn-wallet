import React, { useEffect } from "react"

import { useNavigation } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"

import { readAuthSession } from "@/shared/api/auth-session"
import { hydrateI18n } from "@/shared/i18n"
import { hydrateThemePreference } from "@/shared/theme/themePersistence"
import { useAuthStore } from "@/shared/store/useAuthStore"

import type { RootStackParamList } from "@/app/navigation/types"
import { BootScreen } from "@/app/screens/BootScreen"

type Navigation = NativeStackNavigationProp<RootStackParamList, "BootstrapGate">

export function BootstrapGate() {
  const navigation = useNavigation<Navigation>()

  useEffect(() => {
    let mounted = true

    const bootstrap = async () => {
      try {
        await Promise.all([hydrateI18n(), hydrateThemePreference()])

        const session = await readAuthSession()
        if (!mounted) return

        const authStore = useAuthStore.getState()
        if (session?.accessToken) {
          authStore.setSession(session)
          navigation.reset({
            index: 0,
            routes: [{ name: "MainTabs", params: { screen: "HomeTab" } }],
          })
          return
        }

        authStore.clearSession()
        navigation.reset({
          index: 0,
          routes: [{ name: "AuthStack", params: { screen: "LoginScreen" } }],
        })
      } catch {
        if (!mounted) return
        useAuthStore.getState().clearSession()
        navigation.reset({
          index: 0,
          routes: [{ name: "SupportStack", params: { screen: "SupportPlaceholder", params: { reason: "bootstrap_failed" } } }],
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
