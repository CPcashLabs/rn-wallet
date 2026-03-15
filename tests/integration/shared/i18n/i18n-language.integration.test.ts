type NativeLocaleOptions = {
  os?: "ios" | "android"
  appleLanguages?: string[]
  appleLocale?: string
  localeIdentifier?: string
}

async function loadLanguageHarness(options: NativeLocaleOptions = {}) {
  jest.resetModules()
  jest.doMock("react-native", () => ({
    NativeModules: {
      SettingsManager: {
        settings: {
          AppleLanguages: options.appleLanguages,
          AppleLocale: options.appleLocale,
        },
      },
      I18nManager: {
        localeIdentifier: options.localeIdentifier,
      },
    },
    Platform: {
      OS: options.os ?? "ios",
    },
  }))

  const i18nModule = require("@/shared/i18n")
  const languageHeaderModule = require("@/shared/api/language-header")
  const languagePreferenceModule = require("@/shared/i18n/languagePreference")
  const systemLanguageModule = require("@/shared/i18n/systemLanguage")
  const storageModule = require("@/shared/storage/kvStorage")
  const sessionKeysModule = require("@/shared/storage/sessionKeys")

  return {
    ...i18nModule,
    ...languageHeaderModule,
    ...languagePreferenceModule,
    ...systemLanguageModule,
    ...storageModule,
    KvStorageKeys: sessionKeysModule.KvStorageKeys,
  }
}

describe("i18n and language preference integration", () => {
  afterEach(() => {
    jest.resetModules()
    jest.unmock("react-native")
  })

  it("resolves locale variants across iOS and Android system sources", async () => {
    const iosHarness = await loadLanguageHarness({
      os: "ios",
      appleLanguages: ["zh_CN"],
      appleLocale: "en_US",
    })

    expect(iosHarness.resolveSystemLanguage()).toBe("zh-CN")
    expect(iosHarness.mapLocaleToAppLanguage("zh")).toBe("zh-CN")
    expect(iosHarness.mapLocaleToAppLanguage("en_GB")).toBe("en-US")
    expect(iosHarness.mapLocaleToAppLanguage("zh-CN")).toBe("zh-CN")
    expect(iosHarness.mapLocaleToAppLanguage("fr-FR")).toBeNull()
    expect(iosHarness.mapLocaleToAppLanguage("   ")).toBeNull()
    expect(iosHarness.mapLocaleToAppLanguage(null)).toBeNull()
    expect(iosHarness.resolveLanguageFromPreference("zh-CN", "en_US")).toBe("zh-CN")
    expect(iosHarness.resolveLanguageFromPreference("system", "zh_CN")).toBe("zh-CN")
    expect(iosHarness.resolveLanguageFromPreference("invalid", "fr-FR")).toBe("en-US")

    const androidHarness = await loadLanguageHarness({
      os: "android",
      localeIdentifier: "en_GB",
      appleLocale: "zh_CN",
    })

    expect(androidHarness.resolveSystemLanguage()).toBe("en-US")

    const androidFallbackHarness = await loadLanguageHarness({
      os: "android",
      appleLocale: "zh_CN",
    })

    expect(androidFallbackHarness.resolveSystemLanguage()).toBe("zh-CN")

    const androidAppleLanguagesHarness = await loadLanguageHarness({
      os: "android",
      appleLanguages: ["en_US"],
    })

    expect(androidAppleLanguagesHarness.resolveSystemLanguage()).toBe("en-US")

    const androidDefaultHarness = await loadLanguageHarness({
      os: "android",
    })

    expect(androidDefaultHarness.resolveSystemLanguage()).toBe("en-US")
  })

  it("persists supported language preferences and resolves headers from the live i18n state", async () => {
    const harness = await loadLanguageHarness({
      os: "ios",
      appleLanguages: ["en_US"],
    })

    expect(harness.getLanguagePreference()).toBe("system")

    await harness.setLanguage("zh-CN")

    expect(harness.getLanguagePreference()).toBe("zh-CN")
    expect(harness.getString(harness.KvStorageKeys.AppLanguage)).toBe("zh-CN")
    expect(harness.getCurrentLanguage()).toBe("zh-CN")
    expect(harness.resolveAcceptLanguage()).toBe("zh-CN")
  })

  it("falls back to the system language for unsupported preferences and unsupported active languages", async () => {
    const harness = await loadLanguageHarness({
      os: "ios",
      appleLanguages: ["zh_CN"],
    })

    await harness.setLanguage("fr-FR")

    expect(harness.getLanguagePreference()).toBe("system")
    expect(harness.getString(harness.KvStorageKeys.AppLanguage)).toBeNull()
    expect(harness.getCurrentLanguage()).toBe("zh-CN")

    await harness.i18n.changeLanguage("fr-FR")

    expect(harness.getCurrentLanguage()).toBe("zh-CN")
    expect(harness.resolveAcceptLanguage()).toBe("zh-CN")

    await harness.setLanguagePreference("invalid-language" as never)

    expect(harness.getLanguagePreference()).toBe("system")
    expect(harness.getCurrentLanguage()).toBe("zh-CN")
  })

  it("hydrates stored preferences and respects aborted hydration signals", async () => {
    const harness = await loadLanguageHarness({
      os: "android",
      localeIdentifier: "en_GB",
    })

    harness.setString(harness.KvStorageKeys.AppLanguage, "zh-CN")

    await harness.hydrateI18n()

    expect(harness.i18n.language).toBe("zh-CN")

    await harness.hydrateI18n()

    expect(harness.i18n.language).toBe("zh-CN")

    harness.setString(harness.KvStorageKeys.AppLanguage, "unsupported")
    await harness.i18n.changeLanguage("fr-FR")
    await harness.hydrateI18n()

    expect(harness.i18n.language).toBe("en-US")

    const controller = new AbortController()
    controller.abort()

    await expect(harness.hydrateI18n(controller.signal)).rejects.toMatchObject({
      name: "AbortError",
      message: "I18n hydration aborted.",
    })
  })
})
