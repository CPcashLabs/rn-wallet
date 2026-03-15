import { getJson, setJson } from "@/shared/storage/kvStorage"
import { KvStorageKeys } from "@/shared/storage/sessionKeys"

type HomeBalanceCacheEntry = {
  totalAssetValue: number
  cachedAt: number
}

const MAX_CACHE_ENTRIES = 12

function readCacheMap() {
  return getJson<Record<string, HomeBalanceCacheEntry>>(KvStorageKeys.HomeBalanceCache) ?? {}
}

export function buildHomeBalanceCacheKey(input: {
  address?: string | null
  chainId?: string | number | null
}) {
  const address = input.address?.trim().toLowerCase()

  if (!address) {
    return null
  }

  return `${address}::${String(input.chainId ?? "unknown")}`
}

export function readHomeBalanceCache(cacheKey: string) {
  return readCacheMap()[cacheKey] ?? null
}

export function writeHomeBalanceCache(
  cacheKey: string,
  value: Omit<HomeBalanceCacheEntry, "cachedAt">,
) {
  const current = readCacheMap()
  const nextEntries = Object.entries({
    ...current,
    [cacheKey]: {
      ...value,
      cachedAt: Date.now(),
    },
  })
    .sort(([, left], [, right]) => right.cachedAt - left.cachedAt)
    .slice(0, MAX_CACHE_ENTRIES)

  setJson(KvStorageKeys.HomeBalanceCache, Object.fromEntries(nextEntries))
}
