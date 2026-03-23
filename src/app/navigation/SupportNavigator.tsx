import React from "react"

import { createNativeStackNavigator } from "@react-navigation/native-stack"

import {
  AddDesktopGuideScreen,
  MaintenanceScreen,
  NoNetworkScreen,
  NoWechatScreen,
  NotFoundScreen,
  WechatInterceptorScreen,
} from "@/features/support"

import type { SupportStackParamList } from "@/app/navigation/types"

const Stack = createNativeStackNavigator<SupportStackParamList>()

export function SupportNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="NoNetworkScreen" component={NoNetworkScreen} />
      <Stack.Screen name="NoWechatScreen" component={NoWechatScreen} />
      <Stack.Screen name="MaintenanceScreen" component={MaintenanceScreen} />
      <Stack.Screen name="NotFoundScreen" component={NotFoundScreen} />
      <Stack.Screen name="AddDesktopGuideScreen" component={AddDesktopGuideScreen} />
      <Stack.Screen name="WechatInterceptorScreen" component={WechatInterceptorScreen} />
    </Stack.Navigator>
  )
}
