import { useCallback, useEffect, useState } from "react"

import { getNumber, removeItem, setNumber } from "@/shared/storage/kvStorage"
import {
  calculatePersistentCountdownSecondsLeft,
  getPersistentCountdownNextDelay,
  sanitizePersistentCountdownEndAt,
} from "@/shared/hooks/persistentCountdownState"

export function usePersistentCountdown(key: string, durationMs: number) {
  const [endAt, setEndAt] = useState<number | null>(() => sanitizePersistentCountdownEndAt(getNumber(key)))
  const [secondsLeft, setSecondsLeft] = useState(() => calculatePersistentCountdownSecondsLeft(endAt))

  useEffect(() => {
    const persistedEndAt = getNumber(key)
    const nextEndAt = sanitizePersistentCountdownEndAt(persistedEndAt)

    if (persistedEndAt !== null && nextEndAt === null) {
      removeItem(key)
    }

    setEndAt(nextEndAt)
    setSecondsLeft(calculatePersistentCountdownSecondsLeft(nextEndAt))
  }, [key])

  useEffect(() => {
    if (!endAt) {
      setSecondsLeft(0)
      return
    }

    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const scheduleNextTick = () => {
      if (cancelled) {
        return
      }

      const nextSecondsLeft = calculatePersistentCountdownSecondsLeft(endAt)
      setSecondsLeft(nextSecondsLeft)

      if (nextSecondsLeft <= 0) {
        removeItem(key)
        setEndAt(currentEndAt => (currentEndAt === endAt ? null : currentEndAt))
        return
      }

      timer = setTimeout(scheduleNextTick, getPersistentCountdownNextDelay(endAt))
    }

    scheduleNextTick()

    return () => {
      cancelled = true

      if (timer) {
        clearTimeout(timer)
      }
    }
  }, [endAt, key])

  const start = useCallback(() => {
    const nextEndAt = Date.now() + durationMs
    setNumber(key, nextEndAt)
    setEndAt(nextEndAt)
    setSecondsLeft(calculatePersistentCountdownSecondsLeft(nextEndAt))
  }, [durationMs, key])

  const reset = useCallback(() => {
    removeItem(key)
    setEndAt(null)
    setSecondsLeft(0)
  }, [key])

  return {
    secondsLeft,
    isActive: secondsLeft > 0,
    start,
    reset,
  }
}
