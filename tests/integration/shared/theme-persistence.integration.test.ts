import { hydrateThemePreference, persistThemePreference } from "@/shared/theme/themePersistence"
import { KvStorageKeys } from "@/shared/storage/sessionKeys"
import { getString, removeItem, setString } from "@/shared/storage/kvStorage"
import { useThemeStore } from "@/shared/store/useThemeStore"

describe("theme persistence integration", () => {
  beforeEach(() => {
    removeItem(KvStorageKeys.ThemeMode)
    useThemeStore.setState({ themeMode: "system" })
  })

  it("persists the selected theme mode to storage and store state", () => {
    persistThemePreference("dark")

    expect(getString(KvStorageKeys.ThemeMode)).toBe("dark")
    expect(useThemeStore.getState().themeMode).toBe("dark")
  })

  it("hydrates a valid stored theme mode into the zustand store", async () => {
    setString(KvStorageKeys.ThemeMode, "light")
    useThemeStore.setState({ themeMode: "dark" })

    await hydrateThemePreference()

    expect(useThemeStore.getState().themeMode).toBe("light")
  })

  it("ignores invalid stored theme modes", async () => {
    setString(KvStorageKeys.ThemeMode, "sepia")

    await hydrateThemePreference()

    expect(useThemeStore.getState().themeMode).toBe("system")
  })
})
