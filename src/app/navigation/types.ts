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
  TransferOrderScreen: undefined
  TransferOrderNormalScreen: undefined
  TransferOrderCowalletScreen:
    | {
        multisigWalletId?: string
      }
    | undefined
  TransferConfirmScreen: {
    orderSn: string
  }
  TransferConfirmNormalScreen: {
    orderSn: string
  }
  TxPayStatusScreen: {
    orderSn: string
    pay?: boolean
    walletId?: string
    skipCountdown?: boolean
  }
  SendEntryScreen:
    | {
        orderSn?: string
      }
    | undefined
  SendPaymentInfoScreen: {
    orderSn: string
  }
  SendTokenScreen: undefined
  SendCodeScreen: undefined
  SendCodeDetailScreen: {
    orderSn: string
  }
  SendCodeLogsScreen: undefined
  SendCodeCoverScreen: {
    orderSn: string
  }
  BuyCryptoScreen: undefined
  BttClaimScreen: undefined
}

export type ReceiveStackParamList = {
  ReceiveHomeScreen:
    | {
        payChain?: string
        cowallet?: string
        multisigWalletId?: string
        collapse?: "individuals" | "business"
        chainColor?: string
      }
    | undefined
  ReceiveAddressListScreen:
    | {
        orderType?: "TRACE" | "TRACE_LONG_TERM"
        sendCoinCode?: string
        recvCoinCode?: string
        payChain?: string
        sellerId?: string
        multisigWalletId?: string
      }
    | undefined
  ReceiveAddressCreateScreen: undefined
  ReceiveAddressDeleteScreen: undefined
  InvalidReceiveAddressScreen:
    | {
        orderType?: "TRACE" | "TRACE_LONG_TERM"
        sendCoinCode?: string
        recvCoinCode?: string
        sellerId?: string
        multisigWalletId?: string
      }
    | undefined
  ReceiveExpiryScreen: undefined
  ReceiveTxlogsScreen:
    | {
        orderSn: string
        orderType?: "TRACE" | "TRACE_LONG_TERM"
      }
    | undefined
  RareAddressScreen:
    | {
        payChain?: string
        sendCoinCode?: string
        recvCoinCode?: string
        sellerId?: string
        multisigWalletId?: string
      }
    | undefined
  ReceiveShareScreen: {
    orderSn: string
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
  ReceiveStack: NavigatorScreenParams<ReceiveStackParamList>
  SupportStack: NavigatorScreenParams<SupportStackParamList>
}
