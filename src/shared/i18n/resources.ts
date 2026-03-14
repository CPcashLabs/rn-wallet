import { enUsResource } from "@/shared/i18n/locales/en-US"
import { zhCnResource } from "@/shared/i18n/locales/zh-CN"

export const DEFAULT_LANGUAGE = "en-US"

export const resources = {
  "en-US": enUsResource,
  "zh-CN": zhCnResource,
} as const

export type AppLanguage = keyof typeof resources

export function isSupportedLanguage(language: string): language is AppLanguage {
  return language in resources
}
