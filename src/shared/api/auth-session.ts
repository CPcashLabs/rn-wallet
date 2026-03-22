import { z } from "zod"

import { throwIfAborted } from "@/shared/async/taskController"
import { logInfoSafely, logWarnSafely } from "@/shared/logging/safeConsole"
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
const AUTH_SESSION_LOG_TAG = "[auth.session]"
const AUTH_SESSION_COMPONENT = "auth.session"
const AUTH_SESSION_LOG_TYPES = {
  cacheHit: "cache_hit",
  storageRead: "storage_read",
  write: "write",
  clear: "clear",
  legacyMetaParseFailed: "legacy_meta_parse_failed",
  canonicalVersionCreated: "canonical_version_created",
  invalidCanonicalSnapshot: "invalid_canonical_snapshot",
  legacySessionMigrated: "legacy_session_migrated",
} as const

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

function describeSessionState(session: Partial<AuthSession> | null | undefined) {
  return {
    hasSession: Boolean(session),
    hasAddress: Boolean(session?.address),
    loginType: session?.loginType ?? "unknown",
    hasPasskeyRawId: Boolean(session?.passkeyRawId),
  }
}

export async function readAuthSession(signal?: AbortSignal): Promise<AuthSession | null> {
  return withAuthSessionLock(async () => {
    throwIfAborted(signal, "Auth session read aborted.")
    const state = getAuthSessionState()
    const persistedVersion = await getSecureItem(SecureStorageKeys.AuthSessionVersion)
    throwIfAborted(signal, "Auth session read aborted.")

    if (state.cache !== undefined && state.cacheVersion === persistedVersion) {
      logInfoSafely(AUTH_SESSION_LOG_TAG, {
        context: {
          component: AUTH_SESSION_COMPONENT,
          event: AUTH_SESSION_LOG_TYPES.cacheHit,
          message: "Read auth session from the in-memory cache.",
          details: {
            ...describeSessionState(state.cache),
            hasPersistedVersion: Boolean(persistedVersion),
          },
        },
        forwardToConsole: false,
      })

      return cloneSession(state.cache)
    }

    const { session, version } = await readPersistedAuthSession(persistedVersion, signal)
    state.cache = session
    state.cacheVersion = version

    logInfoSafely(AUTH_SESSION_LOG_TAG, {
      context: {
        component: AUTH_SESSION_COMPONENT,
        event: AUTH_SESSION_LOG_TYPES.storageRead,
        message: "Read auth session from secure storage.",
        details: {
          ...describeSessionState(session),
          hasPersistedVersion: Boolean(version),
        },
      },
      forwardToConsole: false,
    })

    return cloneSession(session)
  }, signal)
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

    logInfoSafely(AUTH_SESSION_LOG_TAG, {
      context: {
        component: AUTH_SESSION_COMPONENT,
        event: AUTH_SESSION_LOG_TYPES.write,
        message: "Persisted auth session to secure storage.",
        details: describeSessionState(normalized),
      },
      forwardToConsole: false,
    })
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

    logInfoSafely(AUTH_SESSION_LOG_TAG, {
      context: {
        component: AUTH_SESSION_COMPONENT,
        event: AUTH_SESSION_LOG_TYPES.clear,
        message: "Cleared auth session from memory and secure storage.",
        details: {
          hasSession: false,
        },
      },
      forwardToConsole: false,
    })
  })
}

export async function readTokenPair(signal?: AbortSignal): Promise<TokenPair | null> {
  const session = await readAuthSession(signal)
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
    logWarnSafely(AUTH_SESSION_LOG_TAG, {
      context: {
        component: AUTH_SESSION_COMPONENT,
        event: AUTH_SESSION_LOG_TYPES.legacyMetaParseFailed,
        message: "Failed to parse legacy auth session metadata.",
      },
      forwardToConsole: false,
    })
    return {}
  }
}

function withAuthSessionLock<T>(task: () => Promise<T>, signal?: AbortSignal): Promise<T> {
  const state = getAuthSessionState()
  const runTask = () => {
    throwIfAborted(signal, "Auth session task aborted.")
    return task()
  }
  const next = state.queue.then(runTask, runTask)
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

async function readPersistedAuthSession(
  currentVersion?: string | null,
  signal?: AbortSignal,
): Promise<{
  session: SessionRecord | null
  version: string | undefined
}> {
  let resolvedVersion = currentVersion ?? undefined
  throwIfAborted(signal, "Auth session read aborted.")
  const canonicalRaw = await getSecureItem(SecureStorageKeys.AuthSession)
  throwIfAborted(signal, "Auth session read aborted.")
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
      throwIfAborted(signal, "Auth session read aborted.")

      logInfoSafely(AUTH_SESSION_LOG_TAG, {
        context: {
          component: AUTH_SESSION_COMPONENT,
          event: AUTH_SESSION_LOG_TYPES.canonicalVersionCreated,
          message: "Created a missing version for the canonical auth session snapshot.",
          details: describeSessionState(canonical),
        },
        forwardToConsole: false,
      })

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
    throwIfAborted(signal, "Auth session read aborted.")
    resolvedVersion = nextVersion

    logWarnSafely(AUTH_SESSION_LOG_TAG, {
      context: {
        component: AUTH_SESSION_COMPONENT,
        event: AUTH_SESSION_LOG_TYPES.invalidCanonicalSnapshot,
        message: "Removed an invalid canonical auth session snapshot.",
      },
      forwardToConsole: false,
    })
  }

  const legacySession = await readLegacyAuthSession(signal)
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
  throwIfAborted(signal, "Auth session read aborted.")

  logInfoSafely(AUTH_SESSION_LOG_TAG, {
    context: {
      component: AUTH_SESSION_COMPONENT,
      event: AUTH_SESSION_LOG_TYPES.legacySessionMigrated,
      message: "Migrated a legacy auth session into the canonical snapshot format.",
      details: describeSessionState(legacySession),
    },
    forwardToConsole: false,
  })

  return {
    session: legacySession,
    version: nextVersion,
  }
}

async function readLegacyAuthSession(signal?: AbortSignal): Promise<SessionRecord | null> {
  throwIfAborted(signal, "Auth session read aborted.")
  const accessToken = await getSecureItem(SecureStorageKeys.AccessToken)
  throwIfAborted(signal, "Auth session read aborted.")
  const refreshToken = await getSecureItem(SecureStorageKeys.RefreshToken)
  throwIfAborted(signal, "Auth session read aborted.")
  const metaRaw = await getSecureItem(SecureStorageKeys.SessionMeta)
  throwIfAborted(signal, "Auth session read aborted.")

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
