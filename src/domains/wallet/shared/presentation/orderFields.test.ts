import {
  mapWalletReceiveShareFields,
  mapWalletTransferShareFields,
  mapWalletTransferStatusFields,
} from "@/domains/wallet/shared/presentation/orderFields"

const t = (key: string) => key

describe("wallet order field mapping", () => {
  it("builds transfer share display fields with fallbacks", () => {
    expect(
      mapWalletTransferShareFields(
        t,
        {
          orderSn: "",
          sendAmount: 12.5,
          sendCoinName: "USDT",
          shareUrl: "",
          paymentAddress: "T_PAY",
          status: 2,
          expiredAt: null,
        },
        "ORDER_1",
      ),
    ).toMatchObject({
      orderSn: { label: "transfer.send.orderSn", value: "ORDER_1" },
      shareAmount: { label: "transfer.send.shareAmount", value: "12.5 USDT" },
      shareUrl: { label: "transfer.send.shareUrl", value: "-" },
      paymentAddress: { label: "transfer.send.paymentAddress", value: "T_PAY" },
      status: { label: "transfer.send.status", value: "2" },
      expiredAt: { label: "transfer.send.expiredAt", value: "-" },
    })
  })

  it("builds receive share display fields", () => {
    expect(
      mapWalletReceiveShareFields(
        t,
        {
          address: "T_RECEIVE",
          shareUrl: "https://cp.cash/receive",
        },
        "TRACE_1",
      ),
    ).toEqual({
      orderSn: { label: "Order SN", value: "TRACE_1" },
      address: { label: "receive.share.address", value: "T_RECEIVE" },
      shareUrl: { label: "receive.share.link", value: "https://cp.cash/receive" },
    })
  })

  it("builds transfer status display fields", () => {
    expect(
      mapWalletTransferStatusFields(t, {
        recvAmount: 10,
        recvActualAmount: 9,
        recvCoinName: "USDT",
        recvChainName: "TRON",
        multisigWalletId: "wallet-1",
        orderType: "SEND",
      }),
    ).toMatchObject({
      receiveAmount: { label: "transfer.status.receiveAmount", value: "9 USDT" },
      paymentMethod: { label: "transfer.status.paymentMethod", value: "transfer.confirm.copouch" },
      arrival: { label: "transfer.status.arrival", value: "TRON" },
      txid: { label: "transfer.status.txid", value: "-" },
      orderType: { label: "transfer.status.orderType", value: "SEND" },
    })
  })
})
