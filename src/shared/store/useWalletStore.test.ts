import { DEFAULT_WALLET_CHAIN_ID, useWalletStore } from "@/shared/store/useWalletStore"

describe("useWalletStore", () => {
  beforeEach(() => {
    useWalletStore.getState().reset()
  })

  it("starts from the idle wallet state", () => {
    expect(DEFAULT_WALLET_CHAIN_ID).toBe("199")
    expect(useWalletStore.getState()).toMatchObject({
      status: "idle",
      address: null,
      chainId: null,
    })
  })

  it("updates and resets the wallet connection state", () => {
    useWalletStore.getState().setWalletState({
      status: "connected",
      address: "0xabc",
      chainId: "199",
    })

    expect(useWalletStore.getState()).toMatchObject({
      status: "connected",
      address: "0xabc",
      chainId: "199",
    })

    useWalletStore.getState().reset()

    expect(useWalletStore.getState()).toMatchObject({
      status: "idle",
      address: null,
      chainId: null,
    })
  })

  it("normalizes absent wallet payload fields to null", () => {
    useWalletStore.getState().setWalletState({
      status: "disconnected",
    })

    expect(useWalletStore.getState()).toMatchObject({
      status: "disconnected",
      address: null,
      chainId: null,
    })
  })
})
