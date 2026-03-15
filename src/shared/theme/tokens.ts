export const lightThemeTokens = {
  colors: {
    background: "#F5F5F7",
    backgroundMuted: "#ECECF1",
    surface: "rgba(255,255,255,0.94)",
    surfaceElevated: "#FFFFFF",
    surfaceMuted: "#F2F2F7",
    text: "#111111",
    mutedText: "#6E6E73",
    border: "rgba(60,60,67,0.18)",
    primary: "#0A84FF",
    primarySoft: "rgba(10,132,255,0.14)",
    shadow: "#0F172A",
    brand: "#111214",
    brandInverse: "#FFFFFF",
  },
  isDark: false,
}

export const darkThemeTokens = {
  colors: {
    background: "#000000",
    backgroundMuted: "#111214",
    surface: "rgba(28,28,30,0.92)",
    surfaceElevated: "#1C1C1E",
    surfaceMuted: "#2C2C2E",
    text: "#FFFFFF",
    mutedText: "#98989D",
    border: "rgba(84,84,88,0.65)",
    primary: "#0A84FF",
    primarySoft: "rgba(10,132,255,0.22)",
    shadow: "#000000",
    brand: "#F5F5F7",
    brandInverse: "#111214",
  },
  isDark: true,
}

export type AppTheme = typeof lightThemeTokens
