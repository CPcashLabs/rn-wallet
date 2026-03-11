import React from "react"

import { createNativeStackNavigator } from "@react-navigation/native-stack"

import { ExportPasskeyScreen } from "@/features/home/screens/ExportPasskeyScreen"
import { MeShellScreen } from "@/features/home/screens/MeShellScreen"
import { PersonalScreen } from "@/features/home/screens/PersonalScreen"
import { SettingsScreen } from "@/features/home/screens/SettingsScreen"
import { UpdateNameScreen } from "@/features/home/screens/UpdateNameScreen"

import type { SettingsStackParamList } from "@/app/navigation/types"

const Stack = createNativeStackNavigator<SettingsStackParamList>()

export function SettingsStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MeShellScreen" component={MeShellScreen} />
      <Stack.Screen name="PersonalScreen" component={PersonalScreen} />
      <Stack.Screen name="SettingsHomeScreen" component={SettingsScreen} />
      <Stack.Screen name="UpdateNameScreen" component={UpdateNameScreen} />
      <Stack.Screen name="ExportPasskeyScreen" component={ExportPasskeyScreen} />
    </Stack.Navigator>
  )
}
