const mockPost = jest.fn()

jest.mock("@/shared/api/client", () => ({
  apiClient: {
    post: (...args: unknown[]) => mockPost(...args),
  },
}))

import { createNormalTransferOrder } from "@/shared/exchange/services/orderCreationApi"

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
})
