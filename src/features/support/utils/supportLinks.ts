import { Linking } from "react-native"

import { getCurrentLanguage } from "@/shared/i18n"

const HELP_HOME_URLS = {
  "en-US": "https://cpcash-1.gitbook.io/cpcash-wallet",
  "zh-CN": "https://cpcash-1.gitbook.io/cpcash-wallet/cn",
} as const

export const UPDATE_LOG_URL = "https://cpcash-1.gitbook.io/cpcash-wallet/announcement/version-update"

export function getSupportGuideUrl() {
  return getCurrentLanguage() === "zh-CN" ? HELP_HOME_URLS["zh-CN"] : HELP_HOME_URLS["en-US"]
}

export async function openSupportUrl(url: string) {
  await Linking.openURL(url)
}
