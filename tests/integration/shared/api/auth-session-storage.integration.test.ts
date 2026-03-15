import {
  clearAuthSession,
  readAuthSession,
  readTokenPair,
  writeAuthSession,
} from "@/shared/api/auth-session"
import { getSecureItem, setSecureItem } from "@/shared/storage/secureStorage"
import { SecureStorageKeys } from "@/shared/storage/sessionKeys"
import { canonicalPasskeySession, nextWalletSession } from "../../test-helpers/authFixtures"
import { clearSecureAuthStorage } from "../../test-helpers/authRuntime"

describe("auth session storage integration", () => {
  beforeEach(async () => {
    await clearSecureAuthStorage()
  })

  it("writes a canonical session, returns cloned reads, and exposes token pairs", async () => {
    await writeAuthSession(canonicalPasskeySession)

    const firstRead = await readAuthSession()
    expect(firstRead).toEqual(canonicalPasskeySession)
    expect(await readTokenPair()).toEqual({
      accessToken: canonicalPasskeySession.accessToken,
      refreshToken: canonicalPasskeySession.refreshToken,
    })
    expect(await getSecureItem(SecureStorageKeys.AuthSessionVersion)).toEqual(expect.any(String))

    firstRead!.accessToken = "mutated"

    expect(await readAuthSession()).toEqual(canonicalPasskeySession)
  })

  it("migrates legacy sessions into canonical storage and tolerates corrupt legacy metadata", async () => {
    await setSecureItem(SecureStorageKeys.AccessToken, "legacy-access")
    await setSecureItem(SecureStorageKeys.RefreshToken, "legacy-refresh")
    await setSecureItem(
      SecureStorageKeys.SessionMeta,
      JSON.stringify({
        address: "0xlegacy",
        expiresAt: 2_000_000_000,
        loginType: "password",
        passkeyRawId: "legacy-raw-id",
      }),
    )

    expect(await readAuthSession()).toEqual({
      accessToken: "legacy-access",
      refreshToken: "legacy-refresh",
      address: "0xlegacy",
      expiresAt: 2_000_000_000,
      loginType: "password",
      passkeyRawId: "legacy-raw-id",
    })

    await clearSecureAuthStorage()

    await setSecureItem(SecureStorageKeys.AccessToken, "fallback-access")
    await setSecureItem(SecureStorageKeys.RefreshToken, "fallback-refresh")
    await setSecureItem(SecureStorageKeys.SessionMeta, "{broken json")

    expect(await readAuthSession()).toEqual({
      accessToken: "fallback-access",
      refreshToken: "fallback-refresh",
    })
    expect(JSON.parse((await getSecureItem(SecureStorageKeys.AuthSession)) ?? "{}")).toEqual({
      accessToken: "fallback-access",
      refreshToken: "fallback-refresh",
    })
    expect(await getSecureItem(SecureStorageKeys.AuthSessionVersion)).toEqual(expect.any(String))
    expect(await getSecureItem(SecureStorageKeys.AccessToken)).toBeNull()
    expect(await getSecureItem(SecureStorageKeys.RefreshToken)).toBeNull()
    expect(await getSecureItem(SecureStorageKeys.SessionMeta)).toBeNull()

    await clearSecureAuthStorage()

    await setSecureItem(SecureStorageKeys.AccessToken, "meta-less-access")
    await setSecureItem(SecureStorageKeys.RefreshToken, "meta-less-refresh")

    expect(await readAuthSession()).toEqual({
      accessToken: "meta-less-access",
      refreshToken: "meta-less-refresh",
    })
  })

  it("creates missing versions for canonical sessions and invalidates the cache when the version changes", async () => {
    await setSecureItem(SecureStorageKeys.AuthSession, JSON.stringify(canonicalPasskeySession))

    expect(await readAuthSession()).toEqual(canonicalPasskeySession)

    const firstVersion = await getSecureItem(SecureStorageKeys.AuthSessionVersion)
    expect(firstVersion).toEqual(expect.any(String))

    await setSecureItem(SecureStorageKeys.AuthSession, JSON.stringify(nextWalletSession))

    expect(await readAuthSession()).toEqual(canonicalPasskeySession)

    await setSecureItem(SecureStorageKeys.AuthSessionVersion, "manual-version")

    expect(await readAuthSession()).toEqual(nextWalletSession)
  })

  it("repairs invalid canonical payloads, clears all persisted state, and returns null token pairs", async () => {
    await setSecureItem(SecureStorageKeys.AuthSession, "not-json")
    await setSecureItem(SecureStorageKeys.AuthSessionVersion, "stale-version")

    expect(await readAuthSession()).toBeNull()
    expect(await getSecureItem(SecureStorageKeys.AuthSession)).toBeNull()
    expect(await getSecureItem(SecureStorageKeys.AuthSessionVersion)).not.toBe("stale-version")

    await writeAuthSession(canonicalPasskeySession)
    await setSecureItem(SecureStorageKeys.AccessToken, "legacy-access")
    await setSecureItem(SecureStorageKeys.RefreshToken, "legacy-refresh")
    await setSecureItem(SecureStorageKeys.SessionMeta, JSON.stringify({ loginType: "wallet" }))

    await clearAuthSession()

    expect(await readAuthSession()).toBeNull()
    expect(await readTokenPair()).toBeNull()
    expect(await getSecureItem(SecureStorageKeys.AuthSession)).toBeNull()
    expect(await getSecureItem(SecureStorageKeys.AccessToken)).toBeNull()
    expect(await getSecureItem(SecureStorageKeys.RefreshToken)).toBeNull()
    expect(await getSecureItem(SecureStorageKeys.SessionMeta)).toBeNull()
    expect(await getSecureItem(SecureStorageKeys.AuthSessionVersion)).toEqual(expect.any(String))
  })

  it("rejects aborted reads before the task starts", async () => {
    const controller = new AbortController()
    controller.abort()

    await expect(readAuthSession(controller.signal)).rejects.toMatchObject({
      name: "AbortError",
      message: "Auth session task aborted.",
    })
  })
})
