import { logInfoSafely } from "@/shared/logging/safeConsole"

const SOCKET_RECONNECT_LOG_TAG = "[socket.reconnect]"
const SOCKET_RECONNECT_COMPONENT = "socket.reconnect"
const SOCKET_RECONNECT_LOG_TYPES = {
  invalidateAttempt: "invalidate_attempt",
  skipSchedule: "skip_schedule",
  skipReconnectCallback: "skip_reconnect_callback",
  executeReconnect: "execute_reconnect",
  scheduleAttempt: "schedule_attempt",
} as const

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

export function invalidateReconnectAttempt(timerRef: TimerRef, generationRef: GenerationRef, timerApi: TimerApi = globalThis) {
  const hadTimer = Boolean(timerRef.current)
  generationRef.current += 1

  logInfoSafely(SOCKET_RECONNECT_LOG_TAG, {
    context: {
      component: SOCKET_RECONNECT_COMPONENT,
      event: SOCKET_RECONNECT_LOG_TYPES.invalidateAttempt,
      message: "Invalidated the pending socket reconnect attempt.",
      details: {
        hadTimer,
        generation: generationRef.current,
      },
    },
    forwardToConsole: false,
  })

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
    logInfoSafely(SOCKET_RECONNECT_LOG_TAG, {
      context: {
        component: SOCKET_RECONNECT_COMPONENT,
        event: SOCKET_RECONNECT_LOG_TYPES.skipSchedule,
        message: "Skipped scheduling a reconnect because a timer is already active.",
        details: {
          reason: "timer_exists",
          generation: generationRef.current,
        },
      },
      forwardToConsole: false,
    })
    return false
  }

  if (!canReconnect()) {
    logInfoSafely(SOCKET_RECONNECT_LOG_TAG, {
      context: {
        component: SOCKET_RECONNECT_COMPONENT,
        event: SOCKET_RECONNECT_LOG_TYPES.skipSchedule,
        message: "Skipped scheduling a reconnect because reconnecting is currently blocked.",
        details: {
          reason: "reconnect_blocked",
          generation: generationRef.current,
        },
      },
      forwardToConsole: false,
    })
    return false
  }

  const reconnectGeneration = generationRef.current
  timerRef.current = timerApi.setTimeout(() => {
    timerRef.current = null

    if (reconnectGeneration !== generationRef.current || !canReconnect()) {
      logInfoSafely(SOCKET_RECONNECT_LOG_TAG, {
        context: {
          component: SOCKET_RECONNECT_COMPONENT,
          event: SOCKET_RECONNECT_LOG_TYPES.skipReconnectCallback,
          message: "Skipped the queued reconnect callback because it was no longer valid.",
          details: {
            reason: reconnectGeneration !== generationRef.current ? "stale_generation" : "reconnect_blocked",
            generation: generationRef.current,
          },
        },
        forwardToConsole: false,
      })
      return
    }

    logInfoSafely(SOCKET_RECONNECT_LOG_TAG, {
      context: {
        component: SOCKET_RECONNECT_COMPONENT,
        event: SOCKET_RECONNECT_LOG_TYPES.executeReconnect,
        message: "Executed the queued reconnect callback.",
        details: {
          generation: generationRef.current,
        },
      },
      forwardToConsole: false,
    })
    onReconnect()
  }, delayMs)

  logInfoSafely(SOCKET_RECONNECT_LOG_TAG, {
    context: {
      component: SOCKET_RECONNECT_COMPONENT,
      event: SOCKET_RECONNECT_LOG_TYPES.scheduleAttempt,
      message: "Scheduled a socket reconnect attempt.",
      details: {
        delayMs,
        generation: reconnectGeneration,
      },
    },
    forwardToConsole: false,
  })

  return true
}
