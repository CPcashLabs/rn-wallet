import { resolveOAuthClientId } from "@/shared/config/runtime"

const RESERVED_OAUTH_TOKEN_BODY_KEYS = new Set(["client_id", "client_secret", "grant_type"])

type OAuthTokenBodyValue = string | number | boolean

export function buildOAuthTokenRequestBody(
  grantType: string,
  params: Record<string, OAuthTokenBodyValue | null | undefined> = {},
) {
  const normalizedGrantType = grantType.trim()
  if (!normalizedGrantType) {
    throw new Error("OAuth grant type is required.")
  }

  const body = new URLSearchParams()
  body.append("client_id", resolveOAuthClientId())
  body.append("grant_type", normalizedGrantType)

  for (const [key, value] of Object.entries(params)) {
    if (RESERVED_OAUTH_TOKEN_BODY_KEYS.has(key)) {
      throw new Error(`OAuth token body param is reserved: ${key}`)
    }

    if (value == null) {
      continue
    }

    body.append(key, String(value))
  }

  return body
}
