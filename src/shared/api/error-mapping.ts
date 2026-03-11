import axios from "axios"

import { ApiError, AuthExpiredError, NetworkUnavailableError } from "@/shared/errors"

function isAuthTokenEndpoint(url?: string) {
  return typeof url === "string" && url.includes("/api/auth/oauth2/token")
}

function describeResponseData(data: unknown) {
  if (typeof data === "string" && data.trim()) {
    return {
      message: data.trim(),
    }
  }

  if (!data || typeof data !== "object") {
    return {}
  }

  const payload = data as Record<string, unknown>
  const message =
    (typeof payload.message === "string" && payload.message) ||
    (typeof payload.error_description === "string" && payload.error_description) ||
    (typeof payload.error === "string" && payload.error) ||
    ""
  const code =
    (typeof payload.code === "string" && payload.code) ||
    (typeof payload.code === "number" && String(payload.code)) ||
    (typeof payload.error_code === "string" && payload.error_code) ||
    ""

  return {
    code,
    message,
  }
}

export function mapApiError(error: unknown) {
  if (error instanceof ApiError) {
    return error
  }

  if (!axios.isAxiosError(error)) {
    return new ApiError("Unknown API error", { cause: error })
  }

  if (!error.response) {
    return new NetworkUnavailableError(error.message || "Network unavailable", { cause: error })
  }

  if (error.response.status === 401 && !isAuthTokenEndpoint(error.config?.url)) {
    return new AuthExpiredError("Session expired", { cause: error })
  }

  const responseData = describeResponseData(error.response.data)

  return new ApiError(responseData.message || error.message || "API request failed", {
    status: error.response.status,
    code: responseData.code,
    cause: error,
  })
}
