import { logErrorSafely, logInfoSafely, logWarnSafely } from "@/shared/logging/safeConsole"

type RuntimeHttpRequest = {
  requestMethod?: string
  requestUrl?: string
  status?: number
}

type RuntimeLogPayload = {
  tag: string
  component: string
  event: string
  message: string
  details?: unknown
  httpRequest?: RuntimeHttpRequest
}

type RuntimeErrorPayload = RuntimeLogPayload & {
  error: unknown
}

const RUNTIME_LOG_FORWARD_TO_CONSOLE = false

function createRuntimeContext(payload: RuntimeLogPayload) {
  const context: {
    component: string
    event: string
    message: string
    details?: unknown
    httpRequest?: RuntimeHttpRequest
  } = {
    component: payload.component,
    event: payload.event,
    message: payload.message,
  }

  if (payload.details !== undefined) {
    context.details = payload.details
  }

  if (payload.httpRequest !== undefined) {
    context.httpRequest = payload.httpRequest
  }

  return context
}

export function logRuntimeInfo(payload: RuntimeLogPayload) {
  logInfoSafely(payload.tag, {
    context: createRuntimeContext(payload),
    forwardToConsole: RUNTIME_LOG_FORWARD_TO_CONSOLE,
  })
}

export function logRuntimeWarn(payload: RuntimeLogPayload) {
  logWarnSafely(payload.tag, {
    context: createRuntimeContext(payload),
    forwardToConsole: RUNTIME_LOG_FORWARD_TO_CONSOLE,
  })
}

export function logRuntimeError(payload: RuntimeErrorPayload) {
  logErrorSafely(payload.tag, payload.error, {
    context: createRuntimeContext(payload),
    forwardToConsole: RUNTIME_LOG_FORWARD_TO_CONSOLE,
  })
}
