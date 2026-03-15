import { DEFAULT_LANGUAGE, type AppLanguage, isSupportedLanguage } from "@/shared/i18n/resources"

export const SYSTEM_LANGUAGE_PREFERENCE = "system"

export type LanguagePreference = AppLanguage | typeof SYSTEM_LANGUAGE_PREFERENCE

export function isLanguagePreference(value: string | null | undefined): value is LanguagePreference {
  return value === SYSTEM_LANGUAGE_PREFERENCE || isSupportedLanguage(value ?? "")
}

export function mapLocaleToAppLanguage(locale: string | null | undefined): AppLanguage | null {
  if (typeof locale !== "string") {
    return null
  }

  const normalized = locale.trim().replace(/_/g, "-")
  if (!normalized) {
    return null
  }

  const [language = "", region] = normalized.split("-")
  const canonical = region ? `${language.toLowerCase()}-${region.toUpperCase()}` : language.toLowerCase()
  if (isSupportedLanguage(canonical)) {
    return canonical
  }

  const primaryLanguage = language.toLowerCase()
  if (primaryLanguage === "zh") {
    return "zh-CN"
  }
  if (primaryLanguage === "en") {
    return "en-US"
  }

  return null
}

export function resolveLanguageFromPreference(preference: string | null | undefined, systemLocale: string | null | undefined): AppLanguage {
  if (typeof preference === "string" && isSupportedLanguage(preference)) {
    return preference
  }

  return mapLocaleToAppLanguage(systemLocale) ?? DEFAULT_LANGUAGE
}
