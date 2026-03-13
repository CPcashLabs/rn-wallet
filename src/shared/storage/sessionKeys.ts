export enum SecureStorageKeys {
  AccessToken = "auth.access_token",
  RefreshToken = "auth.refresh_token",
  SessionMeta = "auth.session_meta",
}

export enum KvStorageKeys {
  AppLanguage = "app.language",
  ThemeMode = "app.theme_mode",
  WalletChainId = "wallet.chain_id",
  WalletRpcIndex = "wallet.rpc_index",
  PasskeyHistory = "auth.passkey_history",
  UserProfile = "auth.user_profile",
  VerificationCodeCountdownEndAt = "auth.verification_code_countdown_end_at",
  EmailBindCountdownEndAt = "auth.email_bind_countdown_end_at",
  EmailUnbindCountdownEndAt = "auth.email_unbind_countdown_end_at",
  ShowBalance = "home.show_balance",
  SelectedCurrency = "home.selected_currency",
  SelectedInviteLevel = "home.selected_invite_level",
  TransferDraft = "transfer.draft",
  SelectTokenPageReload = "transfer.select_token_page_reload",
  HomePageNeedRefresh = "home.home_page_need_refresh",
  ReceiveGuideDismissed = "receive.guide.dismissed",
  ReceiveShowedList = "receive.showed_list",
  CopouchSortByAmount = "copouch.sort_by_amount",
  CopouchGuideDismissedWalletIds = "copouch.guide.dismissed_wallet_ids",
}
