import React from "react"

import { createNativeStackNavigator } from "@react-navigation/native-stack"

import { BttClaimScreen } from "@/features/receive/screens/BttClaimScreen"
import { BuyCryptoScreen } from "@/features/receive/screens/BuyCryptoScreen"
import { SendCodeCoverScreen } from "@/features/transfer/screens/SendCodeCoverScreen"
import { SendCodeDetailScreen } from "@/features/transfer/screens/SendCodeDetailScreen"
import { SendCodeLogsScreen } from "@/features/transfer/screens/SendCodeLogsScreen"
import { SendCodeScreen } from "@/features/transfer/screens/SendCodeScreen"
import { SendEntryScreen } from "@/features/transfer/screens/SendEntryScreen"
import { SendPaymentInfoScreen } from "@/features/transfer/screens/SendPaymentInfoScreen"
import { SendTokenScreen } from "@/features/transfer/screens/SendTokenScreen"
import { SelectTokenScreen } from "@/features/transfer/screens/SelectTokenScreen"
import { TransferAddressScreen } from "@/features/transfer/screens/TransferAddressScreen"
import { TransferConfirmScreen } from "@/features/transfer/screens/TransferConfirmScreen"
import { TransferOrderScreen } from "@/features/transfer/screens/TransferOrderScreen"
import { TxPayStatusScreen } from "@/features/transfer/screens/TxPayStatusScreen"

import type { TransferStackParamList } from "@/app/navigation/types"

const Stack = createNativeStackNavigator<TransferStackParamList>()

export function TransferStackNavigator() {
  return (
    <Stack.Navigator initialRouteName="SelectTokenScreen" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SelectTokenScreen" component={SelectTokenScreen} />
      <Stack.Screen name="TransferAddressScreen" component={TransferAddressScreen} />
      <Stack.Screen name="TransferOrderScreen" component={TransferOrderScreen} />
      <Stack.Screen name="TransferOrderNormalScreen" component={TransferOrderScreen} />
      <Stack.Screen name="TransferOrderCowalletScreen" component={TransferOrderScreen} />
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
