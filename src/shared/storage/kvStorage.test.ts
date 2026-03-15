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

import {
  getBoolean,
  getJson,
  getNumber,
  getStorage,
  getString,
  removeItem,
  setBoolean,
  setJson,
  setNumber,
  setString,
} from "@/shared/storage/kvStorage"

describe("kvStorage", () => {
  beforeEach(() => {
    mockMmkvStore.clear()
  })

  it("stores and reads strings, numbers and booleans", () => {
    setString("language", "zh-CN")
    setNumber("count", 3)
    setBoolean("enabled", true)

    expect(getString("language")).toBe("zh-CN")
    expect(getNumber("count")).toBe(3)
    expect(getBoolean("enabled")).toBe(true)
    expect(getString("missing")).toBeNull()
    expect(getNumber("missing")).toBeNull()
    expect(getBoolean("missing")).toBeNull()
  })

  it("stores json payloads and gracefully handles invalid json", () => {
    setJson("payload", {
      amount: 12.5,
      symbol: "USDT",
    })

    expect(getJson("payload")).toEqual({
      amount: 12.5,
      symbol: "USDT",
    })

    setString("broken", "{not-json")
    expect(getJson("broken")).toBeNull()
  })

  it("removes items and exposes the underlying storage instance", () => {
    setString("token", "secret")
    removeItem("token")

    expect(getString("token")).toBeNull()
    expect(getStorage()).toBeDefined()
  })
})
