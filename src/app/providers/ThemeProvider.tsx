import React, { type PropsWithChildren } from "react"

import { StatusBar, useColorScheme } from "react-native"

import { ThemeContext } from "@/shared/theme/ThemeContext"
import { resolveTheme } from "@/shared/theme/resolveTheme"
import { useThemeStore } from "@/shared/store/useThemeStore"

export function ThemeProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme()
  const themeMode = useThemeStore(state => state.themeMode)
  const theme = resolveTheme(themeMode, systemScheme)

  return (
    <ThemeContext.Provider value={theme}>
      <StatusBar
        animated
        backgroundColor={theme.colors.background}
        barStyle={theme.isDark ? "light-content" : "dark-content"}
      />
      {children}
    </ThemeContext.Provider>
  )
}

