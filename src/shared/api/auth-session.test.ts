const mockSecureStore = new Map<string, string>()
const mockLogInfoSafely = jest.fn()
const mockLogWarnSafely = jest.fn()

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

jest.mock("@/shared/logging/safeConsole", () => ({
  logInfoSafely: (...args: unknown[]) => mockLogInfoSafely(...args),
  logWarnSafely: (...args: unknown[]) => mockLogWarnSafely(...args),
}))

import { SecureStorageKeys } from "@/shared/storage/sessionKeys"
import {
  clearAuthSession,
  readAuthSession,
  readTokenPair,
  resetAuthSessionStateForTests,
  writeAuthSession,
} from "@/shared/api/auth-session"

beforeEach(() => {
  mockCanonicalWriteGate = null
  mockSecureStore.clear()
  jest.clearAllMocks()
  mockLogInfoSafely.mockReset()
  mockLogWarnSafely.mockReset()
  resetAuthSessionStateForTests()
})

describe("auth session storage", () => {
  it("migrates legacy split keys into a canonical session snapshot", async () => {
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
    expect(mockLogInfoSafely).toHaveBeenCalledWith("[auth.session]", {
      context: {
        component: "auth.session",
        event: "legacy_session_migrated",
        message: "Migrated a legacy auth session into the canonical snapshot format.",
        details: {
          hasSession: true,
          hasAddress: true,
          loginType: "password",
          hasPasskeyRawId: false,
        },
      },
      forwardToConsole: false,
    })
  })

  it("serializes concurrent write and read operations to avoid partial snapshots", async () => {
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

  it("invalidates the in-memory cache when another runtime updates the persisted session version", async () => {
    await writeAuthSession({
      accessToken: "cached-access",
      refreshToken: "cached-refresh",
      address: "0xabc",
      loginType: "wallet",
    })

    await expect(readAuthSession()).resolves.toEqual({
      accessToken: "cached-access",
      refreshToken: "cached-refresh",
      address: "0xabc",
      loginType: "wallet",
    })
    expect(mockLogInfoSafely).toHaveBeenCalledWith("[auth.session]", {
      context: {
        component: "auth.session",
        event: "cache_hit",
        message: "Read auth session from the in-memory cache.",
        details: {
          hasSession: true,
          hasAddress: true,
          loginType: "wallet",
          hasPasskeyRawId: false,
          hasPersistedVersion: true,
        },
      },
      forwardToConsole: false,
    })

    mockSecureStore.set(
      SecureStorageKeys.AuthSession,
      JSON.stringify({
        accessToken: "external-access",
        refreshToken: "external-refresh",
        address: "0xdef",
        loginType: "password",
      }),
    )
    mockSecureStore.set(SecureStorageKeys.AuthSessionVersion, "external-version")

    await expect(readAuthSession()).resolves.toEqual({
      accessToken: "external-access",
      refreshToken: "external-refresh",
      address: "0xdef",
      loginType: "password",
    })
  })

  it("rejects a read when the caller aborts before entering the auth session lock", async () => {
    const controller = new AbortController()
    controller.abort()

    await expect(readAuthSession(controller.signal)).rejects.toMatchObject({
      name: "AbortError",
    })
  })

  it("clears canonical sessions and returns null token pairs afterwards", async () => {
    await writeAuthSession({
      accessToken: "access",
      refreshToken: "refresh",
      address: "0xabc",
      loginType: "wallet",
    })

    await clearAuthSession()

    await expect(readAuthSession()).resolves.toBeNull()
    await expect(readTokenPair()).resolves.toBeNull()
    expect(mockSecureStore.has(SecureStorageKeys.AuthSession)).toBe(false)
    expect(mockSecureStore.get(SecureStorageKeys.AuthSessionVersion)).toBeTruthy()
  })

  it("ignores invalid canonical snapshots and rotates the persisted version", async () => {
    mockSecureStore.set(SecureStorageKeys.AuthSession, "{\"accessToken\":\"\",\"refreshToken\":\"\"}")
    mockSecureStore.set(SecureStorageKeys.AuthSessionVersion, "stale-version")

    await expect(readAuthSession()).resolves.toBeNull()

    expect(mockSecureStore.has(SecureStorageKeys.AuthSession)).toBe(false)
    expect(mockSecureStore.get(SecureStorageKeys.AuthSessionVersion)).not.toBe("stale-version")
    expect(mockLogWarnSafely).toHaveBeenCalledWith("[auth.session]", {
      context: {
        component: "auth.session",
        event: "invalid_canonical_snapshot",
        message: "Removed an invalid canonical auth session snapshot.",
      },
      forwardToConsole: false,
    })
  })

  it("creates a canonical session version when the session exists but no version is stored", async () => {
    mockSecureStore.set(
      SecureStorageKeys.AuthSession,
      JSON.stringify({
        accessToken: "canonical-access",
        refreshToken: "canonical-refresh",
        address: "0xabc",
      }),
    )

    await expect(readAuthSession()).resolves.toEqual({
      accessToken: "canonical-access",
      refreshToken: "canonical-refresh",
      address: "0xabc",
    })

    expect(mockSecureStore.get(SecureStorageKeys.AuthSessionVersion)).toBeTruthy()
    expect(mockLogInfoSafely).toHaveBeenCalledWith("[auth.session]", {
      context: {
        component: "auth.session",
        event: "canonical_version_created",
        message: "Created a missing version for the canonical auth session snapshot.",
        details: {
          hasSession: true,
          hasAddress: true,
          loginType: "unknown",
          hasPasskeyRawId: false,
        },
      },
      forwardToConsole: false,
    })
  })

  it("migrates legacy token pairs even when no session meta is stored", async () => {
    mockSecureStore.set(SecureStorageKeys.AccessToken, "legacy-access")
    mockSecureStore.set(SecureStorageKeys.RefreshToken, "legacy-refresh")

    await expect(readAuthSession()).resolves.toEqual({
      accessToken: "legacy-access",
      refreshToken: "legacy-refresh",
    })
  })

  it("ignores malformed legacy session meta during migration", async () => {
    mockSecureStore.set(SecureStorageKeys.AccessToken, "legacy-access")
    mockSecureStore.set(SecureStorageKeys.RefreshToken, "legacy-refresh")
    mockSecureStore.set(SecureStorageKeys.SessionMeta, "{bad-json")

    await expect(readAuthSession()).resolves.toEqual({
      accessToken: "legacy-access",
      refreshToken: "legacy-refresh",
    })
    expect(mockLogWarnSafely).toHaveBeenCalledWith("[auth.session]", {
      context: {
        component: "auth.session",
        event: "legacy_meta_parse_failed",
        message: "Failed to parse legacy auth session metadata.",
      },
      forwardToConsole: false,
    })
  })
})
