import React from "react"

import { createNativeStackNavigator } from "@react-navigation/native-stack"

import { InvalidReceiveAddressScreen } from "@/features/receive/screens/InvalidReceiveAddressScreen"
import { RareAddressScreen } from "@/features/receive/screens/RareAddressScreen"
import { ReceiveAddressCreateScreen } from "@/features/receive/screens/ReceiveAddressCreateScreen"
import { ReceiveAddressDeleteScreen } from "@/features/receive/screens/ReceiveAddressDeleteScreen"
import { ReceiveAddressListScreen } from "@/features/receive/screens/ReceiveAddressListScreen"
import { ReceiveExpiryScreen } from "@/features/receive/screens/ReceiveExpiryScreen"
import { ReceiveFaqDiffScreen, ReceiveFaqScreen } from "@/features/receive/screens/ReceiveFaqScreens"
import { ReceiveHomeScreen } from "@/features/receive/screens/ReceiveHomeScreen"
import { ReceiveShareScreen } from "@/features/receive/screens/ReceiveShareScreen"
import { ReceiveTxlogsScreen } from "@/features/receive/screens/ReceiveTxlogsScreen"

import type { ReceiveStackParamList } from "@/app/navigation/types"

const Stack = createNativeStackNavigator<ReceiveStackParamList>()

export function ReceiveStackNavigator() {
  return (
    <Stack.Navigator initialRouteName="ReceiveHomeScreen" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ReceiveHomeScreen" component={ReceiveHomeScreen} />
      <Stack.Screen name="ReceiveAddressListScreen" component={ReceiveAddressListScreen} />
      <Stack.Screen name="ReceiveAddressCreateScreen" component={ReceiveAddressCreateScreen} />
      <Stack.Screen name="ReceiveAddressDeleteScreen" component={ReceiveAddressDeleteScreen} />
      <Stack.Screen name="InvalidReceiveAddressScreen" component={InvalidReceiveAddressScreen} />
      <Stack.Screen name="ReceiveExpiryScreen" component={ReceiveExpiryScreen} />
      <Stack.Screen name="ReceiveTxlogsScreen" component={ReceiveTxlogsScreen} />
      <Stack.Screen name="RareAddressScreen" component={RareAddressScreen} />
      <Stack.Screen name="ReceiveShareScreen" component={ReceiveShareScreen} />
      <Stack.Screen name="ReceiveFaqScreen" component={ReceiveFaqScreen} />
      <Stack.Screen name="ReceiveFaqDiffScreen" component={ReceiveFaqDiffScreen} />
    </Stack.Navigator>
  )
}
