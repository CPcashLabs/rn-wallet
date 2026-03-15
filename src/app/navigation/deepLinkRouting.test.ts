import { resolveDeepLink, sanitizeWechatTargetPath } from "@/app/navigation/deepLinkRouting"

const ORDER_SN = "ORDER_123"
const COPUCH_ID = "COPOUCH_123"
const EVM_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678"
const TXID = `0x${"a".repeat(64)}`

function expectNotFound(url: string, path?: string) {
  const resolution = resolveDeepLink(url, true)

  expect(resolution.routes).toMatchObject([
    {
      name: "SupportStack",
      params: {
        screen: "NotFoundScreen",
      },
    },
  ])

  const route = resolution.routes[0] as { params?: { params?: { path?: string } } }
  if (path === undefined) {
    return
  }

  expect(route.params?.params?.path).toBe(path)
}

describe("resolveDeepLink", () => {
  const originalApiBaseUrl = (globalThis as { __CPCASH_API_BASE_URL__?: string }).__CPCASH_API_BASE_URL__

  beforeEach(() => {
    ;(globalThis as { __CPCASH_API_BASE_URL__?: string }).__CPCASH_API_BASE_URL__ = "https://cp.cash"
  })

  afterAll(() => {
    ;(globalThis as { __CPCASH_API_BASE_URL__?: string }).__CPCASH_API_BASE_URL__ = originalApiBaseUrl
  })

  it("rejects encoded path separators in order identifiers", () => {
    expectNotFound("app://orders/order%2F123")
  })

  it("rejects malformed public txid values", () => {
    expectNotFound("https://share.cpcash.app/share?txid=javascript:alert(1)")
  })

  it("rejects untrusted nested targets in wechat-interceptor links", () => {
    expectNotFound("app://wechat-interceptor?target=https%3A%2F%2Fevil.example%2Forders%2FORDER_123")
  })

  it("accepts validated nested targets in wechat-interceptor links", () => {
    const resolution = resolveDeepLink("app://wechat-interceptor?target=%2Forders%2FORDER_123", true)

    expect(resolution.routes).toMatchObject([
      {
        name: "SupportStack",
        params: {
          screen: "WechatInterceptorScreen",
          params: {
            targetPath: "/orders/ORDER_123",
          },
        },
      },
    ])
  })

  it("canonicalizes nested query targets before they reach navigation params", () => {
    const resolution = resolveDeepLink(
      `app://wechat-interceptor?target=${encodeURIComponent("app://receive?payChain=BTT&chain_color=%23FFAA00&ignored=1")}`,
      true,
    )

    expect(resolution.routes).toMatchObject([
      {
        name: "SupportStack",
        params: {
          screen: "WechatInterceptorScreen",
          params: {
            targetPath: "/receive?payChain=BTT&chainColor=%23FFAA00",
          },
        },
      },
    ])
  })

  it("rejects receive links with invalid optional query parameters", () => {
    expectNotFound("app://receive?payChain=BTT&chain_color=rgba(0,0,0,1)")
  })

  it("stores canonical protected deep links instead of raw external input", () => {
    const resolution = resolveDeepLink("app://receive?payChain=BTT&chain_color=%23FFAA00&ignored=1", false)

    expect(resolution.pendingProtectedUrl).toBe("/receive?payChain=BTT&chainColor=%23FFAA00")
  })

  it("accepts safe order deep links", () => {
    const resolution = resolveDeepLink(`app://orders/${ORDER_SN}/status`, true)

    expect(resolution.routes).toMatchObject([
      {
        name: "MainTabs",
      },
      {
        name: "TransferStack",
        params: {
          screen: "TxPayStatusScreen",
          params: {
            orderSn: ORDER_SN,
          },
        },
      },
    ])
  })

  it("drops query strings from not-found diagnostics", () => {
    const resolution = resolveDeepLink("https://evil.example/orders/ORDER_123?token=secret&payload=%0Aboom", true)

    expect(resolution.routes).toMatchObject([
      {
        name: "SupportStack",
        params: {
          screen: "NotFoundScreen",
          params: {
            path: "https://evil.example/orders/ORDER_123",
          },
        },
      },
    ])
  })

  it("rewrites legacy share hosts onto the pinned public API origin", () => {
    const resolution = resolveDeepLink(`https://share.cpcash.app/send?share=${ORDER_SN}`, false)

    expect(resolution.routes).toMatchObject([
      {
        name: "TransferStack",
        params: {
          screen: "SendPaymentInfoScreen",
          params: {
            orderSn: ORDER_SN,
            publicAccess: true,
            publicBaseUrl: "https://cp.cash",
          },
        },
      },
    ])
  })

  it.each([
    {
      url: `app://order-voucher/${ORDER_SN}`,
      routeName: "OrdersStack",
      screen: "OrderVoucherScreen",
      pendingProtectedUrl: `/order-voucher/${ORDER_SN}`,
    },
    {
      url: `app://digitalreceipt/${ORDER_SN}`,
      routeName: "OrdersStack",
      screen: "DigitalReceiptScreen",
      pendingProtectedUrl: `/digitalreceipt/${ORDER_SN}`,
    },
    {
      url: `app://flowproof/${ORDER_SN}`,
      routeName: "OrdersStack",
      screen: "FlowProofScreen",
      pendingProtectedUrl: `/flowproof/${ORDER_SN}`,
    },
    {
      url: `app://refund/${ORDER_SN}`,
      routeName: "OrdersStack",
      screen: "RefundDetailScreen",
      pendingProtectedUrl: `/refund/${ORDER_SN}`,
    },
    {
      url: "app://orderbill",
      routeName: "OrdersStack",
      screen: "OrderBillScreen",
      pendingProtectedUrl: "/orderbill",
    },
    {
      url: `app://txlogs/orderdetail/${ORDER_SN}`,
      routeName: "OrdersStack",
      screen: "OrderDetailScreen",
      pendingProtectedUrl: `/orders/${ORDER_SN}`,
    },
    {
      url: `app://txlogs/txpaystatus/${ORDER_SN}`,
      routeName: "TransferStack",
      screen: "TxPayStatusScreen",
      pendingProtectedUrl: `/orders/${ORDER_SN}/status`,
    },
    {
      url: `app://txlogs/splitdetail/${ORDER_SN}`,
      routeName: "OrdersStack",
      screen: "SplitDetailScreen",
      pendingProtectedUrl: `/txlogs/splitdetail/${ORDER_SN}`,
    },
  ])("resolves protected order route $url", ({ url, routeName, screen, pendingProtectedUrl }) => {
    const authenticated = resolveDeepLink(url, true)

    expect(authenticated).toMatchObject({
      index: 1,
      routes: [
        {
          name: "MainTabs",
        },
        {
          name: routeName,
          params: {
            screen,
          },
        },
      ],
    })

    const unauthenticated = resolveDeepLink(url, false)

    expect(unauthenticated).toMatchObject({
      index: 0,
      pendingProtectedUrl,
      routes: [
        {
          name: "AuthStack",
          params: {
            screen: "LoginScreen",
          },
        },
      ],
    })
  })

  it.each([
    `app://orders/${ORDER_SN}/extra`,
    `app://order-voucher/${ORDER_SN}/extra`,
    `app://txlogs/unknown/${ORDER_SN}`,
    "app://orderbill/extra",
  ])("rejects malformed protected order path %s", url => {
    expectNotFound(url)
  })

  it("resolves copouch detail links and canonicalizes cowallet detail paths", () => {
    const copouchResolution = resolveDeepLink(`app://copouch/${COPUCH_ID}`, true)
    expect(copouchResolution).toMatchObject({
      index: 1,
      routes: [
        {
          name: "MainTabs",
          params: {
            screen: "MeTab",
            params: {
              screen: "MeShellScreen",
            },
          },
        },
        {
          name: "CopouchStack",
          params: {
            screen: "CopouchDetailScreen",
            params: {
              id: COPUCH_ID,
            },
          },
        },
      ],
    })

    const cowalletResolution = resolveDeepLink(`app://cowallet/detail/${COPUCH_ID}`, false)
    expect(cowalletResolution).toMatchObject({
      index: 0,
      pendingProtectedUrl: `/copouch/${COPUCH_ID}`,
      routes: [
        {
          name: "AuthStack",
          params: {
            screen: "LoginScreen",
          },
        },
      ],
    })
  })

  it("rejects malformed copouch deep links", () => {
    expectNotFound("app://copouch")
    expectNotFound(`app://cowallet/detail/${COPUCH_ID}/extra`)
  })

  it("resolves invite links for login, home and me screens", () => {
    expect(resolveDeepLink("app://invite?code=HELLO_123", false)).toMatchObject({
      index: 0,
      routes: [
        {
          name: "AuthStack",
          params: {
            screen: "LoginScreen",
            params: {
              inviteCode: "HELLO_123",
            },
          },
        },
      ],
    })

    expect(resolveDeepLink("app://invite?code=HELLO_123", true)).toMatchObject({
      index: 0,
      routes: [
        {
          name: "MainTabs",
          params: {
            screen: "HomeTab",
            params: {
              screen: "HomeShellScreen",
              params: {
                inviteCode: "HELLO_123",
              },
            },
          },
        },
      ],
    })

    expect(resolveDeepLink("app://invite", true)).toMatchObject({
      index: 0,
      routes: [
        {
          name: "MainTabs",
          params: {
            screen: "MeTab",
            params: {
              screen: "InviteHomeScreen",
            },
          },
        },
      ],
    })

    expect(resolveDeepLink("app://invite", false)).toMatchObject({
      index: 0,
      pendingProtectedUrl: "/invite",
      routes: [
        {
          name: "AuthStack",
          params: {
            screen: "LoginScreen",
          },
        },
      ],
    })
  })

  it.each([
    {
      url: "app://invite/invitecode",
      screen: "InviteCodeScreen",
      pendingProtectedUrl: "/invite/invitecode",
    },
    {
      url: "app://invite/promotion",
      screen: "InvitePromotionScreen",
      pendingProtectedUrl: "/invite/promotion",
    },
    {
      url: "app://invite/how-it-works",
      screen: "InviteHowItWorksScreen",
      pendingProtectedUrl: "/invite/how-it-works",
    },
  ])("resolves invite sub-page $url", ({ url, screen, pendingProtectedUrl }) => {
    expect(resolveDeepLink(url, true)).toMatchObject({
      index: 0,
      routes: [
        {
          name: "MainTabs",
          params: {
            screen: "MeTab",
            params: {
              screen,
            },
          },
        },
      ],
    })

    expect(resolveDeepLink(url, false)).toMatchObject({
      index: 0,
      pendingProtectedUrl,
      routes: [
        {
          name: "AuthStack",
          params: {
            screen: "LoginScreen",
          },
        },
      ],
    })
  })

  it("rejects malformed invite links", () => {
    expectNotFound("app://invite/bad-screen")
    expectNotFound("app://invite/promotion/extra")
    expectNotFound("app://invite?code=bad/code")
  })

  it("resolves receive links and canonicalizes cowallet aliases", () => {
    const authenticated = resolveDeepLink(
      `app://receive-detail?payChain=BTT&cowallet=${EVM_ADDRESS}&multisig_wallet_id=MULTI_1&collapse=business&chain_color=%23FFAA00&receiveMode=trace`,
      true,
    )

    expect(authenticated).toMatchObject({
      index: 1,
      routes: [
        {
          name: "MainTabs",
        },
        {
          name: "ReceiveStack",
          params: {
            screen: "ReceiveHomeScreen",
            params: {
              payChain: "BTT",
              copouch: EVM_ADDRESS,
              cowallet: EVM_ADDRESS,
              multisigWalletId: "MULTI_1",
              collapse: "business",
              chainColor: "#FFAA00",
              receiveMode: "trace",
            },
          },
        },
      ],
    })

    const protectedResolution = resolveDeepLink(
      `app://new-receive-detail?copouch=${EVM_ADDRESS}&cowallet=${EVM_ADDRESS}&collapse=individuals`,
      false,
    )

    expect(protectedResolution).toMatchObject({
      index: 0,
      pendingProtectedUrl: `/receive?cowallet=${encodeURIComponent(EVM_ADDRESS)}&collapse=individuals`,
      routes: [
        {
          name: "AuthStack",
          params: {
            screen: "LoginScreen",
          },
        },
      ],
    })
  })

  it("rejects malformed receive links", () => {
    expectNotFound(`app://receive?copouch=${EVM_ADDRESS}&cowallet=0xabcdefabcdefabcdefabcdefabcdefabcdefabcd`)
    expectNotFound("app://receive/extra")
  })

  it("allows a bare wechat-interceptor route without a nested target", () => {
    expect(resolveDeepLink("app://wechat-interceptor", true)).toMatchObject({
      index: 0,
      routes: [
        {
          name: "SupportStack",
          params: {
            screen: "WechatInterceptorScreen",
            params: undefined,
          },
        },
      ],
    })
  })

  it("sanitizes nested targets into canonical deep links", () => {
    expect(sanitizeWechatTargetPath(`https://wallet.cp.cash/share?txid=${TXID}`)).toBe(
      `https://wallet.cp.cash/share?txid=${TXID}`,
    )
    expect(sanitizeWechatTargetPath(`app://share?txid=${TXID}`)).toBe(`/share?txid=${TXID}`)
    expect(sanitizeWechatTargetPath("app://invite?code=HELLO_123")).toBe("/invite?code=HELLO_123")
    expect(sanitizeWechatTargetPath("app://wechat-interceptor?target=/orders/ORDER_123")).toBeUndefined()
    expect(sanitizeWechatTargetPath("  \u0000  ")).toBeUndefined()
  })

  it("resolves public send and share links from app and web hosts", () => {
    expect(resolveDeepLink(`app://send?share=${ORDER_SN}`, true)).toMatchObject({
      index: 0,
      routes: [
        {
          name: "TransferStack",
          params: {
            screen: "SendPaymentInfoScreen",
            params: {
              orderSn: ORDER_SN,
              publicAccess: true,
              publicBaseUrl: undefined,
            },
          },
        },
      ],
    })

    expect(resolveDeepLink(`https://wallet.cp.cash/send/detail?txid=${TXID}`, false)).toMatchObject({
      index: 0,
      routes: [
        {
          name: "TransferStack",
          params: {
            screen: "TxPayStatusScreen",
            params: {
              publicAccess: true,
              publicTxid: TXID,
              publicBaseUrl: "https://wallet.cp.cash",
            },
          },
        },
      ],
    })

    expect(resolveDeepLink(`https://wallet.cp.cash/share?txid=${TXID}`, false)).toMatchObject({
      index: 0,
      routes: [
        {
          name: "TransferStack",
          params: {
            screen: "TxPayStatusScreen",
            params: {
              publicAccess: true,
              publicTxid: TXID,
              publicBaseUrl: "https://wallet.cp.cash",
            },
          },
        },
      ],
    })
  })

  it("rejects malformed public send and share links", () => {
    expectNotFound("app://send/detail")
    expectNotFound("app://send/extra?share=ORDER_123")
    expectNotFound("app://share")
    expectNotFound(`app://share/extra?txid=${TXID}`)
  })

  it("sanitizes unsupported and malformed diagnostics for not-found routes", () => {
    expectNotFound("ftp://share.cpcash.app/share?txid=1", "unsupported-link")
    expectNotFound("not-a-deep-link", "invalid-link")
    expectNotFound("https://bad host/orders/ORDER_123", "invalid-link")
    expectNotFound("app://", "app://")
    expectNotFound("/", "/")
  })

  it("truncates very long diagnostic paths", () => {
    const longPath = `/${"very-long-segment-".repeat(40)}`
    const resolution = resolveDeepLink(longPath, true)
    const path = (resolution.routes[0] as { params?: { params?: { path?: string } } }).params?.params?.path

    expect(path).toBeDefined()
    expect(path?.length).toBeLessThanOrEqual(512)
    expect(path?.endsWith("…")).toBe(true)
  })

  it("rejects additional malformed branches that sanitize into canonical diagnostics", () => {
    expectNotFound("\u0000")
    expectNotFound("app://receive?copouch=not-an-address")
    expectNotFound("app://digitalreceipt")
    expectNotFound("app://flowproof")
    expectNotFound("app://refund")
    expectNotFound("app://txlogs")
    expectNotFound("app://wechat-interceptor/extra")
    expectNotFound("app://send/detail?txid=bad")
    expectNotFound("app://send?share=bad/code")
    expectNotFound("app://send")
  })
})
