const mockResetToAuthStack = jest.fn()
const mockResetToMainTabs = jest.fn()

jest.mock("@/app/navigation/navigationRef", () => ({
  resetToAuthStack: () => mockResetToAuthStack(),
  resetToMainTabs: () => mockResetToMainTabs(),
}))

import { resetToEntryScreen, goBackOrReset } from "@/features/support/utils/supportNavigation"
import { useAuthStore } from "@/shared/store/useAuthStore"

import { resetAuthStoreState } from "../../test-helpers/authRuntime"

describe("supportNavigation integration", () => {
  beforeEach(() => {
    resetAuthStoreState()
    mockResetToAuthStack.mockClear()
    mockResetToMainTabs.mockClear()
  })

  it("routes authenticated users to main tabs and anonymous users to auth stack", () => {
    resetToEntryScreen()

    expect(mockResetToAuthStack).toHaveBeenCalledTimes(1)
    expect(mockResetToMainTabs).not.toHaveBeenCalled()

    useAuthStore.getState().setSession({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      loginType: "password",
    })

    resetToEntryScreen()

    expect(mockResetToMainTabs).toHaveBeenCalledTimes(1)
  })

  it("prefers native back navigation and otherwise falls back to the appropriate entry route", () => {
    const goBack = jest.fn()

    goBackOrReset({
      canGoBack: () => true,
      goBack,
    })

    expect(goBack).toHaveBeenCalledTimes(1)
    expect(mockResetToAuthStack).not.toHaveBeenCalled()
    expect(mockResetToMainTabs).not.toHaveBeenCalled()

    goBackOrReset({
      canGoBack: () => false,
      goBack: jest.fn(),
    })

    expect(mockResetToAuthStack).toHaveBeenCalledTimes(1)

    useAuthStore.getState().setSession({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      loginType: "wallet",
    })

    goBackOrReset({
      canGoBack: () => false,
      goBack: jest.fn(),
    })

    expect(mockResetToMainTabs).toHaveBeenCalledTimes(1)
  })
})
