import { sanitizeWechatTargetPath } from "@/app/navigation/deepLinkRouting"
import { removeItem, setBoolean, setString } from "@/shared/storage/kvStorage"
import { KvStorageKeys } from "@/shared/storage/sessionKeys"

export function clearPersistedWechatTargetPath() {
  removeItem(KvStorageKeys.OriginalTargetPath)
  removeItem(KvStorageKeys.WechatInterceptorShown)
}

export function persistWechatTargetPath(targetPath?: string) {
  const sanitized = sanitizeWechatTargetPath(targetPath)

  if (!sanitized) {
    clearPersistedWechatTargetPath()
    return null
  }

  setString(KvStorageKeys.OriginalTargetPath, sanitized)
  setBoolean(KvStorageKeys.WechatInterceptorShown, true)

  return sanitized
}
