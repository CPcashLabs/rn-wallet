import {
  resolveApiBaseUrl,
  resolveAuthBaseUrl,
  resolveOAuthClientId,
  resolvePasskeyRpId,
  resolveRuntimeEnv,
  buildWebSocketAuthMessage,
  isLocalDevelopmentHost,
  isTlsPinnedHost,
  normalizePinnedNetworkBaseUrl,
  resolveWebSocketUrl,
} from "@/shared/config/runtime"

describe("websocket runtime configuration", () => {
  const runtimeGlobals = globalThis as {
    __CPCASH_API_BASE_URL__?: string
    __CPCASH_OAUTH_CLIENT_ID__?: string
    __CPCASH_PASSKEY_RP_ID__?: string
    __DEV__?: boolean
  }
  const originalApiBaseUrl = runtimeGlobals.__CPCASH_API_BASE_URL__
  const originalOAuthClientId = runtimeGlobals.__CPCASH_OAUTH_CLIENT_ID__
  const originalPasskeyRpId = runtimeGlobals.__CPCASH_PASSKEY_RP_ID__
  const originalDev = runtimeGlobals.__DEV__
  const originalNodeEnv = process.env.NODE_ENV

  beforeEach(() => {
    runtimeGlobals.__CPCASH_API_BASE_URL__ = "https://cp.cash"
    runtimeGlobals.__CPCASH_OAUTH_CLIENT_ID__ = undefined
    runtimeGlobals.__CPCASH_PASSKEY_RP_ID__ = undefined
    runtimeGlobals.__DEV__ = true
    process.env.NODE_ENV = "test"
  })

  afterAll(() => {
    runtimeGlobals.__CPCASH_API_BASE_URL__ = originalApiBaseUrl
    runtimeGlobals.__CPCASH_OAUTH_CLIENT_ID__ = originalOAuthClientId
    runtimeGlobals.__CPCASH_PASSKEY_RP_ID__ = originalPasskeyRpId
    runtimeGlobals.__DEV__ = originalDev
    process.env.NODE_ENV = originalNodeEnv
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

  it("rejects empty websocket access tokens", () => {
    expect(() => buildWebSocketAuthMessage("   ")).toThrow("WebSocket access token is required.")
  })

  it("accepts first-party production hosts that are covered by certificate pinning", () => {
    expect(isTlsPinnedHost("https://cp.cash")).toBe(true)
    expect(isTlsPinnedHost("wallet.cp.cash")).toBe(true)
    expect(isTlsPinnedHost("https://wallet-preview.cp.cash")).toBe(true)
    expect(isTlsPinnedHost("https://wallet.charprotocol.com")).toBe(true)
    expect(isTlsPinnedHost("https://wallet.charprotocol.dev")).toBe(true)
    expect(isTlsPinnedHost("https://share.cpcash.app")).toBe(false)
    expect(isTlsPinnedHost("")).toBe(false)
  })

  it("allows local development endpoints only when explicitly enabled", () => {
    expect(isLocalDevelopmentHost("   ")).toBe(false)
    expect(isLocalDevelopmentHost("http://127.0.0.1:3000")).toBe(true)
    expect(isLocalDevelopmentHost("http://999.0.0.1:3000")).toBe(false)
    expect(isLocalDevelopmentHost("http://10.0.0.2:3000")).toBe(true)
    expect(isLocalDevelopmentHost("http://app.local")).toBe(true)
    expect(isLocalDevelopmentHost("http://[::1]:3000")).toBe(true)
    expect(isLocalDevelopmentHost("https://cp.cash")).toBe(false)
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

  it("normalizes runtime base urls and resolves runtime environment variants", () => {
    runtimeGlobals.__CPCASH_API_BASE_URL__ = " https://wallet-preview.cp.cash/ "

    expect(resolveApiBaseUrl()).toBe("https://wallet-preview.cp.cash")
    expect(resolveRuntimeEnv()).toBe("preview")
    expect(resolveAuthBaseUrl()).toBe("https://wallet-preview.cp.cash")
  })

  it("maps test and production api hosts to their auth hosts", () => {
    runtimeGlobals.__CPCASH_API_BASE_URL__ = "https://charprotocol.com"
    expect(resolveRuntimeEnv()).toBe("test")
    expect(resolveAuthBaseUrl()).toBe("https://wallet.charprotocol.com")

    runtimeGlobals.__CPCASH_API_BASE_URL__ = "https://wallet.charprotocol.dev"
    expect(resolveRuntimeEnv()).toBe("dev")
    expect(resolveAuthBaseUrl()).toBe("https://wallet.charprotocol.dev")

    runtimeGlobals.__CPCASH_API_BASE_URL__ = "https://cp.cash"
    expect(resolveRuntimeEnv()).toBe("prod")
    expect(resolveAuthBaseUrl()).toBe("https://wallet.cp.cash")
  })

  it("falls back to the default release api host in non-dev production mode", () => {
    runtimeGlobals.__DEV__ = false
    runtimeGlobals.__CPCASH_API_BASE_URL__ = undefined
    process.env.NODE_ENV = "production"

    expect(resolveApiBaseUrl()).toBe("https://cp.cash")
    expect(resolveRuntimeEnv()).toBe("prod")
  })

  it("resolves oauth client id from runtime overrides or test defaults", () => {
    runtimeGlobals.__CPCASH_OAUTH_CLIENT_ID__ = "override-client"
    expect(resolveOAuthClientId()).toBe("override-client")

    runtimeGlobals.__CPCASH_OAUTH_CLIENT_ID__ = undefined
    expect(resolveOAuthClientId()).toBe("MEMBER")
  })

  it("throws when oauth client id is missing in non-dev production mode", () => {
    runtimeGlobals.__DEV__ = false
    runtimeGlobals.__CPCASH_OAUTH_CLIENT_ID__ = undefined
    process.env.NODE_ENV = "production"

    expect(() => resolveOAuthClientId()).toThrow("Missing OAuth client id runtime config.")
  })

  it("resolves passkey rp ids from overrides, inferred hosts and local-dev fallback", () => {
    runtimeGlobals.__CPCASH_PASSKEY_RP_ID__ = " wallet.charprotocol.dev "
    expect(resolvePasskeyRpId()).toBe("wallet.charprotocol.dev")

    runtimeGlobals.__CPCASH_PASSKEY_RP_ID__ = undefined
    runtimeGlobals.__CPCASH_API_BASE_URL__ = "https://charprotocol.dev"
    expect(resolvePasskeyRpId()).toBe("wallet.charprotocol.dev")

    runtimeGlobals.__CPCASH_API_BASE_URL__ = "http://127.0.0.1:3000"
    expect(resolvePasskeyRpId()).toBe("wallet.charprotocol.com")
  })

  it("infers preview and production passkey rp ids from api hosts", () => {
    runtimeGlobals.__CPCASH_API_BASE_URL__ = "https://wallet-preview.cp.cash"
    expect(resolvePasskeyRpId()).toBe("wallet-preview.cp.cash")

    runtimeGlobals.__CPCASH_API_BASE_URL__ = "https://wallet.charprotocol.com"
    expect(resolvePasskeyRpId()).toBe("wallet.charprotocol.com")

    runtimeGlobals.__CPCASH_API_BASE_URL__ = "https://wallet.cp.cash"
    expect(resolvePasskeyRpId()).toBe("wallet.cp.cash")

    runtimeGlobals.__DEV__ = false
    runtimeGlobals.__CPCASH_API_BASE_URL__ = "https://cp.cash"
    expect(resolveRuntimeEnv()).toBe("prod")
  })

  it("falls back to the dev runtime environment for unknown local hosts in development", () => {
    runtimeGlobals.__DEV__ = true
    runtimeGlobals.__CPCASH_API_BASE_URL__ = "http://127.0.0.1:3000"

    expect(resolveRuntimeEnv()).toBe("dev")
  })

  it("resolves websocket urls for http, ws and protocol-less local hosts", () => {
    runtimeGlobals.__CPCASH_API_BASE_URL__ = "http://127.0.0.1:3000"
    expect(resolveAuthBaseUrl()).toBe("http://127.0.0.1:3000")
    expect(resolveWebSocketUrl()).toBe("ws://127.0.0.1:3000/ws")

    runtimeGlobals.__CPCASH_API_BASE_URL__ = "ws://wallet.local"
    expect(resolveWebSocketUrl()).toBe("ws://wallet.local/ws")

    runtimeGlobals.__CPCASH_API_BASE_URL__ = "localhost:3000"
    expect(resolveWebSocketUrl()).toBe("wss://localhost:3000/ws")
  })
})
