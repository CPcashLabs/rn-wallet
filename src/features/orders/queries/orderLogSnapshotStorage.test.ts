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

import { buildOrderLogSnapshotKey, readOrderLogSnapshot, writeOrderLogSnapshot } from "@/features/orders/queries/orderLogSnapshotStorage"

beforeEach(() => {
  mockMmkvStore.clear()
  jest.clearAllMocks()
})

describe("orderLogSnapshotStorage", () => {
  it("builds range-aware snapshot keys with all-default fallbacks", () => {
    expect(
      buildOrderLogSnapshotKey({
        startedAt: "2026-03-01 00:00:00",
        endedAt: "2026-03-15 23:59:59",
      }),
    ).toBe("logs::all::all::2026-03-01 00:00:00|2026-03-15 23:59:59||")
  })

  it("writes and reads the persisted first-page snapshot", () => {
    const cacheKey = buildOrderLogSnapshotKey({
      otherAddress: "T_OTHER",
      orderType: "PAYMENT",
      startedTimestamp: 1,
      endedTimestamp: 2,
    })

    writeOrderLogSnapshot(cacheKey, {
      items: [{ orderSn: "ORDER_1" }] as never,
      statistics: {
        paymentAmount: 1,
        receiptAmount: 2,
        fee: 0.1,
        transactions: 3,
      },
      page: 1,
      total: 2,
    })

    expect(readOrderLogSnapshot(cacheKey)).toMatchObject({
      items: [{ orderSn: "ORDER_1" }],
      page: 1,
      total: 2,
    })
  })

  it("keeps only the most recent persisted snapshots", () => {
    const originalNow = Date.now

    try {
      for (let index = 0; index < 20; index += 1) {
        Date.now = () => index + 1
        writeOrderLogSnapshot(`logs-${index}`, {
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

    expect(readOrderLogSnapshot("logs-0")).toBeNull()
    expect(readOrderLogSnapshot("logs-19")).toMatchObject({
      total: 1,
    })
  })
})
