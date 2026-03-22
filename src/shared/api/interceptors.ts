import type { AxiosInstance, InternalAxiosRequestConfig } from "axios"

import { clearAuthSession, readTokenPair } from "@/shared/api/auth-session"
import { mapApiError } from "@/shared/api/error-mapping"
import { resolveAcceptLanguage } from "@/shared/api/language-header"
import { ApiError, AuthExpiredError, NetworkUnavailableError } from "@/shared/errors"
import { logInfoSafely, logWarnSafely } from "@/shared/logging/safeConsole"
import { resetProfileSyncSession } from "@/shared/session/profileSyncSession"
import { useAuthStore } from "@/shared/store/useAuthStore"

type UnauthorizedHandler = (() => void) | null
type NetworkUnavailableHandler = (() => void) | null

const API_REQUEST_LOG_TAG = "[api.request]"
const API_RESPONSE_LOG_TAG = "[api.response]"
const API_INTERCEPTORS_COMPONENT = "api.interceptors"
const API_LOG_TYPES = {
  attachHeaders: "attach_headers",
  businessError: "business_error",
  authExpired: "auth_expired",
  networkUnavailable: "network_unavailable",
} as const

let unauthorizedHandler: UnauthorizedHandler = null
let networkUnavailableHandler: NetworkUnavailableHandler = null

function isAuthTokenEndpoint(url?: string) {
  return typeof url === "string" && url.includes("/api/auth/oauth2/token")
}

function describeRequestConfig(config?: Pick<InternalAxiosRequestConfig, "method" | "baseURL" | "url" | "timeout">) {
  return {
    method: config?.method,
    baseURL: config?.baseURL,
    url: config?.url,
    timeout: config?.timeout,
  }
}

function describeHttpRequest(
  config?: Pick<InternalAxiosRequestConfig, "method" | "url">,
  status?: number,
) {
  return {
    requestMethod: config?.method?.toUpperCase(),
    requestUrl: config?.url,
    status,
  }
}

export function setUnauthorizedHandler(handler: UnauthorizedHandler) {
  unauthorizedHandler = handler
}

export function setNetworkUnavailableHandler(handler: NetworkUnavailableHandler) {
  networkUnavailableHandler = handler
}

export function registerInterceptors(client: AxiosInstance) {
  client.interceptors.request.use(attachHeaders)

  client.interceptors.response.use(
    response => {
      const envelope = response.data as { code?: number | string; message?: string } | undefined

      if (envelope && typeof envelope === "object" && "code" in envelope && Number(envelope.code) !== 200) {
        logWarnSafely(API_RESPONSE_LOG_TAG, {
          context: {
            component: API_INTERCEPTORS_COMPONENT,
            event: API_LOG_TYPES.businessError,
            message: "API response returned a non-success business code.",
            httpRequest: describeHttpRequest(response.config, response.status),
            details: {
              businessCode: String(envelope.code),
              config: describeRequestConfig(response.config),
            },
          },
          forwardToConsole: false,
        })

        return Promise.reject(
          new ApiError(envelope.message ?? "API request failed", {
            status: response.status,
            code: envelope.code,
          }),
        )
      }

      return response
    },
    async error => {
      const mappedError = mapApiError(error)
      const isAuthExpired = mappedError instanceof AuthExpiredError
      const isNetworkUnavailable = mappedError instanceof NetworkUnavailableError

      if (isAuthExpired) {
        await clearAuthSession()
        resetProfileSyncSession()
        useAuthStore.getState().clearSession()
        unauthorizedHandler?.()

        logWarnSafely(API_RESPONSE_LOG_TAG, {
          context: {
            component: API_INTERCEPTORS_COMPONENT,
            event: API_LOG_TYPES.authExpired,
            message: "Cleared local auth state after receiving an expired-session response.",
            details: {
              unauthorizedHandlerRegistered: Boolean(unauthorizedHandler),
            },
          },
          forwardToConsole: false,
        })
      }

      if (isNetworkUnavailable) {
        networkUnavailableHandler?.()

        logWarnSafely(API_RESPONSE_LOG_TAG, {
          context: {
            component: API_INTERCEPTORS_COMPONENT,
            event: API_LOG_TYPES.networkUnavailable,
            message: "Raised the offline handler after mapping a network-unavailable error.",
            details: {
              networkHandlerRegistered: Boolean(networkUnavailableHandler),
            },
          },
          forwardToConsole: false,
        })
      }

      return Promise.reject(mappedError)
    },
  )
}

async function attachHeaders(config: InternalAxiosRequestConfig) {
  const tokenPair = await readTokenPair()
  const language = resolveAcceptLanguage()
  const accessToken = tokenPair?.accessToken
  const authorizationAttached = Boolean(accessToken && !isAuthTokenEndpoint(config.url))

  config.headers.set("Accept-Language", language)

  if (authorizationAttached) {
    config.headers.set("Authorization", `Bearer ${accessToken}`)
  }

  logInfoSafely(API_REQUEST_LOG_TAG, {
    context: {
      component: API_INTERCEPTORS_COMPONENT,
      event: API_LOG_TYPES.attachHeaders,
      message: "Prepared outbound request headers.",
      httpRequest: describeHttpRequest(config),
      details: {
        acceptLanguage: language,
        hasAccessToken: Boolean(accessToken),
        authorizationAttached,
        config: describeRequestConfig(config),
      },
    },
    forwardToConsole: false,
  })

  return config
}
