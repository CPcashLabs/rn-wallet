import { buildOAuthTokenRequestBody } from "@/shared/api/oauth"

type OAuthRuntimeGlobals = typeof globalThis & {
  __CPCASH_OAUTH_CLIENT_ID__?: string
}

describe("oauth token request body", () => {
  const runtimeGlobals = globalThis as OAuthRuntimeGlobals
  const originalOAuthClientId = runtimeGlobals.__CPCASH_OAUTH_CLIENT_ID__

  beforeEach(() => {
    runtimeGlobals.__CPCASH_OAUTH_CLIENT_ID__ = "mobile-public-client"
  })

  afterAll(() => {
    runtimeGlobals.__CPCASH_OAUTH_CLIENT_ID__ = originalOAuthClientId
  })

  it("uses the runtime public client id and never appends a client secret", () => {
    const body = buildOAuthTokenRequestBody("message_signature", {
      address: "0x1234",
      signature: "0xabcd",
      message: "Sign in",
    })

    expect(body.toString()).toBe(
      "client_id=mobile-public-client&grant_type=message_signature&address=0x1234&signature=0xabcd&message=Sign+in",
    )
    expect(body.toString()).not.toContain("client_secret")
  })

  it("trims the runtime public client id", () => {
    runtimeGlobals.__CPCASH_OAUTH_CLIENT_ID__ = "  mobile-public-client  "

    expect(buildOAuthTokenRequestBody("guest").get("client_id")).toBe("mobile-public-client")
  })

  it("rejects reserved oauth body keys", () => {
    expect(() =>
      buildOAuthTokenRequestBody("guest", {
        client_secret: "should-not-be-allowed",
      }),
    ).toThrow("OAuth token body param is reserved: client_secret")
  })
})
