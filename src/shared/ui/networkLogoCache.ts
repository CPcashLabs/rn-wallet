import { removeNetworkLogoFile } from "@/shared/ui/networkLogoFileCache"
import { getJson, removeItem, setJson } from "@/shared/storage/kvStorage"
import { removeRemoteImageCacheEntry, upsertRemoteImageCacheEntry } from "@/shared/storage/remoteImageCacheIndex"
import { KvStorageKeys } from "@/shared/storage/sessionKeys"

type StoredNetworkLogoCacheEntry = {
  logoKey: string
  remoteUri?: string
  localUri?: string
  updatedAt: number
}

export type NetworkLogoCacheEntry = {
  logoKey: string
  remoteUri: string
  localUri: string
  updatedAt: number
}

type NetworkLogoCacheMap = Record<string, StoredNetworkLogoCacheEntry>

const MAX_NETWORK_LOGO_CACHE_ENTRIES = 48
const NETWORK_LOGO_CACHE_VERSION = "v2"

function normalizeLogoKey(logoKey?: string | null) {
  return logoKey?.trim().toLowerCase() || ""
}

function normalizeLogoUri(uri?: string | null) {
  return uri?.trim() || ""
}

function normalizeStoredEntry(logoKey: string, entry?: StoredNetworkLogoCacheEntry | null): NetworkLogoCacheEntry | null {
  if (!entry) {
    return null
  }

  const remoteUri = normalizeLogoUri(entry.remoteUri)
  const localUri = normalizeLogoUri(entry.localUri)

  if (!remoteUri || !localUri) {
    return null
  }

  return {
    logoKey,
    remoteUri,
    localUri,
    updatedAt: typeof entry.updatedAt === "number" ? entry.updatedAt : 0,
  }
}

function readNetworkLogoCacheMap() {
  return getJson<NetworkLogoCacheMap>(KvStorageKeys.NetworkLogoCache) ?? {}
}

function writeNetworkLogoCacheMap(cacheMap: NetworkLogoCacheMap) {
  if (Object.keys(cacheMap).length === 0) {
    removeItem(KvStorageKeys.NetworkLogoCache)
    return
  }

  setJson(KvStorageKeys.NetworkLogoCache, cacheMap)
}

async function cleanupRemovedNetworkLogoFiles(localUris: string[]) {
  await Promise.allSettled(localUris.map(localUri => removeNetworkLogoFile(localUri)))
}

export function buildNetworkLogoCacheKey(input: {
  chainName?: string | null
  fallbackMode?: string | null
}) {
  const normalizedChainName = input.chainName?.trim().toLowerCase() || ""
  const normalizedFallbackMode = input.fallbackMode?.trim().toLowerCase() || "initials"

  if (!normalizedChainName) {
    return ""
  }

  return `${NETWORK_LOGO_CACHE_VERSION}::${normalizedFallbackMode}::${normalizedChainName}`
}

export function readCachedNetworkLogoEntry(logoKey?: string | null) {
  const normalizedLogoKey = normalizeLogoKey(logoKey)

  if (!normalizedLogoKey) {
    return null
  }

  return normalizeStoredEntry(normalizedLogoKey, readNetworkLogoCacheMap()[normalizedLogoKey])
}

export async function writeCachedNetworkLogoEntry(input: {
  logoKey?: string | null
  remoteUri?: string | null
  localUri?: string | null
}) {
  const normalizedLogoKey = normalizeLogoKey(input.logoKey)
  const normalizedRemoteUri = normalizeLogoUri(input.remoteUri)
  const normalizedLocalUri = normalizeLogoUri(input.localUri)

  if (!normalizedLogoKey || !normalizedRemoteUri || !normalizedLocalUri) {
    return
  }

  const cacheMap = readNetworkLogoCacheMap()
  const mutation = upsertRemoteImageCacheEntry<StoredNetworkLogoCacheEntry>(
    cacheMap,
    normalizedLogoKey,
    {
      logoKey: normalizedLogoKey,
      remoteUri: normalizedRemoteUri,
      localUri: normalizedLocalUri,
      updatedAt: Date.now(),
    },
    MAX_NETWORK_LOGO_CACHE_ENTRIES,
  )

  writeNetworkLogoCacheMap(mutation.nextCacheMap)
  await cleanupRemovedNetworkLogoFiles(mutation.removedLocalUris)
}

export async function removeCachedNetworkLogoEntry(logoKey?: string | null) {
  const normalizedLogoKey = normalizeLogoKey(logoKey)

  if (!normalizedLogoKey) {
    return
  }

  const cacheMap = readNetworkLogoCacheMap()
  const mutation = removeRemoteImageCacheEntry<StoredNetworkLogoCacheEntry>(cacheMap, normalizedLogoKey)

  if (mutation.nextCacheMap === cacheMap) {
    return
  }

  writeNetworkLogoCacheMap(mutation.nextCacheMap)
  await cleanupRemovedNetworkLogoFiles(mutation.removedLocalUris)
}
