const DEFAULT_DEBUG_API_BASE_URL = "https://charprotocol.com"
const DEFAULT_RELEASE_API_BASE_URL = "https://cp.cash"
const DEFAULT_DEBUG_PASSKEY_RP_ID = "wallet.charprotocol.com"
const DEFAULT_RELEASE_PASSKEY_RP_ID = "wallet.cp.cash"
const TLS_PINNED_DOMAINS = ["cp.cash", "charprotocol.com", "charprotocol.dev"] as const

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

  const authority = trimmed
    .replace(/^[a-z][a-z0-9+.-]*:\/\//i, "")
    .split(/[/?#]/, 1)[0]
    .replace(/\/+$/, "")

  if (!authority) {
    return ""
  }

  if (authority.startsWith("[")) {
    const closingIndex = authority.indexOf("]")
    if (closingIndex !== -1) {
      return authority.slice(1, closingIndex).toLowerCase()
    }
  }

  return authority.replace(/:\d+$/, "").toLowerCase()
}

function isPinnedNetworkHost(host: string) {
  return TLS_PINNED_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`))
}

function isPrivateIpv4Host(host: string) {
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) {
    return false
  }

  const octets = host.split(".").map((segment) => Number(segment))
  if (octets.some((octet) => Number.isNaN(octet) || octet < 0 || octet > 255)) {
    return false
  }

  return (
    octets[0] === 10 ||
    octets[0] === 127 ||
    (octets[0] === 192 && octets[1] === 168) ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31)
  )
}

export function isLocalDevelopmentHost(value: string) {
  const host = normalizeHost(value)
  if (!host) {
    return false
  }

  return host === "localhost" || host === "0.0.0.0" || host === "::1" || host.endsWith(".local") || isPrivateIpv4Host(host)
}

export function isTlsPinnedHost(value: string) {
  const host = normalizeHost(value)
  if (!host) {
    return false
  }

  return isPinnedNetworkHost(host)
}

export function normalizePinnedNetworkBaseUrl(value: string, options?: { allowLocalDevHosts?: boolean }) {
  const normalized = normalizeBaseUrl(value)
  const host = normalizeHost(normalized)
  const allowLocalDevHosts = options?.allowLocalDevHosts ?? __DEV__

  if (isPinnedNetworkHost(host) || (allowLocalDevHosts && isLocalDevelopmentHost(host))) {
    return normalized
  }

  throw new Error(`Unpinned network host: ${host || "unknown"}`)
}

function readPasskeyRpIdOverride() {
  const runtimeValue = (globalThis as RuntimeGlobals).__CPCASH_PASSKEY_RP_ID__

  if (typeof runtimeValue !== "string" || !runtimeValue.trim()) {
    return null
  }

  return normalizeHost(runtimeValue)
}

function resolveDefaultApiBaseUrl() {
  return normalizePinnedNetworkBaseUrl(__DEV__ ? DEFAULT_DEBUG_API_BASE_URL : DEFAULT_RELEASE_API_BASE_URL, {
    allowLocalDevHosts: false,
  })
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
    return normalizePinnedNetworkBaseUrl(override)
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
      return normalizePinnedNetworkBaseUrl("https://wallet.charprotocol.dev", { allowLocalDevHosts: false })
    case "charprotocol.com":
    case "wallet.charprotocol.com":
      return normalizePinnedNetworkBaseUrl("https://wallet.charprotocol.com", { allowLocalDevHosts: false })
    case "preview.cp.cash":
    case "wallet-preview.cp.cash":
      return normalizePinnedNetworkBaseUrl("https://wallet-preview.cp.cash", { allowLocalDevHosts: false })
    case "cp.cash":
    case "wallet.cp.cash":
      return normalizePinnedNetworkBaseUrl("https://wallet.cp.cash", { allowLocalDevHosts: false })
    default:
      return normalizePinnedNetworkBaseUrl(resolveApiBaseUrl())
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
