import { create } from "zustand"

import {
  createCopouchWallet,
  getCopouchOverview,
  preValidateCopouchCreate,
  refreshCopouchWalletBalance,
  type CopouchWallet,
} from "@/features/copouch/services/copouchApi"
import { getBoolean, setBoolean } from "@/shared/storage/kvStorage"
import { KvStorageKeys } from "@/shared/storage/sessionKeys"
import { useWalletStore } from "@/shared/store/useWalletStore"

const MIN_BTT_OPERATION_BALANCE = 1800

type CowalletState = {
  loading: boolean
  refreshing: boolean
  creating: boolean
  wallets: CopouchWallet[]
  walletLimit: number
  ownerLimit: number
  finishedCount: number
  bttBalance: number
  sortByAmount: boolean
  loadOverview: () => Promise<void>
  refreshOverview: () => Promise<void>
  refreshWalletValue: (walletId: string, walletAddress: string) => Promise<void>
  toggleSortByAmount: () => void
  validateCreateEligibility: (walletName: string) => Promise<void>
  createWallet: (input: { walletName: string; walletBgColor: number }) => Promise<{ txHash: string }>
  clear: () => void
}

function sortWallets(wallets: CopouchWallet[], sortByAmount: boolean) {
  return [...wallets].sort((left, right) => {
    if (sortByAmount) {
      return right.totalValue - left.totalValue
    }

    return new Date(right.createdAt || right.updatedAt || 0).getTime() - new Date(left.createdAt || left.updatedAt || 0).getTime()
  })
}

export const useCowalletStore = create<CowalletState>((set, get) => ({
  loading: false,
  refreshing: false,
  creating: false,
  wallets: [],
  walletLimit: 0,
  ownerLimit: 0,
  finishedCount: 0,
  bttBalance: 0,
  sortByAmount: getBoolean(KvStorageKeys.CopouchSortByAmount) ?? false,
  loadOverview: async () => {
    if (get().loading) {
      return
    }

    set({ loading: true })

    try {
      const walletState = useWalletStore.getState()
      const overview = await getCopouchOverview({
        chainId: walletState.chainId,
        walletAddress: walletState.address,
      })

      set(state => ({
        wallets: sortWallets(overview.wallets, state.sortByAmount),
        walletLimit: overview.walletLimit,
        ownerLimit: overview.ownerLimit,
        finishedCount: overview.finishedCount,
        bttBalance: overview.bttBalance,
      }))
    } finally {
      set({ loading: false })
    }
  },
  refreshOverview: async () => {
    if (get().refreshing) {
      return
    }

    set({ refreshing: true })

    try {
      const walletState = useWalletStore.getState()
      const overview = await getCopouchOverview({
        chainId: walletState.chainId,
        walletAddress: walletState.address,
      })

      set(state => ({
        wallets: sortWallets(overview.wallets, state.sortByAmount),
        walletLimit: overview.walletLimit,
        ownerLimit: overview.ownerLimit,
        finishedCount: overview.finishedCount,
        bttBalance: overview.bttBalance,
      }))
    } finally {
      set({ refreshing: false })
    }
  },
  refreshWalletValue: async (walletId, walletAddress) => {
    const walletState = useWalletStore.getState()
    const nextTotalValue = await refreshCopouchWalletBalance({
      chainId: walletState.chainId,
      walletAddress,
    })

    set(state => ({
      wallets: sortWallets(
        state.wallets.map(wallet =>
          wallet.id === walletId
            ? {
                ...wallet,
                totalValue: nextTotalValue,
              }
            : wallet,
        ),
        state.sortByAmount,
      ),
    }))
  },
  toggleSortByAmount: () => {
    const next = !get().sortByAmount
    setBoolean(KvStorageKeys.CopouchSortByAmount, next)

    set(state => ({
      sortByAmount: next,
      wallets: sortWallets(state.wallets, next),
    }))
  },
  validateCreateEligibility: async walletName => {
    if (get().creating) {
      return
    }

    set({ creating: true })

    try {
      const state = get()
      const walletState = useWalletStore.getState()

      if (state.finishedCount <= 0) {
        throw new Error("finishedCount")
      }

      if (state.wallets.length >= state.walletLimit) {
        throw new Error("walletLimit")
      }

      if (state.bttBalance < MIN_BTT_OPERATION_BALANCE) {
        throw new Error("bttBalance")
      }

      await preValidateCopouchCreate({
        chainId: walletState.chainId,
        walletName,
      })
    } finally {
      set({ creating: false })
    }
  },
  createWallet: async input => {
    if (get().creating) {
      throw new Error("creating")
    }

    set({ creating: true })

    try {
      const state = get()
      const walletState = useWalletStore.getState()

      if (state.finishedCount <= 0) {
        throw new Error("finishedCount")
      }

      if (state.wallets.length >= state.walletLimit) {
        throw new Error("walletLimit")
      }

      if (state.bttBalance < MIN_BTT_OPERATION_BALANCE) {
        throw new Error("bttBalance")
      }

      await preValidateCopouchCreate({
        chainId: walletState.chainId,
        walletName: input.walletName,
      })

      const result = await createCopouchWallet({
        chainId: walletState.chainId,
        walletName: input.walletName,
        walletBgColor: input.walletBgColor,
      })

      await get().refreshOverview()
      return result
    } finally {
      set({ creating: false })
    }
  },
  clear: () =>
    set({
      loading: false,
      refreshing: false,
      creating: false,
      wallets: [],
      walletLimit: 0,
      ownerLimit: 0,
      finishedCount: 0,
      bttBalance: 0,
    }),
}))
