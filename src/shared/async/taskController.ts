type AbortLikeError = Error & {
  code?: string
}

export type LatestTaskRun = {
  signal: AbortSignal
  isCurrent: () => boolean
  commit: (commitFn: () => void) => boolean
  cancel: () => void
}

export type LatestTaskController = {
  begin: () => LatestTaskRun
  cancel: () => void
}

export function createAbortError(message = "Task aborted.") {
  const error = new Error(message) as AbortLikeError
  error.name = "AbortError"
  return error
}

export function throwIfAborted(signal?: AbortSignal, message?: string) {
  if (signal?.aborted) {
    throw createAbortError(message)
  }
}

export function isAbortLikeError(error: unknown) {
  if (!(error instanceof Error)) {
    return false
  }

  const abortError = error as AbortLikeError
  return abortError.name === "AbortError" || abortError.name === "CanceledError" || abortError.code === "ERR_CANCELED"
}

export function waitForAbortableDelay(delayMs: number, signal: AbortSignal) {
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

export function createLatestTaskController(): LatestTaskController {
  let activeController: AbortController | null = null
  let activeRunId = 0

  const cancel = () => {
    activeController?.abort()
    activeController = null
  }

  return {
    begin() {
      activeController?.abort()

      const controller = new AbortController()
      const runId = ++activeRunId
      activeController = controller

      const isCurrent = () => activeController === controller && activeRunId === runId && !controller.signal.aborted

      const cancelRun = () => {
        controller.abort()

        if (activeController === controller) {
          activeController = null
        }
      }

      return {
        signal: controller.signal,
        isCurrent,
        commit(commitFn) {
          if (!isCurrent()) {
            return false
          }

          commitFn()
          return true
        },
        cancel: cancelRun,
      }
    },
    cancel,
  }
}
