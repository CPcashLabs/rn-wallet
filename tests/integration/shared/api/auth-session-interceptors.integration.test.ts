import { readAuthSession, writeAuthSession } from "@/shared/api/auth-session"
import { registerInterceptors, setNetworkUnavailableHandler, setUnauthorizedHandler } from "@/shared/api/interceptors"
import { AuthExpiredError, NetworkUnavailableError } from "@/shared/errors"
import { setLanguagePreference } from "@/shared/i18n"
import { hasProfileSyncHydratedThisSession, runProfileSync } from "@/shared/session/profileSyncSession"
import { useAuthStore } from "@/shared/store/useAuthStore"

import { passwordSession } from "../../test-helpers/authFixtures"
import { resetAuthIntegrationState } from "../../test-helpers/authRuntime"
import { createAxiosError } from "../../test-helpers/axiosError"
import { createFakeAxiosClient } from "../../test-helpers/fakeAxiosClient"

describe("auth session and interceptors integration", () => {
  beforeEach(async () => {
    await resetAuthIntegrationState()
  })

  it("attaches persisted auth and language headers to regular requests", async () => {
    await writeAuthSession(passwordSession)
    await setLanguagePreference("zh-CN")

    const harness = createFakeAxiosClient()
    registerInterceptors(harness.client)

    const config = await harness.getRequestHandler()(harness.createConfig("/api/orders/list"))

    expect(config.headers.get("Authorization")).toBe("Bearer access-token")
    expect(config.headers.get("Accept-Language")).toBe("zh-CN")
  })

  it("does not attach authorization headers to oauth token requests", async () => {
    await writeAuthSession(passwordSession)

    const harness = createFakeAxiosClient()
    registerInterceptors(harness.client)

    const config = await harness.getRequestHandler()(harness.createConfig("/api/auth/oauth2/token"))

    expect(config.headers.get("Authorization")).toBeUndefined()
    expect(config.headers.get("Accept-Language")).toBe("en-US")
  })

  it("clears persisted auth state and resets session guards on 401 responses", async () => {
    await writeAuthSession(passwordSession)
    useAuthStore.getState().setSession(passwordSession)
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
