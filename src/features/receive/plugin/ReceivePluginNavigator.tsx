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
import { ReceiveSelectNetworkScreen } from "@/features/receive/plugin/ReceiveSelectNetworkScreen"

import type { ReceiveStackParamList } from "@/app/navigation/types"

export type ReceivePluginParamList = ReceiveStackParamList & {
  ReceiveSelectNetworkScreen:
    | {
        copouch?: string
        cowallet?: string
        multisigWalletId?: string
      }
    | undefined
}

const Stack = createNativeStackNavigator<ReceivePluginParamList>()

export function ReceivePluginNavigator(props: {
  initialParams?: ReceivePluginParamList["ReceiveSelectNetworkScreen"]
  initialRouteName?: keyof ReceivePluginParamList
  receiveHomeParams?: ReceiveStackParamList["ReceiveHomeScreen"]
}) {
  return (
    <Stack.Navigator initialRouteName={props.initialRouteName ?? "ReceiveSelectNetworkScreen"} screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ReceiveSelectNetworkScreen" component={ReceiveSelectNetworkScreen} initialParams={props.initialParams} />
      <Stack.Screen
        name="ReceiveHomeScreen"
        component={ReceiveHomeScreen as React.ComponentType<any>}
        initialParams={props.receiveHomeParams}
      />
      <Stack.Screen name="ReceiveAddressListScreen" component={ReceiveAddressListScreen as React.ComponentType<any>} />
      <Stack.Screen name="ReceiveAddressCreateScreen" component={ReceiveAddressCreateScreen as React.ComponentType<any>} />
      <Stack.Screen name="ReceiveAddressDeleteScreen" component={ReceiveAddressDeleteScreen as React.ComponentType<any>} />
      <Stack.Screen name="InvalidReceiveAddressScreen" component={InvalidReceiveAddressScreen as React.ComponentType<any>} />
      <Stack.Screen name="ReceiveExpiryScreen" component={ReceiveExpiryScreen as React.ComponentType<any>} />
      <Stack.Screen name="ReceiveTxlogsScreen" component={ReceiveTxlogsScreen as React.ComponentType<any>} />
      <Stack.Screen name="RareAddressScreen" component={RareAddressScreen as React.ComponentType<any>} />
      <Stack.Screen name="ReceiveShareScreen" component={ReceiveShareScreen as React.ComponentType<any>} />
      <Stack.Screen name="ReceiveFaqScreen" component={ReceiveFaqScreen as React.ComponentType<any>} />
      <Stack.Screen name="ReceiveFaqDiffScreen" component={ReceiveFaqDiffScreen as React.ComponentType<any>} />
    </Stack.Navigator>
  )
}
