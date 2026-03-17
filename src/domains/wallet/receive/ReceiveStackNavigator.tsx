import React from "react"

import { createNativeStackNavigator } from "@react-navigation/native-stack"

import { InvalidReceiveAddressScreen } from "@/domains/wallet/receive/screens/InvalidReceiveAddressScreen"
import { RareAddressScreen } from "@/domains/wallet/receive/screens/RareAddressScreen"
import { ReceiveAddressCreateScreen } from "@/domains/wallet/receive/screens/ReceiveAddressCreateScreen"
import { ReceiveAddressDeleteScreen } from "@/domains/wallet/receive/screens/ReceiveAddressDeleteScreen"
import { ReceiveAddressListScreen } from "@/domains/wallet/receive/screens/ReceiveAddressListScreen"
import { ReceiveExpiryScreen } from "@/domains/wallet/receive/screens/ReceiveExpiryScreen"
import { ReceiveFaqDiffScreen, ReceiveFaqScreen } from "@/domains/wallet/receive/screens/ReceiveFaqScreens"
import { ReceiveHomeScreen } from "@/domains/wallet/receive/screens/ReceiveHomeScreen"
import { ReceiveShareScreen } from "@/domains/wallet/receive/screens/ReceiveShareScreen"
import { ReceiveTxlogsScreen } from "@/domains/wallet/receive/screens/ReceiveTxlogsScreen"
import { ReceiveSelectNetworkScreen } from "@/domains/wallet/receive/ReceiveSelectNetworkScreen"

import type { ReceiveStackParamList } from "@/app/navigation/types"

const Stack = createNativeStackNavigator<ReceiveStackParamList>()

export function ReceiveStackNavigator(props: {
  initialRouteName?: keyof ReceiveStackParamList
  selectNetworkParams?: ReceiveStackParamList["ReceiveSelectNetworkScreen"]
  receiveHomeParams?: ReceiveStackParamList["ReceiveHomeScreen"]
}) {
  return (
    <Stack.Navigator initialRouteName={props.initialRouteName ?? "ReceiveHomeScreen"} screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="ReceiveSelectNetworkScreen"
        component={ReceiveSelectNetworkScreen}
        initialParams={props.selectNetworkParams}
      />
      <Stack.Screen name="ReceiveHomeScreen" component={ReceiveHomeScreen} initialParams={props.receiveHomeParams} />
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
