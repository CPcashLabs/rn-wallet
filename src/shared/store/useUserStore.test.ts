const mockGetString = jest.fn()
const mockSetString = jest.fn()
const mockRemoveItem = jest.fn()

jest.mock("@/shared/storage/kvStorage", () => ({
  getString: (...args: unknown[]) => mockGetString(...args),
  setString: (...args: unknown[]) => mockSetString(...args),
  removeItem: (...args: unknown[]) => mockRemoveItem(...args),
}))

function loadUserStore() {
  jest.resetModules()
  return require("@/shared/store/useUserStore") as typeof import("@/shared/store/useUserStore")
}

describe("useUserStore", () => {
  beforeEach(() => {
    mockGetString.mockReset()
    mockSetString.mockReset()
    mockRemoveItem.mockReset()
  })

  it("hydrates a legacy persisted profile without restoring avatar version state", () => {
    mockGetString.mockReturnValue(JSON.stringify({
      nickname: "alice",
      avatar: "https://cdn.example/avatar-1.png",
      email: "alice@example.com",
    }))

    const { useUserStore } = loadUserStore()

    expect(useUserStore.getState()).toMatchObject({
      profile: {
        nickname: "alice",
        avatar: "https://cdn.example/avatar-1.png",
        email: "alice@example.com",
      },
      avatarVersion: 0,
    })
  })

  it("preserves local profile fields when the remote payload omits or blanks them", () => {
    mockGetString.mockReturnValue(JSON.stringify({
      nickname: "alice",
      avatar: "https://cdn.example/avatar-1.png",
      email: "alice@example.com",
    }))

    const { useUserStore } = loadUserStore()

    useUserStore.getState().mergeRemoteProfile({
      nickname: "alice-updated",
      avatar: "",
      email: "",
    })

    expect(useUserStore.getState()).toMatchObject({
      profile: {
        nickname: "alice-updated",
        avatar: "https://cdn.example/avatar-1.png",
        email: "alice@example.com",
      },
      avatarVersion: 0,
    })
    expect(mockSetString).toHaveBeenLastCalledWith(
      "auth.user_profile",
      JSON.stringify({
        state: {
          profile: {
            nickname: "alice-updated",
            avatar: "https://cdn.example/avatar-1.png",
            email: "alice@example.com",
          },
        },
        version: 0,
      }),
    )
  })

  it("increments avatar version for avatar patches and removes persisted state on clear", () => {
    mockGetString.mockReturnValue(null)
    const { useUserStore } = loadUserStore()

    useUserStore.getState().patchProfile({
      nickname: "alice",
      avatar: "https://cdn.example/avatar-2.png",
    })

    expect(useUserStore.getState()).toMatchObject({
      profile: {
        nickname: "alice",
        avatar: "https://cdn.example/avatar-2.png",
      },
      avatarVersion: 1,
    })

    useUserStore.getState().clearProfile()

    expect(mockRemoveItem).toHaveBeenCalledWith("auth.user_profile")
    expect(useUserStore.getState()).toMatchObject({
      profile: null,
      avatarVersion: 0,
    })
  })
})

export {}
