import { Wallet } from "ethers"

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
  createLocalPasskeyCredential,
  purgeLegacyLocalKeyMaterial,
  readLocalWalletCapability,
  signWithLocalWallet,
} from "@/shared/native/localAuthVault"
import { walletAdapter } from "@/shared/native/walletAdapter"
import { getJson, setJson } from "@/shared/storage/kvStorage"
import { getSecureItem, setSecureItem } from "@/shared/storage/secureStorage"
import { useAuthStore } from "@/shared/store/useAuthStore"

const PASSKEY_CREDENTIALS_KEY = "auth.local_passkey_credentials"
const LOCAL_WALLET_KEY = "auth.local_wallet_private_key"
const PASSKEY_PRIVATE_KEY_PREFIX = "auth.local_passkey_private_key"
const TEST_MNEMONIC = "test test test test test test test test test test test junk"

beforeEach(() => {
  mockGetMmkvStore().clear()
  mockGetSecureStore().clear()
  jest.clearAllMocks()
  useAuthStore.setState({
    session: null,
    loginType: null,
    recentPasskeys: [],
  })
})

describe("localAuthVault", () => {
  it("purges stored local wallet and passkey key material", async () => {
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

  it("creates a local wallet and signs messages with the stored JS key", async () => {
    const connection = await walletAdapter.connect()

    expect(connection.ok).toBe(true)
    if (!connection.ok) {
      throw new Error("Expected walletAdapter.connect() to create a JS wallet")
    }

    const storedPrivateKey = await getSecureItem(LOCAL_WALLET_KEY)
    expect(storedPrivateKey).not.toBeNull()

    const signatureResult = await walletAdapter.signMessage("hello-js-wallet")

    expect(signatureResult.ok).toBe(true)
    if (!signatureResult.ok || !storedPrivateKey) {
      throw new Error("Expected walletAdapter.signMessage() to use the stored JS wallet key")
    }

    const expectedSignature = await new Wallet(storedPrivateKey).signMessage("hello-js-wallet")
    expect(signatureResult.data.signature).toBe(expectedSignature)
  })

  it("imports a wallet secret and signs with the imported private key", async () => {
    const imported = await walletAdapter.importSecret(TEST_MNEMONIC)

    expect(imported.ok).toBe(true)
    if (!imported.ok) {
      throw new Error("Expected walletAdapter.importSecret() to import the mnemonic")
    }

    expect(imported.data.address).toBe("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266")
    expect(imported.data.importedType).toBe("mnemonic")

    const signatureResult = await walletAdapter.signMessage("hello-imported-wallet")

    expect(signatureResult.ok).toBe(true)
    if (!signatureResult.ok) {
      throw new Error("Expected walletAdapter.signMessage() to use the imported JS wallet key")
    }

    const importedWallet = Wallet.fromPhrase(TEST_MNEMONIC)
    const expectedSignature = await importedWallet.signMessage("hello-imported-wallet")
    expect(signatureResult.data.signature).toBe(expectedSignature)
  })

  it("prefers the current session passkey key material when signing", async () => {
    await walletAdapter.importSecret(TEST_MNEMONIC)
    const credential = await createLocalPasskeyCredential("alice")

    useAuthStore.setState({
      loginType: "passkey",
      session: {
        accessToken: "token",
        refreshToken: "refresh",
        loginType: "passkey",
        passkeyRawId: credential.rawId,
      },
    })

    const passkeyPrivateKey = await getSecureItem(`${PASSKEY_PRIVATE_KEY_PREFIX}.${credential.rawId}`)
    const signature = await signWithLocalWallet("hello-passkey-session")

    expect(passkeyPrivateKey).not.toBeNull()
    if (!passkeyPrivateKey) {
      throw new Error("Expected passkey private key to remain available for JS signing")
    }

    const expectedSignature = await new Wallet(passkeyPrivateKey).signMessage("hello-passkey-session")
    expect(signature.signature).toBe(expectedSignature)
  })
})
