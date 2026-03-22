const mockGetRecentTransferEntries = jest.fn()

jest.mock("@/domains/wallet/transfer/services/transferApi", () => ({
  getRecentTransferEntries: (...args: unknown[]) => mockGetRecentTransferEntries(...args),
}))

import { getRecentTransferEntriesQueryData, transferKeys } from "@/domains/wallet/transfer/queries/transferQueries"

describe("transferQueries", () => {
  beforeEach(() => {
    mockGetRecentTransferEntries.mockReset()
  })

  it("builds stable recent-entry query keys", () => {
    expect(
      transferKeys.recentEntries({
        sendChainName: " BTT ",
        receiveChainName: " TRON ",
      }),
    ).toEqual([
      "transfer",
      "recent-entries",
      {
        sendChainName: "BTT",
        receiveChainName: "TRON",
      },
    ])
  })

  it("loads recent transfer entries from the shared transfer api", async () => {
    mockGetRecentTransferEntries.mockResolvedValue([
      {
        address: "T123",
        amount: 12.5,
        coinName: "USDT",
        createdAt: 1700000000000,
        direction: "TRANSFER",
      },
    ])

    await expect(
      getRecentTransferEntriesQueryData({
        sendChainName: "BTT",
        receiveChainName: "TRON",
      }),
    ).resolves.toMatchObject([
      {
        address: "T123",
      },
    ])

    expect(mockGetRecentTransferEntries).toHaveBeenCalledWith({
      sendChainName: "BTT",
      receiveChainName: "TRON",
    })
  })
})

export {}
