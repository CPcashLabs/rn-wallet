const DEFAULT_DEBUG_API_BASE_URL = "https://charprotocol.dev"
const DEFAULT_RELEASE_API_BASE_URL = "https://cp.cash"
const DEFAULT_DEBUG_PASSKEY_RP_ID = "wallet.charprotocol.dev"
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

  try {
    return new URL(trimmed).hostname
  } catch {
    return trimmed.replace(/^https?:\/\//, "").replace(/\/+$/, "")
  }
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

export function resolveWebSocketUrl(accessToken?: string) {
  const url = new URL("/ws", resolveAuthBaseUrl())
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:"

  if (accessToken) {
    url.searchParams.set("access_token", accessToken)
  }

  return url.toString()
}
