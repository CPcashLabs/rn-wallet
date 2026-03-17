import { create } from "zustand"

import { getBoolean, setBoolean } from "@/shared/storage/kvStorage"
import { KvStorageKeys } from "@/shared/storage/sessionKeys"

type CopouchState = {
  sortByAmount: boolean
  toggleSortByAmount: () => void
  clear: () => void
}

export const useCopouchStore = create<CopouchState>((set, get) => ({
  sortByAmount: getBoolean(KvStorageKeys.CopouchSortByAmount) ?? false,
  toggleSortByAmount: () => {
    const next = !get().sortByAmount
    setBoolean(KvStorageKeys.CopouchSortByAmount, next)
    set({ sortByAmount: next })
  },
  clear: () =>
    set({
      sortByAmount: getBoolean(KvStorageKeys.CopouchSortByAmount) ?? false,
    }),
}))
