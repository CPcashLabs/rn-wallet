import type { ReceiveLog } from "@/domains/wallet/receive/services/receiveApi"
import {
  attachReceiveTxlogOrderType,
  buildReceiveTxlogSources,
  filterReceiveTxlogs,
  mergeReceiveTxlogs,
  resolveDefaultReceiveTxlogFilter,
} from "@/domains/wallet/receive/screens/receiveTxlogsModel"

function createLog(overrides: Partial<ReceiveLog> = {}): ReceiveLog {
  return {
    amount: 1,
    coinName: "USDT",
    createdAt: 1_700_000_000_000,
    feeAmount: 0.2,
    fromAddress: "0xabc",
    orderSn: "SUB_1",
    orderType: "UNKNOWN",
    receiptAmount: 1.2,
    recvActualAmount: 1,
    status: 1,
    statusName: "done",
    txid: "0xtx",
    ...overrides,
  }
}

describe("receiveTxlogsModel", () => {
  it("builds personal and business sources with current order fallback", () => {
    expect(
      buildReceiveTxlogSources({
        orderSn: "ORDER_TRACE",
        orderType: "TRACE",
        businessOrderSn: "ORDER_LONG",
      }),
    ).toEqual([
      { orderType: "TRACE_LONG_TERM", orderSn: "ORDER_LONG" },
      { orderType: "TRACE", orderSn: "ORDER_TRACE" },
    ])
  })

  it("attaches order type and filters by record type", () => {
    const personalLog = attachReceiveTxlogOrderType([createLog({ orderSn: "TRACE_1", orderType: "TRACE" })], "TRACE")[0]
    const businessLog = attachReceiveTxlogOrderType([createLog({ orderSn: "LONG_1", orderType: "TRACE_LONG_TERM" })], "TRACE_LONG_TERM")[0]

    expect(filterReceiveTxlogs([personalLog, businessLog], "all")).toHaveLength(2)
    expect(filterReceiveTxlogs([personalLog, businessLog], "individuals")).toEqual([personalLog])
    expect(filterReceiveTxlogs([personalLog, businessLog], "business")).toEqual([businessLog])
  })

  it("deduplicates identical logs when two sources return the same child record", () => {
    const personalLog = attachReceiveTxlogOrderType([createLog({ orderSn: "SUB_1", txid: "0xtx", orderType: "TRACE" })], "TRACE")[0]
    const duplicateBusinessLog = attachReceiveTxlogOrderType([createLog({ orderSn: "SUB_1", txid: "0xtx", orderType: "TRACE" })], "TRACE_LONG_TERM")[0]

    expect(mergeReceiveTxlogs([personalLog, duplicateBusinessLog])).toEqual([personalLog])
    expect(filterReceiveTxlogs(mergeReceiveTxlogs([personalLog, duplicateBusinessLog]), "business")).toEqual([])
  })

  it("resolves the initial filter from route order type", () => {
    expect(resolveDefaultReceiveTxlogFilter("TRACE")).toBe("individuals")
    expect(resolveDefaultReceiveTxlogFilter("TRACE_LONG_TERM")).toBe("business")
    expect(resolveDefaultReceiveTxlogFilter(undefined)).toBe("all")
  })
})
