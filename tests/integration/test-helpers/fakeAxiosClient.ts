import { AxiosHeaders, type AxiosInstance, type AxiosResponse, type InternalAxiosRequestConfig } from "axios"

type RequestHandler = (config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig | Promise<InternalAxiosRequestConfig>
type ResponseSuccessHandler = (response: AxiosResponse) => unknown
type ResponseErrorHandler = (error: unknown) => Promise<never>

export function createFakeAxiosClient() {
  let requestHandler: RequestHandler | null = null
  let responseSuccessHandler: ResponseSuccessHandler | null = null
  let responseErrorHandler: ResponseErrorHandler | null = null

  const client = {
    interceptors: {
      request: {
        use(handler: RequestHandler) {
          requestHandler = handler
          return 0
        },
      },
      response: {
        use(success: ResponseSuccessHandler, error: ResponseErrorHandler) {
          responseSuccessHandler = success
          responseErrorHandler = error
          return 0
        },
      },
    },
  } as unknown as AxiosInstance

  return {
    client,
    createConfig(url = "/api/orders/list") {
      return {
        url,
        headers: new AxiosHeaders(),
      } as InternalAxiosRequestConfig
    },
    getRequestHandler() {
      if (!requestHandler) {
        throw new Error("request interceptor not registered")
      }

      return requestHandler
    },
    getResponseSuccessHandler() {
      if (!responseSuccessHandler) {
        throw new Error("response success interceptor not registered")
      }

      return responseSuccessHandler
    },
    getResponseErrorHandler() {
      if (!responseErrorHandler) {
        throw new Error("response error interceptor not registered")
      }

      return responseErrorHandler
    },
  }
}
