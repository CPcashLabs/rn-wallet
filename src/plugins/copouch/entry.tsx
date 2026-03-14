import React from "react"

import { CopouchStackNavigator } from "@/plugins/copouch/CopouchStackNavigator"
import type { PluginEntryProps } from "@/shared/plugins/types"

export default function CopouchPluginEntry(props: PluginEntryProps) {
  void props.context
  return <CopouchStackNavigator />
}
