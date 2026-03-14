import React from "react"

import { TransferStackNavigator } from "@/plugins/transfer/TransferStackNavigator"
import type { PluginEntryProps } from "@/shared/plugins/types"

export default function TransferPluginEntry(props: PluginEntryProps) {
  void props.context
  return <TransferStackNavigator />
}
