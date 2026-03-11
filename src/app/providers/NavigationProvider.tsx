import React, { type PropsWithChildren, useEffect } from "react"

import { DefaultTheme, NavigationContainer } from "@react-navigation/native"
import { useColorScheme } from "react-native"

import { navigationRef, resetToAuthStack } from "@/app/navigation/navigationRef"
import { setUnauthorizedHandler } from "@/shared/api/interceptors"
import { useNavigationStateStore } from "@/shared/store/useNavigationStateStore"
import { useThemeStore } from "@/shared/store/useThemeStore"
import { resolveTheme } from "@/shared/theme/resolveTheme"

export function NavigationProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme()
  const themeMode = useThemeStore(state => state.themeMode)
  const setLastRouteName = useNavigationStateStore(state => state.setLastRouteName)
  const appTheme = resolveTheme(themeMode, systemScheme)

  useEffect(() => {
    setUnauthorizedHandler(resetToAuthStack)

    return () => {
      setUnauthorizedHandler(null)
    }
  }, [])

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={{
        ...DefaultTheme,
        dark: appTheme.isDark,
        colors: {
          ...DefaultTheme.colors,
          primary: appTheme.colors.primary,
          background: appTheme.colors.background,
          card: appTheme.colors.surface,
          text: appTheme.colors.text,
          border: appTheme.colors.border,
          notification: appTheme.colors.primary,
        },
      }}
      onStateChange={() => {
        setLastRouteName(navigationRef.getCurrentRoute()?.name ?? null)
      }}
    >
      {children}
    </NavigationContainer>
  )
}
