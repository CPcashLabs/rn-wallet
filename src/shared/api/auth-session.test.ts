const mockSecureStore = new Map<string, string>()

type Deferred = {
  promise: Promise<void>
  resolve: () => void
}

let mockCanonicalWriteGate: Deferred | null = null

function createDeferred(): Deferred {
  let resolve!: () => void
  const promise = new Promise<void>(nextResolve => {
    resolve = nextResolve
  })

  return {
    promise,
    resolve,
  }
}

jest.mock("react-native-keychain", () => ({
  setGenericPassword: jest.fn(async (username: string, password: string, options?: { service?: string }) => {
    const service = options?.service ?? username
    if (service === "auth.session" && mockCanonicalWriteGate) {
      await mockCanonicalWriteGate.promise
    }

    mockSecureStore.set(service, password)
    return { service }
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

import { SecureStorageKeys } from "@/shared/storage/sessionKeys"

async function loadAuthSessionModule() {
  return require("@/shared/api/auth-session") as typeof import("@/shared/api/auth-session")
}

beforeEach(() => {
  mockCanonicalWriteGate = null
  mockSecureStore.clear()
  jest.clearAllMocks()
  jest.resetModules()
})

describe("auth session storage", () => {
  it("migrates legacy split keys into a canonical session snapshot", async () => {
    const { readAuthSession } = await loadAuthSessionModule()

    mockSecureStore.set(SecureStorageKeys.AccessToken, "legacy-access")
    mockSecureStore.set(SecureStorageKeys.RefreshToken, "legacy-refresh")
    mockSecureStore.set(
      SecureStorageKeys.SessionMeta,
      JSON.stringify({
        address: "0x123",
        loginType: "password",
      }),
    )

    await expect(readAuthSession()).resolves.toEqual({
      accessToken: "legacy-access",
      refreshToken: "legacy-refresh",
      address: "0x123",
      loginType: "password",
    })

    expect(mockSecureStore.get(SecureStorageKeys.AuthSession)).toBe(
      JSON.stringify({
        accessToken: "legacy-access",
        refreshToken: "legacy-refresh",
        address: "0x123",
        loginType: "password",
      }),
    )
    expect(mockSecureStore.has(SecureStorageKeys.AccessToken)).toBe(false)
    expect(mockSecureStore.has(SecureStorageKeys.RefreshToken)).toBe(false)
    expect(mockSecureStore.has(SecureStorageKeys.SessionMeta)).toBe(false)
  })

  it("serializes concurrent write and read operations to avoid partial snapshots", async () => {
    const { readAuthSession, readTokenPair, writeAuthSession } = await loadAuthSessionModule()

    mockCanonicalWriteGate = createDeferred()

    const writePromise = writeAuthSession({
      accessToken: "next-access",
      refreshToken: "next-refresh",
      address: "0xabc",
      loginType: "wallet",
    })

    let readResolved = false
    const readPromise = readAuthSession().then(session => {
      readResolved = true
      return session
    })

    await Promise.resolve()
    expect(readResolved).toBe(false)

    mockCanonicalWriteGate.resolve()

    await expect(writePromise).resolves.toBeUndefined()
    await expect(readPromise).resolves.toEqual({
      accessToken: "next-access",
      refreshToken: "next-refresh",
      address: "0xabc",
      loginType: "wallet",
    })
    await expect(readTokenPair()).resolves.toEqual({
      accessToken: "next-access",
      refreshToken: "next-refresh",
    })
  })
})
