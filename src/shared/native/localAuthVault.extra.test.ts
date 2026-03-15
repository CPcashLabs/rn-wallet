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
  __LOCAL_AUTH_VAULT_MMKV__?: Map<string, string | number | boolean>
  __LOCAL_AUTH_VAULT_SECURE__?: Map<string, string>
}

function mockGetMmkvStore() {
  const globals = globalThis as TestGlobals
  globals.__LOCAL_AUTH_VAULT_MMKV__ ??= new Map<string, string | number | boolean>()
  return globals.__LOCAL_AUTH_VAULT_MMKV__
}

function mockGetSecureStore() {
  const globals = globalThis as TestGlobals
  globals.__LOCAL_AUTH_VAULT_SECURE__ ??= new Map<string, string>()
  return globals.__LOCAL_AUTH_VAULT_SECURE__
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
  authenticateLocalPasskey,
  broadcastTransferWithLocalWallet,
  createLocalPasskeyCredential,
  createLocalWalletUnavailableError,
  getLocalPasskeyWallet,
  getOrCreateLocalWallet,
  importLocalWallet,
  signWithLocalWallet,
} from "@/shared/native/localAuthVault"
import { setJson } from "@/shared/storage/kvStorage"
import { getSecureItem, setSecureItem } from "@/shared/storage/secureStorage"
import { useAuthStore } from "@/shared/store/useAuthStore"

const PASSKEY_CREDENTIALS_KEY = "auth.local_passkey_credentials"
const LOCAL_WALLET_KEY = "auth.local_wallet_private_key"
const PASSKEY_PRIVATE_KEY_PREFIX = "auth.local_passkey_private_key"
const TEST_MNEMONIC = "test test test test test test test test test test test junk"
const TEST_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
const TEST_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678"

describe("localAuthVault extra coverage", () => {
  beforeEach(() => {
    mockGetMmkvStore().clear()
    mockGetSecureStore().clear()
    mockGetRpcProvider.mockReset()
    mockGetRpcProvider.mockReturnValue({ kind: "mock-provider" })
    mockContractTransfer.mockReset()
    ;(Contract as unknown as jest.Mock).mockClear()
    jest.restoreAllMocks()
    useAuthStore.setState({
      session: null,
      loginType: null,
      recentPasskeys: [],
    })
  })

  it("creates a wallet capability unavailable error", () => {
    const error = createLocalWalletUnavailableError()

    expect(error).toMatchObject({
      name: "NativeCapabilityUnavailableError",
      capability: "wallet",
      message: "Local wallet operation is unavailable in the current flow.",
    })
  })

  it("authenticates specific and latest passkey credentials", async () => {
    const olderWallet = Wallet.createRandom()
    const newerWallet = Wallet.createRandom()

    setJson(PASSKEY_CREDENTIALS_KEY, [
      {
        rawId: "raw-old",
        credentialId: "cred-old",
        address: olderWallet.address,
        displayName: "Older Device",
        createdAt: 1,
      },
      {
        rawId: "raw-new",
        credentialId: "cred-new",
        address: newerWallet.address,
        displayName: "Newer Device",
        createdAt: 2,
      },
    ])
    await setSecureItem(`${PASSKEY_PRIVATE_KEY_PREFIX}.raw-old`, olderWallet.privateKey)
    await setSecureItem(`${PASSKEY_PRIVATE_KEY_PREFIX}.raw-new`, newerWallet.privateKey)

    const explicit = await authenticateLocalPasskey("raw-old")
    const latest = await authenticateLocalPasskey()

    expect(explicit).toMatchObject({
      rawId: "raw-old",
      credentialId: "cred-old",
      displayName: "Older Device",
      address: olderWallet.address,
    })
    expect(latest).toMatchObject({
      rawId: "raw-new",
      credentialId: "cred-new",
      displayName: "Newer Device",
      address: newerWallet.address,
    })
  })

  it("surfaces passkey lookup failures for missing credentials and keys", async () => {
    await expect(authenticateLocalPasskey()).rejects.toThrow("No local passkey credential found")

    const storedWallet = Wallet.createRandom()
    setJson(PASSKEY_CREDENTIALS_KEY, [
      {
        rawId: "raw-missing",
        credentialId: "cred-missing",
        address: storedWallet.address,
        displayName: "Missing Key",
        createdAt: 1,
      },
    ])

    await expect(authenticateLocalPasskey("raw-missing")).rejects.toThrow("Passkey credential is missing")
    await expect(getLocalPasskeyWallet("raw-missing")).rejects.toThrow("Passkey credential is missing")
  })

  it("reuses the stored local wallet and falls back when passkey session material is missing", async () => {
    await setSecureItem(LOCAL_WALLET_KEY, TEST_PRIVATE_KEY)
    useAuthStore.setState({
      loginType: "passkey",
      session: {
        accessToken: "token",
        refreshToken: "refresh",
        loginType: "passkey",
        passkeyRawId: "missing-raw-id",
      },
      recentPasskeys: [],
    })

    const signature = await signWithLocalWallet("fallback-to-stored-wallet")
    const expectedSignature = await new Wallet(TEST_PRIVATE_KEY).signMessage("fallback-to-stored-wallet")
    const wallet = await getOrCreateLocalWallet()

    expect(signature.signature).toBe(expectedSignature)
    expect(wallet).toMatchObject({
      address: new Wallet(TEST_PRIVATE_KEY).address,
      chainId: "199",
      providerName: "Local Test Wallet",
      privateKey: TEST_PRIVATE_KEY,
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

  it("filters existing passkey credentials before storing a new one", async () => {
    const existingWallet = Wallet.createRandom()
    setJson(PASSKEY_CREDENTIALS_KEY, [
      {
        rawId: "raw-existing",
        credentialId: "cred-existing",
        address: existingWallet.address,
        displayName: "Existing Device",
        createdAt: 1,
      },
    ])

    const nextCredential = await createLocalPasskeyCredential("alice")

    expect(nextCredential.rawId).toBeTruthy()
    expect(nextCredential.credentialId).toBeTruthy()
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

  it("broadcasts erc20 transfers with the default gas limit", async () => {
    await setSecureItem(LOCAL_WALLET_KEY, TEST_PRIVATE_KEY)
    mockContractTransfer.mockResolvedValue({
      hash: "0xerc20",
    })

    const result = await broadcastTransferWithLocalWallet({
      toAddress: TEST_ADDRESS,
      amount: 2,
      coinPrecision: 0,
      contractAddress: "0x00000000000000000000000000000000000000AA",
      chainId: 199,
    })

    expect(mockGetRpcProvider).toHaveBeenCalledWith(199)
    expect(mockContractTransfer).toHaveBeenCalledWith(TEST_ADDRESS, parseUnits("2", 18), {
      gasLimit: 100000n,
    })
    expect(result).toEqual({
      txHash: "0xerc20",
    })
  })

  it("broadcasts erc20 transfers with an explicit gas limit", async () => {
    await setSecureItem(LOCAL_WALLET_KEY, TEST_PRIVATE_KEY)
    mockContractTransfer.mockResolvedValue({
      hash: "0xerc20-custom-gas",
    })

    const result = await broadcastTransferWithLocalWallet({
      toAddress: TEST_ADDRESS,
      amount: 3,
      coinPrecision: 6,
      contractAddress: "0x00000000000000000000000000000000000000AA",
      gasLimit: 210000,
    })

    expect(mockContractTransfer).toHaveBeenCalledWith(TEST_ADDRESS, parseUnits("3", 6), {
      gasLimit: 210000n,
    })
    expect(result).toEqual({
      txHash: "0xerc20-custom-gas",
    })
  })
})
