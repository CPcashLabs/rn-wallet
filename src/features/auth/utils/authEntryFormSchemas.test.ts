import {
  createAddressSchema,
  createImportSecretSchema,
  createNicknameSchema,
  createPasswordLoginSchema,
  createVerificationCodeSchema,
} from "@/features/auth/utils/authEntryFormSchemas"

const addressMessages = {
  addressRequired: "address-required",
}

const passwordLoginMessages = {
  addressRequired: "address-required",
  passwordRequired: "password-required",
  passwordTooShort: "password-too-short",
}

const verificationCodeMessages = {
  codeInvalid: "code-invalid",
  codeRequired: "code-required",
}

const importSecretMessages = {
  importSecretRequired: "secret-required",
  invalidImportSecret: "secret-invalid",
}

const nicknameMessages = {
  nicknameRequired: "nickname-required",
}

describe("authEntryFormSchemas", () => {
  it("validates required wallet addresses", () => {
    const schema = createAddressSchema(addressMessages)

    expect(schema.safeParse({ address: "" }).error?.issues[0]?.message).toBe("address-required")
    expect(schema.safeParse({ address: "0xabc" }).success).toBe(true)
  })

  it("validates password login inputs", () => {
    const schema = createPasswordLoginSchema(8, passwordLoginMessages)

    expect(schema.safeParse({ address: "", password: "" }).error?.issues[0]?.message).toBe("address-required")
    expect(schema.safeParse({ address: "0xabc", password: "" }).error?.issues[0]?.message).toBe("password-required")
    expect(schema.safeParse({ address: "0xabc", password: "short" }).error?.issues[0]?.message).toBe("password-too-short")
    expect(schema.safeParse({ address: "0xabc", password: "12345678" }).success).toBe(true)
  })

  it("validates six-digit verification codes", () => {
    const schema = createVerificationCodeSchema(verificationCodeMessages)

    expect(schema.safeParse({ code: "" }).error?.issues[0]?.message).toBe("code-required")
    expect(schema.safeParse({ code: "123" }).error?.issues[0]?.message).toBe("code-invalid")
    expect(schema.safeParse({ code: "123456" }).success).toBe(true)
  })

  it("validates wallet import secrets", () => {
    const schema = createImportSecretSchema(importSecretMessages)

    expect(schema.safeParse({ secret: "" }).error?.issues[0]?.message).toBe("secret-required")
    expect(schema.safeParse({ secret: "invalid" }).error?.issues[0]?.message).toBe("secret-invalid")
    expect(
      schema.safeParse({
        secret: "test test test test test test test test test test test junk",
      }).success,
    ).toBe(true)
  })

  it("validates nicknames", () => {
    const schema = createNicknameSchema(nicknameMessages)

    expect(schema.safeParse({ nickname: "" }).error?.issues[0]?.message).toBe("nickname-required")
    expect(schema.safeParse({ nickname: "Alice" }).success).toBe(true)
  })
})
