const mockApiGet = jest.fn()

jest.mock("@/shared/api/client", () => ({
  apiClient: {
    get: (...args: unknown[]) => mockApiGet(...args),
  },
}))

import { getCoinList, resolveChainNameById } from "@/shared/api/walletAssets"

describe("walletAssets", () => {
  beforeEach(() => {
    mockApiGet.mockReset()
  })

  it("resolves the mainnet chain name by chain id", () => {
    expect(resolveChainNameById("199")).toBe("BTT")
    expect(resolveChainNameById(199)).toBe("BTT")
    expect(resolveChainNameById("other")).toBe("BTT_TEST")
    expect(resolveChainNameById(null)).toBe("BTT_TEST")
  })

  it("loads and maps wallet coins from the api envelope", async () => {
    mockApiGet.mockResolvedValue({
      data: {
        code: 200,
        message: "ok",
        data: [
          {
            code: "USDT",
            symbol: "USDT",
            name: "Tether",
            logo: "https://example.com/usdt.png",
            chain_name: "BTT",
            chain_full_name: "BitTorrent Chain",
            chain_logo: "https://example.com/chain.png",
            chain_color: "#00ffaa",
            contract: "0xabc",
            price: 1.01,
            precision: 6,
          },
        ],
      },
    })

    await expect(getCoinList("BTT")).resolves.toEqual([
      {
        code: "USDT",
        symbol: "USDT",
        name: "Tether",
        logo: "https://example.com/usdt.png",
        chainName: "BTT",
        chainColor: "#00ffaa",
        contract: "0xabc",
        price: 1.01,
        precision: 6,
      },
    ])

    expect(mockApiGet).toHaveBeenCalledWith("/api/blockchain/member/coin/list", {
      params: {
        chain_name: "BTT",
      },
    })
  })
})
