jest.mock("axios", () => ({
  __esModule: true,
  default: {
    create: jest.fn(() => ({
      interceptors: {
        request: {
          use: jest.fn(),
        },
        response: {
          use: jest.fn(),
        },
      },
    })),
  },
}))

const mockApiGet = jest.fn()
const mockApiPost = jest.fn()
const mockApiPut = jest.fn()
const mockNormalizePinnedNetworkBaseUrl = jest.fn((value: string) => value.trim().replace(/\/+$/, ""))
const mockResolveApiBaseUrl = jest.fn(() => "https://cp.cash")
const mockBuildOAuthTokenRequestBody = jest.fn(() => new URLSearchParams({ grant_type: "guest" }))

jest.mock("@/shared/api/client", () => ({
  apiClient: {
    get: (...args: unknown[]) => mockApiGet(...args),
    post: (...args: unknown[]) => mockApiPost(...args),
    put: (...args: unknown[]) => mockApiPut(...args),
  },
}))

jest.mock("@/shared/config/runtime", () => ({
  normalizePinnedNetworkBaseUrl: (...args: unknown[]) => mockNormalizePinnedNetworkBaseUrl(...args),
  resolveApiBaseUrl: () => mockResolveApiBaseUrl(),
}))

jest.mock("@/shared/api/oauth", () => ({
  buildOAuthTokenRequestBody: () => mockBuildOAuthTokenRequestBody(),
}))

import axios from "axios"
import {
  checkTransferNetwork,
  createPaymentOrder,
  createSendCodeOrder,
  createSendTokenOrder,
  getOrderDetail,
  getPublicTxStatusDetail,
  getRecentTransferEntries,
  getReceivingOrder,
  getSendOrderLogs,
  getSendShareDetail,
  resetTransferApiStateForTests,
  submitShipOrder,
  updateSendReceiveAddress,
} from "@/domains/wallet/transfer/services/transferApi"

type OAuthRuntimeGlobals = typeof globalThis & {
  __CPCASH_OAUTH_CLIENT_ID__?: string
}

type Deferred<T> = {
  promise: Promise<T>
  resolve: (value: T) => void
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(nextResolve => {
    resolve = nextResolve
  })

  return {
    promise,
    resolve,
  }
}

describe("transferApi guest token", () => {
  const runtimeGlobals = globalThis as OAuthRuntimeGlobals
  const originalOAuthClientId = runtimeGlobals.__CPCASH_OAUTH_CLIENT_ID__
  const mockAxiosCreate = axios.create as jest.Mock

  beforeEach(() => {
    runtimeGlobals.__CPCASH_OAUTH_CLIENT_ID__ = "mobile-public-client"
    mockAxiosCreate.mockReset()
    mockApiGet.mockReset()
    mockApiPost.mockReset()
    mockApiPut.mockReset()
    mockNormalizePinnedNetworkBaseUrl.mockClear()
    mockResolveApiBaseUrl.mockClear()
    mockBuildOAuthTokenRequestBody.mockClear()
    resetTransferApiStateForTests()
  })

  afterAll(() => {
    runtimeGlobals.__CPCASH_OAUTH_CLIENT_ID__ = originalOAuthClientId
  })

  it("deduplicates concurrent guest token requests for the same public base url", async () => {
    const tokenDeferred = createDeferred<{ data: { access_token: string } }>()
    const mockTokenPost = jest.fn(() => tokenDeferred.promise)
    const mockGuestGet = jest.fn(async (url: string) => ({
      data: {
        code: 0,
        message: "ok",
        data: {
          order_sn: url.split("/").pop(),
          share_url: `https://cp.cash/share/${url.split("/").pop()}`,
          order_type: "SEND",
        },
      },
    }))

    mockAxiosCreate.mockImplementation((config: { headers?: Record<string, string> }) => {
      if (config.headers?.["Content-Type"] === "application/x-www-form-urlencoded") {
        return {
          post: mockTokenPost,
        }
      }

      return {
        get: mockGuestGet,
      }
    })

    const firstPromise = getSendShareDetail("ORDER-1", {
      publicAccess: true,
      publicBaseUrl: "https://cp.cash",
    })
    const secondPromise = getSendShareDetail("ORDER-2", {
      publicAccess: true,
      publicBaseUrl: "https://cp.cash",
    })

    await Promise.resolve()
    expect(mockTokenPost).toHaveBeenCalledTimes(1)

    tokenDeferred.resolve({
      data: {
        access_token: "guest-token",
      },
    })

    await expect(firstPromise).resolves.toMatchObject({
      orderSn: "ORDER-1",
    })
    await expect(secondPromise).resolves.toMatchObject({
      orderSn: "ORDER-2",
    })
    expect(mockTokenPost).toHaveBeenCalledTimes(1)
  })

  it("reuses cached guest tokens and falls back for sparse public share payloads", async () => {
    const txid = `0x${"b".repeat(64)}`
    const nowSpy = jest.spyOn(Date, "now")
    nowSpy.mockReturnValue(1_700_000_000_000)

    const mockTokenPost = jest.fn(async () => ({
      data: {
        code: 200,
        message: "ok",
        data: {
          access_token: "guest-token",
        },
      },
    }))
    const mockGuestGet = jest.fn(async () => ({
      data: {
        code: 200,
        message: "ok",
        data: {
          recv_address: "T_PUBLIC",
          recv_amount: "1.5",
          recv_coin_symbol: "USDT",
          send_amount: "2.5",
          send_coin_symbol: "BTT",
        },
      },
    }))

    mockAxiosCreate.mockImplementation((config: { headers?: Record<string, string> }) => {
      if (config.headers?.["Content-Type"] === "application/x-www-form-urlencoded") {
        return {
          post: mockTokenPost,
        }
      }

      return {
        get: mockGuestGet,
      }
    })

    await expect(getPublicTxStatusDetail(txid)).resolves.toEqual(
      expect.objectContaining({
        orderSn: "",
        orderType: "",
        receiveAddress: "T_PUBLIC",
        recvAmount: 1.5,
        recvCoinName: "USDT",
        sendAmount: 2.5,
        sendCoinName: "BTT",
        sellerId: "",
        payUrl: "",
        txid: "",
        shareUrl: "",
        isPayable: true,
        orderReceiptUrl: "",
        txBrowserUrl: "",
      }),
    )

    nowSpy.mockReturnValue(1_700_000_001_000)
    await getPublicTxStatusDetail(txid)

    expect(mockTokenPost).toHaveBeenCalledTimes(1)
    nowSpy.mockRestore()
  })

  it("maps recent transfers and order creation responses", async () => {
    mockApiGet.mockResolvedValueOnce({
      data: {
        code: 200,
        message: "ok",
        data: [
          {
            address: "T_RECEIVER",
            amount: 12.5,
            coin_name: "USDT",
            created_at: 1700000000000,
            direction: "TRANSFER",
          },
        ],
      },
    })
    mockApiPost
      .mockResolvedValueOnce({
        data: {
          code: 200,
          message: "ok",
          data: {
            order_sn: "PAYMENT_1",
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          code: 200,
          message: "ok",
          data: {
            serial_number: "SEND_CODE_1",
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          code: 200,
          message: "ok",
          data: {
            order_sn: "SEND_TOKEN_1",
          },
        },
      })

    await expect(
      getRecentTransferEntries({
        sendChainName: "BTT",
        receiveChainName: "TRON",
      }),
    ).resolves.toEqual([
      {
        address: "T_RECEIVER",
        amount: 12.5,
        coinName: "USDT",
        createdAt: 1700000000000,
        direction: "TRANSFER",
      },
    ])
    await expect(
      createPaymentOrder({
        sellerId: "7",
        recvCoinCode: "USDT",
        sendCoinCode: "BTT",
        sendAmount: 12.5,
        recvAddress: "T_RECEIVER",
        note: "memo",
      }),
    ).resolves.toEqual({
      orderSn: "PAYMENT_1",
    })
    await expect(
      createSendCodeOrder({
        sellerId: "7",
        recvCoinCode: "USDT",
        sendCoinCode: "BTT",
        sendAmount: 12.5,
      }),
    ).resolves.toEqual({
      orderSn: "SEND_CODE_1",
    })
    await expect(
      createSendTokenOrder({
        sellerId: "7",
        recvCoinCode: "USDT",
        sendCoinCode: "BTT",
        sendAmount: 12.5,
      }),
    ).resolves.toEqual({
      orderSn: "SEND_TOKEN_1",
    })
  })

  it("falls back across sparse order creation payloads", async () => {
    mockApiPost
      .mockResolvedValueOnce({
        data: {
          code: 200,
          message: "ok",
          data: {
            serial_number: "PAYMENT_SERIAL",
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          code: 200,
          message: "ok",
          data: {},
        },
      })
      .mockResolvedValueOnce({
        data: {
          code: 200,
          message: "ok",
          data: {},
        },
      })
      .mockResolvedValueOnce({
        data: {
          code: 200,
          message: "ok",
          data: {
            serial_number: "SEND_TOKEN_SERIAL",
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          code: 200,
          message: "ok",
          data: {},
        },
      })

    await expect(
      createPaymentOrder({
        sellerId: "",
        recvCoinCode: "USDT",
        sendCoinCode: "BTT",
        sendAmount: 12.5,
        recvAddress: "T_RECEIVER",
        note: "",
      }),
    ).resolves.toEqual({
      orderSn: "PAYMENT_SERIAL",
    })
    await expect(
      createPaymentOrder({
        sellerId: "",
        recvCoinCode: "USDT",
        sendCoinCode: "BTT",
        sendAmount: 12.5,
        recvAddress: "T_RECEIVER",
        note: "",
      }),
    ).resolves.toEqual({
      orderSn: "",
    })
    await expect(
      createSendCodeOrder({
        sellerId: "7",
        recvCoinCode: "USDT",
        sendCoinCode: "BTT",
        sendAmount: 12.5,
      }),
    ).resolves.toEqual({
      orderSn: "",
    })
    await expect(
      createSendTokenOrder({
        sellerId: "7",
        recvCoinCode: "USDT",
        sendCoinCode: "BTT",
        sendAmount: 12.5,
      }),
    ).resolves.toEqual({
      orderSn: "SEND_TOKEN_SERIAL",
    })
    await expect(
      createSendTokenOrder({
        sellerId: "7",
        recvCoinCode: "USDT",
        sendCoinCode: "BTT",
        sendAmount: 12.5,
      }),
    ).resolves.toEqual({
      orderSn: "",
    })

    expect(mockApiPost.mock.calls[0]?.[1]).toMatchObject({
      seller_id: undefined,
    })
  })

  it("maps receiving and regular order detail payloads", async () => {
    mockApiGet
      .mockResolvedValueOnce({
        data: {
          code: 200,
          message: "ok",
          data: {
            order_sn: "ORDER_1",
            status: "3",
            status_name: "Pending",
            order_type: "RECEIPT",
            recv_address: "T_RECEIVE",
            deposit_address: "T_DEPOSIT",
            recv_actual_amount: "10.5",
            recv_coin_code: "USDT",
            recv_coin_name: "USDT",
            send_actual_amount: "12.5",
            send_coin_code: "BTT",
            send_coin_name: "BTT",
            send_coin_precision: "18",
            send_coin_contract: "0xcoin",
            send_estimate_fee_amount: "0.2",
            note: "memo",
            multisig_wallet_id: 99,
            recv_chain_name: "TRON",
            send_chain_name: "BTT",
            seller_id: 77,
            pay_url: "https://example.com/pay",
            txid: "0xtx",
            updated_at: "1700000000000",
            created_at: "1700000001000",
            expired_at: "1700000002000",
            seller_estimate_receive_at: "1700000003000",
            transfer_address: "T_TRANSFER",
            payment_address: "T_PAYMENT",
            recv_actual_received_at: "1700000004000",
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          code: 200,
          message: "ok",
          data: null,
        },
      })

    await expect(getReceivingOrder("ORDER_1")).resolves.toEqual({
      orderSn: "ORDER_1",
      status: 3,
      statusName: "Pending",
      orderType: "RECEIPT",
      receiveAddress: "T_RECEIVE",
      depositAddress: "T_DEPOSIT",
      recvAmount: 10.5,
      recvCoinCode: "USDT",
      recvCoinName: "USDT",
      sendAmount: 12.5,
      sendCoinCode: "BTT",
      sendCoinName: "BTT",
      sendCoinPrecision: 18,
      sendCoinContract: "0xcoin",
      sendEstimateFeeAmount: 0.2,
      note: "memo",
      multisigWalletId: "99",
      recvChainName: "TRON",
      sendChainName: "BTT",
      sellerId: "77",
      payUrl: "https://example.com/pay",
      txid: "0xtx",
      updatedAt: 1700000000000,
      createdAt: 1700000001000,
      expiredAt: 1700000002000,
      sellerEstimateReceiveAt: 1700000003000,
      transferAddress: "T_TRANSFER",
      paymentAddress: "T_PAYMENT",
      recvActualAmount: 10.5,
      recvActualReceivedAt: 1700000004000,
    })

    await expect(getOrderDetail("ORDER_404")).rejects.toThrow("Order detail not found")
  })

  it("submits ship orders and checks transfer-network matching", async () => {
    mockApiPut.mockResolvedValue(undefined)
    mockApiGet
      .mockResolvedValueOnce({
        data: {
          code: 200,
          message: "ok",
          data: true,
        },
      })
      .mockResolvedValueOnce({
        data: {
          code: 200,
          message: "ok",
          data: {
            matched: false,
            chain_name: "TRON",
          },
        },
      })

    await submitShipOrder({
      orderSn: "ORDER_1",
      txid: "0xtx",
      address: "T_RECEIVE",
    })
    await submitShipOrder({
      orderSn: "ORDER_2",
      txid: "0xtx2",
      address: "T_RECEIVE_2",
      variant: "normal",
    })

    await expect(checkTransferNetwork({ chainName: "TRON", address: "T_ADDRESS" })).resolves.toEqual({
      matched: true,
      chainName: "",
    })
    await expect(checkTransferNetwork({ chainName: "TRON", address: "T_ADDRESS" })).resolves.toEqual({
      matched: false,
      chainName: "TRON",
    })

    expect(mockApiPut).toHaveBeenNthCalledWith(1, "/api/order/member/order/ship/ORDER_1", {
      txid: "0xtx",
      address: "T_RECEIVE",
    })
    expect(mockApiPut).toHaveBeenNthCalledWith(2, "/api/order/member/order/ship-normal/ORDER_2", {
      txid: "0xtx2",
      address: "T_RECEIVE_2",
    })
  })

  it("falls back to the default ship endpoint for CoPouch normal orders", async () => {
    mockApiPut
      .mockRejectedValueOnce(new Error("ship-normal rejected"))
      .mockResolvedValueOnce(undefined)

    await submitShipOrder({
      orderSn: "ORDER_MULTI",
      txid: "0xtx3",
      address: "0xsender",
      variant: "normal",
      multisigWalletId: "COPOUCH_1",
    })

    expect(mockApiPut).toHaveBeenNthCalledWith(1, "/api/order/member/order/ship-normal/ORDER_MULTI", {
      txid: "0xtx3",
      address: "0xsender",
    })
    expect(mockApiPut).toHaveBeenNthCalledWith(2, "/api/order/member/order/ship/ORDER_MULTI", {
      txid: "0xtx3",
      address: "0xsender",
    })
  })

  it("loads private share details, public tx status details and send logs", async () => {
    mockApiGet
      .mockResolvedValueOnce({
        data: {
          code: 200,
          message: "ok",
          data: {
            order_sn: "ORDER_1",
            order_type: "SEND",
            receive_address: "T_RECEIVE",
            deposit_address: "T_DEPOSIT",
            recv_amount: "10.5",
            recv_coin_code: "USDT",
            recv_coin_name: "USDT",
            send_amount: "12.5",
            send_coin_code: "BTT",
            send_coin_name: "BTT",
            send_coin_precision: "18",
            send_coin_contract: "0xcoin",
            send_estimate_fee_amount: "0.2",
            pay_url: "",
            tx_browser_url: "https://example.com/tx",
            exchange_type: "2",
            is_payable: false,
            order_receipt_url: "https://example.com/receipt",
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          page: "3",
          total: "2",
          data: [
            {
              order_sn: "ORDER_2",
              order_type: "SEND",
              created_at: 1700000005000,
              send_amount: "9.5",
              send_coin_name: "BTT",
              recv_amount: "8.5",
              recv_coin_name: "USDT",
              status: "3",
              receive_address: "T_RECEIVE",
              payment_address: "T_PAYMENT",
              deposit_address: "T_DEPOSIT",
              transfer_address: null,
              recv_actual_amount: "8.1",
            },
          ],
        },
      })

    const mockTokenPost = jest.fn(async () => ({
      data: {
        access_token: "guest-token",
      },
    }))
    const mockGuestGet = jest.fn(async () => ({
      data: {
        code: 200,
        message: "ok",
        data: {
          order_sn: "ORDER_TX",
          order_type: "SEND",
          recv_address: "T_PUBLIC",
          recv_coin_code: "USDT",
          recv_coin_name: "USDT",
          send_coin_code: "BTT",
          send_coin_name: "BTT",
          share_link: "https://cp.cash/share/public",
          exchange_type: "3",
          tx_browser_url: "https://example.com/public-tx",
        },
      },
    }))

    mockAxiosCreate.mockImplementation((config: { headers?: Record<string, string> }) => {
      if (config.headers?.["Content-Type"] === "application/x-www-form-urlencoded") {
        return {
          post: mockTokenPost,
        }
      }

      return {
        get: mockGuestGet,
      }
    })

    await expect(getSendShareDetail("ORDER_1")).resolves.toEqual(
      expect.objectContaining({
        orderSn: "ORDER_1",
        shareUrl: "https://cp.cash/send?share=ORDER_1",
        isPayable: false,
        orderReceiptUrl: "https://example.com/receipt",
        exchangeType: 2,
        txBrowserUrl: "https://example.com/tx",
      }),
    )
    await expect(getPublicTxStatusDetail("0xtx-public", " https://cp.cash/ ")).resolves.toEqual(
      expect.objectContaining({
        orderSn: "ORDER_TX",
        shareUrl: "https://cp.cash/share/public",
        exchangeType: 3,
        txBrowserUrl: "https://example.com/public-tx",
      }),
    )
    await expect(getSendOrderLogs({ page: 3, perPage: 20 })).resolves.toEqual({
      page: 3,
      total: 2,
      items: [
        {
          orderSn: "ORDER_2",
          orderType: "SEND",
          createdAt: 1700000005000,
          sendAmount: 9.5,
          sendCoinName: "BTT",
          recvAmount: 8.5,
          recvCoinName: "USDT",
          status: 3,
          receiveAddress: "T_RECEIVE",
          paymentAddress: "T_PAYMENT",
          depositAddress: "T_DEPOSIT",
          transferAddress: "",
          recvActualAmount: 8.1,
        },
      ],
    })
  })

  it("updates receive addresses through the authenticated client", async () => {
    mockApiPut.mockResolvedValue(undefined)

    await updateSendReceiveAddress({
      orderSn: "ORDER_1",
      address: "T_UPDATED",
    })

    expect(mockApiPut).toHaveBeenCalledWith("/api/order/member/order/recv-address/ORDER_1", {
      address: "T_UPDATED",
    })
  })

  it("maps sparse detail, network and log payload fallbacks", async () => {
    mockApiGet
      .mockResolvedValueOnce({
        data: {
          code: 200,
          message: "ok",
          data: {
            recv_address: "T_FALLBACK",
            recv_amount: "6.5",
            recv_coin_symbol: "USDT",
            send_amount: "7.5",
            send_coin_symbol: "BTT",
            seller_id: null,
            pay_url: null,
            txid: null,
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          code: 200,
          message: "ok",
          data: {
            supported: true,
            current_network: "ETH",
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          code: 200,
          message: "ok",
          data: {},
        },
      })
      .mockResolvedValueOnce({
        data: {
          page: "0",
          total: "0",
        },
      })
      .mockResolvedValueOnce({
        data: {
          page: "1",
          total: "1",
          data: [
            {
              order_sn: "ORDER_3",
              order_type: "SEND",
              created_at: 1700000006000,
              send_amount: "2.5",
              send_coin_name: null,
              recv_amount: "1.5",
              recv_coin_name: null,
              status: "1",
              receive_address: null,
              payment_address: null,
              deposit_address: null,
              transfer_address: null,
              recv_actual_amount: "1.1",
            },
          ],
        },
      })

    await expect(getOrderDetail("ORDER_FALLBACK")).resolves.toEqual(
      expect.objectContaining({
        orderSn: "",
        orderType: "",
        receiveAddress: "T_FALLBACK",
        recvAmount: 6.5,
        recvCoinName: "USDT",
        sendAmount: 7.5,
        sendCoinName: "BTT",
        sellerId: "",
        payUrl: "",
        txid: "",
      }),
    )
    await expect(checkTransferNetwork({ chainName: "TRON", address: "T_ADDRESS" })).resolves.toEqual({
      matched: true,
      chainName: "ETH",
    })
    await expect(checkTransferNetwork({ chainName: "TRON", address: "T_ADDRESS" })).resolves.toEqual({
      matched: false,
      chainName: "",
    })
    await expect(getSendOrderLogs({})).resolves.toEqual({
      page: 0,
      total: 0,
      items: [],
    })
    await expect(getSendOrderLogs({ page: 1 })).resolves.toEqual({
      page: 1,
      total: 1,
      items: [
        {
          orderSn: "ORDER_3",
          orderType: "SEND",
          createdAt: 1700000006000,
          sendAmount: 2.5,
          sendCoinName: "",
          recvAmount: 1.5,
          recvCoinName: "",
          status: 1,
          receiveAddress: "",
          paymentAddress: "",
          depositAddress: "",
          transferAddress: "",
          recvActualAmount: 1.1,
        },
      ],
    })

    expect(mockApiGet.mock.calls[3]?.[1]).toMatchObject({
      params: {
        page: 1,
        per_page: 10,
        order_type: "SEND",
      },
    })
  })
})
