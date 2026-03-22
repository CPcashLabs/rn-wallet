import { NativeCapabilityUnavailableError } from "@/shared/errors"
import { passkeyAdapter } from "@/shared/native/passkeyAdapter"

describe("passkeyAdapter", () => {
  it("stays disabled until a hardware-backed signing architecture exists", () => {
    expect(passkeyAdapter.getCapability()).toEqual({
      supported: false,
      reason: "Passkey sign-in is disabled until a hardware-backed native signer replaces the JS private-key derivation flow.",
    })
  })

  it("fails closed for register and authenticate", async () => {
    const registerResult = await passkeyAdapter.register({
      username: "alice",
    })
    const authResult = await passkeyAdapter.authenticate({
      rawId: "raw-id",
    })

    expect(registerResult.ok).toBe(false)
    expect(authResult.ok).toBe(false)

    if (registerResult.ok || authResult.ok) {
      throw new Error("Passkey adapter unexpectedly returned a signed assertion")
    }

    expect(registerResult.error).toBeInstanceOf(NativeCapabilityUnavailableError)
    expect(authResult.error).toBeInstanceOf(NativeCapabilityUnavailableError)
    expect(registerResult.error.message).toBe(
      "Passkey sign-in is disabled until a hardware-backed native signer replaces the JS private-key derivation flow.",
    )
    expect(authResult.error.message).toBe(
      "Passkey sign-in is disabled until a hardware-backed native signer replaces the JS private-key derivation flow.",
    )
  })
})
