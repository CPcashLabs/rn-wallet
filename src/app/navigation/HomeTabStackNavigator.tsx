import React from "react"

import { createNativeStackNavigator } from "@react-navigation/native-stack"

import { HomeShellScreen } from "@/features/home/screens/HomeShellScreen"
import { TotalAssetsScreen } from "@/features/home/screens/TotalAssetsScreen"

import type { HomeTabStackParamList } from "@/app/navigation/types"

const Stack = createNativeStackNavigator<HomeTabStackParamList>()

export function HomeTabStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeShellScreen" component={HomeShellScreen} />
      <Stack.Screen name="TotalAssetsScreen" component={TotalAssetsScreen} />
    </Stack.Navigator>
  )
}
