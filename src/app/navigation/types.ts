import type { NavigatorScreenParams } from "@react-navigation/native"

import type { PluginId, PluginReturnTarget, PluginRouteParams } from "@/shared/plugins/types"

export type AuthStackParamList = {
  LoginScreen: { inviteCode?: string } | undefined
  ImportWalletLoginScreen: { inviteCode?: string } | undefined
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
  TxlogsScreen: undefined
  TxlogsByAddressScreen: {
    address: string
  }
  OrderDetailScreen: {
    orderSn: string
    source?: "message" | "manual"
  }
  SplitDetailScreen: {
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
  OrderVoucherScreen: {
    orderSn: string
  }
  DigitalReceiptScreen: {
    orderSn: string
  }
  FlowProofScreen: {
    orderSn: string
  }
  ReimburseScreen: {
    orderSn: string
  }
  RefundDetailScreen: {
    orderSn: string
  }
  OrderBillScreen:
    | {
        preset?: "today" | "yesterday" | "last7d" | "last30d"
      }
    | undefined
  BillExportScreen: {
    startedAt: string
    endedAt: string
    startedTimestamp?: number
    endedTimestamp?: number
    email?: string
    orderSn?: string
    orderType?: string
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
        requestId?: string
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

type CopouchNavigationContext =
  | {
      copouch?: string
      cowallet?: string
      multisigWalletId?: string
    }
  | undefined

export type TransferStackParamList = {
  SelectTokenScreen: (CopouchNavigationContext & { intent?: "transfer" | "receive" }) | undefined
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
  TransferOrderCopouchScreen:
    | {
        multisigWalletId?: string
      }
    | undefined
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
        copouch?: string
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
  ReceiveFaqScreen: undefined
  ReceiveFaqDiffScreen: undefined
}

type CopouchStackScreenParamList = {
  CopouchHomeScreen: undefined
  CopouchFaqScreen: undefined
  CopouchDetailScreen: {
    id: string
    walletBgColor?: number
  }
  CopouchMemberScreen: {
    id: string
  }
  CopouchDeleteMemberScreen: {
    id: string
  }
  CopouchAddMemberScreen: {
    id: string
  }
  CopouchAddMemberForTeamScreen: {
    id: string
  }
  CopouchAddMemberForTeamSelectScreen: {
    id: string
    teamId: string
  }
  CopouchSettingScreen: {
    id: string
  }
  CopouchSetNameScreen: {
    id: string
  }
  CopouchBgSettingScreen: {
    id: string
  }
  CopouchBillListScreen: {
    id: string
  }
  CopouchRemindScreen: {
    id: string
  }
  CopouchBalanceScreen: {
    id: string
  }
  CopouchSendSelfScreen: {
    id: string
  }
  CopouchReceiveScreen: {
    id: string
  }
  CopouchAllocationScreen: {
    id: string
    orderSn: string
  }
  CopouchViewAllocationScreen: {
    id: string
    orderSn: string
  }
}

type LegacyCowalletStackScreenParamList = {
  CowalletHomeScreen: CopouchStackScreenParamList["CopouchHomeScreen"]
  CowalletFaqScreen: CopouchStackScreenParamList["CopouchFaqScreen"]
  CowalletDetailScreen: CopouchStackScreenParamList["CopouchDetailScreen"]
  CowalletMemberScreen: CopouchStackScreenParamList["CopouchMemberScreen"]
  CowalletDeleteMemberScreen: CopouchStackScreenParamList["CopouchDeleteMemberScreen"]
  CowalletAddMemberScreen: CopouchStackScreenParamList["CopouchAddMemberScreen"]
  CowalletAddMemberForTeamScreen: CopouchStackScreenParamList["CopouchAddMemberForTeamScreen"]
  CowalletAddMemberForTeamSelectScreen: CopouchStackScreenParamList["CopouchAddMemberForTeamSelectScreen"]
  CowalletSettingScreen: CopouchStackScreenParamList["CopouchSettingScreen"]
  CowalletSetNameScreen: CopouchStackScreenParamList["CopouchSetNameScreen"]
  CowalletBgSettingScreen: CopouchStackScreenParamList["CopouchBgSettingScreen"]
  CowalletBillListScreen: CopouchStackScreenParamList["CopouchBillListScreen"]
  CowalletRemindScreen: CopouchStackScreenParamList["CopouchRemindScreen"]
  CowalletBalanceScreen: CopouchStackScreenParamList["CopouchBalanceScreen"]
  CowalletSendSelfScreen: CopouchStackScreenParamList["CopouchSendSelfScreen"]
  CowalletReceiveScreen: CopouchStackScreenParamList["CopouchReceiveScreen"]
  CowalletAllocationScreen: CopouchStackScreenParamList["CopouchAllocationScreen"]
  CowalletViewAllocationScreen: CopouchStackScreenParamList["CopouchViewAllocationScreen"]
}

export type CopouchStackParamList = CopouchStackScreenParamList & LegacyCowalletStackScreenParamList

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
  CopouchStack: NavigatorScreenParams<CopouchStackParamList>
  CowalletStack: NavigatorScreenParams<CopouchStackParamList>
  PluginHost: {
    pluginId: PluginId
    pluginParams?: PluginRouteParams
    returnTo?: PluginReturnTarget
  }
  SupportStack: NavigatorScreenParams<SupportStackParamList>
}
