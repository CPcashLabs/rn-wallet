import React from "react"

import { createNativeStackNavigator } from "@react-navigation/native-stack"

import { SupportPlaceholder } from "@/features/support/screens/SupportPlaceholder"

import type { SupportStackParamList } from "@/app/navigation/types"

const Stack = createNativeStackNavigator<SupportStackParamList>()

export function SupportNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SupportPlaceholder" component={SupportPlaceholder} />
    </Stack.Navigator>
  )
}

