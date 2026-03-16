import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from "axios"

import { resolveApiBaseUrl, resolveAuthBaseUrl } from "@/shared/config/runtime"
import { registerInterceptors } from "@/shared/api/interceptors"

function attachRuntimeBaseUrl(client: AxiosInstance, resolver: () => string) {
  client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    if (typeof config.baseURL !== "string" || !config.baseURL.trim()) {
      config.baseURL = resolver()
    }

    return config
  })
}

export const apiClient = axios.create({
  timeout: 15_000,
  headers: {
    "Content-Type": "application/json",
  },
})

attachRuntimeBaseUrl(apiClient, resolveApiBaseUrl)
registerInterceptors(apiClient)

export const authClient = axios.create({
  timeout: 15_000,
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
  },
})

attachRuntimeBaseUrl(authClient, resolveAuthBaseUrl)
registerInterceptors(authClient)
