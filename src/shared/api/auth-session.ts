import { z } from "zod"

import { getSecureItem, removeSecureItem, setSecureItem } from "@/shared/storage/secureStorage"
import { SecureStorageKeys } from "@/shared/storage/sessionKeys"
import type { AuthSession, TokenPair } from "@/shared/types/auth"

const sessionSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  address: z.string().optional(),
  expiresAt: z.number().optional(),
  loginType: z.enum(["wallet", "passkey", "password"]).optional(),
  passkeyRawId: z.string().optional(),
})

export async function readAuthSession(): Promise<AuthSession | null> {
  const accessToken = await getSecureItem(SecureStorageKeys.AccessToken)
  const refreshToken = await getSecureItem(SecureStorageKeys.RefreshToken)
  const metaRaw = await getSecureItem(SecureStorageKeys.SessionMeta)

  if (!accessToken || !refreshToken) {
    return null
  }

  const meta = metaRaw ? safeParseMeta(metaRaw) : {}

  return sessionSchema.parse({
    accessToken,
    refreshToken,
    ...meta,
  })
}

export async function writeAuthSession(session: AuthSession) {
  await setSecureItem(SecureStorageKeys.AccessToken, session.accessToken)
  await setSecureItem(SecureStorageKeys.RefreshToken, session.refreshToken)
  await setSecureItem(
    SecureStorageKeys.SessionMeta,
      JSON.stringify({
        address: session.address,
        expiresAt: session.expiresAt,
        loginType: session.loginType,
        passkeyRawId: session.passkeyRawId,
      }),
  )
}

export async function clearAuthSession() {
  await Promise.all([
    removeSecureItem(SecureStorageKeys.AccessToken),
    removeSecureItem(SecureStorageKeys.RefreshToken),
    removeSecureItem(SecureStorageKeys.SessionMeta),
  ])
}

export async function readTokenPair(): Promise<TokenPair | null> {
  const session = await readAuthSession()
  if (!session) {
    return null
  }

  return {
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
  }
}

function safeParseMeta(raw: string) {
  try {
    return JSON.parse(raw) as Partial<AuthSession>
  } catch {
    return {}
  }
}
