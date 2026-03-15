import { NativeModules, Platform } from "react-native"

import { DEFAULT_LANGUAGE } from "@/shared/i18n/resources"
import { mapLocaleToAppLanguage } from "@/shared/i18n/languagePreference"

type SettingsManagerShape = {
  settings?: {
    AppleLanguages?: string[]
    AppleLocale?: string
  }
}

type I18nManagerShape = {
  localeIdentifier?: string
}

function readNativeLocale() {
  const settings = (NativeModules.SettingsManager as SettingsManagerShape | undefined)?.settings
  const appleLanguages = Array.isArray(settings?.AppleLanguages) ? settings.AppleLanguages : []
  const appleLocale = typeof settings?.AppleLocale === "string" ? settings.AppleLocale : null
  const localeIdentifier = typeof (NativeModules.I18nManager as I18nManagerShape | undefined)?.localeIdentifier === "string"
    ? (NativeModules.I18nManager as I18nManagerShape).localeIdentifier
    : null

  if (Platform.OS === "ios") {
    return appleLanguages[0] ?? appleLocale
  }

  return localeIdentifier ?? appleLocale ?? appleLanguages[0] ?? null
}

export function resolveSystemLanguage() {
  return mapLocaleToAppLanguage(readNativeLocale()) ?? DEFAULT_LANGUAGE
}
