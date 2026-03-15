const DEFAULT_DEBUG_API_BASE_URL = "https://charprotocol.com"
const DEFAULT_RELEASE_API_BASE_URL = "https://cp.cash"
const DEFAULT_DEBUG_PASSKEY_RP_ID = "wallet.charprotocol.com"
const DEFAULT_RELEASE_PASSKEY_RP_ID = "wallet.cp.cash"

type RuntimeGlobals = typeof globalThis & {
  __CPCASH_API_BASE_URL__?: string
  __CPCASH_PASSKEY_RP_ID__?: string
}

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, "")
}

function readApiBaseUrlOverride() {
  const runtimeValue = (globalThis as RuntimeGlobals).__CPCASH_API_BASE_URL__

  if (typeof runtimeValue !== "string" || !runtimeValue.trim()) {
    return null
  }

  return normalizeBaseUrl(runtimeValue)
}

function normalizeHost(value: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    return ""
  }

  return trimmed
    .replace(/^[a-z][a-z0-9+.-]*:\/\//i, "")
    .split(/[/?#]/, 1)[0]
    .replace(/\/+$/, "")
}

function readPasskeyRpIdOverride() {
  const runtimeValue = (globalThis as RuntimeGlobals).__CPCASH_PASSKEY_RP_ID__

  if (typeof runtimeValue !== "string" || !runtimeValue.trim()) {
    return null
  }

  return normalizeHost(runtimeValue)
}

function resolveDefaultApiBaseUrl() {
  return __DEV__ ? DEFAULT_DEBUG_API_BASE_URL : DEFAULT_RELEASE_API_BASE_URL
}

function inferPasskeyRpIdFromHost(host: string) {
  switch (host) {
    case "charprotocol.dev":
    case "wallet.charprotocol.dev":
      return "wallet.charprotocol.dev"
    case "charprotocol.com":
    case "wallet.charprotocol.com":
      return "wallet.charprotocol.com"
    case "preview.cp.cash":
    case "wallet-preview.cp.cash":
      return "wallet-preview.cp.cash"
    case "cp.cash":
    case "wallet.cp.cash":
      return "wallet.cp.cash"
    default:
      return null
  }
}

export function resolveApiBaseUrl() {
  const override = readApiBaseUrlOverride()
  if (override) {
    return override
  }

  return resolveDefaultApiBaseUrl()
}

export function resolveRuntimeEnv(): "dev" | "test" | "preview" | "prod" {
  const apiHost = normalizeHost(resolveApiBaseUrl())

  switch (apiHost) {
    case "charprotocol.dev":
    case "wallet.charprotocol.dev":
      return "dev"
    case "charprotocol.com":
    case "wallet.charprotocol.com":
      return "test"
    case "preview.cp.cash":
    case "wallet-preview.cp.cash":
      return "preview"
    case "cp.cash":
    case "wallet.cp.cash":
      return "prod"
    default:
      return __DEV__ ? "dev" : "prod"
  }
}

export function resolveAuthBaseUrl() {
  const apiHost = normalizeHost(resolveApiBaseUrl())

  switch (apiHost) {
    case "charprotocol.dev":
    case "wallet.charprotocol.dev":
      return "https://wallet.charprotocol.dev"
    case "charprotocol.com":
    case "wallet.charprotocol.com":
      return "https://wallet.charprotocol.com"
    case "preview.cp.cash":
    case "wallet-preview.cp.cash":
      return "https://wallet-preview.cp.cash"
    case "cp.cash":
    case "wallet.cp.cash":
      return "https://wallet.cp.cash"
    default:
      return resolveApiBaseUrl()
  }
}

export function resolvePasskeyRpId() {
  const override = readPasskeyRpIdOverride()
  if (override) {
    return override
  }

  const inferred = inferPasskeyRpIdFromHost(normalizeHost(resolveApiBaseUrl()))
  if (inferred) {
    return inferred
  }

  return __DEV__ ? DEFAULT_DEBUG_PASSKEY_RP_ID : DEFAULT_RELEASE_PASSKEY_RP_ID
}

function toWebSocketOrigin(value: string) {
  const normalized = normalizeBaseUrl(value)

  if (normalized.startsWith("https://")) {
    return `wss://${normalized.slice("https://".length)}`
  }

  if (normalized.startsWith("http://")) {
    return `ws://${normalized.slice("http://".length)}`
  }

  if (normalized.startsWith("wss://") || normalized.startsWith("ws://")) {
    return normalized
  }

  return `wss://${normalized.replace(/^\/+/, "")}`
}

export function resolveWebSocketUrl() {
  return `${toWebSocketOrigin(resolveAuthBaseUrl())}/ws`
}

export function buildWebSocketAuthMessage(accessToken: string) {
  const normalizedToken = accessToken.trim()
  if (!normalizedToken) {
    throw new Error("WebSocket access token is required.")
  }

  return JSON.stringify({
    type: "authenticate",
    access_token: normalizedToken,
  })
}
