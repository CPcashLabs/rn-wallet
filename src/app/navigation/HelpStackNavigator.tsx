import React from "react"

import { createNativeStackNavigator } from "@react-navigation/native-stack"

import { FAQScreen, GuideDetailScreen, HelpCenterScreen, ReceiveDiffScreen, UserGuideScreen } from "@/features/settings"

import type { HelpStackParamList } from "@/app/navigation/types"

const Stack = createNativeStackNavigator<HelpStackParamList>()

export function HelpStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HelpCenterScreen" component={HelpCenterScreen} />
      <Stack.Screen name="FAQScreen" component={FAQScreen} />
      <Stack.Screen name="ReceiveDiffScreen" component={ReceiveDiffScreen} />
      <Stack.Screen name="UserGuideScreen" component={UserGuideScreen} />
      <Stack.Screen name="GuideDetailScreen" component={GuideDetailScreen} />
    </Stack.Navigator>
  )
}
