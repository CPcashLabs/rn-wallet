export const TX_PAY_STATUS_POLL_INTERVAL_MS = 5_000
export const TX_PAY_STATUS_COUNTDOWN_INTERVAL_MS = 1_000

export function getTxPayStatusCountdownLeft(endAt: number, now = Date.now()) {
  return Math.max(0, endAt - now)
}

export function resolveTxPayStatusCountdownEndAt(input: {
  durationMs?: number
  existingEndAt: number | null
  now?: number
  shouldStart: boolean
}) {
  if (!input.shouldStart) {
    return null
  }

  const now = input.now ?? Date.now()
  if (input.existingEndAt && input.existingEndAt > now) {
    return input.existingEndAt
  }

  return now + (input.durationMs ?? 15_000)
}

export function shouldDisableTxPayStatusRefresh(input: {
  countdownLeft: number
  loading: boolean
}) {
  return input.loading || input.countdownLeft > 0
}

export function startTxPayStatusCountdown(input: {
  endAt: number
  intervalMs?: number
  now?: () => number
  onExpire: () => void
  onTick: (next: number) => void
}) {
  const readNow = input.now ?? Date.now
  let timer: ReturnType<typeof setInterval> | null = null

  const stop = () => {
    if (!timer) {
      return
    }

    clearInterval(timer)
    timer = null
  }

  const tick = () => {
    const next = getTxPayStatusCountdownLeft(input.endAt, readNow())
    input.onTick(next)

    if (next > 0) {
      return
    }

    input.onExpire()
    stop()
  }

  timer = setInterval(tick, input.intervalMs ?? TX_PAY_STATUS_COUNTDOWN_INTERVAL_MS)
  tick()

  return stop
}

export function startTxPayStatusPoller(input: {
  getTask: () => () => void | Promise<void>
  intervalMs?: number
}) {
  const timer = setInterval(() => {
    void input.getTask()()
  }, input.intervalMs ?? TX_PAY_STATUS_POLL_INTERVAL_MS)

  return () => {
    clearInterval(timer)
  }
}
