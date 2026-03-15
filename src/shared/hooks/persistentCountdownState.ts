export function calculatePersistentCountdownSecondsLeft(endAt: number | null, now = Date.now()) {
  if (!endAt) {
    return 0
  }

  return Math.max(0, Math.ceil((endAt - now) / 1000))
}

export function sanitizePersistentCountdownEndAt(endAt: number | null, now = Date.now()) {
  if (typeof endAt !== "number" || !Number.isFinite(endAt) || endAt <= now) {
    return null
  }

  return endAt
}

export function getPersistentCountdownNextDelay(endAt: number, now = Date.now()) {
  const remainingMs = Math.max(0, endAt - now)
  if (remainingMs <= 0) {
    return 0
  }

  const secondsLeft = Math.ceil(remainingMs / 1000)
  return Math.max(0, remainingMs - (secondsLeft - 1) * 1000)
}
