const mockGetNumber = jest.fn()

jest.mock("@/shared/storage/kvStorage", () => ({
  getNumber: (key: string) => mockGetNumber(key),
}))

import { AbiCoder } from "ethers"

import { RPC_REQUEST_TIMEOUT_MS, fetchOnChainBalances, getRpcProvider, resetRpcProvider } from "@/shared/web3/balanceService"

import type { WalletCoin } from "@/shared/api/walletAssets"

const abiCoder = new AbiCoder()
const TEST_ADDRESS = "0x00000000000000000000000000000000000000a1"

function loadBalanceServiceModuleWithFormatUnits(formatter: (value: bigint, precision: number) => string) {
  jest.resetModules()
  jest.doMock("@/shared/storage/kvStorage", () => ({
    getNumber: (key: string) => mockGetNumber(key),
  }))
  jest.doMock("ethers", () => {
    const actual = jest.requireActual("ethers")

    return {
      ...actual,
      formatUnits: formatter,
    }
  })

  return require("@/shared/web3/balanceService") as typeof import("@/shared/web3/balanceService")
}

function createCoin(overrides: Partial<WalletCoin>): WalletCoin {
  return {
    chainColor: overrides.chainColor ?? "#00AAFF",
    chainFullName: overrides.chainFullName ?? "BitTorrent Chain",
    chainLogo: overrides.chainLogo ?? "",
    chainName: overrides.chainName ?? "BTT",
    code: overrides.code ?? "BTT",
    contract: overrides.contract ?? "0x0000000000000000000000000000000000000000",
    logo: overrides.logo ?? "",
    name: overrides.name ?? "BitTorrent",
    precision: overrides.precision ?? 18,
    price: overrides.price ?? 1,
    symbol: overrides.symbol ?? "BTT",
  }
}

describe("fetchOnChainBalances", () => {
  beforeEach(() => {
    mockGetNumber.mockReset()
    mockGetNumber.mockReturnValue(0)
    resetRpcProvider("199")
    resetRpcProvider("1029")
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("returns native balances when the RPC responds before timeout", async () => {
    const provider = {
      getBalance: jest.fn(async () => 12_500_000_000_000_000_000n),
      call: jest.fn(),
    }

    await expect(
      fetchOnChainBalances({
        address: TEST_ADDRESS,
        coins: [createCoin({ code: "BTT" })],
        provider,
      }),
    ).resolves.toEqual({
      BTT: 12.5,
    })
  })

  it("returns ERC20 balances when contract calls succeed", async () => {
    const provider = {
      getBalance: jest.fn(),
      call: jest.fn(async () => abiCoder.encode(["uint256"], [3450000n])),
    }

    await expect(
      fetchOnChainBalances({
        address: TEST_ADDRESS,
        coins: [
          createCoin({
            code: "USDT",
            contract: "0x123",
            precision: 6,
          }),
        ],
        provider,
      }),
    ).resolves.toEqual({
      USDT: 3.45,
    })
  })

  it("falls back to zero after the RPC timeout instead of hanging the whole snapshot", async () => {
    jest.useFakeTimers()

    const provider = {
      getBalance: jest.fn(async () => 1_000_000_000_000_000_000n),
      call: jest.fn(() => new Promise<string>(() => undefined)),
    }

    const snapshotPromise = fetchOnChainBalances({
      address: TEST_ADDRESS,
      coins: [
        createCoin({ code: "BTT" }),
        createCoin({
          code: "USDT",
          contract: "0x123",
          precision: 6,
        }),
      ],
      provider,
    })

    await jest.advanceTimersByTimeAsync(RPC_REQUEST_TIMEOUT_MS)

    await expect(snapshotPromise).resolves.toEqual({
      BTT: 1,
      USDT: 0,
    })
  })

  it("returns an empty snapshot when no address or no coins are provided", async () => {
    await expect(fetchOnChainBalances({ address: null, coins: [createCoin({ code: "BTT" })] })).resolves.toEqual({})
    await expect(fetchOnChainBalances({ address: TEST_ADDRESS, coins: [] })).resolves.toEqual({})
  })

  it("caches rpc providers per chain and resets them when requested", () => {
    mockGetNumber.mockReturnValueOnce(1)

    const mainnetProvider = getRpcProvider("199")
    const sameMainnetProvider = getRpcProvider("199")
    const testnetProvider = getRpcProvider("other")

    expect(mainnetProvider).toBe(sameMainnetProvider)
    expect(mainnetProvider._getConnection().url).toBe("https://rpc.bittorrentchain.io")
    expect(testnetProvider._getConnection().url).toBe("https://pre-rpc.bt.io/")

    const destroySpy = jest.spyOn(mainnetProvider, "destroy")
    resetRpcProvider("199")
    expect(destroySpy).toHaveBeenCalledTimes(1)
    expect(getRpcProvider("199")).not.toBe(mainnetProvider)
  })

  it("falls back to the first rpc entry and the cached provider when the index or provider are missing", async () => {
    mockGetNumber.mockReturnValue(undefined)

    const provider = getRpcProvider()
    const getBalanceSpy = jest.spyOn(provider, "getBalance").mockResolvedValue(2_000_000_000_000_000_000n)

    expect(provider._getConnection().url).toBe("https://pre-rpc.bt.io/")
    await expect(
      fetchOnChainBalances({
        address: TEST_ADDRESS,
        coins: [createCoin({ code: "BTT" })],
      }),
    ).resolves.toEqual({
      BTT: 2,
    })
    expect(getBalanceSpy).toHaveBeenCalledWith(TEST_ADDRESS)
  })

  it("falls back to the first rpc url when the stored rpc index is out of range", () => {
    mockGetNumber.mockReturnValue(99)

    const provider = getRpcProvider("199")

    expect(provider._getConnection().url).toBe("https://rpc.bt.io/")
  })

  it("normalizes non-finite balances to zero", async () => {
    const mod = loadBalanceServiceModuleWithFormatUnits(() => "Infinity")
    const provider = {
      getBalance: jest.fn(async () => 1n),
      call: jest.fn(),
    }

    await expect(
      mod.fetchOnChainBalances({
        address: TEST_ADDRESS,
        coins: [createCoin({ code: "BTT" })],
        provider,
      }),
    ).resolves.toEqual({
      BTT: 0,
    })
  })
})
