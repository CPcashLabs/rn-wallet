import React from "react"

import { createNativeStackNavigator } from "@react-navigation/native-stack"

import { MessageScreen } from "@/features/messages"

import type { MessageStackParamList } from "@/app/navigation/types"

const Stack = createNativeStackNavigator<MessageStackParamList>()

export function MessageStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MessageScreen" component={MessageScreen} />
    </Stack.Navigator>
  )
}
