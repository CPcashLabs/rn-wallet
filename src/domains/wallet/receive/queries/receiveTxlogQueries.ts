import { useQuery } from "@tanstack/react-query"

import {
  getTraceChildLogs,
  getTraceDetail,
  type ReceiveOrder,
} from "@/domains/wallet/receive/services/receiveApi"
import {
  attachReceiveTxlogOrderType,
  matchesReceiveTxlogPayChain,
  type ReceiveTraceOrderType,
  type ReceiveTxlogItem,
} from "@/domains/wallet/receive/screens/receiveTxlogsModel"
import { buildNextSeenLogState } from "@/domains/wallet/receive/screens/receiveTxlogsPolling"
import { getJson, setJson } from "@/shared/storage/kvStorage"
import { KvStorageKeys } from "@/shared/storage/sessionKeys"

type ReceiveTxlogSource = {
  orderSn: string
  orderType: ReceiveTraceOrderType
}

type ReceiveTxlogSnapshotArgs = {
  sources: ReceiveTxlogSource[]
  payChain?: string
}

export type ReceiveTxlogSnapshot = {
  detailByType: Partial<Record<ReceiveTraceOrderType, ReceiveOrder | null>>
  logsByType: Partial<Record<ReceiveTraceOrderType, ReceiveTxlogItem[]>>
  newLogKeys: string[]
}

const EMPTY_SNAPSHOT: ReceiveTxlogSnapshot = {
  detailByType: {},
  logsByType: {},
  newLogKeys: [],
}

function serializeSources(sources: ReceiveTxlogSource[]) {
  return sources.map(source => ({
    orderSn: source.orderSn,
    orderType: source.orderType,
  }))
}

export const receiveTxlogKeys = {
  all: ["receive", "txlogs"] as const,
  snapshot: (args: ReceiveTxlogSnapshotArgs) =>
    [...receiveTxlogKeys.all, { sources: serializeSources(args.sources), payChain: args.payChain ?? null }] as const,
}

export async function getReceiveTxlogSnapshot(args: ReceiveTxlogSnapshotArgs) {
  if (args.sources.length === 0) {
    return EMPTY_SNAPSHOT
  }

  const results = await Promise.all(
    args.sources.map(async source => {
      const [detail, logs] = await Promise.all([getTraceDetail(source.orderSn), getTraceChildLogs({ orderSn: source.orderSn })])

      return {
        ...source,
        detail,
        logs: attachReceiveTxlogOrderType(logs, source.orderType),
      }
    }),
  )

  const payChainMatchedResults = results.filter(result => matchesReceiveTxlogPayChain(result.detail, args.payChain))
  const currentSeenMap = getJson<Record<string, string[]>>(KvStorageKeys.ReceiveShowedList) ?? {}
  const detailByType: Partial<Record<ReceiveTraceOrderType, ReceiveOrder | null>> = {}
  const logsByType: Partial<Record<ReceiveTraceOrderType, ReceiveTxlogItem[]>> = {}
  const freshKeys: string[] = []
  let nextSeenMap = currentSeenMap

  payChainMatchedResults.forEach(result => {
    const nextSeenState = buildNextSeenLogState(result.orderSn, result.logs, nextSeenMap)
    detailByType[result.orderType] = result.detail
    logsByType[result.orderType] = result.logs
    freshKeys.push(...nextSeenState.freshKeys)
    nextSeenMap = nextSeenState.nextSeenMap
  })

  setJson(KvStorageKeys.ReceiveShowedList, nextSeenMap)

  return {
    detailByType,
    logsByType,
    newLogKeys: Array.from(new Set(freshKeys)),
  } satisfies ReceiveTxlogSnapshot
}

export function useReceiveTxlogSnapshotQuery(args: ReceiveTxlogSnapshotArgs & { pollEnabled: boolean }) {
  return useQuery({
    queryKey: receiveTxlogKeys.snapshot(args),
    queryFn: () =>
      getReceiveTxlogSnapshot({
        sources: args.sources,
        payChain: args.payChain,
      }),
    enabled: args.sources.length > 0,
    refetchInterval: args.pollEnabled ? 5_000 : false,
    refetchIntervalInBackground: false,
  })
}
