import type { ReceiveLog } from "@/plugins/receive/services/receiveApi"

const MAX_SEEN_LOG_KEYS = 200

export type ReceiveSeenLogMap = Record<string, string[]>

export function buildReceiveTxlogKey(item: ReceiveLog) {
  return `${item.orderSn}:${item.txid}:${item.createdAt}:${item.amount}:${item.coinName}:${item.fromAddress}:${item.status}`
}

export function buildNextSeenLogState(orderSn: string, nextLogs: ReceiveLog[], currentSeenMap: ReceiveSeenLogMap) {
  const seenKeys = new Set(currentSeenMap[orderSn] ?? [])
  const incomingKeys = nextLogs.map(buildReceiveTxlogKey)
  const freshKeys = incomingKeys.filter(key => !seenKeys.has(key))

  return {
    freshKeys,
    nextSeenMap: {
      ...currentSeenMap,
      [orderSn]: Array.from(new Set([...(currentSeenMap[orderSn] ?? []), ...incomingKeys])).slice(-MAX_SEEN_LOG_KEYS),
    },
  }
}

export function createReceiveTxlogsPollController() {
  let active = true
  let inFlight = false
  let refreshFailureNotified = false

  return {
    startRequest() {
      if (!active || inFlight) {
        return false
      }

      inFlight = true
      return true
    },
    canCommit() {
      return active
    },
    finishRequest() {
      inFlight = false
    },
    markSuccess() {
      refreshFailureNotified = false
    },
    shouldNotifyRefreshFailure() {
      if (!active || refreshFailureNotified) {
        return false
      }

      refreshFailureNotified = true
      return true
    },
    deactivate() {
      active = false
      inFlight = false
    },
  }
}
