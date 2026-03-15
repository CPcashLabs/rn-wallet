import { resolveDeepLink } from "@/app/navigation/deepLinkRouting"

describe("resolveDeepLink", () => {
  it("rejects encoded path separators in order identifiers", () => {
    const resolution = resolveDeepLink("app://orders/order%2F123", true)

    expect(resolution.routes).toMatchObject([
      {
        name: "SupportStack",
        params: {
          screen: "NotFoundScreen",
        },
      },
    ])
  })

  it("rejects malformed public txid values", () => {
    const resolution = resolveDeepLink("https://share.cpcash.app/share?txid=javascript:alert(1)", false)

    expect(resolution.routes).toMatchObject([
      {
        name: "SupportStack",
        params: {
          screen: "NotFoundScreen",
        },
      },
    ])
  })

  it("rejects untrusted nested targets in wechat-interceptor links", () => {
    const resolution = resolveDeepLink(
      "app://wechat-interceptor?target=https%3A%2F%2Fevil.example%2Forders%2FORDER_123",
      true,
    )

    expect(resolution.routes).toMatchObject([
      {
        name: "SupportStack",
        params: {
          screen: "NotFoundScreen",
        },
      },
    ])
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

  it("rejects receive links with invalid optional query parameters", () => {
    const resolution = resolveDeepLink("app://receive?payChain=BTT&chain_color=rgba(0,0,0,1)", true)

    expect(resolution.routes).toMatchObject([
      {
        name: "SupportStack",
        params: {
          screen: "NotFoundScreen",
        },
      },
    ])
  })

  it("accepts safe order deep links", () => {
    const resolution = resolveDeepLink("app://orders/ORDER_123/status", true)

    expect(resolution.routes).toMatchObject([
      {
        name: "MainTabs",
      },
      {
        name: "TransferStack",
        params: {
          screen: "TxPayStatusScreen",
          params: {
            orderSn: "ORDER_123",
          },
        },
      },
    ])
  })
})
