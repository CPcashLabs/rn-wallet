const mockGetNumber = jest.fn()

jest.mock("@/shared/storage/kvStorage", () => ({
  getNumber: (...args: unknown[]) => mockGetNumber(...args),
}))

import { AbiCoder } from "ethers"

import { RPC_REQUEST_TIMEOUT_MS, fetchOnChainBalances, getRpcProvider, resetRpcProvider } from "@/shared/web3/balanceService"

import type { WalletCoin } from "@/shared/api/walletAssets"

const abiCoder = new AbiCoder()
const TEST_ADDRESS = "0x00000000000000000000000000000000000000a1"

function createCoin(overrides: Partial<WalletCoin>): WalletCoin {
  return {
    chainColor: "#00AAFF",
    chainName: "BTT",
    code: "BTT",
    contract: "0x0000000000000000000000000000000000000000",
    logo: "",
    name: "BitTorrent",
    precision: 18,
    price: 1,
    symbol: "BTT",
    ...overrides,
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

  it("normalizes non-finite balances to zero", async () => {
    const provider = {
      getBalance: jest.fn(async () => BigInt(`1${"0".repeat(400)}`)),
      call: jest.fn(),
    }

    await expect(
      fetchOnChainBalances({
        address: TEST_ADDRESS,
        coins: [createCoin({ code: "BTT" })],
        provider,
      }),
    ).resolves.toEqual({
      BTT: 0,
    })
  })
})
