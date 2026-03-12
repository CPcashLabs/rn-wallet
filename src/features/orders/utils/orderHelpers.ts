import { formatAddress } from "@/features/home/utils/format"
import type { OrderBillAddressItem, OrderDetail, OrderListItem, OrderStatistics, OrderTypeFilter } from "@/features/orders/services/ordersApi"

type Translator = (key: string, options?: Record<string, unknown>) => string

export type RangePreset = "all" | "today" | "yesterday" | "last7d" | "last30d"

export type RangeSelection = {
  preset: RangePreset
  startedAt?: string
  endedAt?: string
  startedTimestamp?: number
  endedTimestamp?: number
}

type TimeRange = {
  startedAt: string
  endedAt: string
  startedTimestamp: number
  endedTimestamp: number
}

export function isIncomingOrderType(orderType: string) {
  return /RECEIPT|TRACE|SEND_RECEIVE/i.test(orderType)
}

export function resolveOrderTypeLabel(t: Translator, orderType: string) {
  if (/SEND_TOKEN/i.test(orderType)) {
    return t("orders.types.sendToken")
  }

  if (/SEND/i.test(orderType)) {
    return t("orders.types.sendCode")
  }

  if (/NATIVE/i.test(orderType)) {
    return t("orders.types.native")
  }

  if (/PAYMENT/i.test(orderType)) {
    return t("orders.types.payment")
  }

  if (/RECEIPT|TRACE/i.test(orderType)) {
    return t("orders.types.receipt")
  }

  return orderType || t("orders.types.unknown")
}

export function resolveOrderStatusLabel(t: Translator, status: number) {
  if (status >= 4) {
    return t("orders.status.finished")
  }

  if (status === 3) {
    return t("orders.status.confirming")
  }

  if (status === 2) {
    return t("orders.status.processing")
  }

  if (status >= 0) {
    return t("orders.status.pending")
  }

  if (status === -6) {
    return t("orders.status.refunded")
  }

  return t("orders.status.closed")
}

export function resolveCounterpartyAddress(order: Pick<OrderListItem, "paymentAddress" | "receiveAddress" | "depositAddress" | "transferAddress" | "orderType">) {
  if (isIncomingOrderType(order.orderType)) {
    return order.paymentAddress || order.transferAddress || order.depositAddress || order.receiveAddress
  }

  return order.receiveAddress || order.transferAddress || order.depositAddress || order.paymentAddress
}

export function resolveDetailCounterparty(order: Pick<OrderDetail, "paymentAddress" | "receiveAddress" | "depositAddress" | "transferAddress" | "orderType">) {
  if (isIncomingOrderType(order.orderType)) {
    return order.paymentAddress || order.transferAddress || order.depositAddress || order.receiveAddress
  }

  return order.receiveAddress || order.transferAddress || order.depositAddress || order.paymentAddress
}

export function formatSignedTokenAmount(orderType: string, amount: number, digits = 4) {
  const sign = isIncomingOrderType(orderType) ? "+" : "-"
  return `${sign}${formatTokenAmount(amount, digits)}`
}

export function formatTokenAmount(value: number, digits = 4) {
  if (!Number.isFinite(value)) {
    return "0"
  }

  return value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  })
}

export function formatTimestamp(value: number | null, options?: Intl.DateTimeFormatOptions) {
  if (!value) {
    return "--"
  }

  try {
    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      ...(options ?? {}),
    }).format(new Date(value))
  } catch {
    return "--"
  }
}

export function formatMonthKey(value: number | null) {
  if (!value) {
    return "Unknown"
  }

  const date = new Date(value)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

export function groupOrdersByMonth(items: OrderListItem[]) {
  const map = new Map<string, OrderListItem[]>()

  items.forEach(item => {
    const key = formatMonthKey(item.createdAt)
    const current = map.get(key) ?? []
    current.push(item)
    map.set(key, current)
  })

  return Array.from(map.entries())
}

export function resolveQuickRange(preset: RangePreset): TimeRange | null {
  if (preset === "all") {
    return null
  }

  const now = new Date()
  let start = new Date(now)
  let end = new Date(now)

  switch (preset) {
    case "today":
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)
      break
    case "yesterday":
      start.setDate(start.getDate() - 1)
      start.setHours(0, 0, 0, 0)
      end = new Date(start)
      end.setHours(23, 59, 59, 999)
      break
    case "last7d":
      start.setDate(start.getDate() - 6)
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)
      break
    case "last30d":
      start.setDate(start.getDate() - 29)
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)
      break
    default:
      return null
  }

  return {
    startedAt: toApiDateTime(start),
    endedAt: toApiDateTime(end),
    startedTimestamp: start.getTime(),
    endedTimestamp: end.getTime(),
  }
}

export function buildRangeSelection(preset: RangePreset): RangeSelection {
  const range = resolveQuickRange(preset)

  return {
    preset,
    startedAt: range?.startedAt,
    endedAt: range?.endedAt,
    startedTimestamp: range?.startedTimestamp,
    endedTimestamp: range?.endedTimestamp,
  }
}

export function toApiDateTime(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hour = String(date.getHours()).padStart(2, "0")
  const minute = String(date.getMinutes()).padStart(2, "0")
  const second = String(date.getSeconds()).padStart(2, "0")

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`
}

export function resolveRangeLabel(t: Translator, preset: RangePreset) {
  switch (preset) {
    case "today":
      return t("orders.filters.today")
    case "yesterday":
      return t("orders.filters.yesterday")
    case "last7d":
      return t("orders.filters.last7d")
    case "last30d":
      return t("orders.filters.last30d")
    default:
      return t("orders.filters.all")
  }
}

export function resolveOrderTypeOptions(t: Translator): Array<{ label: string; value?: OrderTypeFilter }> {
  return [
    { label: t("orders.filters.all"), value: undefined },
    { label: t("orders.types.receipt"), value: "RECEIPT" },
    { label: t("orders.types.payment"), value: "PAYMENT" },
    { label: t("orders.types.sendCode"), value: "SEND" },
    { label: t("orders.types.sendToken"), value: "SEND_TOKEN" },
    { label: t("orders.types.native"), value: "NATIVE" },
  ]
}

export function resolveRangeOptions(t: Translator): Array<{ label: string; value: RangePreset }> {
  return [
    { label: t("orders.filters.all"), value: "all" },
    { label: t("orders.filters.today"), value: "today" },
    { label: t("orders.filters.yesterday"), value: "yesterday" },
    { label: t("orders.filters.last7d"), value: "last7d" },
    { label: t("orders.filters.last30d"), value: "last30d" },
  ]
}

export function resolveOrderBillRangeOptions(t: Translator): Array<{ label: string; value: Exclude<RangePreset, "all"> }> {
  return [
    { label: t("orders.filters.today"), value: "today" },
    { label: t("orders.filters.yesterday"), value: "yesterday" },
    { label: t("orders.filters.last7d"), value: "last7d" },
    { label: t("orders.filters.last30d"), value: "last30d" },
  ]
}

export function resolveCounterpartyLabel(t: Translator, orderType: string) {
  return isIncomingOrderType(orderType) ? t("orders.detail.from") : t("orders.detail.to")
}

export function shouldShowConfirm(order: Pick<OrderDetail, "status" | "statusName">) {
  return order.status === 3 || /confirm/i.test(order.statusName)
}

export function shouldShowRefund(order: Pick<OrderDetail, "status" | "buyerRefundAddress">) {
  return order.status < 0 || Boolean(order.buyerRefundAddress)
}

export function buildFlowProofRange(order: Pick<OrderDetail, "createdAt">, preset: "last7d" | "last30d" | "sinceCreated") {
  const now = new Date()
  let start = new Date(now)

  if (preset === "sinceCreated" && order.createdAt) {
    start = new Date(order.createdAt)
  } else if (preset === "last30d") {
    start.setDate(start.getDate() - 29)
  } else {
    start.setDate(start.getDate() - 6)
  }

  start.setHours(0, 0, 0, 0)
  now.setHours(23, 59, 59, 999)

  return {
    startedAt: toApiDateTime(start),
    endedAt: toApiDateTime(now),
    startedTimestamp: start.getTime(),
    endedTimestamp: now.getTime(),
  }
}

export function summarizeStatistics(stats: OrderStatistics) {
  return [
    { key: "payment", value: formatTokenAmount(stats.paymentAmount, 2) },
    { key: "receipt", value: formatTokenAmount(stats.receiptAmount, 2) },
    { key: "fee", value: formatTokenAmount(stats.fee, 2) },
    { key: "transactions", value: formatTokenAmount(stats.transactions, 0) },
  ]
}

export function formatAddressLabel(address: string, fallback = "--") {
  if (!address) {
    return fallback
  }

  return formatAddress(address, 8, 6)
}

export function resolveBillAddressTitle(item: OrderBillAddressItem) {
  return formatAddressLabel(item.address)
}
