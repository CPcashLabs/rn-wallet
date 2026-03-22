const mockPost = jest.fn()

jest.mock("@/shared/api/client", () => ({
  apiClient: {
    post: (...args: unknown[]) => mockPost(...args),
  },
}))

import { createBridgeTransferOrder, createNormalTransferOrder } from "@/shared/exchange/services/orderCreationApi"

describe("orderCreationApi", () => {
  beforeEach(() => {
    mockPost.mockReset()
    mockPost.mockResolvedValue({
      data: {
        code: 200,
        message: "ok",
        data: {
          order_sn: "ORDER_1",
          order_type: "PAYMENT_NORMAL",
          status: 1,
        },
      },
    })
  })

  it("adds the MULTISIG wallet type for CoPouch normal transfer orders", async () => {
    await createNormalTransferOrder({
      coinCode: "USDT_b",
      amount: 12,
      recvAddress: "0xreceiver",
      note: "memo",
      multisigWalletId: "COPOUCH_1",
    })

    expect(mockPost).toHaveBeenCalledWith("/api/order/member/receiving/create-payment-normal", {
      coin_code: "USDT_b",
      amount: 12,
      recv_address: "0xreceiver",
      note: "memo",
      multisig_wallet_id: "COPOUCH_1",
      pay_wallet_type: "MULTISIG",
    })
  })

  it("keeps wallet type unset for regular normal transfer orders", async () => {
    await createNormalTransferOrder({
      coinCode: "USDT_b",
      amount: 12,
      recvAddress: "0xreceiver",
      note: "",
    })

    expect(mockPost).toHaveBeenCalledWith("/api/order/member/receiving/create-payment-normal", {
      coin_code: "USDT_b",
      amount: 12,
      recv_address: "0xreceiver",
      note: "",
      multisig_wallet_id: undefined,
      pay_wallet_type: undefined,
    })
  })

  it("adds the MULTISIG wallet type for CoPouch bridge transfer orders", async () => {
    await createBridgeTransferOrder({
      sellerId: 7,
      recvAddress: "0xreceiver",
      recvCoinCode: "USDT_t",
      sendCoinCode: "BTT",
      sendAmount: 12.5,
      note: "memo",
      multisigWalletId: "COPOUCH_1",
    })

    expect(mockPost).toHaveBeenCalledWith("/api/order/member/receiving/create-payment", {
      seller_id: 7,
      recv_address: "0xreceiver",
      recv_coin_code: "USDT_t",
      send_coin_code: "BTT",
      send_amount: 12.5,
      note: "memo",
      multisig_wallet_id: "COPOUCH_1",
      pay_wallet_type: "MULTISIG",
    })
  })

  it("keeps wallet type unset for regular bridge transfer orders", async () => {
    await createBridgeTransferOrder({
      sellerId: 7,
      recvAddress: "0xreceiver",
      recvCoinCode: "USDT_t",
      sendCoinCode: "BTT",
      sendAmount: 12.5,
      note: "",
    })

    expect(mockPost).toHaveBeenCalledWith("/api/order/member/receiving/create-payment", {
      seller_id: 7,
      recv_address: "0xreceiver",
      recv_coin_code: "USDT_t",
      send_coin_code: "BTT",
      send_amount: 12.5,
      note: "",
      multisig_wallet_id: undefined,
      pay_wallet_type: undefined,
    })
  })
})
