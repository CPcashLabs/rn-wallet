import React from "react"

import { createNativeStackNavigator } from "@react-navigation/native-stack"


import { AddressBookEditScreen, AddressBookListScreen } from "@/features/address-book"

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
