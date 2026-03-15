type ReceiveAutoCreateKeyInput = {
  multisigWalletId?: string
  receiveAddress: string
  recvCoinCode: string
  sellerId: string | number
  sendCoinCode: string
}

export function buildReceiveAutoCreateKey(input: ReceiveAutoCreateKeyInput) {
  return [
    input.receiveAddress.trim().toLowerCase(),
    input.multisigWalletId ?? "",
    String(input.sellerId),
    input.sendCoinCode,
    input.recvCoinCode,
  ].join(":")
}

export function shouldAttemptReceiveAutoCreate(input: {
  attemptedKey: string | null
  currentKey: string | null
  hasPersonalOrder: boolean
}) {
  if (!input.currentKey || input.hasPersonalOrder) {
    return false
  }

  return input.attemptedKey !== input.currentKey
}
