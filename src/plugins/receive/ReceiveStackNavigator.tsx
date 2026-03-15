import React from "react"

import { createNativeStackNavigator } from "@react-navigation/native-stack"

import { InvalidReceiveAddressScreen } from "@/plugins/receive/screens/InvalidReceiveAddressScreen"
import { RareAddressScreen } from "@/plugins/receive/screens/RareAddressScreen"
import { ReceiveAddressCreateScreen } from "@/plugins/receive/screens/ReceiveAddressCreateScreen"
import { ReceiveAddressDeleteScreen } from "@/plugins/receive/screens/ReceiveAddressDeleteScreen"
import { ReceiveAddressListScreen } from "@/plugins/receive/screens/ReceiveAddressListScreen"
import { ReceiveExpiryScreen } from "@/plugins/receive/screens/ReceiveExpiryScreen"
import { ReceiveFaqDiffScreen, ReceiveFaqScreen } from "@/plugins/receive/screens/ReceiveFaqScreens"
import { ReceiveHomeScreen } from "@/plugins/receive/screens/ReceiveHomeScreen"
import { ReceiveShareScreen } from "@/plugins/receive/screens/ReceiveShareScreen"
import { ReceiveTxlogsScreen } from "@/plugins/receive/screens/ReceiveTxlogsScreen"
import { ReceiveSelectNetworkScreen } from "@/plugins/receive/ReceiveSelectNetworkScreen"

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
