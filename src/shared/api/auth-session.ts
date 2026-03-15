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

type SessionRecord = z.infer<typeof sessionSchema>

let authSessionCache: SessionRecord | null | undefined
let authSessionQueue: Promise<void> = Promise.resolve()

export async function readAuthSession(): Promise<AuthSession | null> {
  return withAuthSessionLock(async () => {
    if (authSessionCache !== undefined) {
      return cloneSession(authSessionCache)
    }

    const session = await readPersistedAuthSession()
    authSessionCache = session

    return cloneSession(session)
  })
}

export async function writeAuthSession(session: AuthSession) {
  return withAuthSessionLock(async () => {
    const normalized = normalizeSession(session)

    await setSecureItem(SecureStorageKeys.AuthSession, JSON.stringify(normalized))
    await clearLegacySessionKeys()

    authSessionCache = normalized
  })
}

export async function clearAuthSession() {
  return withAuthSessionLock(async () => {
    authSessionCache = null

    await Promise.all([
      removeSecureItem(SecureStorageKeys.AuthSession),
      removeSecureItem(SecureStorageKeys.AccessToken),
      removeSecureItem(SecureStorageKeys.RefreshToken),
      removeSecureItem(SecureStorageKeys.SessionMeta),
    ])
  })
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

function withAuthSessionLock<T>(task: () => Promise<T>): Promise<T> {
  const next = authSessionQueue.then(task, task)
  authSessionQueue = next.then(
    () => undefined,
    () => undefined,
  )

  return next
}

function cloneSession(session: SessionRecord | null): AuthSession | null {
  return session ? { ...session } : null
}

function normalizeSession(session: AuthSession): SessionRecord {
  return sessionSchema.parse({
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    address: session.address,
    expiresAt: session.expiresAt,
    loginType: session.loginType,
    passkeyRawId: session.passkeyRawId,
  })
}

async function readPersistedAuthSession(): Promise<SessionRecord | null> {
  const canonicalRaw = await getSecureItem(SecureStorageKeys.AuthSession)
  if (canonicalRaw) {
    const canonical = safeParseSession(canonicalRaw)
    if (canonical) {
      return canonical
    }

    await removeSecureItem(SecureStorageKeys.AuthSession)
  }

  const legacySession = await readLegacyAuthSession()
  if (!legacySession) {
    return null
  }

  await setSecureItem(SecureStorageKeys.AuthSession, JSON.stringify(legacySession))
  await clearLegacySessionKeys()

  return legacySession
}

async function readLegacyAuthSession(): Promise<SessionRecord | null> {
  const accessToken = await getSecureItem(SecureStorageKeys.AccessToken)
  const refreshToken = await getSecureItem(SecureStorageKeys.RefreshToken)
  const metaRaw = await getSecureItem(SecureStorageKeys.SessionMeta)

  if (!accessToken || !refreshToken) {
    return null
  }

  const meta = metaRaw ? safeParseMeta(metaRaw) : {}

  return normalizeSession({
    accessToken,
    refreshToken,
    ...meta,
  })
}

async function clearLegacySessionKeys() {
  await Promise.all([
    removeSecureItem(SecureStorageKeys.AccessToken),
    removeSecureItem(SecureStorageKeys.RefreshToken),
    removeSecureItem(SecureStorageKeys.SessionMeta),
  ])
}

function safeParseSession(raw: string) {
  try {
    const parsed = JSON.parse(raw) as Partial<AuthSession>
    return normalizeSession(parsed as AuthSession)
  } catch {
    return null
  }
}
