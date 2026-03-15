import { ApiError, NativeCapabilityUnavailableError, NetworkUnavailableError, UnsafeUploadFileError } from "@/shared/errors"
import { errorCodeOf, isPasskeyAssociationErrorMessage, resolveErrorMessage } from "@/shared/errors/presentation"

describe("resolveErrorMessage", () => {
  const t = (key: string) => key

  it("maps wallet capability errors to the localized wallet-unavailable copy", () => {
    const message = resolveErrorMessage(
      t,
      new NativeCapabilityUnavailableError("wallet", "internal wallet error"),
      {
        fallbackKey: "common.errors.generic",
      },
    )

    expect(message).toBe("auth.errors.walletUnavailable")
  })

  it("maps passkey capability errors to the localized passkey-unavailable copy", () => {
    const message = resolveErrorMessage(
      t,
      new NativeCapabilityUnavailableError("passkey", "internal passkey signer disabled"),
      {
        fallbackKey: "common.errors.generic",
      },
    )

    expect(message).toBe("auth.errors.passkeyUnavailable")
  })

  it("falls back to the raw capability error message for unknown native capabilities", () => {
    const message = resolveErrorMessage(
      t,
      new NativeCapabilityUnavailableError("scanner", "scanner disabled"),
      {
        fallbackKey: "common.errors.generic",
      },
    )

    expect(message).toBe("scanner disabled")
  })

  it("maps unsafe upload file errors to the localized invalid-upload copy", () => {
    const message = resolveErrorMessage(t, new UnsafeUploadFileError("internal upload validation failure"), {
      fallbackKey: "common.errors.generic",
    })

    expect(message).toBe("common.errors.invalidUploadFile")
  })

  it("maps network, code and status specific errors before generic fallbacks", () => {
    expect(
      resolveErrorMessage(t, new NetworkUnavailableError("offline"), {
        fallbackKey: "common.errors.generic",
      }),
    ).toBe("common.errors.network")

    expect(
      resolveErrorMessage(t, new ApiError("bad request", { code: "ORDER_LOCKED", status: 409 }), {
        fallbackKey: "common.errors.generic",
        codeMap: {
          ORDER_LOCKED: "orders.errors.locked",
        },
        statusMap: {
          409: "orders.errors.conflict",
        },
      }),
    ).toBe("orders.errors.locked")

    expect(
      resolveErrorMessage(t, new ApiError("", { status: 403 }), {
        fallbackKey: "common.errors.generic",
        statusMap: {
          403: "common.errors.forbidden",
        },
      }),
    ).toBe("common.errors.forbidden")
  })

  it("supports custom resolvers and message preferences", () => {
    expect(
      resolveErrorMessage(t, new Error("ignored"), {
        fallbackKey: "common.errors.generic",
        customResolver: () => "custom.message",
      }),
    ).toBe("custom.message")

    expect(
      resolveErrorMessage(t, new ApiError("api message"), {
        fallbackKey: "common.errors.generic",
        preferApiMessage: false,
        preferErrorMessage: false,
      }),
    ).toBe("common.errors.generic")

    expect(
      resolveErrorMessage(t, new Error("plain error"), {
        fallbackKey: "common.errors.generic",
        preferErrorMessage: false,
      }),
    ).toBe("common.errors.generic")

    expect(
      resolveErrorMessage(t, new ApiError("api message"), {
        fallbackKey: "common.errors.generic",
      }),
    ).toBe("api message")

    expect(
      resolveErrorMessage(t, new Error("plain error"), {
        fallbackKey: "common.errors.generic",
      }),
    ).toBe("plain error")
  })

  it("detects passkey association failures from generic errors", () => {
    expect(isPasskeyAssociationErrorMessage("Unable to verify webcredentials for credential")).toBe(true)
    expect(isPasskeyAssociationErrorMessage("random message")).toBe(false)

    expect(
      resolveErrorMessage(t, new Error("apple-app-site-association lookup failed"), {
        fallbackKey: "common.errors.generic",
      }),
    ).toBe("auth.errors.passkeyDomainAssociationFailed")
  })

  it("extracts error codes from api and object-shaped errors", () => {
    expect(errorCodeOf(new ApiError("failed", { code: "ORDER_FAILED" }))).toBe("ORDER_FAILED")
    expect(errorCodeOf({ code: 500 })).toBe("500")
    expect(errorCodeOf("oops")).toBe("")
  })
})
