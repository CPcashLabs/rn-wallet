export const DEFAULT_SOCKET_RECONNECT_DELAY_MS = 1_500
export const MAX_SOCKET_RECONNECT_DELAY_MS = 30_000
export const MAX_AUTH_SEND_FAILURE_RECONNECT_ATTEMPTS = 3

type TimerRef = {
  current: ReturnType<typeof setTimeout> | null
}

type GenerationRef = {
  current: number
}

type TimerApi = Pick<typeof globalThis, "setTimeout" | "clearTimeout">

type ScheduleReconnectOptions = {
  canReconnect: () => boolean
  delayMs: number
  generationRef: GenerationRef
  onReconnect: () => void
  timerApi?: TimerApi
  timerRef: TimerRef
}

export function resolveReconnectDelayMs(
  attempt: number,
  baseDelayMs = DEFAULT_SOCKET_RECONNECT_DELAY_MS,
  maxDelayMs = MAX_SOCKET_RECONNECT_DELAY_MS,
) {
  const normalizedAttempt = Math.max(1, Math.floor(attempt))
  return Math.min(baseDelayMs * 2 ** (normalizedAttempt - 1), maxDelayMs)
}

export function shouldReconnectAfterClose(options: {
  attempt: number
  reason?: string
  shouldReconnect: boolean
}) {
  if (!options.shouldReconnect) {
    return false
  }

  if (options.reason === "auth_send_failed" && options.attempt >= MAX_AUTH_SEND_FAILURE_RECONNECT_ATTEMPTS) {
    return false
  }

  return true
}

export function invalidateReconnectAttempt(timerRef: TimerRef, generationRef: GenerationRef, timerApi: TimerApi = globalThis) {
  generationRef.current += 1

  if (!timerRef.current) {
    return
  }

  timerApi.clearTimeout(timerRef.current)
  timerRef.current = null
}

export function scheduleReconnectAttempt({
  canReconnect,
  delayMs,
  generationRef,
  onReconnect,
  timerApi = globalThis,
  timerRef,
}: ScheduleReconnectOptions) {
  if (timerRef.current) {
    return false
  }

  if (!canReconnect()) {
    return false
  }

  const reconnectGeneration = generationRef.current
  timerRef.current = timerApi.setTimeout(() => {
    timerRef.current = null

    if (reconnectGeneration !== generationRef.current || !canReconnect()) {
      return
    }

    onReconnect()
  }, delayMs)

  return true
}
