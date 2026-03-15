import { getJson, removeItem, setJson } from "@/shared/storage/kvStorage"
import { KvStorageKeys } from "@/shared/storage/sessionKeys"

type AvatarCacheEntry = {
  accountKey: string
  avatarUri: string
  resolvedUri: string
  updatedAt: number
}

type AvatarCacheMap = Record<string, AvatarCacheEntry>

const MAX_AVATAR_CACHE_ENTRIES = 12

function normalizeAccountKey(accountKey?: string | null) {
  return accountKey?.trim().toLowerCase() || ""
}

function normalizeAvatarUri(avatarUri?: string | null) {
  return avatarUri?.trim() || ""
}

function readAvatarCacheMap() {
  return getJson<AvatarCacheMap>(KvStorageKeys.UserAvatarCache) ?? {}
}

export function readCachedAvatarEntry(accountKey?: string | null): AvatarCacheEntry | null {
  const normalizedAccountKey = normalizeAccountKey(accountKey)
  if (!normalizedAccountKey) {
    return null
  }

  return readAvatarCacheMap()[normalizedAccountKey] ?? null
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

export function readCachedAvatarSource(input: {
  accountKey?: string | null
  avatarUri?: string | null
}) {
  const normalizedAccountKey = normalizeAccountKey(input.accountKey)
  const normalizedAvatarUri = normalizeAvatarUri(input.avatarUri)

  if (!normalizedAccountKey) {
    return ""
  }

  const entry = readCachedAvatarEntry(normalizedAccountKey)
  if (!entry) {
    return ""
  }

  if (!normalizedAvatarUri) {
    return entry.resolvedUri
  }

  return entry.avatarUri === normalizedAvatarUri ? entry.resolvedUri : ""
}

export function writeCachedAvatarSource(input: {
  accountKey?: string | null
  avatarUri?: string | null
  resolvedUri?: string | null
}) {
  const normalizedAccountKey = normalizeAccountKey(input.accountKey)
  const normalizedAvatarUri = normalizeAvatarUri(input.avatarUri)
  const normalizedResolvedUri = normalizeAvatarUri(input.resolvedUri)

  if (!normalizedAccountKey || !normalizedAvatarUri || !normalizedResolvedUri) {
    return
  }

  const cacheMap = readAvatarCacheMap()
  cacheMap[normalizedAccountKey] = {
    accountKey: normalizedAccountKey,
    avatarUri: normalizedAvatarUri,
    resolvedUri: normalizedResolvedUri,
    updatedAt: Date.now(),
  }
  writeAvatarCacheMap(cacheMap)
}

export function removeCachedAvatarSource(accountKey?: string | null) {
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
