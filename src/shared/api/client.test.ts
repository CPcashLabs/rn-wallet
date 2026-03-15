jest.mock("@/shared/api/interceptors", () => ({
  registerInterceptors: jest.fn(),
}))

import type { AxiosResponse, InternalAxiosRequestConfig } from "axios"

import { apiClient, authClient } from "@/shared/api/client"

type RuntimeGlobals = typeof globalThis & {
  __CPCASH_API_BASE_URL__?: string
}

function createEchoAdapter(expectedMethod: string) {
  return async (config: InternalAxiosRequestConfig): Promise<AxiosResponse<{ baseURL?: string }>> => ({
    data: { baseURL: config.baseURL },
    status: 200,
    statusText: "OK",
    headers: {},
    config,
    request: { method: expectedMethod },
  })
}

describe("api clients runtime baseURL", () => {
  const runtimeGlobals = globalThis as RuntimeGlobals
  const originalApiBaseUrl = runtimeGlobals.__CPCASH_API_BASE_URL__

  beforeEach(() => {
    runtimeGlobals.__CPCASH_API_BASE_URL__ = "https://cp.cash"
  })

  afterAll(() => {
    runtimeGlobals.__CPCASH_API_BASE_URL__ = originalApiBaseUrl
  })

  it("resolves apiClient baseURL at request time", async () => {
    const firstResponse = await apiClient.get("/health", {
      adapter: createEchoAdapter("get"),
    })

    runtimeGlobals.__CPCASH_API_BASE_URL__ = "https://charprotocol.com"

    const secondResponse = await apiClient.get("/health", {
      adapter: createEchoAdapter("get"),
    })

    expect(firstResponse.data.baseURL).toBe("https://cp.cash")
    expect(secondResponse.data.baseURL).toBe("https://charprotocol.com")
  })

  it("resolves authClient baseURL from the latest runtime api host", async () => {
    const firstResponse = await authClient.post("/api/auth/oauth2/token", "grant_type=guest", {
      adapter: createEchoAdapter("post"),
    })

    runtimeGlobals.__CPCASH_API_BASE_URL__ = "https://charprotocol.com"

    const secondResponse = await authClient.post("/api/auth/oauth2/token", "grant_type=guest", {
      adapter: createEchoAdapter("post"),
    })

    expect(firstResponse.data.baseURL).toBe("https://wallet.cp.cash")
    expect(secondResponse.data.baseURL).toBe("https://wallet.charprotocol.com")
  })

  it("preserves explicit per-request baseURL overrides", async () => {
    runtimeGlobals.__CPCASH_API_BASE_URL__ = "https://charprotocol.com"

    const response = await apiClient.get("/health", {
      baseURL: "https://preview.cp.cash",
      adapter: createEchoAdapter("get"),
    })

    expect(response.data.baseURL).toBe("https://preview.cp.cash")
  })
})
