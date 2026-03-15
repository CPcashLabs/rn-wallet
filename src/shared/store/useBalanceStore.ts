import { create } from "zustand"

import { getCoinList, resolveChainNameById, type WalletCoin } from "@/shared/api/walletAssets"
import { fetchOnChainBalances } from "@/shared/web3/balanceService"
import { useWalletStore } from "@/shared/store/useWalletStore"

type BalanceMap = Record<string, number>

type BalanceState = {
  walletKey: string | null
  loading: boolean
  refreshing: boolean
  lastUpdatedAt: number | null
  coins: WalletCoin[]
  balances: BalanceMap
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

export const useBalanceStore = create<BalanceState>((set, get) => ({
  walletKey: null,
  loading: false,
  refreshing: false,
  lastUpdatedAt: null,
  coins: [],
  balances: {},
  loadCoins: async chainId => {
    if (get().loading) {
      return
    }

    const address = useWalletStore.getState().address
    const walletKey = resolveWalletKey(address, chainId)
    if (get().walletKey !== walletKey) {
      set({
        walletKey,
        coins: [],
        balances: {},
        lastUpdatedAt: null,
      })
    }

    set({ loading: true })

    try {
      const chainName = resolveChainNameById(chainId)
      const coins = await getCoinList(chainName)
      const snapshot = await fetchOnChainBalances({ address, chainId, coins })
      const balances = withDefaultBalance(coins, snapshot)

      set({
        walletKey,
        coins,
        balances,
        lastUpdatedAt: Date.now(),
      })
    } finally {
      set({ loading: false })
    }
  },
  refreshCoins: async chainId => {
    if (get().refreshing) {
      return
    }

    const address = useWalletStore.getState().address
    const walletKey = resolveWalletKey(address, chainId)
    set({ refreshing: true })

    try {
      const chainName = resolveChainNameById(chainId)
      const coins = await getCoinList(chainName)
      const snapshot = await fetchOnChainBalances({ address, chainId, coins })
      const balances = withDefaultBalance(coins, snapshot)

      set({
        walletKey,
        coins,
        balances,
        lastUpdatedAt: Date.now(),
      })
    } finally {
      set({ refreshing: false })
    }
  },
  setBalanceSnapshot: snapshot => {
    set(state => ({
      balances: {
        ...state.balances,
        ...snapshot,
      },
      lastUpdatedAt: Date.now(),
    }))
  },
  clear: () =>
    set({
      walletKey: null,
      loading: false,
      refreshing: false,
      lastUpdatedAt: null,
      coins: [],
      balances: {},
    }),
}))
