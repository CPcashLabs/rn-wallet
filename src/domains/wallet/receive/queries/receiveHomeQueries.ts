import { useCallback, useEffect, useMemo, useRef } from "react"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  createReceiveOrder,
  getRecentReceiveOrders,
  getReceivingOrderStatus,
  getTraceDetail,
  type ReceiveOrder,
} from "@/domains/wallet/receive/services/receiveApi"
import { createAbortError, isAbortLikeError, waitForAbortableDelay } from "@/shared/async/taskController"
import { getReceiveConfig, type ReceiveConfig } from "@/shared/receive/services/receiveEntryApi"

type ReceiveHomeQueryOptions = {
  enabled?: boolean
}

export type ReceiveHomeQueryArgs = {
  payChain?: string
  chainId?: string | number | null
  walletAddress?: string | null
  multisigWalletId?: string
}

export type ReceiveCreateConfig = Pick<ReceiveConfig, "sellerId" | "sendCoinCode" | "recvCoinCode"> & {
  receiveMinAmount?: number
}

export type ReceiveHomeQueryData = {
  config: ReceiveConfig
  personalOrder: ReceiveOrder | null
  businessOrder: ReceiveOrder | null
}

type CreateReceiveOrderInput = {
  variant: "short" | "long"
  walletAddress?: string | null
  multisigWalletId?: string
  config?: ReceiveCreateConfig | null
}

const RECEIVE_ORDER_RETRY_ATTEMPTS = 8
const RECEIVE_ORDER_RETRY_DELAY_MS = 1_200
const DEFAULT_RECEIVE_AMOUNT = 10

function normalizeReceiveHomeArgs(args: ReceiveHomeQueryArgs) {
  return {
    payChain: args.payChain ?? null,
    chainId: args.chainId === null || args.chainId === undefined ? null : String(args.chainId),
    walletAddress: args.walletAddress?.trim() ?? null,
    multisigWalletId: args.multisigWalletId?.trim() ?? null,
  }
}

export function pickMarkedOrder(orders: ReceiveOrder[]) {
  return orders.find(item => item.isMarked) ?? orders[0] ?? null
}

export function buildReceiveHomeContextKey(args: ReceiveHomeQueryArgs) {
  return JSON.stringify([
    args.payChain ?? "",
    args.chainId === null || args.chainId === undefined ? "" : String(args.chainId),
    args.walletAddress?.trim() ?? "",
    args.multisigWalletId?.trim() ?? "",
  ])
}

async function waitForReceiveOrderResult(
  loader: () => Promise<ReceiveOrder>,
  signal: AbortSignal,
) {
  let lastError: unknown = null

  for (let attempt = 0; attempt < RECEIVE_ORDER_RETRY_ATTEMPTS; attempt += 1) {
    if (signal.aborted) {
      throw createAbortError("Receive order polling aborted.")
    }

    try {
      const order = await loader()

      if (signal.aborted) {
        throw createAbortError("Receive order polling aborted.")
      }

      return order
    } catch (error) {
      if (signal.aborted || isAbortLikeError(error)) {
        throw error
      }

      lastError = error

      if (attempt < RECEIVE_ORDER_RETRY_ATTEMPTS - 1) {
        await waitForAbortableDelay(RECEIVE_ORDER_RETRY_DELAY_MS, signal)
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("receive_order_not_ready")
}

export function waitForReceivingOrder(serialNumber: string, signal: AbortSignal) {
  return waitForReceiveOrderResult(() => getReceivingOrderStatus(serialNumber), signal)
}

export function waitForTraceDetail(orderSn: string, signal: AbortSignal) {
  return waitForReceiveOrderResult(() => getTraceDetail(orderSn), signal)
}

export const receiveHomeKeys = {
  all: ["receive", "home"] as const,
  detail: (args: ReceiveHomeQueryArgs) => [...receiveHomeKeys.all, normalizeReceiveHomeArgs(args)] as const,
}

export async function getReceiveHomeData(args: ReceiveHomeQueryArgs): Promise<ReceiveHomeQueryData> {
  const config = await getReceiveConfig({
    payChain: args.payChain,
    chainId: args.chainId,
  })

  const [personalOrders, businessOrders] = await Promise.all([
    getRecentReceiveOrders({
      orderType: "TRACE",
      sendCoinCode: config.sendCoinCode,
      recvCoinCode: config.recvCoinCode,
      multisigWalletId: args.multisigWalletId,
    }),
    getRecentReceiveOrders({
      orderType: "TRACE_LONG_TERM",
      sendCoinCode: config.sendCoinCode,
      recvCoinCode: config.recvCoinCode,
      multisigWalletId: args.multisigWalletId,
    }),
  ])

  return {
    config,
    personalOrder: pickMarkedOrder(personalOrders),
    businessOrder: pickMarkedOrder(businessOrders),
  }
}

export async function createReceiveOrderAndWait(
  input: CreateReceiveOrderInput & {
    signal: AbortSignal
  },
) {
  if (!input.config || !input.walletAddress) {
    return null
  }

  if (input.signal.aborted) {
    return null
  }

  try {
    const result = await createReceiveOrder({
      variant: input.variant,
      sellerId: input.config.sellerId,
      recvAmount: input.config.receiveMinAmount || DEFAULT_RECEIVE_AMOUNT,
      recvAddress: input.walletAddress,
      sendCoinCode: input.config.sendCoinCode,
      recvCoinCode: input.config.recvCoinCode,
      multisigWalletId: input.multisigWalletId,
    })

    if (input.signal.aborted) {
      return null
    }

    return result.orderSn.trim().length > 0
      ? await waitForTraceDetail(result.orderSn, input.signal)
      : await waitForReceivingOrder(result.serialNumber, input.signal)
  } catch (error) {
    if (input.signal.aborted || isAbortLikeError(error)) {
      return null
    }

    throw error
  }
}

export function applyReceiveOrderUpdate(
  data: ReceiveHomeQueryData | undefined,
  variant: CreateReceiveOrderInput["variant"],
  order: ReceiveOrder,
) {
  if (!data) {
    return data
  }

  return {
    ...data,
    personalOrder: variant === "short" ? order : data.personalOrder,
    businessOrder: variant === "long" ? order : data.businessOrder,
  }
}

export function useReceiveHomeQuery(args: ReceiveHomeQueryArgs, options?: ReceiveHomeQueryOptions) {
  return useQuery({
    queryKey: receiveHomeKeys.detail(args),
    queryFn: () => getReceiveHomeData(args),
    enabled: options?.enabled ?? true,
    staleTime: 15_000,
  })
}

export function useCreateReceiveOrderMutation(args: ReceiveHomeQueryArgs) {
  const queryClient = useQueryClient()
  const contextKey = useMemo(() => buildReceiveHomeContextKey(args), [args])
  const queryKey = useMemo(() => receiveHomeKeys.detail(args), [args])
  const contextKeyRef = useRef(contextKey)
  const abortControllerRef = useRef<AbortController | null>(null)
  const mutation = useMutation({
    mutationFn: async (input: CreateReceiveOrderInput) => {
      abortControllerRef.current?.abort()

      const controller = new AbortController()
      abortControllerRef.current = controller

      try {
        return await createReceiveOrderAndWait({
          ...input,
          signal: controller.signal,
        })
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null
        }
      }
    },
  })

  useEffect(() => {
    contextKeyRef.current = contextKey
    abortControllerRef.current?.abort()
  }, [contextKey])

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  const createOrder = useCallback(
    async (input: CreateReceiveOrderInput) => {
      const mutationContextKey = contextKeyRef.current
      const order = await mutation.mutateAsync(input)

      if (!order || mutationContextKey !== contextKeyRef.current) {
        return null
      }

      queryClient.setQueryData(queryKey, (current?: ReceiveHomeQueryData) => applyReceiveOrderUpdate(current, input.variant, order))

      return order
    },
    [mutation, queryClient, queryKey],
  )

  return {
    createOrder,
    creating: mutation.isPending,
  }
}
