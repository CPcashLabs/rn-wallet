import React from "react"

import { createNativeStackNavigator } from "@react-navigation/native-stack"

import { ExportPasskeyScreen } from "@/features/home/screens/ExportPasskeyScreen"
import { MeShellScreen } from "@/features/home/screens/MeShellScreen"
import { PersonalScreen } from "@/features/home/screens/PersonalScreen"
import { SettingsScreen } from "@/features/home/screens/SettingsScreen"
import { UpdateNameScreen } from "@/features/home/screens/UpdateNameScreen"
import {
  AboutScreen,
  EmailBindedScreen,
  EmailHomeScreen,
  EmailNotificationScreen,
  EmailUnbindScreen,
  FAQGuideDetailScreen,
  FAQScreen,
  FeedbackScreen,
  HelpCenterScreen,
  InviteCodeScreen,
  InviteHomeScreen,
  InviteHowItWorksScreen,
  InvitePromotionScreen,
  KnowledgeGuideDetailScreen,
  LanguageScreen,
  LicensesScreen,
  NodeSetupScreen,
  ReceiveDiffScreen,
  SafetyGuideDetailScreen,
  UnitScreen,
  UserGuideScreen,
  VerifyEmailScreen,
  WalletGuideDetailScreen,
} from "@/features/settings/screens/Wp09Screens"

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
      <Stack.Screen name="EmailBindedScreen" component={EmailBindedScreen} />
      <Stack.Screen name="EmailUnbindScreen" component={EmailUnbindScreen} />
      <Stack.Screen name="VerifyEmailScreen" component={VerifyEmailScreen} />
      <Stack.Screen name="LanguageScreen" component={LanguageScreen} />
      <Stack.Screen name="UnitScreen" component={UnitScreen} />
      <Stack.Screen name="NodeSetupScreen" component={NodeSetupScreen} />
      <Stack.Screen name="HelpCenterScreen" component={HelpCenterScreen} />
      <Stack.Screen name="FAQScreen" component={FAQScreen} />
      <Stack.Screen name="ReceiveDiffScreen" component={ReceiveDiffScreen} />
      <Stack.Screen name="AboutScreen" component={AboutScreen} />
      <Stack.Screen name="FeedbackScreen" component={FeedbackScreen} />
      <Stack.Screen name="LicensesScreen" component={LicensesScreen} />
      <Stack.Screen name="UserGuideScreen" component={UserGuideScreen} />
      <Stack.Screen name="WalletGuideDetailScreen" component={WalletGuideDetailScreen} />
      <Stack.Screen name="FAQGuideDetailScreen" component={FAQGuideDetailScreen} />
      <Stack.Screen name="KnowledgeGuideDetailScreen" component={KnowledgeGuideDetailScreen} />
      <Stack.Screen name="SafetyGuideDetailScreen" component={SafetyGuideDetailScreen} />
      <Stack.Screen name="InviteHomeScreen" component={InviteHomeScreen} />
      <Stack.Screen name="InviteCodeScreen" component={InviteCodeScreen} />
      <Stack.Screen name="InvitePromotionScreen" component={InvitePromotionScreen} />
      <Stack.Screen name="InviteHowItWorksScreen" component={InviteHowItWorksScreen} />
    </Stack.Navigator>
  )
}
