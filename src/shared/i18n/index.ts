import i18n from "i18next"
import { initReactI18next } from "react-i18next"

import { DEFAULT_LANGUAGE, isSupportedLanguage, resources } from "@/shared/i18n/resources"
import { SYSTEM_LANGUAGE_PREFERENCE, type LanguagePreference, isLanguagePreference, resolveLanguageFromPreference } from "@/shared/i18n/languagePreference"
import { resolveSystemLanguage } from "@/shared/i18n/systemLanguage"
import { getString, removeItem, setString } from "@/shared/storage/kvStorage"
import { KvStorageKeys } from "@/shared/storage/sessionKeys"

function readStoredLanguagePreference(): LanguagePreference {
  const storedLanguage = getString(KvStorageKeys.AppLanguage)
  return isLanguagePreference(storedLanguage) ? storedLanguage : SYSTEM_LANGUAGE_PREFERENCE
}

void i18n.use(initReactI18next).init({
  compatibilityJSON: "v4",
  lng: resolveLanguageFromPreference(readStoredLanguagePreference(), resolveSystemLanguage()),
  fallbackLng: DEFAULT_LANGUAGE,
  resources,
  interpolation: {
    escapeValue: false,
  },
})

export { i18n }

export async function hydrateI18n() {
  const nextLanguage = resolveLanguageFromPreference(readStoredLanguagePreference(), resolveSystemLanguage())

  if (nextLanguage !== i18n.language) {
    await i18n.changeLanguage(nextLanguage)
  }
}

export async function setLanguage(language: string) {
  const nextPreference = isSupportedLanguage(language) ? language : SYSTEM_LANGUAGE_PREFERENCE
  await setLanguagePreference(nextPreference)
}

export async function setLanguagePreference(preference: LanguagePreference) {
  const nextPreference = isLanguagePreference(preference) ? preference : SYSTEM_LANGUAGE_PREFERENCE
  if (nextPreference === SYSTEM_LANGUAGE_PREFERENCE) {
    removeItem(KvStorageKeys.AppLanguage)
  } else {
    setString(KvStorageKeys.AppLanguage, nextPreference)
  }

  const nextLanguage = resolveLanguageFromPreference(nextPreference, resolveSystemLanguage())
  if (nextLanguage !== i18n.language) {
    await i18n.changeLanguage(nextLanguage)
  }
}

export function getLanguagePreference(): LanguagePreference {
  return readStoredLanguagePreference()
}

export function getCurrentLanguage() {
  return isSupportedLanguage(i18n.language) ? i18n.language : resolveSystemLanguage()
}
