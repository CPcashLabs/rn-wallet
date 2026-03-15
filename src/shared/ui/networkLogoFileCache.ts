import { NativeCapabilityUnavailableError } from "@/shared/errors"
import { cacheNativeRemoteImage, removeNativeCachedImage, supportsNativeRemoteImageCache } from "@/shared/native/nativeFilePickerModule"

export function supportsNetworkLogoFileCache() {
  return supportsNativeRemoteImageCache()
}

export async function cacheNetworkLogoToFile(input: {
  logoKey?: string | null
  remoteUri?: string | null
}) {
  const logoKey = input.logoKey?.trim().toLowerCase() || ""
  const remoteUri = input.remoteUri?.trim() || ""

  if (!logoKey || !remoteUri || !supportsNetworkLogoFileCache()) {
    return null
  }

  try {
    const result = await cacheNativeRemoteImage(`network-logo-${logoKey}`, remoteUri)
    return result.localUri?.trim() || null
  } catch (error) {
    if (error instanceof NativeCapabilityUnavailableError) {
      return null
    }

    throw error
  }
}

export async function removeNetworkLogoFile(localUri?: string | null) {
  const normalizedLocalUri = localUri?.trim() || ""

  if (!normalizedLocalUri || !supportsNetworkLogoFileCache()) {
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
