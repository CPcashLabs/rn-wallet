import { useMutation, useQuery, type QueryClient } from "@tanstack/react-query"

import {
  createAddressBookEntry,
  deleteAddressBookEntry,
  getAddressBookDetail,
  getAddressBookList,
  updateAddressBookEntry,
  type AddressBookDraft,
  type AddressBookEntry,
} from "@/shared/address-book/addressBookApi"

type AddressBookSaveInput = {
  id?: string
  draft: AddressBookDraft
}

type AddressBookSaveResult = {
  entry: AddressBookEntry | null
}

function normalizeAddressBookId(id?: string | null) {
  return id?.trim() ?? ""
}

export function sortAddressBookEntries(entries: AddressBookEntry[]) {
  return [...entries].sort((left, right) => {
    const leftTime = left.updatedAt ?? left.createdAt ?? 0
    const rightTime = right.updatedAt ?? right.createdAt ?? 0
    return rightTime - leftTime
  })
}

export function findAddressBookEntryByAddress(entries: AddressBookEntry[], address: string) {
  const normalized = address.trim().toLowerCase()
  if (!normalized) {
    return null
  }

  return entries.find(item => item.walletAddress.toLowerCase() === normalized) ?? null
}

export function upsertAddressBookEntries(entries: AddressBookEntry[], entry: AddressBookEntry) {
  const nextEntries = entries.filter(item => item.id !== entry.id)
  nextEntries.push(entry)
  return sortAddressBookEntries(nextEntries)
}

export function removeAddressBookEntries(entries: AddressBookEntry[], id: string) {
  return entries.filter(item => item.id !== id)
}

export const addressBookKeys = {
  all: ["address-book"] as const,
  list: () => [...addressBookKeys.all, "list"] as const,
  detail: (id?: string | null) => [...addressBookKeys.all, "detail", normalizeAddressBookId(id)] as const,
}

export async function getAddressBookEntriesQueryData() {
  const entries = await getAddressBookList()
  return sortAddressBookEntries(entries)
}

export function writeAddressBookEntryToCache(queryClient: QueryClient, entry: AddressBookEntry) {
  queryClient.setQueryData<AddressBookEntry[]>(addressBookKeys.list(), current => upsertAddressBookEntries(current ?? [], entry))
  queryClient.setQueryData(addressBookKeys.detail(entry.id), entry)
}

export function removeAddressBookEntryFromCache(queryClient: QueryClient, id: string) {
  queryClient.setQueryData<AddressBookEntry[]>(addressBookKeys.list(), current => removeAddressBookEntries(current ?? [], id))
  queryClient.removeQueries({
    queryKey: addressBookKeys.detail(id),
  })
}

export function refetchAddressBookEntries(queryClient: QueryClient) {
  return queryClient.fetchQuery({
    queryKey: addressBookKeys.list(),
    queryFn: getAddressBookEntriesQueryData,
    staleTime: 0,
  })
}

export function useAddressBookEntriesQuery() {
  return useQuery({
    queryKey: addressBookKeys.list(),
    queryFn: getAddressBookEntriesQueryData,
    staleTime: 30_000,
  })
}

export function useAddressBookDetailQuery(id?: string) {
  return useQuery({
    queryKey: addressBookKeys.detail(id),
    queryFn: () => getAddressBookDetail(id ?? ""),
    enabled: Boolean(id),
    staleTime: 30_000,
  })
}

export function useSaveAddressBookEntryMutation(queryClient: QueryClient) {
  return useMutation({
    mutationFn: async (input: AddressBookSaveInput): Promise<AddressBookSaveResult> => {
      if (input.id) {
        await updateAddressBookEntry(input.id, input.draft)
      } else {
        await createAddressBookEntry(input.draft)
      }

      const entries = await refetchAddressBookEntries(queryClient)
      const entry = findAddressBookEntryByAddress(entries, input.draft.walletAddress)
      if (entry) {
        writeAddressBookEntryToCache(queryClient, entry)
      }

      return { entry }
    },
  })
}

export function useDeleteAddressBookEntryMutation(queryClient: QueryClient) {
  return useMutation({
    mutationFn: async (id: string) => {
      await deleteAddressBookEntry(id)
      removeAddressBookEntryFromCache(queryClient, id)
    },
  })
}
