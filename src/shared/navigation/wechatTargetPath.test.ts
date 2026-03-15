const mockMmkvStore = new Map<string, string | number | boolean>()

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

import { sanitizeWechatTargetPath } from "@/app/navigation/deepLinkRouting"
import { clearPersistedWechatTargetPath, persistWechatTargetPath } from "@/shared/navigation/wechatTargetPath"
import { getBoolean, getString, setBoolean, setString } from "@/shared/storage/kvStorage"
import { KvStorageKeys } from "@/shared/storage/sessionKeys"

beforeEach(() => {
  mockMmkvStore.clear()
  jest.clearAllMocks()
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

  it("clears persisted target path state", () => {
    setString(KvStorageKeys.OriginalTargetPath, "/orders/ORDER_123")
    setBoolean(KvStorageKeys.WechatInterceptorShown, true)

    clearPersistedWechatTargetPath()

    expect(getString(KvStorageKeys.OriginalTargetPath)).toBeNull()
    expect(getBoolean(KvStorageKeys.WechatInterceptorShown)).toBeNull()
  })
})
