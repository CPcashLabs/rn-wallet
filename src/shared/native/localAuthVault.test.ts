const mockMmkvStore = new Map<string, string | number | boolean>()
const mockSecureStore = new Map<string, string>()

jest.mock("react-native-mmkv", () => ({
  MMKV: class MockMMKV {
    set(key: string, value: string | number | boolean) {
      mockMmkvStore.set(key, value)
    }

    getString(key: string) {
      const value = mockMmkvStore.get(key)
      return typeof value === "string" ? value : undefined
    }

    getNumber(key: string) {
      const value = mockMmkvStore.get(key)
      return typeof value === "number" ? value : undefined
    }

    getBoolean(key: string) {
      const value = mockMmkvStore.get(key)
      return typeof value === "boolean" ? value : undefined
    }

    delete(key: string) {
      mockMmkvStore.delete(key)
    }
  },
}))

jest.mock("react-native-keychain", () => ({
  setGenericPassword: jest.fn(async (username: string, password: string, options?: { service?: string }) => {
    mockSecureStore.set(options?.service ?? username, password)
    return { service: options?.service ?? username }
  }),
  getGenericPassword: jest.fn(async (options?: { service?: string }) => {
    const service = options?.service ?? ""
    if (!mockSecureStore.has(service)) {
      return false
    }

    return {
      username: service,
      password: mockSecureStore.get(service),
      service,
    }
  }),
  resetGenericPassword: jest.fn(async (options?: { service?: string }) => {
    const service = options?.service
    if (service) {
      mockSecureStore.delete(service)
    }
    return true
  }),
}))

import { NativeCapabilityUnavailableError } from "@/shared/errors"
import { purgeLegacyLocalKeyMaterial, readLocalWalletCapability } from "@/shared/native/localAuthVault"
import { walletAdapter } from "@/shared/native/walletAdapter"
import { getJson, setJson } from "@/shared/storage/kvStorage"
import { getSecureItem, setSecureItem } from "@/shared/storage/secureStorage"

const PASSKEY_CREDENTIALS_KEY = "auth.local_passkey_credentials"
const LOCAL_WALLET_KEY = "auth.local_wallet_private_key"
const PASSKEY_PRIVATE_KEY_PREFIX = "auth.local_passkey_private_key"

beforeEach(() => {
  mockMmkvStore.clear()
  mockSecureStore.clear()
  jest.clearAllMocks()
})

describe("localAuthVault security hardening", () => {
  it("purges legacy private key material from secure storage", async () => {
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

  it("reports local wallet signing as unavailable", async () => {
    expect(readLocalWalletCapability()).toEqual({
      supported: false,
      reason: "Hardware-backed wallet signing is required. This build disables JS-managed private keys.",
    })

    const result = await walletAdapter.connect()

    expect(result.ok).toBe(false)
    if (result.ok) {
      throw new Error("Expected walletAdapter.connect() to be unavailable")
    }

    expect(result.error).toBeInstanceOf(NativeCapabilityUnavailableError)
    expect(result.error.message).toContain("Hardware-backed wallet signing is required")
  })
})
