import React from "react"

import { TransferStackNavigator } from "@/app/navigation/TransferStackNavigator"
import type { PluginEntryProps } from "@/shared/plugins/types"

export default function TransferPluginEntry(props: PluginEntryProps) {
  void props.context
  return <TransferStackNavigator />
}
