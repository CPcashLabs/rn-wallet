jest.mock("axios", () => ({
  __esModule: true,
  default: {
    create: jest.fn(() => ({
      interceptors: {
        request: {
          use: jest.fn(),
        },
        response: {
          use: jest.fn(),
        },
      },
    })),
  },
}))

import axios from "axios"
import { getSendShareDetail, resetTransferApiStateForTests } from "@/plugins/transfer/services/transferApi"

type OAuthRuntimeGlobals = typeof globalThis & {
  __CPCASH_OAUTH_CLIENT_ID__?: string
}

type Deferred<T> = {
  promise: Promise<T>
  resolve: (value: T) => void
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(nextResolve => {
    resolve = nextResolve
  })

  return {
    promise,
    resolve,
  }
}

describe("transferApi guest token", () => {
  const runtimeGlobals = globalThis as OAuthRuntimeGlobals
  const originalOAuthClientId = runtimeGlobals.__CPCASH_OAUTH_CLIENT_ID__
  const mockAxiosCreate = axios.create as jest.Mock

  beforeEach(() => {
    runtimeGlobals.__CPCASH_OAUTH_CLIENT_ID__ = "mobile-public-client"
    mockAxiosCreate.mockReset()
    resetTransferApiStateForTests()
  })

  afterAll(() => {
    runtimeGlobals.__CPCASH_OAUTH_CLIENT_ID__ = originalOAuthClientId
  })

  it("deduplicates concurrent guest token requests for the same public base url", async () => {
    const tokenDeferred = createDeferred<{ data: { access_token: string } }>()
    const mockTokenPost = jest.fn(() => tokenDeferred.promise)
    const mockGuestGet = jest.fn(async (url: string) => ({
      data: {
        code: 0,
        message: "ok",
        data: {
          order_sn: url.split("/").pop(),
          share_url: `https://cp.cash/share/${url.split("/").pop()}`,
          order_type: "SEND",
        },
      },
    }))

    mockAxiosCreate.mockImplementation((config: { headers?: Record<string, string> }) => {
      if (config.headers?.["Content-Type"] === "application/x-www-form-urlencoded") {
        return {
          post: mockTokenPost,
        }
      }

      return {
        get: mockGuestGet,
      }
    })

    const firstPromise = getSendShareDetail("ORDER-1", {
      publicAccess: true,
      publicBaseUrl: "https://cp.cash",
    })
    const secondPromise = getSendShareDetail("ORDER-2", {
      publicAccess: true,
      publicBaseUrl: "https://cp.cash",
    })

    await Promise.resolve()
    expect(mockTokenPost).toHaveBeenCalledTimes(1)

    tokenDeferred.resolve({
      data: {
        access_token: "guest-token",
      },
    })

    await expect(firstPromise).resolves.toMatchObject({
      orderSn: "ORDER-1",
    })
    await expect(secondPromise).resolves.toMatchObject({
      orderSn: "ORDER-2",
    })
    expect(mockTokenPost).toHaveBeenCalledTimes(1)
  })
})
