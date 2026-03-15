const mockApiGet = jest.fn()

jest.mock("@/shared/api/client", () => ({
  apiClient: {
    get: (...args: unknown[]) => mockApiGet(...args),
  },
}))

import {
  requestCoinAllowList,
  requestCpCashAllowList,
  requestCpCashShow,
  requestRebateExchangePairs,
} from "@/shared/exchange/services/exchangeClient"

describe("exchangeClient", () => {
  beforeEach(() => {
    mockApiGet.mockReset()
  })

  it("loads rebate exchange pairs", async () => {
    mockApiGet.mockResolvedValue({
      data: {
        code: 200,
        message: "ok",
        data: [{ recv_coin_code: "USDT", send_coin_code: "BTT" }],
      },
    })

    await expect(requestRebateExchangePairs()).resolves.toEqual([{ recv_coin_code: "USDT", send_coin_code: "BTT" }])
    expect(mockApiGet).toHaveBeenCalledWith("/api/fund/member/order-rebate-claim/list-exchange-pair")
  })

  it("fills the default send coin symbol for cp cash allow-list calls", async () => {
    mockApiGet.mockResolvedValue({
      data: {
        code: 200,
        message: "ok",
        data: [{ chain_name: "BTT" }],
      },
    })

    await expect(
      requestCpCashAllowList({
        group_by_type: 1,
        send_chain_name: "BTT",
      }),
    ).resolves.toEqual([{ chain_name: "BTT" }])

    expect(mockApiGet).toHaveBeenCalledWith("/api/seller/member/exchange/cp-cash-allow-list", {
      params: {
        group_by_type: 1,
        send_chain_name: "BTT",
        send_coin_symbol: "USDT",
      },
    })
  })

  it("preserves explicit params for allow-list, coin-list and quote endpoints", async () => {
    mockApiGet
      .mockResolvedValueOnce({
        data: {
          code: 200,
          message: "ok",
          data: [{ coin_code: "USDT" }],
        },
      })
      .mockResolvedValueOnce({
        data: {
          code: 200,
          message: "ok",
          data: [{ code: "USDT" }],
        },
      })
      .mockResolvedValueOnce({
        data: {
          code: 200,
          message: "ok",
          data: { recv_amount: 12.5 },
        },
      })

    await expect(
      requestCpCashAllowList({
        group_by_type: 0,
        send_coin_symbol: "BUSD",
        recv_chain_name: "TRON",
      }),
    ).resolves.toEqual([{ coin_code: "USDT" }])
    await expect(
      requestCoinAllowList({
        chain_name: "BTT",
        is_send_allowed: true,
        is_recv_allowed: false,
      }),
    ).resolves.toEqual([{ code: "USDT" }])
    await expect(
      requestCpCashShow({
        send_coin_code: "BTT",
        recv_coin_code: "USDT",
        recv_amount: 10,
        rate_type: 0,
      }),
    ).resolves.toEqual({ recv_amount: 12.5 })

    expect(mockApiGet).toHaveBeenNthCalledWith(1, "/api/seller/member/exchange/cp-cash-allow-list", {
      params: {
        group_by_type: 0,
        send_coin_symbol: "BUSD",
        recv_chain_name: "TRON",
      },
    })
    expect(mockApiGet).toHaveBeenNthCalledWith(2, "/api/system/member/coinallow/allow-list", {
      params: {
        chain_name: "BTT",
        is_send_allowed: true,
        is_recv_allowed: false,
      },
    })
    expect(mockApiGet).toHaveBeenNthCalledWith(3, "/api/seller/member/exchange/cp-cash-show", {
      params: {
        send_coin_code: "BTT",
        recv_coin_code: "USDT",
        recv_amount: 10,
        rate_type: 0,
      },
    })
  })
})
