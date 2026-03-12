import React from "react"

import { createNativeStackNavigator } from "@react-navigation/native-stack"

import { InvalidReceiveAddressScreen } from "@/features/receive/screens/InvalidReceiveAddressScreen"
import { RareAddressScreen } from "@/features/receive/screens/RareAddressScreen"
import { ReceiveAddressListScreen } from "@/features/receive/screens/ReceiveAddressListScreen"
import { ReceiveHomeScreen } from "@/features/receive/screens/ReceiveHomeScreen"
import { ReceiveTxlogsScreen } from "@/features/receive/screens/ReceiveTxlogsScreen"
import { PlaceholderScreen } from "@/shared/ui/PlaceholderScreen"

import type { ReceiveStackParamList } from "@/app/navigation/types"

const Stack = createNativeStackNavigator<ReceiveStackParamList>()

function PlaceholderRoute(props: { title: string; description: string }) {
  return <PlaceholderScreen title={props.title} description={props.description} />
}

export function ReceiveStackNavigator() {
  return (
    <Stack.Navigator initialRouteName="ReceiveHomeScreen" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ReceiveHomeScreen" component={ReceiveHomeScreen} />
      <Stack.Screen name="ReceiveAddressListScreen" component={ReceiveAddressListScreen} />
      <Stack.Screen
        name="ReceiveAddressCreateScreen"
        children={() => (
          <PlaceholderRoute title="Receive Address Create" description="WP-06 后续会补齐收款地址创建表单。" />
        )}
      />
      <Stack.Screen
        name="ReceiveAddressDeleteScreen"
        children={() => (
          <PlaceholderRoute title="Receive Address Delete" description="WP-06 后续会补齐删除确认流程。" />
        )}
      />
      <Stack.Screen name="InvalidReceiveAddressScreen" component={InvalidReceiveAddressScreen} />
      <Stack.Screen
        name="ReceiveExpiryScreen"
        children={() => (
          <PlaceholderRoute title="Receive Expiry" description="WP-06 后续会补齐地址有效期设置页。" />
        )}
      />
      <Stack.Screen name="ReceiveTxlogsScreen" component={ReceiveTxlogsScreen} />
      <Stack.Screen name="RareAddressScreen" component={RareAddressScreen} />
    </Stack.Navigator>
  )
}
