import { getBoolean, getJson, getNumber, getStorage, getString, removeItem, setBoolean, setJson, setNumber, setString } from "@/shared/storage/kvStorage"
import { KvStorageKeys } from "@/shared/storage/sessionKeys"
import { useAuthStore } from "@/shared/store/useAuthStore"

import { resetAuthStoreState } from "../../test-helpers/authRuntime"

const session = {
  accessToken: "access-token",
  refreshToken: "refresh-token",
}

const passkeyA = {
  credentialId: "credential-a",
  rawId: "raw-a",
  name: "alice",
}

const passkeyB = {
  credentialId: "credential-b",
  rawId: "raw-b",
  name: "bob",
}

const passkeyC = {
  credentialId: "credential-a",
  rawId: "raw-c",
  name: "carol",
}

const passkeyD = {
  credentialId: "credential-d",
  rawId: "raw-b",
  name: "diana",
}

describe("storage and auth store integration", () => {
  beforeEach(() => {
    removeItem(KvStorageKeys.PasskeyHistory)
    removeItem(KvStorageKeys.AppLanguage)
    removeItem(KvStorageKeys.ThemeMode)
    resetAuthStoreState()
  })

  it("reads and writes primitive and json values through kv storage", () => {
    setString(KvStorageKeys.AppLanguage, "zh-CN")
    setNumber(KvStorageKeys.VerificationCodeCountdownEndAt, 123)
    setBoolean(KvStorageKeys.ShowBalance, true)
    setJson(KvStorageKeys.ThemeMode, { mode: "dark" })

    expect(getString(KvStorageKeys.AppLanguage)).toBe("zh-CN")
    expect(getNumber(KvStorageKeys.VerificationCodeCountdownEndAt)).toBe(123)
    expect(getBoolean(KvStorageKeys.ShowBalance)).toBe(true)
    expect(getJson<{ mode: string }>(KvStorageKeys.ThemeMode)).toEqual({ mode: "dark" })
    expect(getStorage()).toBeDefined()

    setString(KvStorageKeys.ThemeMode, "{broken")

    expect(getJson(KvStorageKeys.ThemeMode)).toBeNull()

    removeItem(KvStorageKeys.AppLanguage)
    removeItem(KvStorageKeys.VerificationCodeCountdownEndAt)
    removeItem(KvStorageKeys.ShowBalance)

    expect(getString(KvStorageKeys.AppLanguage)).toBeNull()
    expect(getNumber(KvStorageKeys.VerificationCodeCountdownEndAt)).toBeNull()
    expect(getBoolean(KvStorageKeys.ShowBalance)).toBeNull()
  })

  it("updates auth state and persists deduplicated recent passkeys", () => {
    const store = useAuthStore.getState()

    store.setBootstrapped(true)
    store.setLoginType("password")
    store.setSession(session)
    store.addRecentPasskey(passkeyA)
    store.addRecentPasskey(passkeyB)
    store.addRecentPasskey(passkeyC)
    store.addRecentPasskey(passkeyD)

    expect(useAuthStore.getState()).toMatchObject({
      isBootstrapped: true,
      session,
      loginType: null,
      recentPasskeys: [passkeyC, passkeyD],
    })
    expect(getJson(KvStorageKeys.PasskeyHistory)).toEqual([passkeyC, passkeyD])

    useAuthStore.getState().clearRecentPasskeys()
    useAuthStore.getState().clearSession()

    expect(useAuthStore.getState()).toMatchObject({
      session: null,
      loginType: null,
      recentPasskeys: [],
    })
    expect(getJson(KvStorageKeys.PasskeyHistory)).toBeNull()
  })

  it("hydrates recent passkeys from persisted storage on a fresh store load", async () => {
    setJson(KvStorageKeys.PasskeyHistory, [passkeyA, passkeyB])

    jest.resetModules()

    const { useAuthStore: freshStore } = require("@/shared/store/useAuthStore")

    expect(freshStore.getState().recentPasskeys).toEqual([passkeyA, passkeyB])
  })
})
