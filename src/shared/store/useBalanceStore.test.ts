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
import { useBalanceStore } from "@/shared/store/useBalanceStore"
import { useWalletStore } from "@/shared/store/useWalletStore"

function createDeferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error?: unknown) => void

  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve
    reject = innerReject
  })

  return { promise, reject, resolve }
}

describe("useBalanceStore", () => {
  const oldCoins: WalletCoin[] = [
    {
      chainColor: "#00AAFF",
      chainName: "BTT",
      code: "OLD",
      contract: "0x1",
      logo: "",
      name: "Old Coin",
      precision: 18,
      price: 1,
      symbol: "OLD",
    },
  ]

  const newCoins: WalletCoin[] = [
    {
      chainColor: "#00FFAA",
      chainName: "BTT",
      code: "NEW",
      contract: "0x2",
      logo: "",
      name: "New Coin",
      precision: 18,
      price: 2,
      symbol: "NEW",
    },
  ]

  beforeEach(() => {
    mockFetchOnChainBalances.mockReset()
    mockGetCoinList.mockReset()
    mockResolveChainNameById.mockReset()
    mockResolveChainNameById.mockReturnValue("BTT")

    useWalletStore.setState({
      address: null,
      chainId: null,
      status: "idle",
    })
    useBalanceStore.getState().clear()
  })

  it("exposes a load error without committing partial balance state", async () => {
    useWalletStore.setState({
      address: "TA1",
      chainId: "199",
      status: "connected",
    })
    mockGetCoinList.mockRejectedValueOnce(new Error("coin_list_failed"))

    await useBalanceStore.getState().loadCoins("199")

    expect(useBalanceStore.getState()).toMatchObject({
      walletKey: "ta1::199",
      loading: false,
      refreshing: false,
      lastUpdatedAt: null,
      coins: [],
      balances: {},
      error: {
        kind: "load",
        message: "coin_list_failed",
      },
    })
  })

  it("preserves the last good snapshot when refresh fails", async () => {
    useWalletStore.setState({
      address: "TA1",
      chainId: "199",
      status: "connected",
    })
    mockGetCoinList.mockResolvedValueOnce(oldCoins)
    mockFetchOnChainBalances.mockResolvedValueOnce({ OLD: 12.5 })

    await useBalanceStore.getState().loadCoins("199")

    const previousState = useBalanceStore.getState()

    mockGetCoinList.mockRejectedValueOnce(new Error("refresh_failed"))

    await useBalanceStore.getState().refreshCoins("199")

    expect(useBalanceStore.getState()).toMatchObject({
      walletKey: "ta1::199",
      loading: false,
      refreshing: false,
      coins: previousState.coins,
      balances: previousState.balances,
      lastUpdatedAt: previousState.lastUpdatedAt,
      error: {
        kind: "refresh",
        message: "refresh_failed",
      },
    })
  })

  it("ignores stale responses from superseded wallet loads", async () => {
    const oldFetch = createDeferred<Record<string, number>>()

    useWalletStore.setState({
      address: "TA1",
      chainId: "199",
      status: "connected",
    })
    mockGetCoinList.mockResolvedValueOnce(oldCoins).mockResolvedValueOnce(newCoins)
    mockFetchOnChainBalances.mockReturnValueOnce(oldFetch.promise).mockResolvedValueOnce({ NEW: 3.5 })

    const firstLoad = useBalanceStore.getState().loadCoins("199")

    expect(useBalanceStore.getState()).toMatchObject({
      walletKey: "ta1::199",
      loading: true,
      coins: [],
      balances: {},
    })

    useWalletStore.setState({
      address: "TB2",
      chainId: "199",
      status: "connected",
    })

    await useBalanceStore.getState().loadCoins("199")

    expect(useBalanceStore.getState()).toMatchObject({
      walletKey: "tb2::199",
      loading: false,
      coins: newCoins,
      balances: {
        NEW: 3.5,
      },
      error: null,
    })

    oldFetch.resolve({ OLD: 9 })
    await firstLoad

    expect(useBalanceStore.getState()).toMatchObject({
      walletKey: "tb2::199",
      coins: newCoins,
      balances: {
        NEW: 3.5,
      },
      error: null,
    })
    expect(mockFetchOnChainBalances).toHaveBeenNthCalledWith(1, {
      address: "TA1",
      chainId: "199",
      coins: oldCoins,
    })
    expect(mockFetchOnChainBalances).toHaveBeenNthCalledWith(2, {
      address: "TB2",
      chainId: "199",
      coins: newCoins,
    })
  })

  it("ignores duplicate in-flight loads for the same wallet", async () => {
    const deferredCoins = createDeferred<WalletCoin[]>()

    useWalletStore.setState({
      address: "TA1",
      chainId: "199",
      status: "connected",
    })
    mockGetCoinList.mockImplementation(() => deferredCoins.promise)

    const firstLoad = useBalanceStore.getState().loadCoins("199")
    const secondLoad = useBalanceStore.getState().loadCoins("199")

    deferredCoins.resolve(oldCoins)
    mockFetchOnChainBalances.mockResolvedValue({ OLD: 1 })

    await firstLoad
    await secondLoad

    expect(mockGetCoinList).toHaveBeenCalledTimes(1)
  })

  it("allows loading balances without a resolved wallet key", async () => {
    mockGetCoinList.mockResolvedValueOnce([])
    mockFetchOnChainBalances.mockResolvedValueOnce({})

    await useBalanceStore.getState().loadCoins()

    expect(useBalanceStore.getState()).toMatchObject({
      walletKey: null,
      loading: false,
      refreshing: false,
      coins: [],
      balances: {},
      error: null,
    })
    expect(mockFetchOnChainBalances).toHaveBeenCalledWith({
      address: null,
      chainId: undefined,
      coins: [],
    })
  })

  it("refreshes through loadCoins when no snapshot exists and skips concurrent refreshes", async () => {
    useWalletStore.setState({
      address: "TA1",
      chainId: "199",
      status: "connected",
    })
    mockGetCoinList.mockResolvedValue(oldCoins)
    mockFetchOnChainBalances.mockResolvedValue({ OLD: 7.5 })

    await useBalanceStore.getState().refreshCoins("199")

    expect(useBalanceStore.getState()).toMatchObject({
      walletKey: "ta1::199",
      balances: {
        OLD: 7.5,
      },
    })

    useBalanceStore.setState({
      walletKey: "ta1::199",
      refreshing: true,
    })

    await useBalanceStore.getState().refreshCoins("199")
    expect(mockGetCoinList).toHaveBeenCalledTimes(1)
  })

  it("merges manual snapshots and normalizes string or unknown refresh errors", async () => {
    useWalletStore.setState({
      address: "TA1",
      chainId: "199",
      status: "connected",
    })
    useBalanceStore.setState({
      walletKey: "ta1::199",
      balances: {
        OLD: 1,
      },
      error: {
        kind: "load",
        message: "previous",
      },
    })

    useBalanceStore.getState().setBalanceSnapshot({
      NEW: 2,
    })

    expect(useBalanceStore.getState()).toMatchObject({
      balances: {
        OLD: 1,
        NEW: 2,
      },
      error: null,
    })

    mockGetCoinList.mockRejectedValueOnce(" refresh failed ")
    await useBalanceStore.getState().loadCoins("199")
    expect(useBalanceStore.getState().error).toEqual({
      kind: "load",
      message: "refresh failed",
    })

    useBalanceStore.setState({
      walletKey: "ta1::199",
      loading: false,
      refreshing: false,
    })
    mockGetCoinList.mockRejectedValueOnce({})
    await useBalanceStore.getState().refreshCoins("199")
    expect(useBalanceStore.getState().error).toEqual({
      kind: "refresh",
      message: "balance_refresh_failed",
    })
  })

  it("ignores stale load failures after the request is superseded", async () => {
    const deferredCoins = createDeferred<WalletCoin[]>()

    useWalletStore.setState({
      address: "TA1",
      chainId: "199",
      status: "connected",
    })
    mockGetCoinList.mockImplementationOnce(() => deferredCoins.promise)

    const loadPromise = useBalanceStore.getState().loadCoins("199")

    expect(useBalanceStore.getState()).toMatchObject({
      walletKey: "ta1::199",
      loading: true,
    })

    useBalanceStore.getState().clear()
    deferredCoins.reject(new Error("stale_load_failed"))
    await loadPromise

    expect(useBalanceStore.getState()).toMatchObject({
      walletKey: null,
      loading: false,
      refreshing: false,
      coins: [],
      balances: {},
      error: null,
    })
  })

  it("refreshes an existing wallet snapshot and fills missing balances with zero", async () => {
    useWalletStore.setState({
      address: "TA1",
      chainId: "199",
      status: "connected",
    })
    mockGetCoinList.mockResolvedValueOnce(oldCoins)
    mockFetchOnChainBalances.mockResolvedValueOnce({ OLD: 12.5 })

    await useBalanceStore.getState().loadCoins("199")

    mockGetCoinList.mockResolvedValueOnce(newCoins)
    mockFetchOnChainBalances.mockResolvedValueOnce({})

    await useBalanceStore.getState().refreshCoins("199")

    expect(useBalanceStore.getState()).toMatchObject({
      walletKey: "ta1::199",
      loading: false,
      refreshing: false,
      error: null,
      coins: newCoins,
      balances: {
        NEW: 0,
      },
    })
  })

  it("ignores stale refresh failures after the store is cleared", async () => {
    const deferredCoins = createDeferred<WalletCoin[]>()

    useWalletStore.setState({
      address: "TA1",
      chainId: "199",
      status: "connected",
    })
    mockGetCoinList.mockResolvedValueOnce(oldCoins)
    mockFetchOnChainBalances.mockResolvedValueOnce({ OLD: 1 })

    await useBalanceStore.getState().loadCoins("199")

    mockGetCoinList.mockImplementationOnce(() => deferredCoins.promise)

    const refreshPromise = useBalanceStore.getState().refreshCoins("199")

    expect(useBalanceStore.getState()).toMatchObject({
      walletKey: "ta1::199",
      refreshing: true,
    })

    useBalanceStore.getState().clear()
    deferredCoins.reject(new Error("stale_refresh_failed"))
    await refreshPromise

    expect(useBalanceStore.getState()).toMatchObject({
      walletKey: null,
      loading: false,
      refreshing: false,
      coins: [],
      balances: {},
      error: null,
    })
  })
})
