import { formatAddress } from "@/features/home/utils/format"
import type { MessageItem } from "@/features/messages/services/messageApi"

type Translate = (key: string, options?: Record<string, unknown>) => string

export type MessageTarget =
  | {
      kind: "copouchHome"
    }
  | {
      kind: "copouchAllocation"
      walletId: string
      orderSn: string
    }
  | {
      kind: "orderDetail"
      orderSn: string
    }
  | {
      kind: "missingOrder"
    }

export function resolveMessageTarget(item: MessageItem): MessageTarget {
  if (item.type === "OWNER_REMOVED") {
    return {
      kind: "copouchHome",
    }
  }

  if (item.type === "RE_ALLOCATE") {
    if (item.multisigWalletId && item.orderSn) {
      return {
        kind: "copouchAllocation",
        walletId: item.multisigWalletId,
        orderSn: item.orderSn,
      }
    }

    if (item.multisigWalletId) {
      return {
        kind: "copouchHome",
      }
    }

    return {
      kind: "missingOrder",
    }
  }

  if (item.orderSn) {
    return {
      kind: "orderDetail",
      orderSn: item.orderSn,
    }
  }

  return {
    kind: "missingOrder",
  }
}

export function resolveMessageTitle(item: MessageItem, t: Translate) {
  if (item.type === "OWNER_REMOVED") {
    return t("message.types.ownerRemoved")
  }

  if (item.type === "RE_ALLOCATE") {
    return t("message.types.reallocate")
  }

  const map: Record<string, string> = {
    RECEIPT: "message.types.receipt",
    RECEIPT_FIXED: "message.types.receipt",
    RECEIPT_NORMAL: "message.types.receipt",
    TRACE: "message.types.receipt",
    TRACE_LONG_TERM: "message.types.receipt",
    TRACE_CHILD: "message.types.receipt",
    PAYMENT: "message.types.payment",
    PAYMENT_NORMAL: "message.types.payment",
    SEND: "message.types.send",
    SEND_RECEIVE: "message.types.sendReceive",
    NATIVE: "message.types.native",
  }

  return t(map[item.orderType] ?? "message.types.default")
}

export function resolveMessageBody(item: MessageItem, t: Translate) {
  if (item.type === "OWNER_REMOVED") {
    return t("message.ownerRemovedBody", {
      walletName: item.multisigWalletName || "CoPouch",
    })
  }

  if (item.type === "RE_ALLOCATE") {
    return t("message.reallocateBody", {
      operator: item.operatorNickname || "--",
      walletName: item.multisigWalletName || "CoPouch",
    })
  }

  const isReceive = ["RECEIPT", "RECEIPT_FIXED", "RECEIPT_NORMAL", "TRACE", "TRACE_LONG_TERM", "TRACE_CHILD", "SEND_RECEIVE"].includes(
    item.orderType,
  )
  const targetAddress = isReceive ? item.paymentAddress || item.receiveAddress : item.receiveAddress || item.transferAddress

  return t(isReceive ? "message.fromAddress" : "message.toAddress", {
    address: targetAddress ? formatAddress(targetAddress) : "--",
  })
}

export function resolveMessageAmount(item: MessageItem) {
  const amount = item.sendAmount || item.recvAmount || item.sendActualAmount || item.recvActualAmount
  return Number.isFinite(amount) ? String(amount) : "0"
}

export function resolveMessageCoin(item: MessageItem) {
  return item.sendCoinName || item.recvCoinName || "USDT"
}

export function formatRelativeTime(timestamp: number | null, t: Translate) {
  if (!timestamp) {
    return "--"
  }

  const diff = Math.max(0, Date.now() - timestamp)
  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour

  if (diff < hour) {
    return t("message.time.minutesAgo", { count: Math.max(1, Math.floor(diff / minute) || 1) })
  }

  if (diff < day) {
    return t("message.time.hoursAgo", { count: Math.floor(diff / hour) })
  }

  return t("message.time.daysAgo", { count: Math.floor(diff / day) })
}
