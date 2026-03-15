function loadNativePasskeyModule(input?: {
  os?: string
  nativeModule?: Record<string, unknown>
}) {
  jest.resetModules()
  jest.doMock("react-native", () => ({
    NativeModules: {
      CPCashPasskey: input?.nativeModule,
    },
    Platform: {
      OS: input?.os ?? "ios",
    },
  }))

  return require("@/shared/native/nativePasskeyModule") as typeof import("@/shared/native/nativePasskeyModule")
}

describe("nativePasskeyModule", () => {
  it("reports unsupported platforms and missing modules", () => {
    expect(loadNativePasskeyModule({ os: "web" }).readNativePasskeyCapability()).toEqual({
      supported: false,
      reason: "Passkey is only available on iOS and Android.",
    })

    expect(loadNativePasskeyModule().readNativePasskeyCapability()).toEqual({
      supported: false,
      reason: "Passkey native module is not installed.",
    })
  })

  it("surfaces native support flags and reasons", () => {
    expect(
      loadNativePasskeyModule({
        nativeModule: {
          isSupported: false,
          reason: "Secure enclave unavailable",
        },
      }).readNativePasskeyCapability(),
    ).toEqual({
      supported: false,
      reason: "Secure enclave unavailable",
    })

    expect(
      loadNativePasskeyModule({
        nativeModule: {
          register: jest.fn(),
          authenticate: jest.fn(),
          reason: "Passkey disabled by policy",
        },
      }).readNativePasskeyCapability(),
    ).toEqual({
      supported: false,
      reason: "Passkey disabled by policy",
    })
  })

  it("falls back to default native passkey reasons when native flags are incomplete", () => {
    expect(
      loadNativePasskeyModule({
        nativeModule: {
          isSupported: false,
          register: jest.fn(),
          authenticate: jest.fn(),
        },
      }).readNativePasskeyCapability(),
    ).toEqual({
      supported: false,
      reason: "Passkey is not supported on this device.",
    })

    expect(
      loadNativePasskeyModule({
        nativeModule: {
          register: jest.fn(),
          authenticate: jest.fn(),
          reason: "   ",
        },
      }).readNativePasskeyCapability(),
    ).toEqual({
      supported: true,
    })
  })

  it("delegates register and authenticate calls to the native module", async () => {
    const nativeModule = {
      register: jest.fn(async () => ({ credentialId: "credential-1", rawId: "raw-1", userId: "user-1" })),
      authenticate: jest.fn(async () => ({ credentialId: "credential-1", rawId: "raw-1", userId: "user-1" })),
    }
    const mod = loadNativePasskeyModule({
      nativeModule,
    })

    await expect(mod.registerNativePasskey({ username: "alice", rpId: "wallet.cp.cash" })).resolves.toEqual({
      credentialId: "credential-1",
      rawId: "raw-1",
      userId: "user-1",
    })
    await expect(mod.authenticateNativePasskey({ rawId: "raw-1", rpId: "wallet.cp.cash" })).resolves.toEqual({
      credentialId: "credential-1",
      rawId: "raw-1",
      userId: "user-1",
    })
  })

  it("throws when register or authenticate is unavailable", async () => {
    const mod = loadNativePasskeyModule()

    await expect(mod.registerNativePasskey({ username: "alice", rpId: "wallet.cp.cash" })).rejects.toMatchObject({
      name: "NativeCapabilityUnavailableError",
      message: "Passkey native module is not installed.",
    })
    await expect(mod.authenticateNativePasskey({ rawId: "raw-1", rpId: "wallet.cp.cash" })).rejects.toMatchObject({
      name: "NativeCapabilityUnavailableError",
      message: "Passkey native module is not installed.",
    })
  })
})
