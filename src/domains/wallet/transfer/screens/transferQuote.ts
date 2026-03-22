import type { TransferOrderOption, TransferQuote } from "@/shared/exchange/services/exchangeApi"

export type TransferQuotedOption = {
  option: TransferOrderOption
  requestKey: string
  sendAmount: number
}

export function buildTransferQuoteKey(input: {
  amount: number
  channelKey: string
  recvCoinCode: string
  sendCoinCode: string
}) {
  return `${input.channelKey}:${input.sendCoinCode}:${input.recvCoinCode}:${input.amount}`
}

export function applyTransferQuote(baseOption: TransferOrderOption, quote: TransferQuote): TransferOrderOption {
  return {
    ...baseOption,
    sellerId: String(quote.sellerId ?? baseOption.sellerId),
    feeAmount: quote.feeValue,
    recvEstimateAmount: quote.recvAmount,
    sendMinAmount: quote.sendMinAmount,
  }
}

export function resolveTransferOption(
  selectedOption: TransferOrderOption | null,
  quotedOption: TransferQuotedOption | null,
  requestKey: string | null,
) {
  if (selectedOption == null) {
    return null
  }

  if (!requestKey || quotedOption?.requestKey !== requestKey) {
    return selectedOption
  }

  return quotedOption.option
}
