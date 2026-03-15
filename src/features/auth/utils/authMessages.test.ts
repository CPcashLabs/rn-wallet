const mockTranslate = jest.fn((key: string) => key)

jest.mock("@/shared/i18n", () => ({
  i18n: {
    t: (key: string) => mockTranslate(key),
  },
}))

import { ApiError } from "@/shared/errors"
import { appendApiDebugSuffix, getAuthErrorMessage, getInviteBindingMessage } from "@/features/auth/utils/authMessages"

describe("authMessages", () => {
  it("uses a custom fallback key when auth errors cannot be resolved", () => {
    expect(getAuthErrorMessage(new Error(""), "auth.errors.customFallback")).toBe("auth.errors.customFallback")
  })

  it("does not append internal status metadata in production mode", () => {
    const message = appendApiDebugSuffix(
      "Login failed",
      new ApiError("unauthorized", { status: 401, code: "ACCOUNT_LOCKED" }),
      false,
    )

    expect(message).toBe("Login failed")
  })

  it("appends internal status metadata only when debug details are enabled", () => {
    const message = appendApiDebugSuffix(
      "Login failed",
      new ApiError("unauthorized", { status: 401, code: "ACCOUNT_LOCKED" }),
      true,
    )

    expect(message).toBe("Login failed\nhttp=401 / code=ACCOUNT_LOCKED")
  })

  it("returns the original message for non-api errors and uses unknown placeholders for missing api metadata", () => {
    const runtime = global as typeof globalThis & {
      __DEV__?: boolean
    }
    const previousDev = __DEV__

    runtime.__DEV__ = true
    try {
      expect(appendApiDebugSuffix("Login failed", new Error("boom"), true)).toBe("Login failed")
      expect(appendApiDebugSuffix("Login failed", new ApiError("unauthorized"))).toBe(
        "Login failed\nhttp=unknown / code=none",
      )
    } finally {
      runtime.__DEV__ = previousDev
    }
  })

  it("maps auth api errors and invite binding errors through translations", () => {
    expect(getAuthErrorMessage(new ApiError("server says no", { code: "10005", status: 401 }))).toBe(
      "auth.errors.incorrectPassword",
    )
    expect(getAuthErrorMessage(new ApiError("", { status: 401 }))).toBe("auth.errors.loginUnauthorized")
    expect(getInviteBindingMessage(new ApiError("invite lower level", { code: "20023" }))).toBe(
      "auth.errors.inviteLowerLevel",
    )
    expect(getInviteBindingMessage(new ApiError("invite already bound", { code: "20020" }))).toBe(
      "auth.errors.inviteAlreadyBound",
    )
    expect(getInviteBindingMessage(new Error("other"))).toBe("auth.errors.inviteBindFailed")
  })
})
