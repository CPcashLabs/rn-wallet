import { bindInviteCode, signInWithMessageSignature } from "@/features/auth/services/authApi"
import { persistAuthenticatedSession } from "@/features/auth/services/authSessionOrchestrator"
import { getInviteBindingMessage } from "@/features/auth/utils/authMessages"
import { resetToMainTabs } from "@/app/navigation/navigationRef"

import { createWalletLoginMessage, finalizeWalletLogin } from "./walletLogin"

jest.mock("@/features/auth/services/authApi", () => ({
  bindInviteCode: jest.fn(),
  signInWithMessageSignature: jest.fn(),
}))

jest.mock("@/features/auth/services/authSessionOrchestrator", () => ({
  persistAuthenticatedSession: jest.fn(),
}))

jest.mock("@/features/auth/utils/authMessages", () => ({
  getInviteBindingMessage: jest.fn(),
}))

jest.mock("@/app/navigation/navigationRef", () => ({
  resetToMainTabs: jest.fn(),
}))

const mockBindInviteCode = bindInviteCode as jest.MockedFunction<typeof bindInviteCode>
const mockSignInWithMessageSignature = signInWithMessageSignature as jest.MockedFunction<typeof signInWithMessageSignature>
const mockPersistAuthenticatedSession = persistAuthenticatedSession as jest.MockedFunction<typeof persistAuthenticatedSession>
const mockGetInviteBindingMessage = getInviteBindingMessage as jest.MockedFunction<typeof getInviteBindingMessage>
const mockResetToMainTabs = resetToMainTabs as jest.MockedFunction<typeof resetToMainTabs>

describe("walletLogin", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSignInWithMessageSignature.mockResolvedValue({
      accessToken: "access-token",
      refreshToken: "refresh-token",
    })
  })

  it("builds a message payload with the provided address", () => {
    const message = createWalletLoginMessage("0xabc")

    expect(message.address).toBe("0xabc")
    expect(message.login_time).toEqual(expect.any(String))
  })

  it("persists wallet login and resets to the main tabs", async () => {
    const message = {
      address: "0x123",
      login_time: "1710000000000",
    }

    await finalizeWalletLogin({
      address: "0x123",
      signature: "0xsigned",
      message,
      inviteCode: "INVITE",
    })

    expect(mockSignInWithMessageSignature).toHaveBeenCalledWith({
      signature: "0xsigned",
      address: "0x123",
      message: JSON.stringify(message),
    })
    expect(mockPersistAuthenticatedSession).toHaveBeenCalledWith({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      address: "0x123",
      loginType: "wallet",
    })
    expect(mockBindInviteCode).toHaveBeenCalledWith("INVITE")
    expect(mockResetToMainTabs).toHaveBeenCalledTimes(1)
  })

  it("shows invite binding notice without blocking login success", async () => {
    const error = new Error("bind failed")
    const onInviteBindingMessage = jest.fn()

    mockBindInviteCode.mockRejectedValueOnce(error)
    mockGetInviteBindingMessage.mockReturnValueOnce("邀请码已绑定")

    await finalizeWalletLogin({
      address: "0x456",
      signature: "0xsignature",
      message: {
        address: "0x456",
        login_time: "1710000000001",
      },
      inviteCode: "INVITE",
      onInviteBindingMessage,
    })

    expect(onInviteBindingMessage).toHaveBeenCalledWith("邀请码已绑定")
    expect(mockResetToMainTabs).toHaveBeenCalledTimes(1)
  })
})
