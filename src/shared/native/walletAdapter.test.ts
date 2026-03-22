const mockReadLocalWalletCapability = jest.fn()
const mockImportLocalWallet = jest.fn()
const mockSignWithLocalWallet = jest.fn()
const mockBroadcastTransferWithLocalWallet = jest.fn()

jest.mock("@/shared/native/localWalletVault", () => ({
  readLocalWalletCapability: (...args: unknown[]) => mockReadLocalWalletCapability(...args),
  importLocalWallet: (...args: unknown[]) => mockImportLocalWallet(...args),
  signWithLocalWallet: (...args: unknown[]) => mockSignWithLocalWallet(...args),
  broadcastTransferWithLocalWallet: (...args: unknown[]) => mockBroadcastTransferWithLocalWallet(...args),
}))

import { walletAdapter } from "@/shared/native/walletAdapter"

describe("walletAdapter", () => {
  beforeEach(() => {
    mockReadLocalWalletCapability.mockReset()
    mockImportLocalWallet.mockReset()
    mockSignWithLocalWallet.mockReset()
    mockBroadcastTransferWithLocalWallet.mockReset()
  })

  it("reports local-wallet capability", () => {
    mockReadLocalWalletCapability.mockReturnValue({
      supported: true,
    })

    expect(walletAdapter.getCapability()).toEqual({
      supported: true,
    })
  })

  it("imports wallets through the local auth vault", async () => {
    mockImportLocalWallet.mockResolvedValue({
      address: "0xdef",
      chainId: "199",
      providerName: "Imported Wallet",
      importedType: "private-key",
    })

    await expect(walletAdapter.importSecret("secret")).resolves.toEqual({
      ok: true,
      data: {
        address: "0xdef",
        chainId: "199",
        providerName: "Imported Wallet",
        importedType: "private-key",
      },
    })
  })

  it("signs messages and broadcasts transfers", async () => {
    mockSignWithLocalWallet.mockResolvedValue({
      signature: "0xsigned",
    })
    mockBroadcastTransferWithLocalWallet.mockResolvedValue({
      txHash: "0xtx",
    })

    await expect(walletAdapter.signMessage("hello")).resolves.toEqual({
      ok: true,
      data: {
        signature: "0xsigned",
      },
    })
    await expect(
      walletAdapter.signAndBroadcastTransfer({
        toAddress: "0xreceiver",
        amount: 1,
        coinPrecision: 6,
        contractAddress: "0xcontract",
      }),
    ).resolves.toEqual({
      ok: true,
      data: {
        txHash: "0xtx",
      },
    })
  })

  it("normalizes wallet operation failures", async () => {
    mockImportLocalWallet.mockRejectedValue("import failed")
    mockSignWithLocalWallet.mockRejectedValue("sign failed")
    mockBroadcastTransferWithLocalWallet.mockRejectedValue("broadcast failed")

    await expect(walletAdapter.importSecret("secret")).resolves.toMatchObject({
      ok: false,
      error: {
        message: "Wallet import failed",
      },
    })
    await expect(walletAdapter.signMessage("hello")).resolves.toMatchObject({
      ok: false,
      error: {
        message: "Wallet signature failed",
      },
    })
    await expect(
      walletAdapter.signAndBroadcastTransfer({
        toAddress: "0xreceiver",
        amount: 1,
        coinPrecision: 6,
        contractAddress: "0xcontract",
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: {
        message: "Transaction broadcast failed",
      },
    })
  })

  it("preserves Error instances from wallet operations", async () => {
    mockImportLocalWallet.mockRejectedValue(new Error("Invalid private key"))
    mockSignWithLocalWallet.mockRejectedValue(new Error("Signing rejected"))
    mockBroadcastTransferWithLocalWallet.mockRejectedValue(new Error("RPC unavailable"))

    await expect(walletAdapter.importSecret("secret")).resolves.toMatchObject({
      ok: false,
      error: {
        message: "Invalid private key",
      },
    })
    await expect(walletAdapter.signMessage("hello")).resolves.toMatchObject({
      ok: false,
      error: {
        message: "Signing rejected",
      },
    })
    await expect(
      walletAdapter.signAndBroadcastTransfer({
        toAddress: "0xreceiver",
        amount: 1,
        coinPrecision: 6,
        contractAddress: "0xcontract",
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: {
        message: "RPC unavailable",
      },
    })
  })
})
