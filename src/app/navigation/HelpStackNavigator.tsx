import React from "react"

import { createNativeStackNavigator } from "@react-navigation/native-stack"

import {
  FAQGuideDetailScreen,
  FAQScreen,
  HelpCenterScreen,
  KnowledgeGuideDetailScreen,
  ReceiveDiffScreen,
  SafetyGuideDetailScreen,
  UserGuideScreen,
  WalletGuideDetailScreen,
} from "@/features/settings/screens/SettingsHelpScreens"

import type { HelpStackParamList } from "@/app/navigation/types"

const Stack = createNativeStackNavigator<HelpStackParamList>()

export function HelpStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HelpCenterScreen" component={HelpCenterScreen} />
      <Stack.Screen name="FAQScreen" component={FAQScreen} />
      <Stack.Screen name="ReceiveDiffScreen" component={ReceiveDiffScreen} />
      <Stack.Screen name="UserGuideScreen" component={UserGuideScreen} />
      <Stack.Screen name="WalletGuideDetailScreen" component={WalletGuideDetailScreen} />
      <Stack.Screen name="FAQGuideDetailScreen" component={FAQGuideDetailScreen} />
      <Stack.Screen name="KnowledgeGuideDetailScreen" component={KnowledgeGuideDetailScreen} />
      <Stack.Screen name="SafetyGuideDetailScreen" component={SafetyGuideDetailScreen} />
    </Stack.Navigator>
  )
}
