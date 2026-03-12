import { create } from "zustand"

import { getCoinList, resolveChainNameById, type HomeCoin } from "@/features/home/services/homeApi"
import { fetchOnChainBalances } from "@/shared/web3/balanceService"
import { useWalletStore } from "@/shared/store/useWalletStore"

type BalanceMap = Record<string, number>

type BalanceState = {
  loading: boolean
  refreshing: boolean
  lastUpdatedAt: number | null
  coins: HomeCoin[]
  balances: BalanceMap
  loadCoins: (chainId?: string | number | null) => Promise<void>
  refreshCoins: (chainId?: string | number | null) => Promise<void>
  setBalanceSnapshot: (snapshot: BalanceMap) => void
  clear: () => void
}

function withDefaultBalance(coins: HomeCoin[], previous: BalanceMap) {
  return coins.reduce<BalanceMap>((acc, coin) => {
    acc[coin.code] = previous[coin.code] ?? 0
    return acc
  }, {})
}

export const useBalanceStore = create<BalanceState>((set, get) => ({
  loading: false,
  refreshing: false,
  lastUpdatedAt: null,
  coins: [],
  balances: {},
  loadCoins: async chainId => {
    if (get().loading) {
      return
    }

    set({ loading: true })

    try {
      const chainName = resolveChainNameById(chainId)
      const coins = await getCoinList(chainName)
      const address = useWalletStore.getState().address
      const snapshot = await fetchOnChainBalances({ address, chainId, coins })
      const balances = withDefaultBalance(coins, snapshot)

      set({
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

    set({ refreshing: true })

    try {
      const chainName = resolveChainNameById(chainId)
      const coins = await getCoinList(chainName)
      const address = useWalletStore.getState().address
      const snapshot = await fetchOnChainBalances({ address, chainId, coins })
      const balances = withDefaultBalance(coins, snapshot)

      set({
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
      loading: false,
      refreshing: false,
      lastUpdatedAt: null,
      coins: [],
      balances: {},
    }),
}))
