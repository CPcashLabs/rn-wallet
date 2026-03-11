import { getString } from "@/shared/storage/kvStorage"
import { KvStorageKeys } from "@/shared/storage/sessionKeys"

const DEFAULT_LANGUAGE = "en-US"

export function resolveAcceptLanguage() {
  return getString(KvStorageKeys.AppLanguage) ?? DEFAULT_LANGUAGE
}

