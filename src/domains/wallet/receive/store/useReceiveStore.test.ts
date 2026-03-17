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
import { resetReceiveStoreForTests, useReceiveStore } from "@/domains/wallet/receive/store/useReceiveStore"

type Deferred<T> = {
  promise: Promise<T>
  resolve: (value: T) => void
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(nextResolve => {
    resolve = nextResolve
  })

  return {
    promise,
    resolve,
  }
}

function buildOrder(id: string) {
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

async function loadReadyReceiveHome(overrides?: { payChain?: string; chainId?: string; walletAddress?: string }) {
  mockGetReceiveConfig.mockResolvedValue({
    sellerId: "seller",
    sendCoinCode: "SEND",
    recvCoinCode: "USDT",
    receiveMinAmount: 10,
  })
  mockGetRecentReceiveOrders.mockResolvedValue([])

  await useReceiveStore.getState().loadHome({
    payChain: overrides?.payChain ?? "chain",
    chainId: overrides?.chainId ?? "1",
    walletAddress: overrides?.walletAddress ?? "0xabc",
  })
}

describe("useReceiveStore", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetReceiveStoreForTests()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("drops stale loadHome commits after the receive context changes", async () => {
    const oldConfigDeferred = createDeferred<{
      sellerId: string
      sendCoinCode: string
      recvCoinCode: string
      receiveMinAmount: number
    }>()

    mockGetReceiveConfig.mockImplementation(async (input: { payChain?: string }) => {
      if (input.payChain === "old-chain") {
        return oldConfigDeferred.promise
      }

      return {
        sellerId: "seller-new",
        sendCoinCode: "NEW",
        recvCoinCode: "USDT",
        receiveMinAmount: 10,
      }
    })

    mockGetRecentReceiveOrders.mockImplementation(async (input: { orderType: string; sendCoinCode: string }) => {
      if (input.sendCoinCode === "NEW") {
        return [buildOrder(`new-${input.orderType}`)]
      }

      return [buildOrder(`old-${input.orderType}`)]
    })

    const staleLoadPromise = useReceiveStore.getState().loadHome({
      payChain: "old-chain",
      chainId: "1",
      walletAddress: "0xold",
    })

    const freshLoadPromise = useReceiveStore.getState().loadHome({
      payChain: "new-chain",
      chainId: "2",
      walletAddress: "0xnew",
    })

    await freshLoadPromise
    oldConfigDeferred.resolve({
      sellerId: "seller-old",
      sendCoinCode: "OLD",
      recvCoinCode: "USDT",
      receiveMinAmount: 10,
    })
    await staleLoadPromise

    expect(useReceiveStore.getState().config).toMatchObject({
      sellerId: "seller-new",
      sendCoinCode: "NEW",
    })
    expect(useReceiveStore.getState().personalOrder).toMatchObject({
      remarkName: "new-TRACE",
    })
    expect(useReceiveStore.getState().businessOrder).toMatchObject({
      remarkName: "new-TRACE_LONG_TERM",
    })
  })

  it("invalidates an in-flight createOrder when a new receive context is loaded", async () => {
    const traceDeferred = createDeferred<ReturnType<typeof buildOrder>>()

    mockGetReceiveConfig.mockImplementation(async (input: { payChain?: string }) => ({
      sellerId: input.payChain === "new-chain" ? "seller-new" : "seller-old",
      sendCoinCode: input.payChain === "new-chain" ? "NEW" : "OLD",
      recvCoinCode: "USDT",
      receiveMinAmount: 10,
    }))

    mockGetRecentReceiveOrders.mockImplementation(async (input: { orderType: string; sendCoinCode: string }) => {
      const scope = input.sendCoinCode === "NEW" ? "new" : "old"
      return [buildOrder(`${scope}-${input.orderType}`)]
    })

    mockCreateReceiveOrder.mockResolvedValue({
      orderSn: "trace-old",
      serialNumber: "serial-old",
    })
    mockGetTraceDetail.mockImplementation(() => traceDeferred.promise)

    await useReceiveStore.getState().loadHome({
      payChain: "old-chain",
      chainId: "1",
      walletAddress: "0xold",
    })

    const createPromise = useReceiveStore.getState().createOrder({
      variant: "short",
      walletAddress: "0xold",
    })

    await Promise.resolve()

    const nextLoadPromise = useReceiveStore.getState().loadHome({
      payChain: "new-chain",
      chainId: "2",
      walletAddress: "0xnew",
    })

    traceDeferred.resolve(buildOrder("stale-create"))

    await nextLoadPromise
    await expect(createPromise).resolves.toBeNull()

    expect(useReceiveStore.getState().config).toMatchObject({
      sellerId: "seller-new",
      sendCoinCode: "NEW",
    })
    expect(useReceiveStore.getState().personalOrder).toMatchObject({
      remarkName: "new-TRACE",
    })
    expect(useReceiveStore.getState().creating).toBe(false)
  })

  it("keeps the existing snapshot while reloading the same receive context", async () => {
    const deferredConfig = createDeferred<{
      sellerId: string
      sendCoinCode: string
      recvCoinCode: string
      receiveMinAmount: number
    }>()

    mockGetReceiveConfig
      .mockResolvedValueOnce({
        sellerId: "seller-old",
        sendCoinCode: "OLD",
        recvCoinCode: "USDT",
        receiveMinAmount: 10,
      })
      .mockImplementationOnce(() => deferredConfig.promise)

    mockGetRecentReceiveOrders.mockImplementation(async (input: { orderType: string; sendCoinCode: string }) => {
      const scope = input.sendCoinCode === "OLD" ? "old" : "new"
      return [buildOrder(`${scope}-${input.orderType}`)]
    })

    await useReceiveStore.getState().loadHome({
      payChain: "same-chain",
      chainId: "1",
      walletAddress: "0xsame",
    })

    const reloadPromise = useReceiveStore.getState().loadHome({
      payChain: "same-chain",
      chainId: "1",
      walletAddress: "0xsame",
    })

    expect(useReceiveStore.getState()).toMatchObject({
      loading: true,
      config: {
        sellerId: "seller-old",
      },
      personalOrder: {
        remarkName: "old-TRACE",
      },
      businessOrder: {
        remarkName: "old-TRACE_LONG_TERM",
      },
    })

    deferredConfig.resolve({
      sellerId: "seller-new",
      sendCoinCode: "NEW",
      recvCoinCode: "USDT",
      receiveMinAmount: 20,
    })
    await reloadPromise

    expect(useReceiveStore.getState()).toMatchObject({
      loading: false,
      config: {
        sellerId: "seller-new",
      },
      personalOrder: {
        remarkName: "new-TRACE",
      },
      businessOrder: {
        remarkName: "new-TRACE_LONG_TERM",
      },
    })
  })

  it("rethrows active loadHome failures and clears the loading state", async () => {
    mockGetReceiveConfig.mockRejectedValue(new Error("config_failed"))

    await expect(
      useReceiveStore.getState().loadHome({
        payChain: "bad-chain",
        chainId: "1",
        walletAddress: "0xbad",
      }),
    ).rejects.toThrow("config_failed")

    expect(useReceiveStore.getState().loading).toBe(false)
  })

  it("returns null immediately when createOrder lacks config or wallet address", async () => {
    await expect(
      useReceiveStore.getState().createOrder({
        variant: "short",
      }),
    ).resolves.toBeNull()
  })

  it("builds a fresh receive context from nullish inputs and keeps the first unmarked order", async () => {
    mockGetReceiveConfig.mockResolvedValue({
      sellerId: "seller",
      sendCoinCode: "SEND",
      recvCoinCode: "USDT",
      receiveMinAmount: 10,
    })
    mockGetRecentReceiveOrders
      .mockResolvedValueOnce([
        {
          ...buildOrder("first"),
          isMarked: false,
        },
        {
          ...buildOrder("second"),
          isMarked: false,
        },
      ])
      .mockResolvedValueOnce([])

    await useReceiveStore.getState().loadHome({
      chainId: null,
      walletAddress: null,
      multisigWalletId: "  ",
    })

    expect(useReceiveStore.getState().personalOrder).toMatchObject({
      remarkName: "first",
    })
    expect(mockGetReceiveConfig).toHaveBeenCalledWith({
      payChain: undefined,
      chainId: null,
    })
  })

  it("polls receiving status for long-lived orders after transient failures", async () => {
    jest.useFakeTimers()

    mockGetReceiveConfig.mockResolvedValue({
      sellerId: "seller",
      sendCoinCode: "SEND",
      recvCoinCode: "USDT",
      receiveMinAmount: 15,
    })
    mockGetRecentReceiveOrders.mockResolvedValue([])
    mockCreateReceiveOrder.mockResolvedValue({
      orderSn: "",
      serialNumber: "serial-1",
    })
    mockGetReceivingOrderStatus.mockRejectedValueOnce(new Error("pending")).mockResolvedValueOnce(buildOrder("business"))

    await useReceiveStore.getState().loadHome({
      payChain: "chain",
      chainId: "1",
      walletAddress: "0xabc",
    })

    const createPromise = useReceiveStore.getState().createOrder({
      variant: "long",
      walletAddress: "0xabc",
      multisigWalletId: "wallet-1",
    })

    await Promise.resolve()
    await jest.advanceTimersByTimeAsync(1200)

    await expect(createPromise).resolves.toMatchObject({
      remarkName: "business",
    })
    expect(useReceiveStore.getState().businessOrder).toMatchObject({
      remarkName: "business",
    })
    expect(useReceiveStore.getState().creating).toBe(false)
  })

  it("polls trace-detail orders after transient failures", async () => {
    jest.useFakeTimers()

    mockGetReceiveConfig.mockResolvedValue({
      sellerId: "seller",
      sendCoinCode: "SEND",
      recvCoinCode: "USDT",
      receiveMinAmount: 10,
    })
    mockGetRecentReceiveOrders.mockResolvedValue([])
    mockCreateReceiveOrder.mockResolvedValue({
      orderSn: "trace-1",
      serialNumber: "serial-1",
    })
    mockGetTraceDetail.mockRejectedValueOnce(new Error("pending")).mockResolvedValueOnce(buildOrder("personal"))

    await useReceiveStore.getState().loadHome({
      payChain: "chain",
      chainId: "1",
      walletAddress: "0xabc",
    })

    const createPromise = useReceiveStore.getState().createOrder({
      variant: "short",
      walletAddress: "0xabc",
    })

    await Promise.resolve()
    await jest.advanceTimersByTimeAsync(1200)

    await expect(createPromise).resolves.toMatchObject({
      remarkName: "personal",
    })
    expect(useReceiveStore.getState().personalOrder).toMatchObject({
      remarkName: "personal",
    })
  })

  it("returns null when createOrder becomes stale before polling starts", async () => {
    await loadReadyReceiveHome({
      payChain: "old-chain",
      chainId: "1",
      walletAddress: "0xold",
    })

    mockGetReceiveConfig.mockResolvedValue({
      sellerId: "seller-new",
      sendCoinCode: "NEW",
      recvCoinCode: "USDT",
      receiveMinAmount: 20,
    })
    mockGetRecentReceiveOrders.mockResolvedValue([])
    mockCreateReceiveOrder.mockImplementation(async () => {
      await useReceiveStore.getState().loadHome({
        payChain: "new-chain",
        chainId: "2",
        walletAddress: "0xnew",
      })

      return {
        orderSn: "",
        serialNumber: "serial-stale",
      }
    })

    await expect(
      useReceiveStore.getState().createOrder({
        variant: "short",
        walletAddress: "0xold",
      }),
    ).resolves.toBeNull()
  })

  it("returns null when trace detail resolves after the receive context changes", async () => {
    await loadReadyReceiveHome({
      payChain: "old-chain",
      chainId: "1",
      walletAddress: "0xold",
    })

    mockGetReceiveConfig.mockResolvedValue({
      sellerId: "seller-new",
      sendCoinCode: "NEW",
      recvCoinCode: "USDT",
      receiveMinAmount: 20,
    })
    mockGetRecentReceiveOrders.mockResolvedValue([])
    mockCreateReceiveOrder.mockResolvedValue({
      orderSn: "trace-stale",
      serialNumber: "serial-stale",
    })
    mockGetTraceDetail.mockImplementation(async () => {
      await useReceiveStore.getState().loadHome({
        payChain: "new-chain",
        chainId: "2",
        walletAddress: "0xnew",
      })

      return buildOrder("stale-trace")
    })

    await expect(
      useReceiveStore.getState().createOrder({
        variant: "short",
        walletAddress: "0xold",
      }),
    ).resolves.toBeNull()
  })

  it("returns null when a new receive context starts right after trace polling resolves", async () => {
    await loadReadyReceiveHome({
      payChain: "old-chain",
      chainId: "1",
      walletAddress: "0xold",
    })

    mockGetReceiveConfig.mockResolvedValue({
      sellerId: "seller-new",
      sendCoinCode: "NEW",
      recvCoinCode: "USDT",
      receiveMinAmount: 20,
    })
    mockGetRecentReceiveOrders.mockResolvedValue([])
    mockCreateReceiveOrder.mockResolvedValue({
      orderSn: "trace-after-poll",
      serialNumber: "serial-after-poll",
    })
    mockGetTraceDetail.mockImplementation(async () => {
      queueMicrotask(() => {
        void useReceiveStore.getState().loadHome({
          payChain: "new-chain",
          chainId: "2",
          walletAddress: "0xnew",
        })
      })

      return buildOrder("after-poll")
    })

    await expect(
      useReceiveStore.getState().createOrder({
        variant: "short",
        walletAddress: "0xold",
      }),
    ).resolves.toBeNull()
  })

  it("returns null when receiving polling aborts before the first attempt or via abort-like errors", async () => {
    await loadReadyReceiveHome()

    mockCreateReceiveOrder.mockResolvedValue({
      get orderSn() {
        resetReceiveStoreForTests()
        return ""
      },
      serialNumber: "serial-aborted",
    })

    await expect(
      useReceiveStore.getState().createOrder({
        variant: "long",
        walletAddress: "0xabc",
      }),
    ).resolves.toBeNull()

    await loadReadyReceiveHome()
    mockCreateReceiveOrder.mockResolvedValue({
      orderSn: "",
      serialNumber: "serial-abort-like",
    })
    mockGetReceivingOrderStatus.mockRejectedValue(createAbortError("Receive order polling aborted."))

    await expect(
      useReceiveStore.getState().createOrder({
        variant: "long",
        walletAddress: "0xabc",
      }),
    ).resolves.toBeNull()
  })

  it("returns null when receiving polling aborts after a fetch resolves", async () => {
    await loadReadyReceiveHome()

    mockCreateReceiveOrder.mockResolvedValue({
      orderSn: "",
      serialNumber: "serial-after-fetch",
    })
    mockGetReceivingOrderStatus.mockImplementation(async () => {
      resetReceiveStoreForTests()
      return buildOrder("after-fetch")
    })

    await expect(
      useReceiveStore.getState().createOrder({
        variant: "long",
        walletAddress: "0xabc",
      }),
    ).resolves.toBeNull()
  })

  it("returns null when trace polling aborts before or after fetch resolution", async () => {
    await loadReadyReceiveHome()

    mockCreateReceiveOrder.mockResolvedValue({
      get orderSn() {
        resetReceiveStoreForTests()
        return "trace-before-fetch"
      },
      serialNumber: "serial-trace-before-fetch",
    })

    await expect(
      useReceiveStore.getState().createOrder({
        variant: "short",
        walletAddress: "0xabc",
      }),
    ).resolves.toBeNull()

    await loadReadyReceiveHome()
    mockCreateReceiveOrder.mockResolvedValue({
      orderSn: "trace-after-fetch",
      serialNumber: "serial-trace-after-fetch",
    })
    mockGetTraceDetail.mockImplementation(async () => {
      resetReceiveStoreForTests()
      return buildOrder("after-trace-fetch")
    })

    await expect(
      useReceiveStore.getState().createOrder({
        variant: "short",
        walletAddress: "0xabc",
      }),
    ).resolves.toBeNull()
  })

  it("rethrows receive_order_not_ready after repeated non-error receiving failures", async () => {
    jest.useFakeTimers()
    await loadReadyReceiveHome()

    mockCreateReceiveOrder.mockResolvedValue({
      orderSn: "",
      serialNumber: "serial-never-ready",
    })
    mockGetReceivingOrderStatus.mockRejectedValue("pending")

    const createPromise = useReceiveStore.getState().createOrder({
      variant: "long",
      walletAddress: "0xabc",
    })
    const assertion = expect(createPromise).rejects.toThrow("receive_order_not_ready")

    await Promise.resolve()
    await jest.advanceTimersByTimeAsync(1200 * 8)

    await assertion
  })

  it("rethrows receive_order_not_ready after repeated non-error trace failures", async () => {
    jest.useFakeTimers()
    await loadReadyReceiveHome()

    mockCreateReceiveOrder.mockResolvedValue({
      orderSn: "trace-never-ready",
      serialNumber: "serial-trace-never-ready",
    })
    mockGetTraceDetail.mockRejectedValue("pending")

    const createPromise = useReceiveStore.getState().createOrder({
      variant: "short",
      walletAddress: "0xabc",
    })
    const assertion = expect(createPromise).rejects.toThrow("receive_order_not_ready")

    await Promise.resolve()
    await jest.advanceTimersByTimeAsync(1200 * 8)

    await assertion
  })

  it("rethrows the last Error from receiving and trace polling when retries are exhausted", async () => {
    jest.useFakeTimers()
    await loadReadyReceiveHome()

    mockCreateReceiveOrder.mockResolvedValueOnce({
      orderSn: "",
      serialNumber: "serial-error",
    })
    mockGetReceivingOrderStatus.mockRejectedValue(new Error("receiving_failed"))

    const receivingPromise = useReceiveStore.getState().createOrder({
      variant: "long",
      walletAddress: "0xabc",
    })
    const receivingAssertion = expect(receivingPromise).rejects.toThrow("receiving_failed")

    await Promise.resolve()
    await jest.advanceTimersByTimeAsync(1200 * 8)
    await receivingAssertion

    await loadReadyReceiveHome()
    mockCreateReceiveOrder.mockResolvedValueOnce({
      orderSn: "trace-error",
      serialNumber: "trace-error-serial",
    })
    mockGetTraceDetail.mockRejectedValue(new Error("trace_failed"))

    const tracePromise = useReceiveStore.getState().createOrder({
      variant: "short",
      walletAddress: "0xabc",
    })
    const traceAssertion = expect(tracePromise).rejects.toThrow("trace_failed")

    await Promise.resolve()
    await jest.advanceTimersByTimeAsync(1200 * 8)
    await traceAssertion
  })

  it("swallows abort-like loadHome and createOrder failures", async () => {
    mockGetReceiveConfig.mockRejectedValue(createAbortError("load aborted"))

    await expect(
      useReceiveStore.getState().loadHome({
        payChain: "chain",
        chainId: "1",
        walletAddress: "0xabc",
      }),
    ).resolves.toBeUndefined()

    mockGetReceiveConfig.mockResolvedValue({
      sellerId: "seller",
      sendCoinCode: "SEND",
      recvCoinCode: "USDT",
      receiveMinAmount: 10,
    })
    mockGetRecentReceiveOrders.mockResolvedValue([])

    await useReceiveStore.getState().loadHome({
      payChain: "chain",
      chainId: "1",
      walletAddress: "0xabc",
    })

    mockCreateReceiveOrder.mockRejectedValue(createAbortError("create aborted"))

    await expect(
      useReceiveStore.getState().createOrder({
        variant: "short",
        walletAddress: "0xabc",
      }),
    ).resolves.toBeNull()
  })

  it("falls back to the default receive amount when config.receiveMinAmount is zero", async () => {
    mockGetReceiveConfig.mockResolvedValue({
      sellerId: "seller",
      sendCoinCode: "SEND",
      recvCoinCode: "USDT",
      receiveMinAmount: 0,
    })
    mockGetRecentReceiveOrders.mockResolvedValue([])
    mockCreateReceiveOrder.mockResolvedValue({
      orderSn: "trace-min-0",
      serialNumber: "serial-min-0",
    })
    mockGetTraceDetail.mockResolvedValue(buildOrder("trace-min-0"))

    await useReceiveStore.getState().loadHome({
      payChain: "chain",
      chainId: "1",
      walletAddress: "0xabc",
    })
    await useReceiveStore.getState().createOrder({
      variant: "short",
      walletAddress: "0xabc",
    })

    expect(mockCreateReceiveOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        recvAmount: 10,
      }),
    )
  })
})
