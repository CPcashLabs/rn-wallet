import type { ReceiveLog, ReceiveOrder } from "@/domains/wallet/receive/services/receiveApi"
import { buildReceiveTxlogKey } from "@/domains/wallet/receive/screens/receiveTxlogsPolling"

export type ReceiveTraceOrderType = "TRACE" | "TRACE_LONG_TERM"
export type ReceiveTxlogRecordFilter = "all" | "individuals" | "business"

export type ReceiveTxlogItem = ReceiveLog & {
  sourceOrderType: ReceiveTraceOrderType
}

export function resolveDefaultReceiveTxlogFilter(orderType?: ReceiveTraceOrderType): ReceiveTxlogRecordFilter {
  if (orderType === "TRACE") {
    return "individuals"
  }

  if (orderType === "TRACE_LONG_TERM") {
    return "business"
  }

  return "all"
}

export function buildReceiveTxlogSources(input: {
  orderSn?: string
  orderType?: ReceiveTraceOrderType
  personalOrderSn?: string
  businessOrderSn?: string
}) {
  const sources = new Map<ReceiveTraceOrderType, string>()
  const personalOrderSn = input.personalOrderSn?.trim()
  const businessOrderSn = input.businessOrderSn?.trim()
  const currentOrderSn = input.orderSn?.trim()

  if (personalOrderSn) {
    sources.set("TRACE", personalOrderSn)
  }

  if (businessOrderSn) {
    sources.set("TRACE_LONG_TERM", businessOrderSn)
  }

  if (currentOrderSn && input.orderType && !sources.has(input.orderType)) {
    sources.set(input.orderType, currentOrderSn)
  }

  return Array.from(sources.entries()).map(([orderType, orderSn]) => ({
    orderType,
    orderSn,
  }))
}

export function attachReceiveTxlogOrderType(logs: ReceiveLog[], orderType: ReceiveTraceOrderType): ReceiveTxlogItem[] {
  return logs.map(item => ({
    ...item,
    sourceOrderType: orderType,
  }))
}

function resolveLogFilterOrderType(item: ReceiveTxlogItem): ReceiveTraceOrderType {
  if (item.orderType === "TRACE" || item.orderType === "TRACE_LONG_TERM") {
    return item.orderType
  }

  return item.sourceOrderType
}

export function filterReceiveTxlogs(logs: ReceiveTxlogItem[], filter: ReceiveTxlogRecordFilter) {
  if (filter === "all") {
    return logs
  }

  const targetOrderType = filter === "individuals" ? "TRACE" : "TRACE_LONG_TERM"
  return logs.filter(item => resolveLogFilterOrderType(item) === targetOrderType)
}

export function mergeReceiveTxlogs(logs: ReceiveTxlogItem[]) {
  const merged = new Map<string, ReceiveTxlogItem>()

  logs.forEach(item => {
    const key = buildReceiveTxlogKey(item)
    const current = merged.get(key)

    if (!current) {
      merged.set(key, item)
      return
    }

    const currentHasConcreteType = current.orderType === "TRACE" || current.orderType === "TRACE_LONG_TERM"
    const nextHasConcreteType = item.orderType === "TRACE" || item.orderType === "TRACE_LONG_TERM"

    if (!currentHasConcreteType && nextHasConcreteType) {
      merged.set(key, item)
    }
  })

  return Array.from(merged.values()).sort((left, right) => (right.createdAt ?? 0) - (left.createdAt ?? 0))
}

function normalizeChainName(value?: string | null) {
  return value?.trim().toLowerCase().replace(/\s+/g, "") || ""
}

export function matchesReceiveTxlogPayChain(detail: ReceiveOrder | null | undefined, payChain?: string) {
  const target = normalizeChainName(payChain)

  if (!target) {
    return true
  }

  return normalizeChainName(detail?.sendChainName) === target || normalizeChainName(detail?.recvChainName) === target
}
