import { getCurrentLanguage } from "@/shared/i18n"

export function resolveAcceptLanguage() {
  return getCurrentLanguage()
}
