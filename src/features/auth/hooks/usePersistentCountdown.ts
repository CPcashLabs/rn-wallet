import { useCallback, useEffect, useState } from "react"

import { getNumber, removeItem, setNumber } from "@/shared/storage/kvStorage"

function calculateRemainingSeconds(endAt: number | null) {
  if (!endAt) {
    return 0
  }

  return Math.max(0, Math.ceil((endAt - Date.now()) / 1000))
}

export function usePersistentCountdown(key: string, durationMs: number) {
  const [secondsLeft, setSecondsLeft] = useState(() => calculateRemainingSeconds(getNumber(key)))

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft(calculateRemainingSeconds(getNumber(key)))
    }, 500)

    return () => {
      clearInterval(timer)
    }
  }, [key])

  const start = useCallback(() => {
    const endAt = Date.now() + durationMs
    setNumber(key, endAt)
    setSecondsLeft(calculateRemainingSeconds(endAt))
  }, [durationMs, key])

  const reset = useCallback(() => {
    removeItem(key)
    setSecondsLeft(0)
  }, [key])

  return {
    secondsLeft,
    isActive: secondsLeft > 0,
    start,
    reset,
  }
}
