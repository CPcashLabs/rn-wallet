import { NativeCapabilityUnavailableError } from "@/shared/errors"
import { cacheNativeRemoteImage, removeNativeCachedImage, supportsNativeRemoteImageCache } from "@/shared/native/nativeFilePickerModule"

export function supportsAvatarFileCache() {
  return supportsNativeRemoteImageCache()
}

export async function cacheAvatarToFile(input: {
  accountKey?: string | null
  remoteUri?: string | null
}) {
  const accountKey = input.accountKey?.trim().toLowerCase() || ""
  const remoteUri = input.remoteUri?.trim() || ""

  if (!accountKey || !remoteUri || !supportsAvatarFileCache()) {
    return null
  }

  try {
    const result = await cacheNativeRemoteImage(accountKey, remoteUri)
    return result.localUri?.trim() || null
  } catch (error) {
    if (error instanceof NativeCapabilityUnavailableError) {
      return null
    }
    throw error
  }
}

export async function removeAvatarFile(localUri?: string | null) {
  const normalizedLocalUri = localUri?.trim() || ""
  if (!normalizedLocalUri || !supportsAvatarFileCache()) {
    return
  }

  try {
    await removeNativeCachedImage(normalizedLocalUri)
  } catch (error) {
    if (!(error instanceof NativeCapabilityUnavailableError)) {
      throw error
    }
  }
}
