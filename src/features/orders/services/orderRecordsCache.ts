import { getJson, setJson } from "@/shared/storage/kvStorage"
import { KvStorageKeys } from "@/shared/storage/sessionKeys"

import type {
  OrderBillAddressItem,
  OrderListItem,
  OrderStatistics,
  OrderTypeFilter,
  RangeQuery,
} from "@/features/orders/services/ordersApi"

type OrderLogsCacheEntry = {
  items: OrderListItem[]
  statistics: OrderStatistics
  page: number
  total: number
  cachedAt: number
}

type OrderBillCacheEntry = {
  items: OrderBillAddressItem[]
  statistics: OrderStatistics
  cachedAt: number
}

const MAX_CACHE_ENTRIES = 18

function readCacheMap<T extends { cachedAt: number }>(storageKey: KvStorageKeys) {
  return getJson<Record<string, T>>(storageKey) ?? {}
}

function writeCacheMap<T extends { cachedAt: number }>(storageKey: KvStorageKeys, key: string, value: T) {
  const current = readCacheMap<T>(storageKey)
  const nextEntries = Object.entries({
    ...current,
    [key]: value,
  })
    .sort(([, left], [, right]) => right.cachedAt - left.cachedAt)
    .slice(0, MAX_CACHE_ENTRIES)

  setJson(storageKey, Object.fromEntries(nextEntries))
}

function resolveRangeKey(input: RangeQuery) {
  return [input.startedAt ?? "", input.endedAt ?? "", input.startedTimestamp ?? "", input.endedTimestamp ?? ""].join("|")
}

export function buildOrderLogsCacheKey(input: {
  otherAddress?: string
  orderType?: OrderTypeFilter
} & RangeQuery) {
  return `logs::${input.otherAddress ?? "all"}::${input.orderType ?? "all"}::${resolveRangeKey(input)}`
}

export function readOrderLogsCache(cacheKey: string) {
  return readCacheMap<OrderLogsCacheEntry>(KvStorageKeys.OrdersTxlogsCache)[cacheKey] ?? null
}

export function writeOrderLogsCache(
  cacheKey: string,
  value: Omit<OrderLogsCacheEntry, "cachedAt">,
) {
  writeCacheMap<OrderLogsCacheEntry>(KvStorageKeys.OrdersTxlogsCache, cacheKey, {
    ...value,
    cachedAt: Date.now(),
  })
}

export function buildOrderBillCacheKey(input: RangeQuery) {
  return `bill::${resolveRangeKey(input)}`
}

export function readOrderBillCache(cacheKey: string) {
  return readCacheMap<OrderBillCacheEntry>(KvStorageKeys.OrdersBillCache)[cacheKey] ?? null
}

export function writeOrderBillCache(
  cacheKey: string,
  value: Omit<OrderBillCacheEntry, "cachedAt">,
) {
  writeCacheMap<OrderBillCacheEntry>(KvStorageKeys.OrdersBillCache, cacheKey, {
    ...value,
    cachedAt: Date.now(),
  })
}

export function countNewOrderRecords(previous: OrderListItem[], next: OrderListItem[]) {
  const previousIds = new Set(previous.map(item => item.orderSn))
  return next.reduce((count, item) => count + (previousIds.has(item.orderSn) ? 0 : 1), 0)
}
