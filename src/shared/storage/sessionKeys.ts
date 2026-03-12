export enum SecureStorageKeys {
  AccessToken = "auth.access_token",
  RefreshToken = "auth.refresh_token",
  SessionMeta = "auth.session_meta",
}

export enum KvStorageKeys {
  AppLanguage = "app.language",
  ThemeMode = "app.theme_mode",
  WalletChainId = "wallet.chain_id",
  PasskeyHistory = "auth.passkey_history",
  UserProfile = "auth.user_profile",
  VerificationCodeCountdownEndAt = "auth.verification_code_countdown_end_at",
  ShowBalance = "home.show_balance",
  TransferDraft = "transfer.draft",
  SelectTokenPageReload = "transfer.select_token_page_reload",
  HomePageNeedRefresh = "home.home_page_need_refresh",
  ReceiveGuideDismissed = "receive.guide.dismissed",
  ReceiveShowedList = "receive.showed_list",
}
