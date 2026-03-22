const mockGetRpcProvider = jest.fn()
const mockContractTransfer = jest.fn()

jest.mock("@/shared/web3/balanceService", () => ({
  getRpcProvider: (...args: unknown[]) => mockGetRpcProvider(...args),
}))

jest.mock("ethers", () => {
  const actual = jest.requireActual("ethers") as typeof import("ethers")

  return {
    ...actual,
    Contract: jest.fn(() => ({
      transfer: mockContractTransfer,
    })),
  }
})

import { Contract, Wallet, parseUnits } from "ethers"

type TestGlobals = typeof globalThis & {
  __LOCAL_WALLET_VAULT_MMKV__?: Map<string, string | number | boolean>
  __LOCAL_WALLET_VAULT_SECURE__?: Map<string, string>
}

function mockGetMmkvStore() {
  const globals = globalThis as TestGlobals
  globals.__LOCAL_WALLET_VAULT_MMKV__ ??= new Map<string, string | number | boolean>()
  return globals.__LOCAL_WALLET_VAULT_MMKV__
}

function mockGetSecureStore() {
  const globals = globalThis as TestGlobals
  globals.__LOCAL_WALLET_VAULT_SECURE__ ??= new Map<string, string>()
  return globals.__LOCAL_WALLET_VAULT_SECURE__
}

jest.mock("react-native-mmkv", () => ({
  MMKV: class MockMMKV {
    set(key: string, value: string | number | boolean) {
      mockGetMmkvStore().set(key, value)
    }

    getString(key: string) {
      const value = mockGetMmkvStore().get(key)
      return typeof value === "string" ? value : undefined
    }

    getNumber(key: string) {
      const value = mockGetMmkvStore().get(key)
      return typeof value === "number" ? value : undefined
    }

    getBoolean(key: string) {
      const value = mockGetMmkvStore().get(key)
      return typeof value === "boolean" ? value : undefined
    }

    delete(key: string) {
      mockGetMmkvStore().delete(key)
    }
  },
}))

jest.mock("react-native-keychain", () => ({
  setGenericPassword: jest.fn(async (username: string, password: string, options?: { service?: string }) => {
    mockGetSecureStore().set(options?.service ?? username, password)
    return { service: options?.service ?? username }
  }),
  getGenericPassword: jest.fn(async (options?: { service?: string }) => {
    const service = options?.service ?? ""
    const secureStore = mockGetSecureStore()

    if (!secureStore.has(service)) {
      return false
    }

    return {
      username: service,
      password: secureStore.get(service),
      service,
    }
  }),
  resetGenericPassword: jest.fn(async (options?: { service?: string }) => {
    const service = options?.service
    if (service) {
      mockGetSecureStore().delete(service)
    }
    return true
  }),
}))

import {
  broadcastTransferWithLocalWallet,
  createLocalWalletUnavailableError,
  getOrCreateLocalWallet,
  importLocalWallet,
  purgeLegacyLocalKeyMaterial,
  readLocalWalletCapability,
  signWithLocalWallet,
} from "@/shared/native/localWalletVault"
import { getJson, setJson } from "@/shared/storage/kvStorage"
import { getSecureItem, setSecureItem } from "@/shared/storage/secureStorage"

const PASSKEY_CREDENTIALS_KEY = "auth.local_passkey_credentials"
const LOCAL_WALLET_KEY = "auth.local_wallet_private_key"
const PASSKEY_PRIVATE_KEY_PREFIX = "auth.local_passkey_private_key"
const TEST_MNEMONIC = "test test test test test test test test test test test junk"
const TEST_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
const TEST_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678"

describe("localWalletVault", () => {
  beforeEach(() => {
    mockGetMmkvStore().clear()
    mockGetSecureStore().clear()
    mockGetRpcProvider.mockReset()
    mockGetRpcProvider.mockReturnValue({ kind: "mock-provider" })
    mockContractTransfer.mockReset()
    ;(Contract as unknown as jest.Mock).mockClear()
    jest.restoreAllMocks()
  })

  it("purges stored local wallet and legacy passkey key material", async () => {
    setJson(PASSKEY_CREDENTIALS_KEY, [
      {
        rawId: "raw-1",
        credentialId: "cred-1",
        address: "0x123",
        displayName: "Device 1",
        createdAt: 1,
      },
    ])
    await setSecureItem(LOCAL_WALLET_KEY, "wallet-private-key")
    await setSecureItem(`${PASSKEY_PRIVATE_KEY_PREFIX}.raw-1`, "passkey-private-key")

    await purgeLegacyLocalKeyMaterial()

    expect(await getSecureItem(LOCAL_WALLET_KEY)).toBeNull()
    expect(await getSecureItem(`${PASSKEY_PRIVATE_KEY_PREFIX}.raw-1`)).toBeNull()
    expect(getJson(PASSKEY_CREDENTIALS_KEY)).toBeNull()
  })

  it("reports local wallet signing as available", () => {
    expect(readLocalWalletCapability()).toEqual({
      supported: true,
    })
  })

  it("creates a wallet capability unavailable error", () => {
    expect(createLocalWalletUnavailableError()).toMatchObject({
      name: "NativeCapabilityUnavailableError",
      capability: "wallet",
      message: "Local wallet operation is unavailable in the current flow.",
    })
  })

  it("creates and reuses a local wallet, then signs with the stored key", async () => {
    const createdWallet = await getOrCreateLocalWallet()
    const reusedWallet = await getOrCreateLocalWallet()
    const storedPrivateKey = await getSecureItem(LOCAL_WALLET_KEY)

    expect(reusedWallet).toEqual(createdWallet)
    expect(storedPrivateKey).not.toBeNull()
    if (!storedPrivateKey) {
      throw new Error("Expected stored private key")
    }

    const signature = await signWithLocalWallet("hello-local-wallet")
    const expectedSignature = await new Wallet(storedPrivateKey).signMessage("hello-local-wallet")

    expect(signature.signature).toBe(expectedSignature)
  })

  it("imports mnemonic and private-key secrets with the expected provider names", async () => {
    const importedMnemonic = await importLocalWallet(TEST_MNEMONIC)
    const importedPrivateKey = await importLocalWallet(TEST_PRIVATE_KEY)

    expect(importedMnemonic).toMatchObject({
      providerName: "Imported Mnemonic Wallet",
      importedType: "mnemonic",
    })
    expect(importedPrivateKey).toMatchObject({
      providerName: "Imported Private Key Wallet",
      importedType: "privateKey",
      address: new Wallet(TEST_PRIVATE_KEY).address,
    })
  })

  it("creates a local wallet on-demand when signing without stored material", async () => {
    const signature = await signWithLocalWallet("auto-created-wallet")
    const storedPrivateKey = await getSecureItem(LOCAL_WALLET_KEY)

    expect(storedPrivateKey).not.toBeNull()
    if (!storedPrivateKey) {
      throw new Error("Expected auto-created private key")
    }

    const expectedSignature = await new Wallet(storedPrivateKey).signMessage("auto-created-wallet")
    expect(signature.signature).toBe(expectedSignature)
  })

  it("broadcasts native transfers through the wallet signer", async () => {
    await setSecureItem(LOCAL_WALLET_KEY, TEST_PRIVATE_KEY)
    const sendTransaction = jest.spyOn(Wallet.prototype, "sendTransaction").mockResolvedValue({
      hash: "0xnative",
    } as never)

    const result = await broadcastTransferWithLocalWallet({
      toAddress: TEST_ADDRESS,
      amount: 1.25,
      coinPrecision: 6,
      contractAddress: "",
      chainId: "199",
    })

    expect(mockGetRpcProvider).toHaveBeenCalledWith("199")
    expect(sendTransaction).toHaveBeenCalledWith({
      to: TEST_ADDRESS,
      value: parseUnits("1.25", 6),
    })
    expect(result).toEqual({
      txHash: "0xnative",
    })
  })

  it("broadcasts erc20 transfers with the default and explicit gas limits", async () => {
    await setSecureItem(LOCAL_WALLET_KEY, TEST_PRIVATE_KEY)
    mockContractTransfer
      .mockResolvedValueOnce({
        hash: "0xerc20",
      })
      .mockResolvedValueOnce({
        hash: "0xerc20-custom-gas",
      })

    const defaultGasResult = await broadcastTransferWithLocalWallet({
      toAddress: TEST_ADDRESS,
      amount: 2,
      coinPrecision: 0,
      contractAddress: "0x00000000000000000000000000000000000000AA",
      chainId: 199,
    })
    const explicitGasResult = await broadcastTransferWithLocalWallet({
      toAddress: TEST_ADDRESS,
      amount: 3,
      coinPrecision: 6,
      contractAddress: "0x00000000000000000000000000000000000000AA",
      gasLimit: 210000,
    })

    expect(mockContractTransfer).toHaveBeenNthCalledWith(1, TEST_ADDRESS, parseUnits("2", 18), {
      gasLimit: 100000n,
    })
    expect(mockContractTransfer).toHaveBeenNthCalledWith(2, TEST_ADDRESS, parseUnits("3", 6), {
      gasLimit: 210000n,
    })
    expect(defaultGasResult).toEqual({
      txHash: "0xerc20",
    })
    expect(explicitGasResult).toEqual({
      txHash: "0xerc20-custom-gas",
    })
  })
})
