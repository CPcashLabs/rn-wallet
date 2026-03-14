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
