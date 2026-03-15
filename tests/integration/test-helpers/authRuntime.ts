import { clearAuthSession, resetAuthSessionStateForTests } from "@/shared/api/auth-session"
import { setNetworkUnavailableHandler, setUnauthorizedHandler } from "@/shared/api/interceptors"
import { setLanguagePreference } from "@/shared/i18n"
import { resetProfileSyncSession } from "@/shared/session/profileSyncSession"
import { removeSecureItem } from "@/shared/storage/secureStorage"
import { SecureStorageKeys } from "@/shared/storage/sessionKeys"
import { useAuthStore } from "@/shared/store/useAuthStore"

export function resetAuthStoreState() {
  useAuthStore.setState({
    isBootstrapped: false,
    session: null,
    loginType: null,
    recentPasskeys: [],
  })
}

export async function resetAuthIntegrationState() {
  setUnauthorizedHandler(null)
  setNetworkUnavailableHandler(null)
  resetProfileSyncSession()
  await setLanguagePreference("system")
  resetAuthStoreState()
  await clearAuthSession()
}

export async function clearSecureAuthStorage() {
  resetAuthSessionStateForTests()
  await Promise.all([
    removeSecureItem(SecureStorageKeys.AuthSession),
    removeSecureItem(SecureStorageKeys.AuthSessionVersion),
    removeSecureItem(SecureStorageKeys.AccessToken),
    removeSecureItem(SecureStorageKeys.RefreshToken),
    removeSecureItem(SecureStorageKeys.SessionMeta),
  ])
}
