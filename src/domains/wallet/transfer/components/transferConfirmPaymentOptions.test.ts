import { resolveTransferConfirmPaymentOptions } from "@/domains/wallet/transfer/components/transferConfirmPaymentOptions"
import type { TransferOrderOption } from "@/shared/exchange/services/exchangeApi"

function createOption(sendCoinCode: string): TransferOrderOption {
  return {
    sellerId: "",
    sendCoinCode,
    sendCoinSymbol: sendCoinCode,
    sendChainName: "btt_test",
    sendChainFullName: "BitTorrent Test Network",
    sendChainLogo: "",
    sendChainColor: "",
    recvCoinCode: "USDT",
    recvCoinSymbol: "USDT",
    feeAmount: 0,
    recvEstimateAmount: 0,
    sendMinAmount: 0,
    sendCoinContract: "",
  } as TransferOrderOption
}

describe("transferConfirmPaymentOptions", () => {
  it("groups balance-insufficient options into the unavailable section", () => {
    const result = resolveTransferConfirmPaymentOptions({
      paymentOptions: [createOption("USDT"), createOption("USDT_E"), createOption("USDC")],
      detail: {
        sendAmount: 21,
        sendCoinCode: "USDT_E",
      },
      balances: {
        USDT: 100,
        USDT_E: 14.98,
        USDC: 0,
      },
      hasBalanceSnapshot: true,
    })

    expect(result.available.map(item => item.option.sendCoinCode)).toEqual(["USDT"])
    expect(result.unavailable.map(item => item.option.sendCoinCode)).toEqual(["USDT_E", "USDC"])
    expect(result.selectedOptionUnavailable).toBe(true)
    expect(result.unavailable[0]?.unavailableReason).toBe("balanceInsufficient")
  })

  it("keeps options available until the balance snapshot is ready", () => {
    const result = resolveTransferConfirmPaymentOptions({
      paymentOptions: [createOption("USDT")],
      detail: {
        sendAmount: 21,
        sendCoinCode: "USDT",
      },
      balances: {},
      hasBalanceSnapshot: false,
    })

    expect(result.available.map(item => item.option.sendCoinCode)).toEqual(["USDT"])
    expect(result.unavailable).toEqual([])
    expect(result.selectedOptionUnavailable).toBe(false)
  })

  it("does not block submit when the currently selected option remains available", () => {
    const result = resolveTransferConfirmPaymentOptions({
      paymentOptions: [createOption("USDT"), createOption("USDT_E")],
      detail: {
        sendAmount: 21,
        sendCoinCode: "USDT",
      },
      balances: {
        USDT: 50,
        USDT_E: 10,
      },
      hasBalanceSnapshot: true,
    })

    expect(result.available.map(item => item.option.sendCoinCode)).toEqual(["USDT"])
    expect(result.selectedOptionUnavailable).toBe(false)
  })
})
