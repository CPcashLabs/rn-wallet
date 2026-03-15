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
  isOrderDetailCacheSnapshotEqual,
  readOrderDetailCache,
  writeOrderDetailCache,
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
})
