import { DEFAULT_LANGUAGE } from "@/shared/i18n/resources"
import { SYSTEM_LANGUAGE_PREFERENCE, mapLocaleToAppLanguage, resolveLanguageFromPreference } from "@/shared/i18n/languagePreference"

describe("language preference resolution", () => {
  it("maps supported Chinese and English system locales into app languages", () => {
    expect(mapLocaleToAppLanguage("zh-Hans-CN")).toBe("zh-CN")
    expect(mapLocaleToAppLanguage("zh_CN")).toBe("zh-CN")
    expect(mapLocaleToAppLanguage("en-GB")).toBe("en-US")
  })

  it("falls back to the default language for unsupported locales", () => {
    expect(resolveLanguageFromPreference(SYSTEM_LANGUAGE_PREFERENCE, "fr-FR")).toBe(DEFAULT_LANGUAGE)
  })

  it("prefers an explicit language over the system locale", () => {
    expect(resolveLanguageFromPreference("en-US", "zh-CN")).toBe("en-US")
    expect(resolveLanguageFromPreference("zh-CN", "en-US")).toBe("zh-CN")
  })

  it("uses the system locale when there is no explicit preference", () => {
    expect(resolveLanguageFromPreference(null, "zh-Hans")).toBe("zh-CN")
    expect(resolveLanguageFromPreference(SYSTEM_LANGUAGE_PREFERENCE, "en_US")).toBe("en-US")
  })
})
