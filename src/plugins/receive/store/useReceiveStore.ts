import { create } from "zustand"

import {
  createReceiveOrder,
  getRecentReceiveOrders,
  getReceivingOrderStatus,
  getTraceDetail,
  type ReceiveOrder,
} from "@/plugins/receive/services/receiveApi"
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

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function waitForReceivingOrder(serialNumber: string) {
  let lastError: unknown = null

  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      return await getReceivingOrderStatus(serialNumber)
    } catch (error) {
      lastError = error
      await sleep(1200)
    }
  }

  throw lastError instanceof Error ? lastError : new Error("receive_order_not_ready")
}

async function waitForTraceDetail(orderSn: string) {
  let lastError: unknown = null

  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      return await getTraceDetail(orderSn)
    } catch (error) {
      lastError = error
      await sleep(1200)
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
    set({ loading: true })

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

      set({
        config,
        personalOrder: pickMarkedOrder(personalOrders),
        businessOrder: pickMarkedOrder(businessOrders),
      })
    } finally {
      set({ loading: false })
    }
  },
  createOrder: async input => {
    const { config } = get()

    if (!config || !input.walletAddress) {
      return null
    }

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

      const current =
        result.orderSn.trim().length > 0 ? await waitForTraceDetail(result.orderSn) : await waitForReceivingOrder(result.serialNumber)

      if (input.variant === "short") {
        set({ personalOrder: current })
      } else {
        set({ businessOrder: current })
      }

      return current
    } finally {
      set({ creating: false })
    }
  },
}))
