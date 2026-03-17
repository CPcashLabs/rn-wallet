import React from "react"

import { createNativeStackNavigator } from "@react-navigation/native-stack"

import { AddressBookStackNavigator } from "@/app/navigation/AddressBookStackNavigator"
import { AuthNavigator } from "@/app/navigation/AuthNavigator"
import { BootstrapGate } from "@/app/navigation/BootstrapGate"
import { CopouchStackNavigator } from "@/plugins/copouch/CopouchStackNavigator"
import { HelpStackNavigator } from "@/app/navigation/HelpStackNavigator"
import { MainTabNavigator } from "@/app/navigation/MainTabNavigator"
import { MessageStackNavigator } from "@/app/navigation/MessageStackNavigator"
import { OrdersStackNavigator } from "@/app/navigation/OrdersStackNavigator"
import { ReceiveStackNavigator } from "@/domains/wallet/receive/ReceiveStackNavigator"
import { SupportNavigator } from "@/app/navigation/SupportNavigator"
import { TransferStackNavigator } from "@/domains/wallet/transfer/TransferStackNavigator"

import type { RootStackParamList } from "@/app/navigation/types"

const Stack = createNativeStackNavigator<RootStackParamList>()

export function RootNavigator() {
  return (
    <Stack.Navigator initialRouteName="BootstrapGate" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="BootstrapGate" component={BootstrapGate} />
      <Stack.Screen name="AuthStack" component={AuthNavigator} />
      <Stack.Screen name="MainTabs" component={MainTabNavigator} />
      <Stack.Screen name="MessageStack" component={MessageStackNavigator} />
      <Stack.Screen name="OrdersStack" component={OrdersStackNavigator} />
      <Stack.Screen name="HelpStack" component={HelpStackNavigator} />
      <Stack.Screen name="AddressBookStack" component={AddressBookStackNavigator} />
      <Stack.Screen name="TransferStack" component={TransferStackNavigator} />
      <Stack.Screen name="ReceiveStack" component={ReceiveStackNavigator} />
      <Stack.Screen
        name="CopouchStack"
        component={CopouchStackNavigator}
        options={{
          animation: "slide_from_bottom",
          presentation: "modal",
        }}
      />
      <Stack.Screen name="SupportStack" component={SupportNavigator} />
    </Stack.Navigator>
  )
}
