import { createEmailCodeSchema, createEmailSchema } from "@/features/settings/utils/emailFormSchemas"

const messages = {
  codeInvalid: "code-invalid",
  codeRequired: "code-required",
  emailInvalid: "email-invalid",
  emailRequired: "email-required",
}

describe("emailFormSchemas", () => {
  it("validates email input", () => {
    const schema = createEmailSchema(messages)

    expect(schema.safeParse({ email: "" }).error?.issues[0]?.message).toBe("email-required")
    expect(schema.safeParse({ email: "wallet" }).error?.issues[0]?.message).toBe("email-invalid")
    expect(schema.safeParse({ email: "wallet@example.com" }).success).toBe(true)
  })

  it("validates six-digit email verification codes", () => {
    const schema = createEmailCodeSchema(messages)

    expect(schema.safeParse({ code: "" }).error?.issues[0]?.message).toBe("code-required")
    expect(schema.safeParse({ code: "123" }).error?.issues[0]?.message).toBe("code-invalid")
    expect(schema.safeParse({ code: "123456" }).success).toBe(true)
  })
})
