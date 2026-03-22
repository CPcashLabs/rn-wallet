import type { TransferOrderDetail } from "@/domains/wallet/transfer/services/transferApi"
import type { TransferOrderOption } from "@/shared/exchange/services/exchangeApi"

type BalanceMap = Record<string, number>

export type TransferConfirmPaymentOptionItem = {
  option: TransferOrderOption
  active: boolean
  availableBalance: number
  unavailableReason: "balanceInsufficient" | null
}

export type TransferConfirmPaymentOptionsResult = {
  available: TransferConfirmPaymentOptionItem[]
  unavailable: TransferConfirmPaymentOptionItem[]
  selectedOptionUnavailable: boolean
}

export function resolveTransferConfirmPaymentOptions(input: {
  paymentOptions: TransferOrderOption[]
  detail: Pick<TransferOrderDetail, "sendAmount" | "sendCoinCode"> | null
  balances: BalanceMap
  hasBalanceSnapshot: boolean
}): TransferConfirmPaymentOptionsResult {
  const items = input.paymentOptions.map<TransferConfirmPaymentOptionItem>(option => {
    const availableBalance = input.balances[option.sendCoinCode] ?? 0
    const active = option.sendCoinCode === input.detail?.sendCoinCode
    const unavailableReason =
      input.hasBalanceSnapshot && input.detail && input.detail.sendAmount > availableBalance ? "balanceInsufficient" : null

    return {
      option,
      active,
      availableBalance,
      unavailableReason,
    }
  })

  const available = items.filter(item => item.unavailableReason == null)
  const unavailable = items.filter(item => item.unavailableReason != null)

  return {
    available,
    unavailable,
    selectedOptionUnavailable: unavailable.some(item => item.active),
  }
}
