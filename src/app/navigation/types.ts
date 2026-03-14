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
  EmailNotificationScreen: undefined
  EmailHomeScreen: undefined
  EmailBindedScreen: undefined
  EmailUnbindScreen: undefined
  VerifyEmailScreen: { email: string }
  LanguageScreen: undefined
  UnitScreen: undefined
  NodeSetupScreen: undefined
  HelpCenterScreen: undefined
  FAQScreen: undefined
  ReceiveDiffScreen: undefined
  AboutScreen: undefined
  FeedbackScreen: undefined
  LicensesScreen: undefined
  UserGuideScreen: undefined
  WalletGuideDetailScreen: undefined
  FAQGuideDetailScreen: undefined
  KnowledgeGuideDetailScreen: undefined
  SafetyGuideDetailScreen: undefined
  InviteHomeScreen: undefined
  InviteCodeScreen: undefined
  InvitePromotionScreen: undefined
  InviteHowItWorksScreen: undefined
}

export type MessageStackParamList = {
  MessageScreen: undefined
}

export type OrdersStackParamList = {
  OrderDetailScreen: {
    orderSn: string
    source?: "message" | "manual"
  }
  TagsNotesScreen: {
    orderSn: string
  }
  TagsNotesEditScreen: undefined
  LabelManagementScreen: undefined
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
  SelectTokenScreen:
    | {
        intent?: "transfer" | "receive"
        cowallet?: string
        multisigWalletId?: string
      }
    | undefined
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
    orderSn?: string
    pay?: boolean
    walletId?: string
    skipCountdown?: boolean
    publicAccess?: boolean
    publicTxid?: string
    publicBaseUrl?: string
  }
  SendEntryScreen:
    | {
        orderSn?: string
      }
    | undefined
  SendPaymentInfoScreen: {
    orderSn: string
    publicAccess?: boolean
    publicBaseUrl?: string
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
  BuyCryptoScreen:
    | {
        payChain?: string
        sellerId?: string
        sendCoinCode?: string
        recvCoinCode?: string
        recvAddress?: string
      }
    | undefined
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
        receiveMode?: "normal" | "trace"
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
  ReceiveAddressCreateScreen:
    | {
        orderSn: string
        address: string
        remarkName?: string
        multisigWalletId?: string
      }
    | undefined
  ReceiveAddressDeleteScreen:
    | {
        orderType?: "TRACE" | "TRACE_LONG_TERM"
        sendCoinCode?: string
        recvCoinCode?: string
        sellerId?: string
        multisigWalletId?: string
      }
    | undefined
  InvalidReceiveAddressScreen:
    | {
        orderType?: "TRACE" | "TRACE_LONG_TERM"
        sendCoinCode?: string
        recvCoinCode?: string
        sellerId?: string
        multisigWalletId?: string
      }
    | undefined
  ReceiveExpiryScreen:
    | {
        multisigWalletId?: string
        collapse?: "individuals" | "business"
        sellerId?: string
        sendCoinCode?: string
        recvCoinCode?: string
        payChain?: string
      }
    | undefined
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

export type CowalletStackParamList = {
  CowalletHomeScreen: undefined
  CowalletFaqScreen: undefined
  CowalletDetailScreen: {
    id: string
    walletBgColor?: number
  }
  CowalletMemberScreen: {
    id: string
  }
  CowalletDeleteMemberScreen: {
    id: string
  }
  CowalletAddMemberScreen: {
    id: string
  }
  CowalletAddMemberForTeamScreen: {
    id: string
  }
  CowalletAddMemberForTeamSelectScreen: {
    id: string
    teamId: string
  }
  CowalletSettingScreen: {
    id: string
  }
  CowalletSetNameScreen: {
    id: string
  }
  CowalletBgSettingScreen: {
    id: string
  }
  CowalletBillListScreen: {
    id: string
  }
  CowalletRemindScreen: {
    id: string
  }
  CowalletBalanceScreen: {
    id: string
  }
  CowalletSendSelfScreen: {
    id: string
  }
  CowalletReceiveScreen: {
    id: string
  }
  CowalletAllocationScreen: {
    id: string
    orderSn: string
  }
  CowalletViewAllocationScreen: {
    id: string
    orderSn: string
  }
}

export type MainTabParamList = {
  HomeTab: NavigatorScreenParams<HomeTabStackParamList> | undefined
  MeTab: NavigatorScreenParams<SettingsStackParamList> | undefined
}

export type SupportStackParamList = {
  NoNetworkScreen:
    | {
        mode?: "summary" | "details"
        failedPath?: string
      }
    | undefined
  NoWechatScreen:
    | {
        target?: string
      }
    | undefined
  MaintenanceScreen:
    | {
        reason?: string
      }
    | undefined
  NotFoundScreen:
    | {
        path?: string
      }
    | undefined
  AddDesktopGuideScreen:
    | {
        source?: "login" | "manual"
      }
    | undefined
  WechatInterceptorScreen:
    | {
        targetPath?: string
      }
    | undefined
}

export type RootStackParamList = {
  BootstrapGate: undefined
  AuthStack: NavigatorScreenParams<AuthStackParamList>
  MainTabs: NavigatorScreenParams<MainTabParamList>
  MessageStack: NavigatorScreenParams<MessageStackParamList>
  OrdersStack: NavigatorScreenParams<OrdersStackParamList>
  AddressBookStack: NavigatorScreenParams<AddressBookStackParamList>
  TransferStack: NavigatorScreenParams<TransferStackParamList>
  ReceiveStack: NavigatorScreenParams<ReceiveStackParamList>
  CowalletStack: NavigatorScreenParams<CowalletStackParamList>
  SupportStack: NavigatorScreenParams<SupportStackParamList>
}
