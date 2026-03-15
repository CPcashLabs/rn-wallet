import { getJson, setJson } from "@/shared/storage/kvStorage"
import { KvStorageKeys } from "@/shared/storage/sessionKeys"

import type {
  OrderBillAddressItem,
  OrderDetail,
  OrderLabelBinding,
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

type OrderDetailCacheSnapshot = {
  detail: OrderDetail
  labelBinding: OrderLabelBinding
}

type OrderDetailCacheEntry = OrderDetailCacheSnapshot & {
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

export function buildOrderDetailCacheKey(orderSn: string) {
  return `detail::${orderSn}`
}

export function readOrderDetailCache(orderSn: string): OrderDetailCacheSnapshot | null {
  const cacheKey = buildOrderDetailCacheKey(orderSn)
  const entry = readCacheMap<OrderDetailCacheEntry>(KvStorageKeys.OrdersDetailCache)[cacheKey]
  if (!entry) {
    return null
  }

  return {
    detail: entry.detail,
    labelBinding: entry.labelBinding,
  }
}

export function writeOrderDetailCache(orderSn: string, value: OrderDetailCacheSnapshot) {
  const cacheKey = buildOrderDetailCacheKey(orderSn)
  writeCacheMap<OrderDetailCacheEntry>(KvStorageKeys.OrdersDetailCache, cacheKey, {
    ...value,
    cachedAt: Date.now(),
  })
}

export function isOrderDetailCacheSnapshotEqual(left: OrderDetailCacheSnapshot | null, right: OrderDetailCacheSnapshot | null) {
  if (left === right) {
    return true
  }
  if (!left || !right) {
    return false
  }

  return JSON.stringify(left) === JSON.stringify(right)
}

export function countNewOrderRecords(previous: OrderListItem[], next: OrderListItem[]) {
  const previousIds = new Set(previous.map(item => item.orderSn))
  return next.reduce((count, item) => count + (previousIds.has(item.orderSn) ? 0 : 1), 0)
}
