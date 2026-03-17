import { navigateRoot } from "@/app/navigation/navigationRef"

import type { ReceiveStackParamList, TransferStackParamList } from "@/app/navigation/types"

export function openTransferModule(params?: TransferStackParamList["SelectTokenScreen"]) {
  return navigateRoot("TransferStack", {
    screen: "SelectTokenScreen",
    params,
  })
}

export function openScannedTransferModule(input: {
  scannedAddress: string
  scannedChainType: "EVM" | "TRON"
  autoAdvanceToOrder?: boolean
  autoSelectFirstMatching?: boolean
}) {
  return openTransferModule({
    intent: "transfer",
    preferredChainType: input.scannedChainType,
    prefilledRecipientAddress: input.scannedAddress,
    autoAdvanceToOrder: input.autoAdvanceToOrder ?? true,
    autoSelectFirstMatching: input.autoSelectFirstMatching ?? input.scannedChainType === "TRON",
  })
}

export function openReceiveModule(params?: {
  selectNetworkParams?: ReceiveStackParamList["ReceiveSelectNetworkScreen"]
  receiveHomeParams?: ReceiveStackParamList["ReceiveHomeScreen"]
}) {
  if (params?.receiveHomeParams?.payChain) {
    return navigateRoot("ReceiveStack", {
      screen: "ReceiveHomeScreen",
      params: params.receiveHomeParams,
    })
  }

  return navigateRoot("ReceiveStack", {
    screen: "ReceiveSelectNetworkScreen",
    params: params?.selectNetworkParams,
  })
}
