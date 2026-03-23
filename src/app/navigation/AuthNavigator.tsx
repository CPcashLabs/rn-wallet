import React from "react"

import { createNativeStackNavigator } from "@react-navigation/native-stack"

import {
  CreateMnemonicScreen,
  FirstSetPasswordScreen,
  ForgotPasswordAddressScreen,
  ForgotPasswordEmailScreen,
  ImportWalletLoginScreen,
  LoggedInSetPasswordScreen,
  LoginScreen,
  PasskeyIntroScreen,
  PasskeySignupScreen,
  PasswordLoginScreen,
  SetPasswordScreen,
} from "@/features/auth"

import type { AuthStackParamList } from "@/app/navigation/types"

const Stack = createNativeStackNavigator<AuthStackParamList>()

export function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="LoginScreen" component={LoginScreen} />
      <Stack.Screen name="CreateMnemonicScreen" component={CreateMnemonicScreen} />
      <Stack.Screen name="ImportWalletLoginScreen" component={ImportWalletLoginScreen} />
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
