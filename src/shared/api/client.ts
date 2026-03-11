import axios from "axios"

import { resolveApiBaseUrl, resolveAuthBaseUrl } from "@/shared/config/runtime"
import { registerInterceptors } from "@/shared/api/interceptors"

export const apiClient = axios.create({
  baseURL: resolveApiBaseUrl(),
  timeout: 15_000,
  headers: {
    "Content-Type": "application/json",
  },
})

registerInterceptors(apiClient)

export const authClient = axios.create({
  baseURL: resolveAuthBaseUrl(),
  timeout: 15_000,
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
  },
})
