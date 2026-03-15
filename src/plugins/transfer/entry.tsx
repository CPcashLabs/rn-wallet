import React from "react"

import { TransferStackNavigator } from "@/plugins/transfer/TransferStackNavigator"
import type { PluginEntryProps } from "@/shared/plugins/types"

export default function TransferPluginEntry(props: PluginEntryProps) {
  const scannedAddress = typeof props.context.route.params?.scannedAddress === "string" ? props.context.route.params.scannedAddress : undefined
  const scannedChainType =
    props.context.route.params?.scannedChainType === "EVM" || props.context.route.params?.scannedChainType === "TRON"
      ? props.context.route.params.scannedChainType
      : undefined
  const autoAdvanceToOrder =
    typeof props.context.route.params?.autoAdvanceToOrder === "boolean" ? props.context.route.params.autoAdvanceToOrder : true
  const autoSelectFirstMatching =
    typeof props.context.route.params?.autoSelectFirstMatching === "boolean"
      ? props.context.route.params.autoSelectFirstMatching
      : scannedChainType === "TRON"

  if (scannedAddress && scannedChainType) {
    return (
      <TransferStackNavigator
        initialRouteName="SelectTokenScreen"
        selectTokenParams={{
          intent: "transfer",
          preferredChainType: scannedChainType,
          prefilledRecipientAddress: scannedAddress,
          autoAdvanceToOrder,
          autoSelectFirstMatching,
        }}
      />
    )
  }

  return <TransferStackNavigator />
}
