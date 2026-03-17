import type { ReceiveLog } from "@/domains/wallet/receive/services/receiveApi"
import {
  buildNextSeenLogState,
  buildReceiveTxlogKey,
  createReceiveTxlogsPollController,
} from "@/domains/wallet/receive/screens/receiveTxlogsPolling"

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

describe("receiveTxlogsPolling", () => {
  it("deduplicates seen log keys and marks only unseen logs as fresh", () => {
    const firstLog = createLog()
    const secondLog = createLog({
      createdAt: 1_700_000_000_001,
      orderSn: "SUB_2",
      txid: "0xtx-2",
    })
    const firstKey = buildReceiveTxlogKey(firstLog)
    const secondKey = buildReceiveTxlogKey(secondLog)

    const { freshKeys, nextSeenMap } = buildNextSeenLogState("ORDER_1", [firstLog, secondLog], {
      ORDER_1: [firstKey],
    })

    expect(freshKeys).toEqual([secondKey])
    expect(nextSeenMap).toEqual({
      ORDER_1: [firstKey, secondKey],
    })
  })

  it("keeps only the latest 200 seen log keys", () => {
    const seed = Array.from({ length: 199 }, (_value, index) => `seen-${index}`)
    const logs = [
      createLog({
        orderSn: "SUB_200",
        txid: "0xtx-200",
        createdAt: 1_700_000_000_200,
      }),
      createLog({
        orderSn: "SUB_201",
        txid: "0xtx-201",
        createdAt: 1_700_000_000_201,
      }),
    ]

    const { nextSeenMap } = buildNextSeenLogState("ORDER_1", logs, {
      ORDER_1: seed,
    })

    expect(nextSeenMap.ORDER_1).toHaveLength(200)
    expect(nextSeenMap.ORDER_1[0]).toBe("seen-1")
    expect(nextSeenMap.ORDER_1.at(-1)).toBe(buildReceiveTxlogKey(logs[1]))
  })

  it("treats all keys as fresh when no previous seen state exists", () => {
    const log = createLog()
    const key = buildReceiveTxlogKey(log)

    expect(buildNextSeenLogState("ORDER_2", [log], {})).toEqual({
      freshKeys: [key],
      nextSeenMap: {
        ORDER_2: [key],
      },
    })
  })

  it("prevents overlapping poll requests and suppresses repeated refresh failure notifications", () => {
    const controller = createReceiveTxlogsPollController()

    expect(controller.startRequest()).toBe(true)
    expect(controller.startRequest()).toBe(false)
    expect(controller.shouldNotifyRefreshFailure()).toBe(true)
    expect(controller.shouldNotifyRefreshFailure()).toBe(false)

    controller.finishRequest()
    controller.markSuccess()

    expect(controller.startRequest()).toBe(true)
    expect(controller.shouldNotifyRefreshFailure()).toBe(true)
  })

  it("stops committing results after deactivation", () => {
    const controller = createReceiveTxlogsPollController()

    expect(controller.startRequest()).toBe(true)
    controller.deactivate()

    expect(controller.canCommit()).toBe(false)
    expect(controller.shouldNotifyRefreshFailure()).toBe(false)
    expect(controller.startRequest()).toBe(false)
  })
})
