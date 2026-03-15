import type { TransferOrderOption } from "@/shared/exchange/services/exchangeApi"
import {
  applyCopouchTransferQuote,
  buildCopouchTransferQuoteKey,
  resolveCopouchTransferOption,
} from "@/plugins/copouch/screens/copouchTransferQuote"

function createOption(overrides: Partial<TransferOrderOption> = {}): TransferOrderOption {
  return {
    sellerId: "seller-1",
    sendCoinCode: "USDT",
    sendCoinSymbol: "USDT",
    recvCoinCode: "USDT",
    recvCoinSymbol: "USDT",
    feeAmount: 0,
    recvEstimateAmount: 0,
    sendMinAmount: 0,
    sendCoinContract: "0xcontract",
    ...overrides,
  }
}

describe("copouchTransferQuote", () => {
  it("builds distinct quote keys for different channels and amounts", () => {
    expect(
      buildCopouchTransferQuoteKey({
        channelKey: "bridge:tron",
        sendCoinCode: "USDT",
        recvCoinCode: "USDT",
        amount: 10,
      }),
    ).not.toBe(
      buildCopouchTransferQuoteKey({
        channelKey: "bridge:tron",
        sendCoinCode: "USDT",
        recvCoinCode: "USDT",
        amount: 20,
      }),
    )

    expect(
      buildCopouchTransferQuoteKey({
        channelKey: "bridge:tron",
        sendCoinCode: "USDT",
        recvCoinCode: "USDT",
        amount: 10,
      }),
    ).not.toBe(
      buildCopouchTransferQuoteKey({
        channelKey: "normal:tron",
        sendCoinCode: "USDT",
        recvCoinCode: "USDT",
        amount: 10,
      }),
    )
  })

  it("applies quote fields onto the base option", () => {
    const next = applyCopouchTransferQuote(createOption(), {
      feeAmount: 0.2,
      feeValue: 0.25,
      recvAmount: 9.75,
      recvCoinCode: "USDT",
      recvCoinName: "USDT",
      sendAmount: 10,
      sendCoinCode: "USDT",
      sendCoinName: "USDT",
      sendMinAmount: 5,
      sendMaxAmount: 100,
      sellerId: 42,
    })

    expect(next.sellerId).toBe("42")
    expect(next.feeAmount).toBe(0.25)
    expect(next.recvEstimateAmount).toBe(9.75)
    expect(next.sendMinAmount).toBe(5)
  })

  it("falls back to the selected option when the quoted option is stale", () => {
    const selectedOption = createOption({
      sellerId: "seller-current",
    })

    expect(
      resolveCopouchTransferOption(
        selectedOption,
        {
          requestKey: "bridge:tron:USDT:USDT:10",
          option: createOption({
            sellerId: "seller-stale",
            feeAmount: 0.3,
          }),
        },
        "bridge:tron:USDT:USDT:11",
      ),
    ).toBe(selectedOption)
  })
})
