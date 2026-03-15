const mockGetJson = jest.fn()
const mockSetJson = jest.fn()
const mockRemoveItem = jest.fn()

jest.mock("@/shared/storage/kvStorage", () => ({
  getJson: (...args: unknown[]) => mockGetJson(...args),
  setJson: (...args: unknown[]) => mockSetJson(...args),
  removeItem: (...args: unknown[]) => mockRemoveItem(...args),
}))

function loadAuthStore() {
  jest.resetModules()
  return require("@/shared/store/useAuthStore") as typeof import("@/shared/store/useAuthStore")
}

describe("useAuthStore", () => {
  beforeEach(() => {
    mockGetJson.mockReset()
    mockSetJson.mockReset()
    mockRemoveItem.mockReset()
  })

  it("hydrates recent passkeys from storage during initialization", () => {
    mockGetJson.mockReturnValue([
      {
        credentialId: "credential-1",
        rawId: "raw-1",
        username: "alice",
      },
    ])

    const { useAuthStore } = loadAuthStore()

    expect(useAuthStore.getState().recentPasskeys).toEqual([
      {
        credentialId: "credential-1",
        rawId: "raw-1",
        username: "alice",
      },
    ])
  })

  it("updates bootstrapped, session and login type state", () => {
    mockGetJson.mockReturnValue([])
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

  it("deduplicates and persists the two most recent passkeys", () => {
    mockGetJson.mockReturnValue([
      {
        credentialId: "credential-1",
        rawId: "raw-1",
        username: "alice",
      },
      {
        credentialId: "credential-2",
        rawId: "raw-2",
        username: "bob",
      },
    ])
    const { useAuthStore } = loadAuthStore()

    useAuthStore.getState().addRecentPasskey({
      credentialId: "credential-2",
      rawId: "raw-2",
      username: "bob-updated",
    })
    useAuthStore.getState().addRecentPasskey({
      credentialId: "credential-3",
      rawId: "raw-3",
      username: "carol",
    })

    expect(useAuthStore.getState().recentPasskeys).toEqual([
      {
        credentialId: "credential-2",
        rawId: "raw-2",
        username: "bob-updated",
      },
      {
        credentialId: "credential-3",
        rawId: "raw-3",
        username: "carol",
      },
    ])
    expect(mockSetJson).toHaveBeenLastCalledWith("auth.passkey_history", [
      {
        credentialId: "credential-2",
        rawId: "raw-2",
        username: "bob-updated",
      },
      {
        credentialId: "credential-3",
        rawId: "raw-3",
        username: "carol",
      },
    ])
  })

  it("clears recent passkeys and auth session independently", () => {
    mockGetJson.mockReturnValue([])
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
          username: "alice",
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
