import React from "react"

import { ReceivePluginNavigator } from "@/plugins/receive/ReceivePluginNavigator"
import type { PluginEntryProps } from "@/shared/plugins/types"

export default function ReceivePluginEntry(props: PluginEntryProps) {
  const payChain = typeof props.context.route.params?.payChain === "string" ? props.context.route.params.payChain : undefined
  const chainColor = typeof props.context.route.params?.chainColor === "string" ? props.context.route.params.chainColor : undefined
  const copouch = typeof props.context.route.params?.copouch === "string" ? props.context.route.params.copouch : undefined
  const cowallet = typeof props.context.route.params?.cowallet === "string" ? props.context.route.params.cowallet : undefined
  const multisigWalletId =
    typeof props.context.route.params?.multisigWalletId === "string" ? props.context.route.params.multisigWalletId : undefined
  const receiveMode =
    props.context.route.params?.receiveMode === "normal" || props.context.route.params?.receiveMode === "trace"
      ? props.context.route.params.receiveMode
      : undefined

  if (payChain) {
    return (
      <ReceivePluginNavigator
        initialRouteName="ReceiveHomeScreen"
        receiveHomeParams={{
          payChain,
          chainColor,
          copouch,
          cowallet,
          multisigWalletId,
          receiveMode,
        }}
      />
    )
  }

  return (
    <ReceivePluginNavigator
      initialParams={{
        copouch,
        cowallet,
        multisigWalletId,
      }}
    />
  )
}
