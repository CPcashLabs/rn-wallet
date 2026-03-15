import { buildHomeBalanceCacheKey, readHomeBalanceCache, writeHomeBalanceCache } from "@/features/home/services/homeBalanceCache"
import { removeItem } from "@/shared/storage/kvStorage"
import { KvStorageKeys } from "@/shared/storage/sessionKeys"

describe("homeBalanceCache integration", () => {
  beforeEach(() => {
    removeItem(KvStorageKeys.HomeBalanceCache)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("builds normalized cache keys and returns null for empty addresses", () => {
    expect(buildHomeBalanceCacheKey({ address: "  0xAbC  ", chainId: 199 })).toBe("0xabc::199")
    expect(buildHomeBalanceCacheKey({ address: "0xabc", chainId: null })).toBe("0xabc::unknown")
    expect(buildHomeBalanceCacheKey({ address: "   ", chainId: 199 })).toBeNull()
    expect(buildHomeBalanceCacheKey({ address: null, chainId: 199 })).toBeNull()
    expect(readHomeBalanceCache("missing")).toBeNull()
  })

  it("writes and reads cached balances with timestamps", () => {
    jest.spyOn(Date, "now").mockReturnValue(1700000000000)

    const cacheKey = buildHomeBalanceCacheKey({
      address: "0xAbC",
      chainId: undefined,
    })

    expect(cacheKey).toBe("0xabc::unknown")

    writeHomeBalanceCache(cacheKey!, {
      totalAssetValue: 123.45,
    })

    expect(readHomeBalanceCache(cacheKey!)).toEqual({
      totalAssetValue: 123.45,
      cachedAt: 1700000000000,
    })
  })

  it("keeps only the latest twelve cache entries", () => {
    let tick = 0
    jest.spyOn(Date, "now").mockImplementation(() => {
      tick += 1
      return tick
    })

    for (let index = 0; index < 13; index += 1) {
      writeHomeBalanceCache(`wallet-${index}`, {
        totalAssetValue: index,
      })
    }

    expect(readHomeBalanceCache("wallet-0")).toBeNull()
    expect(readHomeBalanceCache("wallet-1")).toEqual({
      totalAssetValue: 1,
      cachedAt: 2,
    })
    expect(readHomeBalanceCache("wallet-12")).toEqual({
      totalAssetValue: 12,
      cachedAt: 13,
    })
  })
})
