export const lightThemeTokens = {
  colors: {
    background: "#F8FAFC",
    surface: "#FFFFFF",
    text: "#0F172A",
    mutedText: "#475569",
    border: "#E2E8F0",
    primary: "#0F766E",
  },
  isDark: false,
}

export const darkThemeTokens = {
  colors: {
    background: "#020617",
    surface: "#0F172A",
    text: "#F8FAFC",
    mutedText: "#94A3B8",
    border: "#1E293B",
    primary: "#2DD4BF",
  },
  isDark: true,
}

export type AppTheme = typeof lightThemeTokens

