import type { AxiosInstance, InternalAxiosRequestConfig } from "axios"

import { clearAuthSession, readTokenPair } from "@/shared/api/auth-session"
import { mapApiError } from "@/shared/api/error-mapping"
import { resolveAcceptLanguage } from "@/shared/api/language-header"
import { ApiError, AuthExpiredError } from "@/shared/errors"
import { useAuthStore } from "@/shared/store/useAuthStore"

type UnauthorizedHandler = (() => void) | null

let unauthorizedHandler: UnauthorizedHandler = null

function isAuthTokenEndpoint(url?: string) {
  return typeof url === "string" && url.includes("/api/auth/oauth2/token")
}

export function setUnauthorizedHandler(handler: UnauthorizedHandler) {
  unauthorizedHandler = handler
}

export function registerInterceptors(client: AxiosInstance) {
  client.interceptors.request.use(attachHeaders)

  client.interceptors.response.use(
    response => {
      const envelope = response.data as { code?: number | string; message?: string } | undefined

      if (envelope && typeof envelope === "object" && "code" in envelope && Number(envelope.code) !== 200) {
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

      if (mappedError instanceof AuthExpiredError) {
        await clearAuthSession()
        useAuthStore.getState().clearSession()
        unauthorizedHandler?.()
      }

      return Promise.reject(mappedError)
    },
  )
}

async function attachHeaders(config: InternalAxiosRequestConfig) {
  const tokenPair = await readTokenPair()
  const language = resolveAcceptLanguage()

  config.headers.set("Accept-Language", language)

  if (tokenPair?.accessToken && !isAuthTokenEndpoint(config.url)) {
    config.headers.set("Authorization", `Bearer ${tokenPair.accessToken}`)
  }

  return config
}
