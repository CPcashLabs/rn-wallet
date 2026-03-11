import React from "react"

import { createNativeStackNavigator } from "@react-navigation/native-stack"

import { FirstSetPasswordScreen } from "@/features/auth/screens/FirstSetPasswordScreen"
import { ForgotPasswordAddressScreen } from "@/features/auth/screens/ForgotPasswordAddressScreen"
import { ForgotPasswordEmailScreen } from "@/features/auth/screens/ForgotPasswordEmailScreen"
import { LoggedInSetPasswordScreen } from "@/features/auth/screens/LoggedInSetPasswordScreen"
import { LoginScreen } from "@/features/auth/screens/LoginScreen"
import { PasskeyIntroScreen } from "@/features/auth/screens/PasskeyIntroScreen"
import { PasskeySignupScreen } from "@/features/auth/screens/PasskeySignupScreen"
import { PasswordLoginScreen } from "@/features/auth/screens/PasswordLoginScreen"
import { SetPasswordScreen } from "@/features/auth/screens/SetPasswordScreen"

import type { AuthStackParamList } from "@/app/navigation/types"

const Stack = createNativeStackNavigator<AuthStackParamList>()

export function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="LoginScreen" component={LoginScreen} />
      <Stack.Screen name="PasskeySignupScreen" component={PasskeySignupScreen} />
      <Stack.Screen name="PasskeyIntroScreen" component={PasskeyIntroScreen} />
      <Stack.Screen name="PasswordLoginScreen" component={PasswordLoginScreen} />
      <Stack.Screen name="ForgotPasswordAddressScreen" component={ForgotPasswordAddressScreen} />
      <Stack.Screen name="ForgotPasswordEmailScreen" component={ForgotPasswordEmailScreen} />
      <Stack.Screen name="SetPasswordScreen" component={SetPasswordScreen} />
      <Stack.Screen name="FirstSetPasswordScreen" component={FirstSetPasswordScreen} />
      <Stack.Screen name="LoggedInSetPasswordScreen" component={LoggedInSetPasswordScreen} />
    </Stack.Navigator>
  )
}
