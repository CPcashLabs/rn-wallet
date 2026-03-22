const mockCreateReceiveOrder = jest.fn()
const mockGetRecentReceiveOrders = jest.fn()
const mockGetReceivingOrderStatus = jest.fn()
const mockGetTraceDetail = jest.fn()
const mockGetReceiveConfig = jest.fn()

jest.mock("@/domains/wallet/receive/services/receiveApi", () => ({
  createReceiveOrder: (...args: unknown[]) => mockCreateReceiveOrder(...args),
  getRecentReceiveOrders: (...args: unknown[]) => mockGetRecentReceiveOrders(...args),
  getReceivingOrderStatus: (...args: unknown[]) => mockGetReceivingOrderStatus(...args),
  getTraceDetail: (...args: unknown[]) => mockGetTraceDetail(...args),
}))

jest.mock("@/shared/receive/services/receiveEntryApi", () => ({
  getReceiveConfig: (...args: unknown[]) => mockGetReceiveConfig(...args),
}))

import { createAbortError } from "@/shared/async/taskController"
import {
  applyReceiveOrderUpdate,
  buildReceiveHomeContextKey,
  createReceiveOrderAndWait,
  getReceiveHomeData,
  pickMarkedOrder,
} from "@/domains/wallet/receive/queries/receiveHomeQueries"

function buildOrder(id: string, overrides?: Partial<ReturnType<typeof buildOrderBase>>) {
  return {
    ...buildOrderBase(id),
    ...overrides,
  }
}

function buildOrderBase(id: string) {
  return {
    orderSn: `${id}-order`,
    serialNumber: `${id}-serial`,
    address: `${id}-address`,
    amount: 1,
    coinName: "USDT",
    createdAt: 1,
    orderType: "TRACE" as const,
    isMarked: true,
    remarkName: id,
    expiredAt: null,
    sendChainName: "TRON",
    recvChainName: "TRON",
    isRareAddress: false,
  }
}

describe("receiveHomeQueries", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("builds stable context keys and keeps the marked order", () => {
    expect(
      buildReceiveHomeContextKey({
        payChain: "BTT",
        chainId: 199,
        walletAddress: " TA1 ",
        multisigWalletId: " wallet-1 ",
      }),
    ).toBe("[\"BTT\",\"199\",\"TA1\",\"wallet-1\"]")

    expect(
      pickMarkedOrder([
        buildOrder("first", { isMarked: false }),
        buildOrder("second"),
      ]),
    ).toMatchObject({
      remarkName: "second",
    })

    expect(
      pickMarkedOrder([
        buildOrder("fallback", { isMarked: false }),
        buildOrder("ignored", { isMarked: false }),
      ]),
    ).toMatchObject({
      remarkName: "fallback",
    })
  })

  it("loads receive home data from config and recent orders", async () => {
    mockGetReceiveConfig.mockResolvedValue({
      payChain: "BTT",
      payChainFullName: "BitTorrent",
      payChainColor: "#00AAFF",
      payChainLogo: "logo",
      sellerId: "seller",
      sendCoinCode: "SEND",
      sendCoinSymbol: "BTC",
      recvCoinCode: "USDT",
      recvCoinSymbol: "USDT",
      receiveMinAmount: 15,
      receiveMaxAmount: 100,
    })
    mockGetRecentReceiveOrders
      .mockResolvedValueOnce([
        buildOrder("personal-old", { isMarked: false }),
        buildOrder("personal-current"),
      ])
      .mockResolvedValueOnce([buildOrder("business-current")])

    await expect(
      getReceiveHomeData({
        payChain: "BTT",
        chainId: "199",
        multisigWalletId: "wallet-1",
      }),
    ).resolves.toMatchObject({
      config: {
        sellerId: "seller",
      },
      personalOrder: {
        remarkName: "personal-current",
      },
      businessOrder: {
        remarkName: "business-current",
      },
    })

    expect(mockGetReceiveConfig).toHaveBeenCalledWith({
      payChain: "BTT",
      chainId: "199",
    })
    expect(mockGetRecentReceiveOrders).toHaveBeenNthCalledWith(1, {
      orderType: "TRACE",
      sendCoinCode: "SEND",
      recvCoinCode: "USDT",
      multisigWalletId: "wallet-1",
    })
    expect(mockGetRecentReceiveOrders).toHaveBeenNthCalledWith(2, {
      orderType: "TRACE_LONG_TERM",
      sendCoinCode: "SEND",
      recvCoinCode: "USDT",
      multisigWalletId: "wallet-1",
    })
  })

  it("returns null immediately when create input lacks config or wallet address", async () => {
    const controller = new AbortController()

    await expect(
      createReceiveOrderAndWait({
        variant: "short",
        signal: controller.signal,
      }),
    ).resolves.toBeNull()
  })

  it("falls back to the default receive amount and waits for trace detail", async () => {
    mockCreateReceiveOrder.mockResolvedValue({
      orderSn: "trace-1",
      serialNumber: "serial-1",
    })
    mockGetTraceDetail.mockResolvedValue(buildOrder("trace-ready"))

    await expect(
      createReceiveOrderAndWait({
        variant: "short",
        walletAddress: "TA1",
        config: {
          sellerId: "seller",
          sendCoinCode: "SEND",
          recvCoinCode: "USDT",
          receiveMinAmount: 0,
        },
        signal: new AbortController().signal,
      }),
    ).resolves.toMatchObject({
      remarkName: "trace-ready",
    })

    expect(mockCreateReceiveOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        recvAmount: 10,
      }),
    )
    expect(mockGetTraceDetail).toHaveBeenCalledWith("trace-1")
  })

  it("retries receiving status until the order becomes ready", async () => {
    jest.useFakeTimers()

    mockCreateReceiveOrder.mockResolvedValue({
      orderSn: "",
      serialNumber: "serial-1",
    })
    mockGetReceivingOrderStatus.mockRejectedValueOnce(new Error("pending")).mockResolvedValueOnce(buildOrder("receiving-ready"))

    const promise = createReceiveOrderAndWait({
      variant: "long",
      walletAddress: "TA1",
      config: {
        sellerId: "seller",
        sendCoinCode: "SEND",
        recvCoinCode: "USDT",
        receiveMinAmount: 15,
      },
      signal: new AbortController().signal,
    })

    await Promise.resolve()
    await jest.advanceTimersByTimeAsync(1200)

    await expect(promise).resolves.toMatchObject({
      remarkName: "receiving-ready",
    })
    expect(mockGetReceivingOrderStatus).toHaveBeenCalledTimes(2)
  })

  it("swallows abort-like create failures and exhausted polling errors separately", async () => {
    mockCreateReceiveOrder.mockRejectedValueOnce(createAbortError("create aborted"))

    await expect(
      createReceiveOrderAndWait({
        variant: "short",
        walletAddress: "TA1",
        config: {
          sellerId: "seller",
          sendCoinCode: "SEND",
          recvCoinCode: "USDT",
        },
        signal: new AbortController().signal,
      }),
    ).resolves.toBeNull()

    jest.useFakeTimers()
    mockCreateReceiveOrder.mockResolvedValueOnce({
      orderSn: "",
      serialNumber: "serial-never-ready",
    })
    mockGetReceivingOrderStatus.mockRejectedValue("pending")

    const promise = createReceiveOrderAndWait({
      variant: "long",
      walletAddress: "TA1",
      config: {
        sellerId: "seller",
        sendCoinCode: "SEND",
        recvCoinCode: "USDT",
      },
      signal: new AbortController().signal,
    })
    const assertion = expect(promise).rejects.toThrow("receive_order_not_ready")

    await Promise.resolve()
    await jest.advanceTimersByTimeAsync(1200 * 8)
    await assertion
  })

  it("applies order updates onto the matching receive card only", () => {
    const base = {
      config: {
        payChain: "BTT",
        payChainFullName: "BitTorrent",
        payChainColor: "#00AAFF",
        payChainLogo: "logo",
        sellerId: "seller",
        sendCoinCode: "SEND",
        sendCoinSymbol: "BTC",
        recvCoinCode: "USDT",
        recvCoinSymbol: "USDT",
        receiveMinAmount: 15,
        receiveMaxAmount: 100,
      },
      personalOrder: buildOrder("personal"),
      businessOrder: buildOrder("business"),
    }

    expect(applyReceiveOrderUpdate(base, "short", buildOrder("personal-next"))).toMatchObject({
      personalOrder: {
        remarkName: "personal-next",
      },
      businessOrder: {
        remarkName: "business",
      },
    })
    expect(applyReceiveOrderUpdate(base, "long", buildOrder("business-next"))).toMatchObject({
      personalOrder: {
        remarkName: "personal",
      },
      businessOrder: {
        remarkName: "business-next",
      },
    })
    expect(applyReceiveOrderUpdate(undefined, "short", buildOrder("missing"))).toBeUndefined()
  })
})

export {}
