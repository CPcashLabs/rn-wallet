import React from "react"

import { createNativeStackNavigator } from "@react-navigation/native-stack"

import { BttClaimScreen } from "@/plugins/transfer/screens/BttClaimScreen"
import { BuyCryptoScreen } from "@/plugins/transfer/screens/BuyCryptoScreen"
import { SendCodeCoverScreen } from "@/plugins/transfer/screens/SendCodeCoverScreen"
import { SendCodeDetailScreen } from "@/plugins/transfer/screens/SendCodeDetailScreen"
import { SendCodeLogsScreen } from "@/plugins/transfer/screens/SendCodeLogsScreen"
import { SendCodeScreen } from "@/plugins/transfer/screens/SendCodeScreen"
import { SendEntryScreen } from "@/plugins/transfer/screens/SendEntryScreen"
import { SendPaymentInfoScreen } from "@/plugins/transfer/screens/SendPaymentInfoScreen"
import { SendTokenScreen } from "@/plugins/transfer/screens/SendTokenScreen"
import { SelectTokenScreen } from "@/plugins/transfer/screens/SelectTokenScreen"
import { TransferAddressScreen } from "@/plugins/transfer/screens/TransferAddressScreen"
import { TransferConfirmScreen } from "@/plugins/transfer/screens/TransferConfirmScreen"
import { TransferOrderScreen } from "@/plugins/transfer/screens/TransferOrderScreen"
import { TxPayStatusScreen } from "@/plugins/transfer/screens/TxPayStatusScreen"

import type { TransferStackParamList } from "@/app/navigation/types"

const Stack = createNativeStackNavigator<TransferStackParamList>()

export function TransferStackNavigator(props: {
  initialRouteName?: keyof TransferStackParamList
  selectTokenParams?: TransferStackParamList["SelectTokenScreen"]
}) {
  return (
    <Stack.Navigator initialRouteName={props.initialRouteName ?? "SelectTokenScreen"} screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SelectTokenScreen" component={SelectTokenScreen} initialParams={props.selectTokenParams} />
      <Stack.Screen name="TransferAddressScreen" component={TransferAddressScreen} />
      <Stack.Screen name="TransferOrderScreen" component={TransferOrderScreen} />
      <Stack.Screen name="TransferOrderNormalScreen" component={TransferOrderScreen} />
      <Stack.Screen name="TransferOrderCopouchScreen" component={TransferOrderScreen} />
      <Stack.Screen name="TransferOrderCowalletScreen" component={TransferOrderScreen as React.ComponentType<any>} />
      <Stack.Screen name="TransferConfirmScreen" component={TransferConfirmScreen} />
      <Stack.Screen name="TransferConfirmNormalScreen" component={TransferConfirmScreen} />
      <Stack.Screen name="TxPayStatusScreen" component={TxPayStatusScreen} />
      <Stack.Screen name="SendEntryScreen" component={SendEntryScreen} />
      <Stack.Screen name="SendPaymentInfoScreen" component={SendPaymentInfoScreen} />
      <Stack.Screen name="SendTokenScreen" component={SendTokenScreen} />
      <Stack.Screen name="SendCodeScreen" component={SendCodeScreen} />
      <Stack.Screen name="SendCodeDetailScreen" component={SendCodeDetailScreen} />
      <Stack.Screen name="SendCodeLogsScreen" component={SendCodeLogsScreen} />
      <Stack.Screen name="SendCodeCoverScreen" component={SendCodeCoverScreen} />
      <Stack.Screen name="BuyCryptoScreen" component={BuyCryptoScreen} />
      <Stack.Screen name="BttClaimScreen" component={BttClaimScreen} />
    </Stack.Navigator>
  )
}
