import { QueryClient } from "@tanstack/react-query"

const mockGetAddressBookList = jest.fn()

jest.mock("@/shared/address-book/addressBookApi", () => ({
  getAddressBookList: (...args: unknown[]) => mockGetAddressBookList(...args),
}))

import type { AddressBookEntry } from "@/shared/address-book/addressBookApi"
import {
  addressBookKeys,
  findAddressBookEntryByAddress,
  getAddressBookEntriesQueryData,
  removeAddressBookEntries,
  removeAddressBookEntryFromCache,
  sortAddressBookEntries,
  upsertAddressBookEntries,
  writeAddressBookEntryToCache,
} from "@/shared/address-book/addressBookQueries"

function buildEntry(id: string, overrides?: Partial<AddressBookEntry>): AddressBookEntry {
  return {
    id,
    name: `Entry ${id}`,
    walletAddress: `0x${id}`,
    chainType: "EVM",
    chainName: "BTT",
    createdAt: Number(id),
    updatedAt: Number(id),
    ...overrides,
  }
}

describe("addressBookQueries", () => {
  beforeEach(() => {
    mockGetAddressBookList.mockReset()
  })

  it("sorts entries by updatedAt or createdAt descending", () => {
    expect(
      sortAddressBookEntries([
        buildEntry("1", { updatedAt: 10 }),
        buildEntry("2", { updatedAt: 30 }),
        buildEntry("3", { updatedAt: undefined, createdAt: 20 }),
      ]).map(item => item.id),
    ).toEqual(["2", "3", "1"])
  })

  it("finds entries by normalized wallet address", () => {
    const entries = [buildEntry("1", { walletAddress: "0xAbC" })]

    expect(findAddressBookEntryByAddress(entries, " 0xabc ")).toMatchObject({
      id: "1",
    })
    expect(findAddressBookEntryByAddress(entries, " ")).toBeNull()
  })

  it("builds sorted list data from the address book api", async () => {
    mockGetAddressBookList.mockResolvedValue([
      buildEntry("1", { updatedAt: 10 }),
      buildEntry("2", { updatedAt: 30 }),
      buildEntry("3", { updatedAt: 20 }),
    ])

    await expect(getAddressBookEntriesQueryData()).resolves.toMatchObject([
      { id: "2" },
      { id: "3" },
      { id: "1" },
    ])
  })

  it("upserts and removes entries from list snapshots", () => {
    const entries = [buildEntry("1", { updatedAt: 10 }), buildEntry("2", { updatedAt: 30 })]

    expect(
      upsertAddressBookEntries(entries, buildEntry("3", { updatedAt: 20 })).map(item => item.id),
    ).toEqual(["2", "3", "1"])

    expect(
      upsertAddressBookEntries(entries, buildEntry("1", { updatedAt: 40, name: "Updated" })).map(item => item.id),
    ).toEqual(["1", "2"])

    expect(removeAddressBookEntries(entries, "2").map(item => item.id)).toEqual(["1"])
  })

  it("writes and removes entries through the shared query cache", () => {
    const queryClient = new QueryClient()

    queryClient.setQueryData(addressBookKeys.list(), [buildEntry("1", { updatedAt: 10 })])
    writeAddressBookEntryToCache(queryClient, buildEntry("2", { updatedAt: 20 }))

    expect(queryClient.getQueryData(addressBookKeys.list())).toMatchObject([
      { id: "2" },
      { id: "1" },
    ])
    expect(queryClient.getQueryData(addressBookKeys.detail("2"))).toMatchObject({
      id: "2",
    })

    removeAddressBookEntryFromCache(queryClient, "2")

    expect(queryClient.getQueryData(addressBookKeys.list())).toMatchObject([{ id: "1" }])
    expect(queryClient.getQueryData(addressBookKeys.detail("2"))).toBeUndefined()
  })
})

export {}
