import { create } from "zustand"

import {
  createReceiveOrder,
  getRecentReceiveOrders,
  getReceivingOrderStatus,
  getTraceDetail,
  type ReceiveOrder,
} from "@/domains/wallet/receive/services/receiveApi"
import { createAbortError, createLatestTaskController, isAbortLikeError, waitForAbortableDelay } from "@/shared/async/taskController"
import { getReceiveConfig, type ReceiveConfig } from "@/shared/receive/services/receiveEntryApi"

type ReceiveStoreState = {
  config: ReceiveConfig | null
  loading: boolean
  creating: boolean
  personalOrder: ReceiveOrder | null
  businessOrder: ReceiveOrder | null
  loadHome: (input: { payChain?: string; chainId?: string | number | null; walletAddress?: string | null; multisigWalletId?: string }) => Promise<void>
  createOrder: (input: {
    variant: "short" | "long"
    walletAddress?: string | null
    multisigWalletId?: string
  }) => Promise<ReceiveOrder | null>
}

function pickMarkedOrder(orders: ReceiveOrder[]) {
  return orders.find(item => item.isMarked) ?? orders[0] ?? null
}

function buildReceiveStoreContextKey(input: {
  payChain?: string
  chainId?: string | number | null
  walletAddress?: string | null
  multisigWalletId?: string
}) {
  return JSON.stringify([
    input.payChain ?? "",
    input.chainId === null || input.chainId === undefined ? "" : String(input.chainId),
    input.walletAddress?.trim() ?? "",
    input.multisigWalletId?.trim() ?? "",
  ])
}

const receiveLoadTaskController = createLatestTaskController()
const receiveCreateTaskController = createLatestTaskController()
let activeReceiveStoreContextKey: string | null = null

async function waitForReceivingOrder(serialNumber: string, signal: AbortSignal) {
  let lastError: unknown = null

  for (let attempt = 0; attempt < 8; attempt += 1) {
    if (signal.aborted) {
      throw createAbortError("Receive order polling aborted.")
    }

    try {
      const order = await getReceivingOrderStatus(serialNumber)

      if (signal.aborted) {
        throw createAbortError("Receive order polling aborted.")
      }

      return order
    } catch (error) {
      if (signal.aborted || isAbortLikeError(error)) {
        throw error
      }

      lastError = error
      await waitForAbortableDelay(1200, signal)
    }
  }

  throw lastError instanceof Error ? lastError : new Error("receive_order_not_ready")
}

async function waitForTraceDetail(orderSn: string, signal: AbortSignal) {
  let lastError: unknown = null

  for (let attempt = 0; attempt < 8; attempt += 1) {
    if (signal.aborted) {
      throw createAbortError("Receive order polling aborted.")
    }

    try {
      const order = await getTraceDetail(orderSn)

      if (signal.aborted) {
        throw createAbortError("Receive order polling aborted.")
      }

      return order
    } catch (error) {
      if (signal.aborted || isAbortLikeError(error)) {
        throw error
      }

      lastError = error
      await waitForAbortableDelay(1200, signal)
    }
  }

  throw lastError instanceof Error ? lastError : new Error("receive_order_not_ready")
}

export const useReceiveStore = create<ReceiveStoreState>((set, get) => ({
  config: null,
  loading: false,
  creating: false,
  personalOrder: null,
  businessOrder: null,
  loadHome: async input => {
    const contextKey = buildReceiveStoreContextKey(input)
    const contextChanged = activeReceiveStoreContextKey !== contextKey
    const run = receiveLoadTaskController.begin()
    activeReceiveStoreContextKey = contextKey

    if (contextChanged) {
      receiveCreateTaskController.cancel()
    }

    set({
      loading: true,
      ...(contextChanged
        ? {
            config: null,
            creating: false,
            personalOrder: null,
            businessOrder: null,
          }
        : {}),
    })

    try {
      const config = await getReceiveConfig({
        payChain: input.payChain,
        chainId: input.chainId,
      })

      const [personalOrders, businessOrders] = await Promise.all([
        getRecentReceiveOrders({
          orderType: "TRACE",
          sendCoinCode: config.sendCoinCode,
          recvCoinCode: config.recvCoinCode,
          multisigWalletId: input.multisigWalletId,
        }),
        getRecentReceiveOrders({
          orderType: "TRACE_LONG_TERM",
          sendCoinCode: config.sendCoinCode,
          recvCoinCode: config.recvCoinCode,
          multisigWalletId: input.multisigWalletId,
        }),
      ])

      run.commit(() => {
        set({
          config,
          personalOrder: pickMarkedOrder(personalOrders),
          businessOrder: pickMarkedOrder(businessOrders),
        })
      })
    } catch (error) {
      if (!run.isCurrent() || isAbortLikeError(error)) {
        return
      }

      throw error
    } finally {
      run.commit(() => {
        set({ loading: false })
      })
    }
  },
  createOrder: async input => {
    const { config } = get()

    if (!config || !input.walletAddress) {
      return null
    }

    const contextKey = activeReceiveStoreContextKey
    const run = receiveCreateTaskController.begin()
    set({ creating: true })

    try {
      const result = await createReceiveOrder({
        variant: input.variant,
        sellerId: config.sellerId,
        recvAmount: config.receiveMinAmount || 10,
        recvAddress: input.walletAddress,
        sendCoinCode: config.sendCoinCode,
        recvCoinCode: config.recvCoinCode,
        multisigWalletId: input.multisigWalletId,
      })

      if (!run.isCurrent()) {
        return null
      }

      const current =
        result.orderSn.trim().length > 0
          ? await waitForTraceDetail(result.orderSn, run.signal)
          : await waitForReceivingOrder(result.serialNumber, run.signal)

      run.commit(() => {
        if (input.variant === "short") {
          set({ personalOrder: current })
        } else {
          set({ businessOrder: current })
        }
      })

      return current
    } catch (error) {
      if (!run.isCurrent() || isAbortLikeError(error)) {
        return null
      }

      throw error
    } finally {
      run.commit(() => {
        set({ creating: false })
      })
    }
  },
}))

export function resetReceiveStoreForTests() {
  receiveLoadTaskController.cancel()
  receiveCreateTaskController.cancel()
  activeReceiveStoreContextKey = null
  useReceiveStore.setState({
    config: null,
    loading: false,
    creating: false,
    personalOrder: null,
    businessOrder: null,
  })
}
