function loadSystemLanguageModule(input?: {
  os?: string
  settingsManager?: Record<string, unknown>
  i18nManager?: Record<string, unknown>
}) {
  jest.resetModules()
  jest.doMock("react-native", () => ({
    NativeModules: {
      SettingsManager: input?.settingsManager,
      I18nManager: input?.i18nManager,
    },
    Platform: {
      OS: input?.os ?? "ios",
    },
  }))

  return require("@/shared/i18n/systemLanguage") as typeof import("@/shared/i18n/systemLanguage")
}

describe("systemLanguage", () => {
  it("prefers the first iOS Apple language over locale fallbacks", () => {
    const mod = loadSystemLanguageModule({
      os: "ios",
      settingsManager: {
        settings: {
          AppleLanguages: ["en_US", "zh_CN"],
          AppleLocale: "zh_CN",
        },
      },
      i18nManager: {
        localeIdentifier: "zh_CN",
      },
    })

    expect(mod.resolveSystemLanguage()).toBe("en-US")
  })

  it("falls back to the iOS Apple locale when AppleLanguages is not an array", () => {
    const mod = loadSystemLanguageModule({
      os: "ios",
      settingsManager: {
        settings: {
          AppleLanguages: "en_US",
          AppleLocale: "zh_CN",
        },
      },
    })

    expect(mod.resolveSystemLanguage()).toBe("zh-CN")
  })

  it("prefers the Android locale identifier and falls back to Apple locale or language", () => {
    const identifierFirst = loadSystemLanguageModule({
      os: "android",
      settingsManager: {
        settings: {
          AppleLanguages: ["en_US"],
          AppleLocale: "en_US",
        },
      },
      i18nManager: {
        localeIdentifier: "zh_CN",
      },
    })
    const localeFallback = loadSystemLanguageModule({
      os: "android",
      settingsManager: {
        settings: {
          AppleLanguages: ["en_US"],
          AppleLocale: "zh_CN",
        },
      },
      i18nManager: {
        localeIdentifier: 123,
      },
    })
    const languageFallback = loadSystemLanguageModule({
      os: "android",
      settingsManager: {
        settings: {
          AppleLanguages: ["en_US"],
          AppleLocale: 456,
        },
      },
      i18nManager: {
        localeIdentifier: null,
      },
    })

    expect(identifierFirst.resolveSystemLanguage()).toBe("zh-CN")
    expect(localeFallback.resolveSystemLanguage()).toBe("zh-CN")
    expect(languageFallback.resolveSystemLanguage()).toBe("en-US")
  })

  it("falls back to the default language when no native locale can be mapped", () => {
    const missingLocale = loadSystemLanguageModule({
      os: "android",
      settingsManager: {
        settings: {},
      },
      i18nManager: {},
    })
    const unsupportedLocale = loadSystemLanguageModule({
      os: "android",
      settingsManager: {
        settings: {
          AppleLocale: "fr_FR",
        },
      },
    })

    expect(missingLocale.resolveSystemLanguage()).toBe("en-US")
    expect(unsupportedLocale.resolveSystemLanguage()).toBe("en-US")
  })
})
