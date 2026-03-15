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

type AuthSessionState = {
  cache: SessionRecord | null | undefined
  cacheVersion: string | undefined
  queue: Promise<void>
}

const AUTH_SESSION_STATE_KEY = "__cpcashAuthSessionState__"

function getAuthSessionState(): AuthSessionState {
  const globalWithState = globalThis as typeof globalThis & {
    [AUTH_SESSION_STATE_KEY]?: AuthSessionState
  }

  if (!globalWithState[AUTH_SESSION_STATE_KEY]) {
    globalWithState[AUTH_SESSION_STATE_KEY] = {
      cache: undefined,
      cacheVersion: undefined,
      queue: Promise.resolve(),
    }
  }

  return globalWithState[AUTH_SESSION_STATE_KEY] as AuthSessionState
}

export async function readAuthSession(): Promise<AuthSession | null> {
  return withAuthSessionLock(async () => {
    const state = getAuthSessionState()
    const persistedVersion = await getSecureItem(SecureStorageKeys.AuthSessionVersion)

    if (state.cache !== undefined && state.cacheVersion === persistedVersion) {
      return cloneSession(state.cache)
    }

    const { session, version } = await readPersistedAuthSession(persistedVersion)
    state.cache = session
    state.cacheVersion = version

    return cloneSession(session)
  })
}

export async function writeAuthSession(session: AuthSession) {
  return withAuthSessionLock(async () => {
    const state = getAuthSessionState()
    const normalized = normalizeSession(session)
    const version = createSessionVersion()

    await setSecureItem(SecureStorageKeys.AuthSession, JSON.stringify(normalized))
    await setSecureItem(SecureStorageKeys.AuthSessionVersion, version)
    await removeLegacySessionKeys()

    state.cache = normalized
    state.cacheVersion = version
  })
}

export async function clearAuthSession() {
  return withAuthSessionLock(async () => {
    const state = getAuthSessionState()
    const version = createSessionVersion()

    await Promise.all([
      removeSecureItem(SecureStorageKeys.AuthSession),
      removeLegacySessionKeys(),
    ])
    await setSecureItem(SecureStorageKeys.AuthSessionVersion, version)

    state.cache = null
    state.cacheVersion = version
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
  const state = getAuthSessionState()
  const next = state.queue.then(task, task)
  state.queue = next.then(
    () => undefined,
    () => undefined,
  )

  return next
}

export function resetAuthSessionStateForTests() {
  const state = getAuthSessionState()
  state.cache = undefined
  state.cacheVersion = undefined
  state.queue = Promise.resolve()
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

function createSessionVersion() {
  return `${Date.now()}:${Math.random().toString(36).slice(2, 10)}`
}

async function readPersistedAuthSession(currentVersion?: string | null): Promise<{
  session: SessionRecord | null
  version: string | undefined
}> {
  let resolvedVersion = currentVersion ?? undefined
  const canonicalRaw = await getSecureItem(SecureStorageKeys.AuthSession)
  if (canonicalRaw) {
    const canonical = safeParseSession(canonicalRaw)
    if (canonical) {
      if (resolvedVersion) {
        return {
          session: canonical,
          version: resolvedVersion,
        }
      }

      const nextVersion = createSessionVersion()
      await setSecureItem(SecureStorageKeys.AuthSessionVersion, nextVersion)

      return {
        session: canonical,
        version: nextVersion,
      }
    }

    const nextVersion = createSessionVersion()
    await Promise.all([
      removeSecureItem(SecureStorageKeys.AuthSession),
      setSecureItem(SecureStorageKeys.AuthSessionVersion, nextVersion),
    ])
    resolvedVersion = nextVersion
  }

  const legacySession = await readLegacyAuthSession()
  if (!legacySession) {
    return {
      session: null,
      version: resolvedVersion,
    }
  }

  const nextVersion = createSessionVersion()
  await setSecureItem(SecureStorageKeys.AuthSession, JSON.stringify(legacySession))
  await setSecureItem(SecureStorageKeys.AuthSessionVersion, nextVersion)
  await removeLegacySessionKeys()

  return {
    session: legacySession,
    version: nextVersion,
  }
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

async function removeLegacySessionKeys() {
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
