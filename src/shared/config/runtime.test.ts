import { buildWebSocketAuthMessage, resolveWebSocketUrl } from "@/shared/config/runtime"

describe("websocket runtime configuration", () => {
  const originalApiBaseUrl = (globalThis as { __CPCASH_API_BASE_URL__?: string }).__CPCASH_API_BASE_URL__

  beforeEach(() => {
    ;(globalThis as { __CPCASH_API_BASE_URL__?: string }).__CPCASH_API_BASE_URL__ = "https://cp.cash"
  })

  afterAll(() => {
    ;(globalThis as { __CPCASH_API_BASE_URL__?: string }).__CPCASH_API_BASE_URL__ = originalApiBaseUrl
  })

  it("resolves the websocket endpoint without leaking the access token into the URL", () => {
    expect(resolveWebSocketUrl()).toBe("wss://wallet.cp.cash/ws")
    expect(resolveWebSocketUrl()).not.toContain("access_token")
    expect(resolveWebSocketUrl()).not.toContain("?")
  })

  it("builds an authenticate message that carries the token in the first payload", () => {
    expect(buildWebSocketAuthMessage("  secret-token  ")).toBe(
      JSON.stringify({
        type: "authenticate",
        access_token: "secret-token",
      }),
    )
  })
})
