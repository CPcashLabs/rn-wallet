const mockTranslate = jest.fn((key: string) => key)

jest.mock("@/shared/i18n", () => ({
  i18n: {
    t: (key: string) => mockTranslate(key),
  },
}))

import { createCurrentPasswordSchema, createPasswordSetupSchema } from "@/features/auth/utils/passwordFormSchema"

const passwordRules = {
  passwordMinLength: 8,
  passwordUppercaseRequired: true,
  passwordLowercaseRequired: true,
  passwordNumericRequired: true,
  passwordSpecialCharRequired: false,
  rsaPublicKey: "rsa-public-key",
}

const messages = {
  confirmPasswordRequired: "confirm-required",
  currentPasswordRequired: "current-required",
  passwordMismatch: "password-mismatch",
  passwordRequired: "password-required",
}

describe("passwordFormSchema", () => {
  it("validates the current-password step", () => {
    const schema = createCurrentPasswordSchema(messages)

    expect(schema.safeParse({ originPassword: "" }).error?.issues[0]?.message).toBe("current-required")
    expect(schema.safeParse({ originPassword: "secret" }).success).toBe(true)
  })

  it("enforces password rules and confirm-password matching", () => {
    const schema = createPasswordSetupSchema(passwordRules, messages)

    expect(schema.safeParse({ password: "", passwordAgain: "" }).error?.issues[0]?.message).toBe("password-required")
    expect(schema.safeParse({ password: "short", passwordAgain: "short" }).error?.issues[0]?.message).toBe(
      "auth.errors.passwordTooShort",
    )
    expect(schema.safeParse({ password: "Password1", passwordAgain: "Password2" }).error?.issues[0]?.message).toBe(
      "password-mismatch",
    )
    expect(schema.safeParse({ password: "Password1", passwordAgain: "Password1" }).success).toBe(true)
  })

  it("skips password-rule validation until rules finish loading", () => {
    const schema = createPasswordSetupSchema(null, messages)

    expect(schema.safeParse({ password: "short", passwordAgain: "short" }).success).toBe(true)
  })
})
