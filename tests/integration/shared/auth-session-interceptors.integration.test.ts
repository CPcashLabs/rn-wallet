import { clearAuthSession, readAuthSession, writeAuthSession } from "@/shared/api/auth-session"
import { registerInterceptors, setNetworkUnavailableHandler, setUnauthorizedHandler } from "@/shared/api/interceptors"
import { AuthExpiredError, NetworkUnavailableError } from "@/shared/errors"
import { hasProfileSyncHydratedThisSession, resetProfileSyncSession, runProfileSync } from "@/shared/session/profileSyncSession"
import { KvStorageKeys } from "@/shared/storage/sessionKeys"
import { removeItem, setString } from "@/shared/storage/kvStorage"
import { useAuthStore } from "@/shared/store/useAuthStore"

import { createFakeAxiosClient } from "../test-helpers/fakeAxiosClient"

const session = {
  accessToken: "access-token",
  refreshToken: "refresh-token",
  loginType: "password" as const,
}

function createAxiosError(overrides: Record<string, unknown> = {}) {
  return {
    name: "AxiosError",
    message: "Request failed",
    isAxiosError: true,
    config: {
      url: "/api/orders/list",
    },
    ...overrides,
  }
}

describe("auth session and interceptors integration", () => {
  beforeEach(async () => {
    setUnauthorizedHandler(null)
    setNetworkUnavailableHandler(null)
    resetProfileSyncSession()
    useAuthStore.setState({
      isBootstrapped: false,
      session: null,
      loginType: null,
      recentPasskeys: [],
    })
    await clearAuthSession()
    removeItem(KvStorageKeys.AppLanguage)
  })

  it("attaches persisted auth and language headers to regular requests", async () => {
    await writeAuthSession(session)
    setString(KvStorageKeys.AppLanguage, "zh-CN")

    const harness = createFakeAxiosClient()
    registerInterceptors(harness.client)

    const config = await harness.getRequestHandler()(harness.createConfig("/api/orders/list"))

    expect(config.headers.get("Authorization")).toBe("Bearer access-token")
    expect(config.headers.get("Accept-Language")).toBe("zh-CN")
  })

  it("does not attach authorization headers to oauth token requests", async () => {
    await writeAuthSession(session)

    const harness = createFakeAxiosClient()
    registerInterceptors(harness.client)

    const config = await harness.getRequestHandler()(harness.createConfig("/api/auth/oauth2/token"))

    expect(config.headers.get("Authorization")).toBeUndefined()
    expect(config.headers.get("Accept-Language")).toBe("en-US")
  })

  it("clears persisted auth state and resets session guards on 401 responses", async () => {
    await writeAuthSession(session)
    useAuthStore.getState().setSession(session)
    await runProfileSync(async () => true)

    const unauthorizedSpy = jest.fn()
    setUnauthorizedHandler(unauthorizedSpy)

    const harness = createFakeAxiosClient()
    registerInterceptors(harness.client)

    await expect(
      harness.getResponseErrorHandler()(
        createAxiosError({
          response: {
            status: 401,
            data: {
              message: "token expired",
            },
          },
        }),
      ),
    ).rejects.toBeInstanceOf(AuthExpiredError)

    expect(await readAuthSession()).toBeNull()
    expect(useAuthStore.getState().session).toBeNull()
    expect(hasProfileSyncHydratedThisSession()).toBe(false)
    expect(unauthorizedSpy).toHaveBeenCalledTimes(1)
  })

  it("calls the network unavailable hook for transport-level failures", async () => {
    const networkSpy = jest.fn()
    setNetworkUnavailableHandler(networkSpy)

    const harness = createFakeAxiosClient()
    registerInterceptors(harness.client)

    await expect(
      harness.getResponseErrorHandler()(
        createAxiosError({
          message: "socket hang up",
          response: undefined,
        }),
      ),
    ).rejects.toBeInstanceOf(NetworkUnavailableError)

    expect(networkSpy).toHaveBeenCalledTimes(1)
  })
})
