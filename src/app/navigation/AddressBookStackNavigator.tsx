import React from "react"

import { createNativeStackNavigator } from "@react-navigation/native-stack"

import { AddressBookEditScreen } from "@/features/address-book/screens/AddressBookEditScreen"
import { AddressBookListScreen } from "@/features/address-book/screens/AddressBookListScreen"

import type { AddressBookStackParamList } from "@/app/navigation/types"

const Stack = createNativeStackNavigator<AddressBookStackParamList>()

export function AddressBookStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AddressBookListScreen" component={AddressBookListScreen} />
      <Stack.Screen name="AddressBookEditScreen" component={AddressBookEditScreen} />
    </Stack.Navigator>
  )
}
