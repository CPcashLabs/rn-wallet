import { create } from "zustand"

import { getCoinList, resolveChainNameById, type WalletCoin } from "@/shared/api/walletAssets"
import { fetchOnChainBalances } from "@/shared/web3/balanceService"
import { useWalletStore } from "@/shared/store/useWalletStore"

type BalanceMap = Record<string, number>

export type BalanceError = {
  kind: "load" | "refresh"
  message: string
}

type BalanceState = {
  walletKey: string | null
  loading: boolean
  refreshing: boolean
  lastUpdatedAt: number | null
  coins: WalletCoin[]
  balances: BalanceMap
  error: BalanceError | null
  loadCoins: (chainId?: string | number | null) => Promise<void>
  refreshCoins: (chainId?: string | number | null) => Promise<void>
  setBalanceSnapshot: (snapshot: BalanceMap) => void
  clear: () => void
}

function withDefaultBalance(coins: WalletCoin[], previous: BalanceMap) {
  return coins.reduce<BalanceMap>((acc, coin) => {
    acc[coin.code] = previous[coin.code] ?? 0
    return acc
  }, {})
}

function resolveWalletKey(address?: string | null, chainId?: string | number | null) {
  const normalizedAddress = address?.trim().toLowerCase()

  if (!normalizedAddress) {
    return null
  }

  return `${normalizedAddress}::${String(chainId ?? "unknown")}`
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

export const useBalanceStore = create<BalanceState>((set, get) => {
  let activeRequestId = 0

  function startRequest() {
    activeRequestId += 1
    return activeRequestId
  }

  function isCurrentRequest(requestId: number) {
    return requestId === activeRequestId
  }

  return {
    walletKey: null,
    loading: false,
    refreshing: false,
    lastUpdatedAt: null,
    coins: [],
    balances: {},
    error: null,
    loadCoins: async chainId => {
      const address = useWalletStore.getState().address
      const walletKey = resolveWalletKey(address, chainId)
      const state = get()

      if ((state.loading || state.refreshing) && state.walletKey === walletKey) {
        return
      }

      const requestId = startRequest()
      const shouldResetState = state.walletKey !== walletKey

      set({
        walletKey,
        loading: true,
        refreshing: false,
        error: null,
        ...(shouldResetState
          ? {
              coins: [],
              balances: {},
              lastUpdatedAt: null,
            }
          : {}),
      })

      try {
        const chainName = resolveChainNameById(chainId)
        const coins = await getCoinList(chainName)
        const snapshot = await fetchOnChainBalances({ address, chainId, coins })
        const balances = withDefaultBalance(coins, snapshot)

        if (!isCurrentRequest(requestId)) {
          return
        }

        set({
          walletKey,
          loading: false,
          refreshing: false,
          error: null,
          coins,
          balances,
          lastUpdatedAt: Date.now(),
        })
      } catch (error) {
        if (!isCurrentRequest(requestId)) {
          return
        }

        set({
          walletKey,
          loading: false,
          refreshing: false,
          error: toBalanceError("load", error),
        })
      }
    },
    refreshCoins: async chainId => {
      const address = useWalletStore.getState().address
      const walletKey = resolveWalletKey(address, chainId)
      const state = get()

      if (state.walletKey !== walletKey) {
        await get().loadCoins(chainId)
        return
      }

      if (state.loading || state.refreshing) {
        return
      }

      const requestId = startRequest()
      set({
        walletKey,
        refreshing: true,
        error: null,
      })

      try {
        const chainName = resolveChainNameById(chainId)
        const coins = await getCoinList(chainName)
        const snapshot = await fetchOnChainBalances({ address, chainId, coins })
        const balances = withDefaultBalance(coins, snapshot)

        if (!isCurrentRequest(requestId)) {
          return
        }

        set({
          walletKey,
          loading: false,
          refreshing: false,
          error: null,
          coins,
          balances,
          lastUpdatedAt: Date.now(),
        })
      } catch (error) {
        if (!isCurrentRequest(requestId)) {
          return
        }

        set({
          walletKey,
          loading: false,
          refreshing: false,
          error: toBalanceError("refresh", error),
        })
      }
    },
    setBalanceSnapshot: snapshot => {
      set(state => ({
        balances: {
          ...state.balances,
          ...snapshot,
        },
        error: null,
        lastUpdatedAt: Date.now(),
      }))
    },
    clear: () => {
      startRequest()
      set({
        walletKey: null,
        loading: false,
        refreshing: false,
        lastUpdatedAt: null,
        coins: [],
        balances: {},
        error: null,
      })
    },
  }
})
