import { create } from "zustand"

import { getAddressBookList, type AddressBookEntry } from "@/features/address-book/services/addressBookApi"

type AddressBookState = {
  entries: AddressBookEntry[]
  loading: boolean
  refreshing: boolean
  selectedEntry: AddressBookEntry | null
  setEntries: (entries: AddressBookEntry[]) => void
  loadEntries: () => Promise<void>
  refreshEntries: () => Promise<void>
  upsertEntry: (entry: AddressBookEntry) => void
  removeEntry: (id: string) => void
  setSelectedEntry: (entry: AddressBookEntry | null) => void
  findByAddress: (address: string) => AddressBookEntry | null
}

function sortEntries(entries: AddressBookEntry[]) {
  return [...entries].sort((left, right) => {
    const leftTime = left.updatedAt ?? left.createdAt ?? 0
    const rightTime = right.updatedAt ?? right.createdAt ?? 0
    return rightTime - leftTime
  })
}

export const useAddressBookStore = create<AddressBookState>((set, get) => ({
  entries: [],
  loading: false,
  refreshing: false,
  selectedEntry: null,
  setEntries: entries => {
    set({ entries: sortEntries(entries) })
  },
  loadEntries: async () => {
    if (get().loading) {
      return
    }

    set({ loading: true })

    try {
      const entries = await getAddressBookList()
      set({ entries: sortEntries(entries) })
    } finally {
      set({ loading: false })
    }
  },
  refreshEntries: async () => {
    if (get().refreshing) {
      return
    }

    set({ refreshing: true })

    try {
      const entries = await getAddressBookList()
      set({ entries: sortEntries(entries) })
    } finally {
      set({ refreshing: false })
    }
  },
  upsertEntry: entry => {
    set(state => {
      const nextEntries = state.entries.filter(item => item.id !== entry.id)
      nextEntries.push(entry)
      return {
        entries: sortEntries(nextEntries),
      }
    })
  },
  removeEntry: id => {
    set(state => ({
      entries: state.entries.filter(item => item.id !== id),
      selectedEntry: state.selectedEntry?.id === id ? null : state.selectedEntry,
    }))
  },
  setSelectedEntry: selectedEntry => {
    set({ selectedEntry })
  },
  findByAddress: address => {
    const normalized = address.trim().toLowerCase()
    if (!normalized) {
      return null
    }

    return get().entries.find(item => item.walletAddress.toLowerCase() === normalized) ?? null
  },
}))
