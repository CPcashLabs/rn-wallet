import {
  buildWebSocketAuthMessage,
  isLocalDevelopmentHost,
  isTlsPinnedHost,
  normalizePinnedNetworkBaseUrl,
  resolveWebSocketUrl,
} from "@/shared/config/runtime"

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

  it("accepts first-party production hosts that are covered by certificate pinning", () => {
    expect(isTlsPinnedHost("https://cp.cash")).toBe(true)
    expect(isTlsPinnedHost("wallet.cp.cash")).toBe(true)
    expect(isTlsPinnedHost("https://wallet-preview.cp.cash")).toBe(true)
    expect(isTlsPinnedHost("https://wallet.charprotocol.com")).toBe(true)
    expect(isTlsPinnedHost("https://wallet.charprotocol.dev")).toBe(true)
    expect(isTlsPinnedHost("https://share.cpcash.app")).toBe(false)
  })

  it("allows local development endpoints only when explicitly enabled", () => {
    expect(isLocalDevelopmentHost("http://127.0.0.1:3000")).toBe(true)
    expect(normalizePinnedNetworkBaseUrl("http://127.0.0.1:3000", { allowLocalDevHosts: true })).toBe("http://127.0.0.1:3000")
    expect(() => normalizePinnedNetworkBaseUrl("http://127.0.0.1:3000", { allowLocalDevHosts: false })).toThrow(
      "Unpinned network host",
    )
  })

  it("rejects unpinned remote hosts", () => {
    expect(() => normalizePinnedNetworkBaseUrl("https://evil.example", { allowLocalDevHosts: false })).toThrow(
      "Unpinned network host: evil.example",
    )
  })
})
