import type { NavigatorScreenParams } from "@react-navigation/native"

export type AuthStackParamList = {
  LoginScreen: { inviteCode?: string } | undefined
  PasskeySignupScreen: { inviteCode?: string } | undefined
  PasskeyIntroScreen: undefined
  PasswordLoginScreen: { address?: string; inviteCode?: string } | undefined
  ForgotPasswordAddressScreen: { address?: string } | undefined
  ForgotPasswordEmailScreen: { address?: string; email?: string } | undefined
  SetPasswordScreen: { address?: string; randomString?: string; mode?: "email" } | undefined
  FirstSetPasswordScreen: { address?: string } | undefined
  LoggedInSetPasswordScreen: undefined
}

export type HomeTabStackParamList = {
  HomeShellScreen: { inviteCode?: string } | undefined
  TotalAssetsScreen: undefined
}

export type SettingsStackParamList = {
  MeShellScreen: undefined
  PersonalScreen: undefined
  SettingsHomeScreen: undefined
  UpdateNameScreen: undefined
  ExportPasskeyScreen: undefined
}

export type AddressBookStackParamList = {
  AddressBookListScreen:
    | {
        mode?: "manage" | "select"
        chainType?: "EVM" | "TRON"
      }
    | undefined
  AddressBookEditScreen:
    | {
        id?: string
        initialAddress?: string
        chainType?: "EVM" | "TRON"
      }
    | undefined
}

export type TransferStackParamList = {
  SelectTokenScreen: undefined
  TransferAddressScreen: {
    receiveChainName: string
    receiveChainFullName: string
    receiveChainColor: string
    receiveChainLogo: string
    addressRegexes: string[]
    channelType: "bridge" | "normal"
    title: string
    isRebate: boolean
    initialAddress?: string
  }
}

export type MainTabParamList = {
  HomeTab: NavigatorScreenParams<HomeTabStackParamList> | undefined
  MeTab: NavigatorScreenParams<SettingsStackParamList> | undefined
}

export type SupportStackParamList = {
  SupportPlaceholder: { reason?: string } | undefined
}

export type RootStackParamList = {
  BootstrapGate: undefined
  AuthStack: NavigatorScreenParams<AuthStackParamList>
  MainTabs: NavigatorScreenParams<MainTabParamList>
  AddressBookStack: NavigatorScreenParams<AddressBookStackParamList>
  TransferStack: NavigatorScreenParams<TransferStackParamList>
  SupportStack: NavigatorScreenParams<SupportStackParamList>
}
