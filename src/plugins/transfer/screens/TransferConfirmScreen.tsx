import React, { useCallback } from "react"

import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { TransferConfirmScreenView, type TransferConfirmSuccess, type TransferConfirmVariant } from "@/plugins/transfer/components/TransferConfirmPanel"

import type { TransferStackParamList } from "@/app/navigation/types"

type Props = NativeStackScreenProps<
  TransferStackParamList,
  "TransferConfirmScreen" | "TransferConfirmNormalScreen"
>

export function TransferConfirmScreen({ navigation, route }: Props) {
  const variant: TransferConfirmVariant = route.name === "TransferConfirmNormalScreen" ? "normal" : "default"

  const handleCompleted = useCallback(
    ({ orderSn, walletId }: TransferConfirmSuccess) => {
      navigation.replace("TxPayStatusScreen", {
        orderSn,
        pay: true,
        walletId,
      })
    },
    [navigation],
  )

  return (
    <TransferConfirmScreenView
      onClose={navigation.goBack}
      onCompleted={handleCompleted}
      orderSn={route.params.orderSn}
      variant={variant}
    />
  )
}
