import { getString, setString } from "@/shared/storage/kvStorage"
import { KvStorageKeys } from "@/shared/storage/sessionKeys"
import { useThemeStore, type ThemeMode } from "@/shared/store/useThemeStore"

const validModes = new Set<ThemeMode>(["system", "light", "dark"])

export async function hydrateThemePreference() {
  const stored = getString(KvStorageKeys.ThemeMode)
  if (stored && validModes.has(stored as ThemeMode)) {
    useThemeStore.getState().setThemeMode(stored as ThemeMode)
  }
}

export function persistThemePreference(themeMode: ThemeMode) {
  setString(KvStorageKeys.ThemeMode, themeMode)
  useThemeStore.getState().setThemeMode(themeMode)
}

