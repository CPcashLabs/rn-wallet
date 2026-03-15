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
  if (timerRef.current || !canReconnect()) {
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
