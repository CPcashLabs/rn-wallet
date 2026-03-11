import React from "react"

import { createNativeStackNavigator } from "@react-navigation/native-stack"

import { SelectTokenScreen } from "@/features/transfer/screens/SelectTokenScreen"
import { TransferAddressScreen } from "@/features/transfer/screens/TransferAddressScreen"

import type { TransferStackParamList } from "@/app/navigation/types"

const Stack = createNativeStackNavigator<TransferStackParamList>()

export function TransferStackNavigator() {
  return (
    <Stack.Navigator initialRouteName="SelectTokenScreen" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SelectTokenScreen" component={SelectTokenScreen} />
      <Stack.Screen name="TransferAddressScreen" component={TransferAddressScreen} />
    </Stack.Navigator>
  )
}
