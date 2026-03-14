import React from "react"

import { ReceiveStackNavigator } from "@/app/navigation/ReceiveStackNavigator"
import type { PluginEntryProps } from "@/shared/plugins/types"

export default function ReceivePluginEntry(props: PluginEntryProps) {
  void props.context
  return <ReceiveStackNavigator />
}
