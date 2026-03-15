import {
  ApiError,
  AuthExpiredError,
  NativeCapabilityUnavailableError,
  NetworkUnavailableError,
  UnsafeUploadFileError,
} from "@/shared/errors"

describe("shared errors", () => {
  it("builds ApiError with and without optional metadata", () => {
    const cause = new Error("root cause")
    const detailed = new ApiError("bad request", {
      status: 400,
      code: "BAD_REQUEST",
      cause,
    })
    const minimal = new ApiError("boom")

    expect(detailed).toMatchObject({
      name: "ApiError",
      message: "bad request",
      status: 400,
      code: "BAD_REQUEST",
      cause,
    })
    expect(minimal).toMatchObject({
      name: "ApiError",
      message: "boom",
      status: undefined,
      code: undefined,
      cause: undefined,
    })
  })

  it("builds auth and network errors with default and custom messages", () => {
    const authCause = new Error("expired")
    const expiredDefault = new AuthExpiredError()
    const expiredCustom = new AuthExpiredError("Session timed out", {
      cause: authCause,
    })
    const networkDefault = new NetworkUnavailableError()
    const networkCustom = new NetworkUnavailableError("Offline", {
      cause: authCause,
    })

    expect(expiredDefault).toMatchObject({
      name: "AuthExpiredError",
      message: "Authentication expired",
      status: 401,
      code: "AUTH_EXPIRED",
      cause: undefined,
    })
    expect(expiredCustom).toMatchObject({
      name: "AuthExpiredError",
      message: "Session timed out",
      status: 401,
      code: "AUTH_EXPIRED",
      cause: authCause,
    })
    expect(networkDefault).toMatchObject({
      name: "NetworkUnavailableError",
      message: "Network unavailable",
      code: "NETWORK_UNAVAILABLE",
      cause: undefined,
    })
    expect(networkCustom).toMatchObject({
      name: "NetworkUnavailableError",
      message: "Offline",
      code: "NETWORK_UNAVAILABLE",
      cause: authCause,
    })
  })

  it("builds native capability and upload errors with default and custom messages", () => {
    const defaultCapability = new NativeCapabilityUnavailableError("scanner")
    const customCapability = new NativeCapabilityUnavailableError("wallet", "Wallet native bridge missing")
    const defaultUpload = new UnsafeUploadFileError()
    const customUpload = new UnsafeUploadFileError("Bad attachment")

    expect(defaultCapability).toMatchObject({
      name: "NativeCapabilityUnavailableError",
      message: "scanner is not available in the current app version",
      capability: "scanner",
    })
    expect(customCapability).toMatchObject({
      name: "NativeCapabilityUnavailableError",
      message: "Wallet native bridge missing",
      capability: "wallet",
    })
    expect(defaultUpload).toMatchObject({
      name: "UnsafeUploadFileError",
      message: "Unsafe upload file input",
      code: "INVALID_UPLOAD_FILE",
    })
    expect(customUpload).toMatchObject({
      name: "UnsafeUploadFileError",
      message: "Bad attachment",
      code: "INVALID_UPLOAD_FILE",
    })
  })
})
