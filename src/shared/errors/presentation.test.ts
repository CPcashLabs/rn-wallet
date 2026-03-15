import { NativeCapabilityUnavailableError, UnsafeUploadFileError } from "@/shared/errors"
import { resolveErrorMessage } from "@/shared/errors/presentation"

describe("resolveErrorMessage", () => {
  it("maps wallet capability errors to the localized wallet-unavailable copy", () => {
    const t = (key: string) => key

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
    const t = (key: string) => key

    const message = resolveErrorMessage(
      t,
      new NativeCapabilityUnavailableError("passkey", "internal passkey signer disabled"),
      {
        fallbackKey: "common.errors.generic",
      },
    )

    expect(message).toBe("auth.errors.passkeyUnavailable")
  })

  it("maps unsafe upload file errors to the localized invalid-upload copy", () => {
    const t = (key: string) => key

    const message = resolveErrorMessage(t, new UnsafeUploadFileError("internal upload validation failure"), {
      fallbackKey: "common.errors.generic",
    })

    expect(message).toBe("common.errors.invalidUploadFile")
  })
})
