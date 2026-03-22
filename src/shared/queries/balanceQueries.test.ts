import type { QueryClient } from "@tanstack/react-query"

const mockFetchOnChainBalances = jest.fn()
const mockGetCoinList = jest.fn()
const mockResolveChainNameById = jest.fn()

jest.mock("@/shared/api/walletAssets", () => ({
  getCoinList: (...args: unknown[]) => mockGetCoinList(...args),
  resolveChainNameById: (...args: unknown[]) => mockResolveChainNameById(...args),
}))

jest.mock("@/shared/web3/balanceService", () => ({
  fetchOnChainBalances: (...args: unknown[]) => mockFetchOnChainBalances(...args),
}))

import type { WalletCoin } from "@/shared/api/walletAssets"
import {
  balanceKeys,
  buildWalletBalanceKey,
  getWalletBalanceQueryData,
  invalidateBalanceQueries,
  refetchBalanceQueries,
  removeBalanceQueries,
  resolveBalanceQueryError,
  withDefaultBalance,
} from "@/shared/queries/balanceQueries"

describe("balanceQueries", () => {
  const coins: WalletCoin[] = [
    {
      chainColor: "#00AAFF",
      chainName: "BTT",
      code: "USDT",
      contract: "0x1",
      logo: "",
      name: "Tether",
      precision: 6,
      price: 1,
      symbol: "USDT",
    },
    {
      chainColor: "#00AAFF",
      chainName: "BTT",
      code: "BTT",
      contract: "0x2",
      logo: "",
      name: "BitTorrent",
      precision: 18,
      price: 2,
      symbol: "BTT",
    },
  ]

  beforeEach(() => {
    mockFetchOnChainBalances.mockReset()
    mockGetCoinList.mockReset()
    mockResolveChainNameById.mockReset()
    mockResolveChainNameById.mockReturnValue("BTT")
  })

  it("builds stable wallet balance keys and query keys", () => {
    expect(buildWalletBalanceKey({ address: " TA1 ", chainId: "199" })).toBe("ta1::199")
    expect(buildWalletBalanceKey({ address: "", chainId: "199" })).toBeNull()
    expect(balanceKeys.wallet({ address: " TA1 ", chainId: 199 })).toEqual([
      "balances",
      "wallet",
      {
        address: "ta1",
        chainId: "199",
      },
    ])
  })

  it("fills missing balances with zero while preserving fetched snapshots", () => {
    expect(withDefaultBalance(coins, { USDT: 12.5 })).toEqual({
      USDT: 12.5,
      BTT: 0,
    })
  })

  it("fetches wallet balance query data from the shared services", async () => {
    const originalNow = Date.now

    try {
      Date.now = () => 123456
      mockGetCoinList.mockResolvedValueOnce(coins)
      mockFetchOnChainBalances.mockResolvedValueOnce({
        USDT: 8.5,
      })

      await expect(
        getWalletBalanceQueryData({
          address: "TA1",
          chainId: "199",
        }),
      ).resolves.toEqual({
        walletKey: "ta1::199",
        coins,
        balances: {
          USDT: 8.5,
          BTT: 0,
        },
        lastUpdatedAt: 123456,
      })
    } finally {
      Date.now = originalNow
    }

    expect(mockResolveChainNameById).toHaveBeenCalledWith("199")
    expect(mockGetCoinList).toHaveBeenCalledWith("BTT")
    expect(mockFetchOnChainBalances).toHaveBeenCalledWith({
      address: "TA1",
      chainId: "199",
      coins,
    })
  })

  it("maps query errors to load and refresh states", () => {
    expect(resolveBalanceQueryError(new Error("rpc_failed"), false)).toEqual({
      kind: "load",
      message: "rpc_failed",
    })
    expect(resolveBalanceQueryError("refresh_failed", true)).toEqual({
      kind: "refresh",
      message: "refresh_failed",
    })
    expect(resolveBalanceQueryError(null, false)).toBeNull()
  })

  it("exposes query client helpers for invalidating, refetching and removing balances", async () => {
    const invalidateQueries = jest.fn(() => Promise.resolve())
    const refetchQueries = jest.fn(() => Promise.resolve())
    const removeQueries = jest.fn()
    const queryClient = {
      invalidateQueries,
      refetchQueries,
      removeQueries,
    } as unknown as QueryClient

    await invalidateBalanceQueries(queryClient)
    await refetchBalanceQueries(queryClient)
    removeBalanceQueries(queryClient)

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: balanceKeys.all,
    })
    expect(refetchQueries).toHaveBeenCalledWith({
      queryKey: balanceKeys.all,
      type: "all",
    })
    expect(removeQueries).toHaveBeenCalledWith({
      queryKey: balanceKeys.all,
    })
  })
})

export {}
