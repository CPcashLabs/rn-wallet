import i18n from "i18next"
import { initReactI18next } from "react-i18next"

import { DEFAULT_LANGUAGE, isSupportedLanguage, resources } from "@/shared/i18n/resources"
import { getString, setString } from "@/shared/storage/kvStorage"
import { KvStorageKeys } from "@/shared/storage/sessionKeys"

void i18n.use(initReactI18next).init({
  compatibilityJSON: "v4",
  lng: DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  resources,
  interpolation: {
    escapeValue: false,
  },
})

export { i18n }

export async function hydrateI18n() {
  const storedLanguage = getString(KvStorageKeys.AppLanguage)

  if (storedLanguage && isSupportedLanguage(storedLanguage) && storedLanguage !== i18n.language) {
    await i18n.changeLanguage(storedLanguage)
  }
}

export async function setLanguage(language: string) {
  const nextLanguage = isSupportedLanguage(language) ? language : DEFAULT_LANGUAGE
  setString(KvStorageKeys.AppLanguage, nextLanguage)

  if (nextLanguage !== i18n.language) {
    await i18n.changeLanguage(nextLanguage)
  }
}

export function getCurrentLanguage() {
  return isSupportedLanguage(i18n.language) ? i18n.language : DEFAULT_LANGUAGE
}
