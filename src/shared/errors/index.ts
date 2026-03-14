export class ApiError extends Error {
  status?: number
  code?: string | number
  cause?: unknown

  constructor(message: string, options?: { status?: number; code?: string | number; cause?: unknown }) {
    super(message)
    this.name = "ApiError"
    this.status = options?.status
    this.code = options?.code
    this.cause = options?.cause
  }
}

export class AuthExpiredError extends ApiError {
  constructor(message = "Authentication expired", options?: { cause?: unknown }) {
    super(message, { status: 401, code: "AUTH_EXPIRED", cause: options?.cause })
    this.name = "AuthExpiredError"
  }
}

export class NetworkUnavailableError extends ApiError {
  constructor(message = "Network unavailable", options?: { cause?: unknown }) {
    super(message, { code: "NETWORK_UNAVAILABLE", cause: options?.cause })
    this.name = "NetworkUnavailableError"
  }
}

export class NativeCapabilityUnavailableError extends Error {
  capability: string

  constructor(capability: string, message?: string) {
    super(message ?? `${capability} is not available in the current app version`)
    this.name = "NativeCapabilityUnavailableError"
    this.capability = capability
  }
}
