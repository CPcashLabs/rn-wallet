const mockMmkvStore = new Map<string, string | number | boolean>()

jest.mock("react-native-mmkv", () => ({
  MMKV: class MockMMKV {
    set(key: string, value: string | number | boolean) {
      mockMmkvStore.set(key, value)
    }

    getString(key: string) {
      const value = mockMmkvStore.get(key)
      return typeof value === "string" ? value : undefined
    }

    getNumber(key: string) {
      const value = mockMmkvStore.get(key)
      return typeof value === "number" ? value : undefined
    }

    getBoolean(key: string) {
      const value = mockMmkvStore.get(key)
      return typeof value === "boolean" ? value : undefined
    }

    delete(key: string) {
      mockMmkvStore.delete(key)
    }
  },
}))

import type { OrderDetail, OrderLabelBinding } from "@/features/orders/services/ordersApi"

const {
  buildOrderBillCacheKey,
  buildOrderDetailCacheKey,
  buildOrderLogsCacheKey,
  countNewOrderRecords,
  readOrderBillCache,
  readOrderLogsCache,
  isOrderDetailCacheSnapshotEqual,
  readOrderDetailCache,
  writeOrderBillCache,
  writeOrderDetailCache,
  writeOrderLogsCache,
} = require("@/features/orders/services/ordersApi") as typeof import("@/features/orders/services/ordersApi")

function createDetail(overrides?: Partial<OrderDetail>): OrderDetail {
  return {
    note: "",
    recvChainName: "BTT",
    recvChainLogo: "",
    recvCoinCode: "USDT",
    recvChainBrowsers: [],
    sendChainBrowsers: [],
    recvCoinContract: "",
    recvCoinLogo: "",
    recvCoinName: "USDT",
    buyerEmail: "",
    buyerEstimateReceiveAt: null,
    recvActualAmount: 10,
    recvActualReceivedAt: null,
    receiveAddress: "T_RECEIVE",
    buyerRefundAddress: "",
    paymentAddress: "T_PAYMENT",
    recvAmount: 10,
    createdAt: 1,
    recvEstimateAmount: 10,
    sendEstimateAmount: 10,
    expiredAt: null,
    finishedAt: null,
    orderSn: "ORDER_1",
    orderType: "PAYMENT",
    sellerChainBrowsers: [],
    sendChainName: "BTT",
    sendCoinCode: "USDT",
    sendCoinContract: "",
    sendCoinLogo: "",
    sendCoinName: "USDT",
    sendCoinPrecision: 6,
    sellerEstimateReceiveAt: null,
    sendActualAmount: 10,
    sendActualReceivedAt: null,
    depositAddress: "T_DEPOSIT",
    transferAddress: "T_TRANSFER",
    sendAmount: 10,
    status: 1,
    statusName: "Pending",
    sendActualFeeAmount: 0.1,
    sendEstimateFeeAmount: 0.1,
    sendFeeAmount: 0.1,
    multisigWalletId: null,
    multisigWalletName: "",
    multisigWalletAddress: "",
    isBuyer: true,
    notesImageUrl: "",
    txid: "0x123",
    ...overrides,
  }
}

function createLabelBinding(overrides?: Partial<OrderLabelBinding>): OrderLabelBinding {
  return {
    notes: "",
    notesImageUrl: "",
    labels: [],
    ...overrides,
  }
}

beforeEach(() => {
  mockMmkvStore.clear()
  jest.clearAllMocks()
})

describe("order detail cache", () => {
  it("reads back the cached detail snapshot", () => {
    const detail = createDetail()
    const labelBinding = createLabelBinding({ notes: "memo" })

    writeOrderDetailCache(detail.orderSn, {
      detail,
      labelBinding,
    })

    expect(readOrderDetailCache(detail.orderSn)).toEqual({
      detail,
      labelBinding,
    })
  })

  it("treats identical snapshots as equal", () => {
    const detail = createDetail()
    const labelBinding = createLabelBinding({ notes: "same" })

    expect(
      isOrderDetailCacheSnapshotEqual(
        { detail, labelBinding },
        { detail: createDetail(), labelBinding: createLabelBinding({ notes: "same" }) },
      ),
    ).toBe(true)
  })

  it("detects changed detail snapshots", () => {
    expect(
      isOrderDetailCacheSnapshotEqual(
        { detail: createDetail(), labelBinding: createLabelBinding() },
        { detail: createDetail({ status: 2 }), labelBinding: createLabelBinding() },
      ),
    ).toBe(false)
  })

  it("writes and reads order log and bill caches with range-based keys", () => {
    const logsKey = buildOrderLogsCacheKey({
      otherAddress: "T_OTHER",
      orderType: "PAYMENT",
      startedAt: "2026-03-01 00:00:00",
      endedAt: "2026-03-15 23:59:59",
    })
    const billKey = buildOrderBillCacheKey({
      startedTimestamp: 1,
      endedTimestamp: 2,
    })

    writeOrderLogsCache(logsKey, {
      items: [],
      statistics: {
        paymentAmount: 1,
        receiptAmount: 2,
        fee: 0.1,
        transactions: 3,
      },
      page: 1,
      total: 2,
    })
    writeOrderBillCache(billKey, {
      items: [],
      statistics: {
        paymentAmount: 4,
        receiptAmount: 5,
        fee: 0.2,
        transactions: 6,
      },
    })

    expect(readOrderLogsCache(logsKey)).toMatchObject({
      page: 1,
      total: 2,
    })
    expect(readOrderBillCache(billKey)).toMatchObject({
      statistics: {
        paymentAmount: 4,
        receiptAmount: 5,
        fee: 0.2,
        transactions: 6,
      },
    })
  })

  it("counts only newly appeared order records", () => {
    expect(
      countNewOrderRecords(
        [{ orderSn: "ORDER_1" }, { orderSn: "ORDER_2" }] as never,
        [{ orderSn: "ORDER_2" }, { orderSn: "ORDER_3" }, { orderSn: "ORDER_4" }] as never,
      ),
    ).toBe(2)
  })

  it("returns null for missing detail snapshots and supports direct reference equality", () => {
    const snapshot = {
      detail: createDetail(),
      labelBinding: createLabelBinding(),
    }

    expect(readOrderDetailCache("MISSING")).toBeNull()
    expect(buildOrderDetailCacheKey("ORDER_1")).toBe("detail::ORDER_1")
    expect(isOrderDetailCacheSnapshotEqual(snapshot, snapshot)).toBe(true)
    expect(isOrderDetailCacheSnapshotEqual(null, snapshot)).toBe(false)
  })

  it("keeps only the most recent cache entries when the cache exceeds its limit", () => {
    const originalNow = Date.now

    try {
      for (let index = 0; index < 20; index += 1) {
        Date.now = () => index + 1
        writeOrderLogsCache(`logs-${index}`, {
          items: [],
          statistics: {
            paymentAmount: index,
            receiptAmount: index,
            fee: 0,
            transactions: index,
          },
          page: 1,
          total: 1,
        })
      }
    } finally {
      Date.now = originalNow
    }

    expect(readOrderLogsCache("logs-0")).toBeNull()
    expect(readOrderLogsCache("logs-19")).toMatchObject({
      total: 1,
    })
  })
})
