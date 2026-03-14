import React from "react"

import { CopouchStackNavigator } from "@/app/navigation/CopouchStackNavigator"
import type { PluginEntryProps } from "@/shared/plugins/types"

export default function CopouchPluginEntry(props: PluginEntryProps) {
  void props.context
  return <CopouchStackNavigator />
}
