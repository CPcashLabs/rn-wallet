jest.mock("react-native-mmkv", () => {
  const mockStore = new Map<string, string | number | boolean>()

  return {
    __mockStore: mockStore,
    MMKV: class MockMMKV {
      set(key: string, value: string | number | boolean) {
        mockStore.set(key, value)
      }

      getString(key: string) {
        const value = mockStore.get(key)
        return typeof value === "string" ? value : undefined
      }

      getNumber(key: string) {
        const value = mockStore.get(key)
        return typeof value === "number" ? value : undefined
      }

      getBoolean(key: string) {
        const value = mockStore.get(key)
        return typeof value === "boolean" ? value : undefined
      }

      delete(key: string) {
        mockStore.delete(key)
      }
    },
  }
})

import { sanitizeWechatTargetPath } from "@/app/navigation/deepLinkRouting"
import { clearPersistedWechatTargetPath, persistWechatTargetPath } from "@/shared/navigation/wechatTargetPath"
import { getBoolean, getString, setBoolean, setString } from "@/shared/storage/kvStorage"
import { KvStorageKeys } from "@/shared/storage/sessionKeys"

const { __mockStore: mockMmkvStore } = require("react-native-mmkv") as {
  __mockStore: Map<string, string | number | boolean>
}
const originalApiBaseUrl = (globalThis as { __CPCASH_API_BASE_URL__?: string }).__CPCASH_API_BASE_URL__

beforeEach(() => {
  ;(globalThis as { __CPCASH_API_BASE_URL__?: string }).__CPCASH_API_BASE_URL__ = "https://cp.cash"
  mockMmkvStore.clear()
  jest.clearAllMocks()
})

afterAll(() => {
  ;(globalThis as { __CPCASH_API_BASE_URL__?: string }).__CPCASH_API_BASE_URL__ = originalApiBaseUrl
})

describe("wechat target path persistence", () => {
  it("stores only validated target paths", () => {
    expect(persistWechatTargetPath("/orders/ORDER_123")).toBe("/orders/ORDER_123")
    expect(getString(KvStorageKeys.OriginalTargetPath)).toBe("/orders/ORDER_123")
    expect(getBoolean(KvStorageKeys.WechatInterceptorShown)).toBe(true)
  })

  it("rejects and clears untrusted target paths before persistence", () => {
    setString(KvStorageKeys.OriginalTargetPath, "/orders/ORDER_123")
    setBoolean(KvStorageKeys.WechatInterceptorShown, true)

    expect(persistWechatTargetPath("https://evil.example/orders/ORDER_123")).toBeNull()
    expect(getString(KvStorageKeys.OriginalTargetPath)).toBeNull()
    expect(getBoolean(KvStorageKeys.WechatInterceptorShown)).toBeNull()
  })

  it("rejects recursive wechat interceptor targets", () => {
    expect(sanitizeWechatTargetPath("/wechat-interceptor?target=%2Forders%2FORDER_123")).toBeUndefined()
  })

  it("canonicalizes validated public share targets before persistence", () => {
    expect(sanitizeWechatTargetPath("https://share.cpcash.app/send?share=ORDER_123&ignored=1")).toBe("https://cp.cash/send?share=ORDER_123")
  })

  it("does not leak state across control-character checks", () => {
    expect(sanitizeWechatTargetPath("/orders/ORDER_123")).toBe("/orders/ORDER_123")
    expect(sanitizeWechatTargetPath("/orders/ORDER_123\u0000")).toBeUndefined()
    expect(sanitizeWechatTargetPath("/orders/ORDER_123")).toBe("/orders/ORDER_123")
  })

  it("clears persisted target path state", () => {
    setString(KvStorageKeys.OriginalTargetPath, "/orders/ORDER_123")
    setBoolean(KvStorageKeys.WechatInterceptorShown, true)

    clearPersistedWechatTargetPath()

    expect(getString(KvStorageKeys.OriginalTargetPath)).toBeNull()
    expect(getBoolean(KvStorageKeys.WechatInterceptorShown)).toBeNull()
  })
})
