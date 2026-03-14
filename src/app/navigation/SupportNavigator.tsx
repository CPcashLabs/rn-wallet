import React from "react"

import { createNativeStackNavigator } from "@react-navigation/native-stack"

import { AddDesktopGuideScreen } from "@/features/support/screens/AddDesktopGuideScreen"
import { MaintenanceScreen } from "@/features/support/screens/MaintenanceScreen"
import { NoNetworkScreen } from "@/features/support/screens/NoNetworkScreen"
import { NoWechatScreen } from "@/features/support/screens/NoWechatScreen"
import { NotFoundScreen } from "@/features/support/screens/NotFoundScreen"
import { WechatInterceptorScreen } from "@/features/support/screens/WechatInterceptorScreen"

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
