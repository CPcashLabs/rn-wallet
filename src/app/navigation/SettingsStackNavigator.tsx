import React from "react"

import { createNativeStackNavigator } from "@react-navigation/native-stack"

import { ExportPasskeyScreen, MeShellScreen, PersonalScreen, SettingsScreen, UpdateNameScreen } from "@/features/home"
import {
  AboutScreen,
  EmailHomeScreen,
  EmailNotificationScreen,
  EmailUnbindScreen,
  FeedbackScreen,
  InviteCodeScreen,
  InviteHomeScreen,
  InviteHowItWorksScreen,
  InvitePromotionScreen,
  LanguageScreen,
  LicensesScreen,
  NodeSetupScreen,
  UnitScreen,
  VerifyEmailScreen,
} from "@/features/settings"

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
      <Stack.Screen name="EmailNotificationScreen" component={EmailNotificationScreen} />
      <Stack.Screen name="EmailHomeScreen" component={EmailHomeScreen} />
      <Stack.Screen name="EmailUnbindScreen" component={EmailUnbindScreen} />
      <Stack.Screen name="VerifyEmailScreen" component={VerifyEmailScreen} />
      <Stack.Screen name="LanguageScreen" component={LanguageScreen} />
      <Stack.Screen name="UnitScreen" component={UnitScreen} />
      <Stack.Screen name="NodeSetupScreen" component={NodeSetupScreen} />
      <Stack.Screen name="AboutScreen" component={AboutScreen} />
      <Stack.Screen name="FeedbackScreen" component={FeedbackScreen} />
      <Stack.Screen name="LicensesScreen" component={LicensesScreen} />
      <Stack.Screen name="InviteHomeScreen" component={InviteHomeScreen} />
      <Stack.Screen name="InviteCodeScreen" component={InviteCodeScreen} />
      <Stack.Screen name="InvitePromotionScreen" component={InvitePromotionScreen} />
      <Stack.Screen name="InviteHowItWorksScreen" component={InviteHowItWorksScreen} />
    </Stack.Navigator>
  )
}
