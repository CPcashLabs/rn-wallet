import {
  createInitialNavigationStateFromRouteDescriptors,
  decodeNavigationBridgePath,
  encodeNavigationBridgeUrl,
  resolveNavigationStateFromBridgePath,
} from "@/app/navigation/navigationLinking"

const ORDER_SN = "ORDER_123"
const TXID = `0x${"a".repeat(64)}`

describe("navigationLinking", () => {
  const originalApiBaseUrl = (globalThis as { __CPCASH_API_BASE_URL__?: string }).__CPCASH_API_BASE_URL__

  beforeEach(() => {
    ;(globalThis as { __CPCASH_API_BASE_URL__?: string }).__CPCASH_API_BASE_URL__ = "https://cp.cash"
  })

  afterAll(() => {
    ;(globalThis as { __CPCASH_API_BASE_URL__?: string }).__CPCASH_API_BASE_URL__ = originalApiBaseUrl
  })

  it("encodes and decodes bridge urls with the original deep-link payload", () => {
    const bridgeUrl = encodeNavigationBridgeUrl(`https://wallet.cp.cash/share?txid=${TXID}`, "protected")
    const path = bridgeUrl.replace("cpcash-nav://", "")

    expect(decodeNavigationBridgePath(path)).toEqual({
      source: "protected",
      url: `https://wallet.cp.cash/share?txid=${TXID}`,
    })
  })

  it("builds nested navigation state from route descriptors", () => {
    const state = createInitialNavigationStateFromRouteDescriptors(
      [
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
        {
          name: "OrdersStack",
          params: {
            screen: "OrderDetailScreen",
            params: {
              orderSn: ORDER_SN,
              source: "manual",
            },
          },
        },
      ],
      1,
    )

    expect(state).toMatchObject({
      index: 1,
      routes: [
        {
          name: "MainTabs",
          state: {
            index: 0,
            routes: [
              {
                name: "HomeTab",
                state: {
                  index: 0,
                  routes: [
                    {
                      name: "HomeShellScreen",
                      params: {
                        inviteCode: "HELLO_123",
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
        {
          name: "OrdersStack",
          state: {
            index: 0,
            routes: [
              {
                name: "OrderDetailScreen",
                params: {
                  orderSn: ORDER_SN,
                  source: "manual",
                },
              },
            ],
          },
        },
      ],
    })
  })

  it("resolves bridge paths through the deep-link parser while preserving trusted public hosts", () => {
    const payload = resolveNavigationStateFromBridgePath(
      `resolve?source=incoming&url=${encodeURIComponent(`https://wallet.cp.cash/share?txid=${TXID}`)}`,
      false,
    )

    expect(payload).toMatchObject({
      source: "incoming",
      url: `https://wallet.cp.cash/share?txid=${TXID}`,
      resolution: {
        routes: [
          {
            name: "TransferStack",
            params: {
              screen: "TxPayStatusScreen",
              params: {
                publicAccess: true,
                publicBaseUrl: "https://wallet.cp.cash",
                publicTxid: TXID,
              },
            },
          },
        ],
      },
      state: {
        index: 0,
        routes: [
          {
            name: "TransferStack",
            state: {
              routes: [
                {
                  name: "TxPayStatusScreen",
                  params: {
                    publicAccess: true,
                    publicBaseUrl: "https://wallet.cp.cash",
                    publicTxid: TXID,
                  },
                },
              ],
            },
          },
        ],
      },
    })
  })

  it("returns null for malformed bridge paths", () => {
    expect(decodeNavigationBridgePath("invite?code=HELLO_123")).toBeNull()
    expect(resolveNavigationStateFromBridgePath("resolve?source=bad", true)).toBeNull()
  })
})
