const BASE_DELAY_MS = 1_500
const BACKOFF_MULTIPLIER = 1.3
const MAX_DELAY_MS = 4_000

type AbortLikeError = Error & {
  code?: string
}

function createAbortError() {
  const error = new Error("Transfer confirm retry aborted.") as AbortLikeError
  error.name = "AbortError"
  return error
}

export function getTransferConfirmRetryDelay(attempt: number) {
  return Math.min(MAX_DELAY_MS, Math.round(BASE_DELAY_MS * Math.pow(BACKOFF_MULTIPLIER, attempt)))
}

export function isAbortLikeError(error: unknown) {
  if (!(error instanceof Error)) {
    return false
  }

  const abortError = error as AbortLikeError
  return abortError.name === "AbortError" || abortError.name === "CanceledError" || abortError.code === "ERR_CANCELED"
}

export function waitForTransferConfirmRetry(delayMs: number, signal: AbortSignal) {
  if (signal.aborted) {
    return Promise.reject(createAbortError())
  }

  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      signal.removeEventListener("abort", handleAbort)
    }

    const timer = setTimeout(() => {
      cleanup()
      resolve()
    }, delayMs)

    const handleAbort = () => {
      clearTimeout(timer)
      cleanup()
      reject(createAbortError())
    }

    signal.addEventListener("abort", handleAbort, { once: true })
  })
}
