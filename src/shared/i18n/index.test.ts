const mockGetString = jest.fn()
const mockSetString = jest.fn()
const mockRemoveItem = jest.fn()
const mockResolveSystemLanguage = jest.fn()

function loadI18nModule(input?: {
  storedLanguage?: string | null
  systemLanguage?: string
  currentLanguage?: string
}) {
  jest.resetModules()

  const mockI18n = {
    language: input?.currentLanguage ?? "en-US",
    use: jest.fn(),
    init: jest.fn(),
    changeLanguage: jest.fn(async (nextLanguage: string) => {
      mockI18n.language = nextLanguage
    }),
    t: jest.fn((key: string) => key),
  }

  mockI18n.use.mockReturnValue(mockI18n)
  mockI18n.init.mockImplementation((options: { lng: string }) => {
    mockI18n.language = options.lng
    return Promise.resolve(mockI18n)
  })

  mockGetString.mockImplementation(() => input?.storedLanguage ?? null)
  mockResolveSystemLanguage.mockImplementation(() => input?.systemLanguage ?? "zh-CN")

  jest.doMock("i18next", () => ({
    __esModule: true,
    default: mockI18n,
  }))
  jest.doMock("react-i18next", () => ({
    initReactI18next: {},
  }))
  jest.doMock("@/shared/storage/kvStorage", () => ({
    getString: (...args: unknown[]) => mockGetString(...args),
    setString: (...args: unknown[]) => mockSetString(...args),
    removeItem: (...args: unknown[]) => mockRemoveItem(...args),
  }))
  jest.doMock("@/shared/i18n/systemLanguage", () => ({
    resolveSystemLanguage: () => mockResolveSystemLanguage(),
  }))
  jest.doMock("@/shared/async/taskController", () => ({
    throwIfAborted(signal?: AbortSignal, message?: string) {
      if (signal?.aborted) {
        const error = new Error(message)
        error.name = "AbortError"
        throw error
      }
    },
  }))

  const module = require("@/shared/i18n") as typeof import("@/shared/i18n")

  return {
    mockI18n,
    module,
  }
}

describe("shared i18n index", () => {
  beforeEach(() => {
    mockGetString.mockReset()
    mockSetString.mockReset()
    mockRemoveItem.mockReset()
    mockResolveSystemLanguage.mockReset()
  })

  it("initializes i18n with the stored language preference", () => {
    const { module, mockI18n } = loadI18nModule({
      storedLanguage: "en-US",
      systemLanguage: "zh-CN",
    })

    expect(mockI18n.init).toHaveBeenCalledWith(
      expect.objectContaining({
        lng: "en-US",
        fallbackLng: "en-US",
      }),
    )
    expect(module.getLanguagePreference()).toBe("en-US")
    expect(module.getCurrentLanguage()).toBe("en-US")
  })

  it("falls back to the system preference when the stored language is invalid", () => {
    const { module, mockI18n } = loadI18nModule({
      storedLanguage: "fr-FR",
      systemLanguage: "zh-CN",
    })

    expect(mockI18n.init).toHaveBeenCalledWith(
      expect.objectContaining({
        lng: "zh-CN",
      }),
    )
    expect(module.getLanguagePreference()).toBe("system")
  })

  it("hydrates and persists explicit or system language changes", async () => {
    const { module, mockI18n } = loadI18nModule({
      storedLanguage: "zh-CN",
      systemLanguage: "en-US",
      currentLanguage: "en-US",
    })

    mockI18n.language = "en-US"
    await module.hydrateI18n()
    expect(mockI18n.changeLanguage).toHaveBeenCalledWith("zh-CN")

    await module.setLanguage("en-US")
    expect(mockSetString).toHaveBeenCalledWith("app.language", "en-US")

    await module.setLanguage("fr-FR")
    expect(mockRemoveItem).toHaveBeenCalledWith("app.language")
  })

  it("skips language changes when the next language is already active", async () => {
    const { module, mockI18n } = loadI18nModule({
      storedLanguage: "en-US",
      systemLanguage: "zh-CN",
      currentLanguage: "en-US",
    })

    await module.hydrateI18n()
    expect(mockI18n.changeLanguage).not.toHaveBeenCalled()

    await module.setLanguagePreference("en-US")
    expect(mockSetString).toHaveBeenCalledWith("app.language", "en-US")
    expect(mockI18n.changeLanguage).not.toHaveBeenCalled()
  })

  it("normalizes invalid preferences to system and avoids changing to the same resolved language", async () => {
    const { module, mockI18n } = loadI18nModule({
      storedLanguage: null,
      systemLanguage: "zh-CN",
      currentLanguage: "zh-CN",
    })

    await module.setLanguagePreference("fr-FR" as never)

    expect(mockRemoveItem).toHaveBeenCalledWith("app.language")
    expect(mockI18n.changeLanguage).not.toHaveBeenCalled()
  })

  it("falls back to the system language for unsupported current values and aborts hydration", async () => {
    const { module, mockI18n } = loadI18nModule({
      storedLanguage: "system",
      systemLanguage: "zh-CN",
      currentLanguage: "fr-FR",
    })

    mockI18n.language = "fr-FR"
    expect(module.getCurrentLanguage()).toBe("zh-CN")

    const controller = new AbortController()
    controller.abort()

    await expect(module.hydrateI18n(controller.signal)).rejects.toMatchObject({
      name: "AbortError",
    })
    expect(mockI18n.changeLanguage).not.toHaveBeenCalled()
  })
})
