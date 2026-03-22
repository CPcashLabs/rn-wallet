import { getJson, setJson } from "@/shared/storage/kvStorage"
import { KvStorageKeys } from "@/shared/storage/sessionKeys"

import type { OrderListItem, OrderStatistics, OrderTypeFilter, RangeQuery } from "@/features/orders/services/ordersApi"

const MAX_ORDER_LOG_SNAPSHOTS = 18

type OrderLogSnapshotInput = {
  otherAddress?: string
  orderType?: OrderTypeFilter
} & RangeQuery

export type OrderLogSnapshotEntry = {
  items: OrderListItem[]
  statistics: OrderStatistics
  page: number
  total: number
  cachedAt: number
}

function readSnapshotMap() {
  return getJson<Record<string, OrderLogSnapshotEntry>>(KvStorageKeys.OrdersTxlogsCache) ?? {}
}

function resolveRangeKey(input: RangeQuery) {
  return [input.startedAt ?? "", input.endedAt ?? "", input.startedTimestamp ?? "", input.endedTimestamp ?? ""].join("|")
}

export function buildOrderLogSnapshotKey(input: OrderLogSnapshotInput) {
  return `logs::${input.otherAddress ?? "all"}::${input.orderType ?? "all"}::${resolveRangeKey(input)}`
}

export function readOrderLogSnapshot(cacheKey: string) {
  return readSnapshotMap()[cacheKey] ?? null
}

export function writeOrderLogSnapshot(
  cacheKey: string,
  value: Omit<OrderLogSnapshotEntry, "cachedAt">,
) {
  const nextEntries = Object.entries({
    ...readSnapshotMap(),
    [cacheKey]: {
      ...value,
      cachedAt: Date.now(),
    },
  })
    .sort(([, left], [, right]) => right.cachedAt - left.cachedAt)
    .slice(0, MAX_ORDER_LOG_SNAPSHOTS)

  setJson(KvStorageKeys.OrdersTxlogsCache, Object.fromEntries(nextEntries))
}

export function countNewOrderRecords(
  previous: Array<Pick<OrderListItem, "orderSn">>,
  next: Array<Pick<OrderListItem, "orderSn">>,
) {
  const previousIds = new Set(previous.map(item => item.orderSn))
  return next.reduce((count, item) => count + (previousIds.has(item.orderSn) ? 0 : 1), 0)
}
