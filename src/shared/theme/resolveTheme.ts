import type { ColorSchemeName } from "react-native"

import type { ThemeMode } from "@/shared/store/useThemeStore"
import { darkThemeTokens, lightThemeTokens } from "@/shared/theme/tokens"

export function resolveTheme(themeMode: ThemeMode, systemScheme: ColorSchemeName) {
  if (themeMode === "dark") {
    return darkThemeTokens
  }

  if (themeMode === "light") {
    return lightThemeTokens
  }

  return systemScheme === "dark" ? darkThemeTokens : lightThemeTokens
}

