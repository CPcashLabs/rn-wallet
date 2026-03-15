const mockCreateReceiveOrder = jest.fn()
const mockGetRecentReceiveOrders = jest.fn()
const mockGetReceivingOrderStatus = jest.fn()
const mockGetTraceDetail = jest.fn()
const mockGetReceiveConfig = jest.fn()

jest.mock("@/plugins/receive/services/receiveApi", () => ({
  createReceiveOrder: (...args: unknown[]) => mockCreateReceiveOrder(...args),
  getRecentReceiveOrders: (...args: unknown[]) => mockGetRecentReceiveOrders(...args),
  getReceivingOrderStatus: (...args: unknown[]) => mockGetReceivingOrderStatus(...args),
  getTraceDetail: (...args: unknown[]) => mockGetTraceDetail(...args),
}))

jest.mock("@/shared/receive/services/receiveEntryApi", () => ({
  getReceiveConfig: (...args: unknown[]) => mockGetReceiveConfig(...args),
}))

import { resetReceiveStoreForTests, useReceiveStore } from "@/plugins/receive/store/useReceiveStore"

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

describe("useReceiveStore", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetReceiveStoreForTests()
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
})
