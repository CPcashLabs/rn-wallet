import type { TransferOrderOption } from "@/shared/exchange/services/exchangeApi"
import {
  applyTransferQuote,
  buildTransferQuoteKey,
  resolveTransferOption,
} from "@/domains/wallet/transfer/screens/transferQuote"

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

describe("transferQuote", () => {
  it("builds distinct quote keys for different channels and amounts", () => {
    expect(
      buildTransferQuoteKey({
        channelKey: "bridge:tron",
        sendCoinCode: "USDT",
        recvCoinCode: "USDT",
        amount: 10,
      }),
    ).not.toBe(
      buildTransferQuoteKey({
        channelKey: "bridge:tron",
        sendCoinCode: "USDT",
        recvCoinCode: "USDT",
        amount: 20,
      }),
    )

    expect(
      buildTransferQuoteKey({
        channelKey: "bridge:tron",
        sendCoinCode: "USDT",
        recvCoinCode: "USDT",
        amount: 10,
      }),
    ).not.toBe(
      buildTransferQuoteKey({
        channelKey: "bridge:eth",
        sendCoinCode: "USDT",
        recvCoinCode: "USDT",
        amount: 10,
      }),
    )
  })

  it("applies quote fields onto the base option", () => {
    const next = applyTransferQuote(createOption(), {
      feeAmount: 0.2,
      feeValue: 0.25,
      recvAmount: 9.75,
      recvCoinCode: "USDT",
      recvCoinName: "USDT",
      sendAmount: 10.1,
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

  it("keeps the existing seller id when the quote omits it", () => {
    const next = applyTransferQuote(
      createOption({
        sellerId: "seller-current",
      }),
      {
        feeAmount: 0.2,
        feeValue: 0.25,
        recvAmount: 9.75,
        recvCoinCode: "USDT",
        recvCoinName: "USDT",
        sendAmount: 10.1,
        sendCoinCode: "USDT",
        sendCoinName: "USDT",
        sendMinAmount: 5,
        sendMaxAmount: 100,
        sellerId: null,
      },
    )

    expect(next.sellerId).toBe("seller-current")
  })

  it("falls back to the selected option when the quoted option is stale", () => {
    const selectedOption = createOption({
      sellerId: "seller-current",
    })

    expect(
      resolveTransferOption(
        selectedOption,
        {
          requestKey: "bridge:tron:USDT:USDT:10",
          sendAmount: 10.5,
          option: createOption({
            sellerId: "seller-stale",
            feeAmount: 0.3,
          }),
        },
        "bridge:tron:USDT:USDT:11",
      ),
    ).toBe(selectedOption)
  })

  it("returns null when no option is selected and uses the fresh quoted option when keys match", () => {
    expect(resolveTransferOption(null, null, "request-key")).toBeNull()

    const quotedOption = createOption({
      sellerId: "seller-quoted",
      feeAmount: 0.5,
    })

    expect(
      resolveTransferOption(
        createOption({
          sellerId: "seller-current",
        }),
        {
          requestKey: "bridge:tron:USDT:USDT:10",
          sendAmount: 10.5,
          option: quotedOption,
        },
        "bridge:tron:USDT:USDT:10",
      ),
    ).toBe(quotedOption)
  })
})
