import { create } from "zustand"

export type ThemeMode = "system" | "light" | "dark"

type ThemeState = {
  themeMode: ThemeMode
  setThemeMode: (mode: ThemeMode) => void
}

export const useThemeStore = create<ThemeState>(set => ({
  themeMode: "system",
  setThemeMode: themeMode => set({ themeMode }),
}))

