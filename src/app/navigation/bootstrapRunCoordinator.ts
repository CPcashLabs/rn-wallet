export type BootstrapRun = {
  cancel: () => void
  isCurrent: () => boolean
  signal: AbortSignal
}

let activeRunId = 0
let activeController: AbortController | null = null

export function beginBootstrapRun(): BootstrapRun {
  activeController?.abort()

  const controller = new AbortController()
  const runId = ++activeRunId
  activeController = controller

  const isCurrent = () => activeController === controller && activeRunId === runId && !controller.signal.aborted

  const cancel = () => {
    controller.abort()

    if (activeController === controller) {
      activeController = null
    }
  }

  return {
    cancel,
    isCurrent,
    signal: controller.signal,
  }
}

export function resetBootstrapRunCoordinatorForTests() {
  activeController?.abort()
  activeController = null
  activeRunId = 0
}
