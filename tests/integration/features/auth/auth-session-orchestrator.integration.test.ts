const mockSyncCurrentUserProfile = jest.fn(async () => undefined)
type MockWalletStatus = "idle" | "connected" | "disconnected"

const mockUserStoreState = {
  profile: null as Record<string, unknown> | null,
  patchProfile: jest.fn((patch: Record<string, unknown>) => {
    mockUserStoreState.profile = {
      ...(mockUserStoreState.profile ?? {}),
      ...patch,
    }
  }),
}

const mockWalletStoreState: {
  status: MockWalletStatus
  address: string | null
  chainId: string | null
  setWalletState: jest.Mock<void, [{ status: MockWalletStatus; address?: string | null; chainId?: string | null }]>
} = {
  status: "idle",
  address: null as string | null,
  chainId: null as string | null,
  setWalletState: jest.fn((payload: { status: MockWalletStatus; address?: string | null; chainId?: string | null }) => {
    mockWalletStoreState.status = payload.status
    mockWalletStoreState.address = payload.address ?? null
    mockWalletStoreState.chainId = payload.chainId ?? null
  }),
}

jest.mock("@/features/home/hooks/useProfileSync", () => ({
  syncCurrentUserProfile: () => mockSyncCurrentUserProfile(),
}))

jest.mock("@/shared/store/useUserStore", () => ({
  useUserStore: {
    getState: () => mockUserStoreState,
  },
}))

jest.mock("@/shared/store/useWalletStore", () => ({
  DEFAULT_WALLET_CHAIN_ID: "199",
  useWalletStore: {
    getState: () => mockWalletStoreState,
  },
}))

import { persistAuthenticatedSession } from "@/features/auth/services/authSessionOrchestrator"
import { readAuthSession } from "@/shared/api/auth-session"
import { hasProfileSyncHydratedThisSession, runProfileSync } from "@/shared/session/profileSyncSession"
import { useAuthStore } from "@/shared/store/useAuthStore"

import { resetAuthIntegrationState } from "../../test-helpers/authRuntime"

describe("authSessionOrchestrator integration", () => {
  beforeEach(async () => {
    await resetAuthIntegrationState()
    mockSyncCurrentUserProfile.mockClear()
    mockUserStoreState.profile = null
    mockUserStoreState.patchProfile.mockClear()
    mockWalletStoreState.status = "idle"
    mockWalletStoreState.address = null
    mockWalletStoreState.chainId = null
    mockWalletStoreState.setWalletState.mockClear()
  })

  it("persists the authenticated session and seeds empty profile and wallet state", async () => {
    await runProfileSync(async () => true)

    expect(hasProfileSyncHydratedThisSession()).toBe(true)

    await persistAuthenticatedSession({
      accessToken: "access-passkey",
      refreshToken: "refresh-passkey",
      address: "0xabc",
      loginType: "passkey",
      passkeyRawId: "raw-id-123",
    })

    expect(await readAuthSession()).toEqual({
      accessToken: "access-passkey",
      refreshToken: "refresh-passkey",
      address: "0xabc",
      loginType: "passkey",
      passkeyRawId: "raw-id-123",
    })
    expect(useAuthStore.getState()).toMatchObject({
      session: {
        accessToken: "access-passkey",
        refreshToken: "refresh-passkey",
        address: "0xabc",
        loginType: "passkey",
        passkeyRawId: "raw-id-123",
      },
      loginType: "passkey",
    })
    expect(mockUserStoreState.patchProfile).toHaveBeenCalledWith({
      address: "0xabc",
    })
    expect(mockUserStoreState.profile).toEqual({
      address: "0xabc",
    })
    expect(mockWalletStoreState.setWalletState).toHaveBeenCalledWith({
      status: "connected",
      address: "0xabc",
      chainId: "199",
    })
    expect(mockWalletStoreState).toMatchObject({
      status: "connected",
      address: "0xabc",
      chainId: "199",
    })
    expect(mockSyncCurrentUserProfile).toHaveBeenCalledTimes(1)
    expect(hasProfileSyncHydratedThisSession()).toBe(false)
  })

  it("preserves existing profile addresses and wallet chain ids", async () => {
    mockUserStoreState.profile = {
      address: "0xexisting",
      nickname: "alice",
    }
    mockWalletStoreState.chainId = "188"

    await persistAuthenticatedSession({
      accessToken: "access-password",
      refreshToken: "refresh-password",
      address: "0xnew",
      loginType: "password",
    })

    expect(await readAuthSession()).toEqual({
      accessToken: "access-password",
      refreshToken: "refresh-password",
      address: "0xnew",
      loginType: "password",
    })
    expect(useAuthStore.getState()).toMatchObject({
      session: {
        accessToken: "access-password",
        refreshToken: "refresh-password",
        address: "0xnew",
        loginType: "password",
      },
      loginType: "password",
    })
    expect(mockUserStoreState.patchProfile).not.toHaveBeenCalled()
    expect(mockUserStoreState.profile).toEqual({
      address: "0xexisting",
      nickname: "alice",
    })
    expect(mockWalletStoreState.setWalletState).toHaveBeenCalledWith({
      status: "connected",
      address: "0xnew",
      chainId: "188",
    })
    expect(mockWalletStoreState).toMatchObject({
      status: "connected",
      address: "0xnew",
      chainId: "188",
    })
    expect(mockSyncCurrentUserProfile).toHaveBeenCalledTimes(1)
  })
})
