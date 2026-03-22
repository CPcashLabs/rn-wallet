import { useQuery } from "@tanstack/react-query"

import { getCoinList, resolveChainNameById, type WalletCoin } from "@/shared/api/walletAssets"
import { fetchOnChainBalances } from "@/shared/web3/balanceService"

type BalanceMap = Record<string, number>

export type BalanceError = {
  kind: "load" | "refresh"
  message: string
}

export type WalletBalanceQueryArgs = {
  address?: string | null
  chainId?: string | number | null
}

export type WalletBalanceQueryData = {
  walletKey: string | null
  coins: WalletCoin[]
  balances: BalanceMap
  lastUpdatedAt: number
}

function normalizeBalanceArgs(args: WalletBalanceQueryArgs) {
  return {
    address: args.address?.trim().toLowerCase() ?? null,
    chainId: args.chainId === null || args.chainId === undefined ? null : String(args.chainId),
  }
}

export function buildWalletBalanceKey(args: WalletBalanceQueryArgs) {
  const normalizedAddress = args.address?.trim().toLowerCase()

  if (!normalizedAddress) {
    return null
  }

  return `${normalizedAddress}::${String(args.chainId ?? "unknown")}`
}

export function withDefaultBalance(coins: WalletCoin[], previous: BalanceMap) {
  return coins.reduce<BalanceMap>((acc, coin) => {
    acc[coin.code] = previous[coin.code] ?? 0
    return acc
  }, {})
}

function toBalanceError(kind: BalanceError["kind"], error: unknown): BalanceError {
  if (error instanceof Error && error.message.trim()) {
    return {
      kind,
      message: error.message,
    }
  }

  if (typeof error === "string" && error.trim()) {
    return {
      kind,
      message: error.trim(),
    }
  }

  return {
    kind,
    message: kind === "refresh" ? "balance_refresh_failed" : "balance_load_failed",
  }
}

export const balanceKeys = {
  all: ["balances"] as const,
  wallet: (args: WalletBalanceQueryArgs) => [...balanceKeys.all, "wallet", normalizeBalanceArgs(args)] as const,
}

export async function getWalletBalanceQueryData(args: WalletBalanceQueryArgs): Promise<WalletBalanceQueryData> {
  const chainName = resolveChainNameById(args.chainId)
  const coins = await getCoinList(chainName)
  const snapshot = await fetchOnChainBalances({
    address: args.address,
    chainId: args.chainId,
    coins,
  })

  return {
    walletKey: buildWalletBalanceKey(args),
    coins,
    balances: withDefaultBalance(coins, snapshot),
    lastUpdatedAt: Date.now(),
  }
}

export function resolveBalanceQueryError(error: unknown, isRefetchError: boolean) {
  if (!error) {
    return null
  }

  return toBalanceError(isRefetchError ? "refresh" : "load", error)
}

export function useWalletBalanceQuery(args: WalletBalanceQueryArgs) {
  return useQuery({
    queryKey: balanceKeys.wallet(args),
    queryFn: () => getWalletBalanceQueryData(args),
    enabled: Boolean(args.address?.trim()),
    staleTime: 30_000,
    retry: false,
  })
}
