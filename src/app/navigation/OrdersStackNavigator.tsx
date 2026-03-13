import React from "react"

import { createNativeStackNavigator } from "@react-navigation/native-stack"

import { LabelManagementScreen } from "@/features/orders/screens/LabelManagementScreen"
import { OrderDetailScreen } from "@/features/orders/screens/OrderDetailScreen"
import { TagsNotesScreen } from "@/features/orders/screens/TagsNotesScreen"

import type { OrdersStackParamList } from "@/app/navigation/types"

const Stack = createNativeStackNavigator<OrdersStackParamList>()

export function OrdersStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="OrderDetailScreen" component={OrderDetailScreen} />
      <Stack.Screen name="TagsNotesScreen" component={TagsNotesScreen} />
      <Stack.Screen name="TagsNotesEditScreen" component={LabelManagementScreen} />
      <Stack.Screen name="LabelManagementScreen" component={LabelManagementScreen} />
    </Stack.Navigator>
  )
}
