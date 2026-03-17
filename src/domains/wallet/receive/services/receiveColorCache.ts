import { getJson, setJson } from "@/shared/storage/kvStorage"
import { KvStorageKeys } from "@/shared/storage/sessionKeys"

type ReceiveChainColorCacheEntry = {
  color: string
  updatedAt: number
}

const MAX_CACHE_ENTRIES = 24

function normalizePayChain(payChain?: string | null) {
  return payChain?.trim().toLowerCase() || ""
}

function normalizeColor(color?: string | null) {
  return color?.trim() || ""
}

export function resolvePreferredReceiveChainColor(input: {
  cachedColor?: string | null
  routeColor?: string | null
  fallbackColor: string
}) {
  const cachedColor = normalizeColor(input.cachedColor)

  if (cachedColor) {
    return cachedColor
  }

  const routeColor = normalizeColor(input.routeColor)
  return routeColor || input.fallbackColor
}

export function shouldPrimeReceiveChainColorFromRoute(input: {
  cachedColor?: string | null
  routeColor?: string | null
}) {
  return !normalizeColor(input.cachedColor) && Boolean(normalizeColor(input.routeColor))
}

function readCacheMap() {
  return getJson<Record<string, ReceiveChainColorCacheEntry>>(KvStorageKeys.ReceiveChainColorCache) ?? {}
}

export function readCachedReceiveChainColor(payChain?: string | null) {
  const normalizedPayChain = normalizePayChain(payChain)

  if (!normalizedPayChain) {
    return ""
  }

  return readCacheMap()[normalizedPayChain]?.color ?? ""
}

export function writeCachedReceiveChainColor(input: {
  payChain?: string | null
  color?: string | null
}) {
  const normalizedPayChain = normalizePayChain(input.payChain)
  const normalizedColor = normalizeColor(input.color)

  if (!normalizedPayChain || !normalizedColor) {
    return
  }

  const current = readCacheMap()
  const nextEntries = Object.entries({
    ...current,
    [normalizedPayChain]: {
      color: normalizedColor,
      updatedAt: Date.now(),
    },
  })
    .sort(([, left], [, right]) => right.updatedAt - left.updatedAt)
    .slice(0, MAX_CACHE_ENTRIES)

  setJson(KvStorageKeys.ReceiveChainColorCache, Object.fromEntries(nextEntries))
}
