const mockGetString = jest.fn()
const mockSetString = jest.fn()
const mockRemoveItem = jest.fn()

jest.mock("@/shared/storage/kvStorage", () => ({
  getString: (...args: unknown[]) => mockGetString(...args),
  setString: (...args: unknown[]) => mockSetString(...args),
  removeItem: (...args: unknown[]) => mockRemoveItem(...args),
}))

function loadAuthStore() {
  jest.resetModules()
  return require("@/shared/store/useAuthStore") as typeof import("@/shared/store/useAuthStore")
}

describe("useAuthStore", () => {
  beforeEach(() => {
    mockGetString.mockReset()
    mockSetString.mockReset()
    mockRemoveItem.mockReset()
  })

  it("hydrates recent passkeys from the legacy storage payload during initialization", () => {
    mockGetString.mockReturnValue(JSON.stringify([
      {
        credentialId: "credential-1",
        rawId: "raw-1",
        name: "alice",
      },
    ]))

    const { useAuthStore } = loadAuthStore()

    expect(useAuthStore.getState().recentPasskeys).toEqual([
      {
        credentialId: "credential-1",
        rawId: "raw-1",
        name: "alice",
      },
    ])
  })

  it("updates bootstrapped, session and login type state", () => {
    mockGetString.mockReturnValue(null)
    const { useAuthStore } = loadAuthStore()

    useAuthStore.getState().setBootstrapped(true)
    useAuthStore.getState().setSession({
      accessToken: "access",
      refreshToken: "refresh",
      loginType: "password",
      address: "0xabc",
    })
    useAuthStore.getState().setLoginType("wallet")

    expect(useAuthStore.getState()).toMatchObject({
      isBootstrapped: true,
      session: {
        accessToken: "access",
        refreshToken: "refresh",
        loginType: "password",
        address: "0xabc",
      },
      loginType: "wallet",
    })
  })

  it("falls back to a null login type when the session omits it", () => {
    mockGetString.mockReturnValue(null)
    const { useAuthStore } = loadAuthStore()

    useAuthStore.getState().setSession({
      accessToken: "access",
      refreshToken: "refresh",
    })

    expect(useAuthStore.getState()).toMatchObject({
      session: {
        accessToken: "access",
        refreshToken: "refresh",
      },
      loginType: null,
    })
  })

  it("deduplicates and persists the two most recent passkeys", () => {
    mockGetString.mockReturnValue(JSON.stringify([
      {
        credentialId: "credential-1",
        rawId: "raw-1",
        name: "alice",
      },
      {
        credentialId: "credential-2",
        rawId: "raw-2",
        name: "bob",
      },
    ]))
    const { useAuthStore } = loadAuthStore()

    useAuthStore.getState().addRecentPasskey({
      credentialId: "credential-2",
      rawId: "raw-2",
      name: "bob-updated",
    })
    useAuthStore.getState().addRecentPasskey({
      credentialId: "credential-3",
      rawId: "raw-3",
      name: "carol",
    })

    expect(useAuthStore.getState().recentPasskeys).toEqual([
      {
        credentialId: "credential-2",
        rawId: "raw-2",
        name: "bob-updated",
      },
      {
        credentialId: "credential-3",
        rawId: "raw-3",
        name: "carol",
      },
    ])
    expect(mockSetString).toHaveBeenCalled()
    expect(mockSetString).toHaveBeenLastCalledWith(
      "auth.passkey_history",
      JSON.stringify({
        state: {
          recentPasskeys: [
            {
              credentialId: "credential-2",
              rawId: "raw-2",
              name: "bob-updated",
            },
            {
              credentialId: "credential-3",
              rawId: "raw-3",
              name: "carol",
            },
          ],
        },
        version: 0,
      }),
    )
  })

  it("clears recent passkeys and auth session independently", () => {
    mockGetString.mockReturnValue(null)
    const { useAuthStore } = loadAuthStore()

    useAuthStore.setState({
      session: {
        accessToken: "access",
        refreshToken: "refresh",
      },
      loginType: "wallet",
      recentPasskeys: [
        {
          credentialId: "credential-1",
          rawId: "raw-1",
          name: "alice",
        },
      ],
    })

    useAuthStore.getState().clearRecentPasskeys()
    useAuthStore.getState().clearSession()

    expect(mockRemoveItem).toHaveBeenCalledWith("auth.passkey_history")
    expect(useAuthStore.getState()).toMatchObject({
      session: null,
      loginType: null,
      recentPasskeys: [],
    })
  })
})

export {}
