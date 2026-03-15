import { ApiError } from "@/shared/errors"
import { appendApiDebugSuffix } from "@/features/auth/utils/authMessages"

describe("appendApiDebugSuffix", () => {
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
})
