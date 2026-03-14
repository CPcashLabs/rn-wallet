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

beforeEach(() => {
  mockMmkvStore.clear()
  mockSecureStore.clear()
  jest.clearAllMocks()
})
