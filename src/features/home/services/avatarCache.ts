import { getJson, removeItem, setJson } from "@/shared/storage/kvStorage"
import { KvStorageKeys } from "@/shared/storage/sessionKeys"

type StoredAvatarCacheEntry = {
  accountKey: string
  avatarUri?: string
  resolvedUri?: string
  remoteUri?: string
  localUri?: string
  updatedAt: number
}

export type AvatarCacheEntry = {
  accountKey: string
  remoteUri: string
  localUri: string
  fallbackRemoteUri: string
  updatedAt: number
}

type AvatarCacheMap = Record<string, StoredAvatarCacheEntry>

const MAX_AVATAR_CACHE_ENTRIES = 12

function normalizeAccountKey(accountKey?: string | null) {
  return accountKey?.trim().toLowerCase() || ""
}

function normalizeAvatarUri(avatarUri?: string | null) {
  return avatarUri?.trim() || ""
}

function normalizeStoredEntry(accountKey: string, entry?: StoredAvatarCacheEntry | null): AvatarCacheEntry | null {
  if (!entry) {
    return null
  }

  const remoteUri = normalizeAvatarUri(entry.remoteUri)
  const localUri = normalizeAvatarUri(entry.localUri)
  const fallbackRemoteUri = normalizeAvatarUri(entry.resolvedUri || entry.remoteUri || entry.avatarUri)

  return {
    accountKey,
    remoteUri,
    localUri,
    fallbackRemoteUri,
    updatedAt: typeof entry.updatedAt === "number" ? entry.updatedAt : 0,
  }
}

function readAvatarCacheMap() {
  return getJson<AvatarCacheMap>(KvStorageKeys.UserAvatarCache) ?? {}
}

export function readCachedAvatarEntry(accountKey?: string | null): AvatarCacheEntry | null {
  const normalizedAccountKey = normalizeAccountKey(accountKey)
  if (!normalizedAccountKey) {
    return null
  }

  return normalizeStoredEntry(normalizedAccountKey, readAvatarCacheMap()[normalizedAccountKey])
}

function writeAvatarCacheMap(cacheMap: AvatarCacheMap) {
  const entries = Object.entries(cacheMap)
  if (entries.length === 0) {
    removeItem(KvStorageKeys.UserAvatarCache)
    return
  }

  const trimmedEntries = entries
    .sort(([, left], [, right]) => right.updatedAt - left.updatedAt)
    .slice(0, MAX_AVATAR_CACHE_ENTRIES)

  setJson(KvStorageKeys.UserAvatarCache, Object.fromEntries(trimmedEntries))
}

export function writeCachedAvatarEntry(input: {
  accountKey?: string | null
  remoteUri?: string | null
  localUri?: string | null
}) {
  const normalizedAccountKey = normalizeAccountKey(input.accountKey)
  const normalizedRemoteUri = normalizeAvatarUri(input.remoteUri)
  const normalizedLocalUri = normalizeAvatarUri(input.localUri)

  if (!normalizedAccountKey || !normalizedRemoteUri || !normalizedLocalUri) {
    return
  }

  const cacheMap = readAvatarCacheMap()
  cacheMap[normalizedAccountKey] = {
    accountKey: normalizedAccountKey,
    avatarUri: normalizedRemoteUri,
    resolvedUri: normalizedRemoteUri,
    remoteUri: normalizedRemoteUri,
    localUri: normalizedLocalUri,
    updatedAt: Date.now(),
  }
  writeAvatarCacheMap(cacheMap)
}

export function removeCachedAvatarEntry(accountKey?: string | null) {
  const normalizedAccountKey = normalizeAccountKey(accountKey)
  if (!normalizedAccountKey) {
    return
  }

  const cacheMap = readAvatarCacheMap()
  if (!cacheMap[normalizedAccountKey]) {
    return
  }

  delete cacheMap[normalizedAccountKey]
  writeAvatarCacheMap(cacheMap)
}
