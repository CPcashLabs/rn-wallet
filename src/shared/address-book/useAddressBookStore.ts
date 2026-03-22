import { create } from "zustand"

import type { AddressBookEntry } from "@/shared/address-book/addressBookApi"

type AddressBookSelectionState = {
  selectedEntry: AddressBookEntry | null
  setSelectedEntry: (entry: AddressBookEntry | null) => void
}

export const useAddressBookStore = create<AddressBookSelectionState>(set => ({
  selectedEntry: null,
  setSelectedEntry: selectedEntry => {
    set({ selectedEntry })
  },
}))
