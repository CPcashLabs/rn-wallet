import { apiClient } from "@/shared/api/client"
import { type ApiEnvelope, unwrapEnvelope } from "@/shared/api/envelope"
import { buildImageUploadFormDataPart, type UploadableImage } from "@/shared/api/uploadFile"
import { useAuthStore } from "@/shared/store/useAuthStore"
import { useWalletStore } from "@/shared/store/useWalletStore"
import type { UserProfile } from "@/shared/types/auth"

type UserProfilePayload = {
  id?: string
  address?: string
  nickname?: string
  email?: string
  avatar?: string
  level_rank?: number
  invite_bound?: boolean
  wallet_is_backup?: boolean
  transfer_email_notify_enable?: boolean
  reward_email_notify_enable?: boolean
  receipt_email_notify_enable?: boolean
  backup_wallet_notify_enable?: boolean
}

type UploadFilePayload =
  | string
  | {
      url?: string
      full_url?: string
      path?: string
      filename?: string
    }

function resolveUploadedFileUrl(payload: UploadFilePayload) {
  if (typeof payload === "string") {
    return payload
  }

  return payload.url ?? payload.full_url ?? payload.path ?? ""
}

function toUserProfile(payload: UserProfilePayload): UserProfile {
  const walletAddress = useWalletStore.getState().address ?? undefined
  const sessionAddress = useAuthStore.getState().session?.address

  return {
    id: payload.id,
    address: payload.address ?? walletAddress ?? sessionAddress,
    nickname: payload.nickname,
    email: payload.email,
    avatar: payload.avatar,
    levelRank: payload.level_rank,
    inviteBound: payload.invite_bound,
    walletIsBackup: payload.wallet_is_backup,
    transferEmailNotifyEnable: payload.transfer_email_notify_enable,
    rewardEmailNotifyEnable: payload.reward_email_notify_enable,
    receiptEmailNotifyEnable: payload.receipt_email_notify_enable,
    backupWalletNotifyEnable: payload.backup_wallet_notify_enable,
  }
}

export async function getCurrentUserProfile(signal?: AbortSignal) {
  const response = await apiClient.get<ApiEnvelope<UserProfilePayload>>("/api/system/member/security/current", {
    signal,
  })
  return toUserProfile(unwrapEnvelope(response.data))
}

export async function updateProfileNickname(nickname: string) {
  const response = await apiClient.put<ApiEnvelope<boolean>>("/api/system/member/security/update", { nickname })

  return unwrapEnvelope(response.data)
}

export async function updateProfileAvatar(avatar: string) {
  const response = await apiClient.put<ApiEnvelope<boolean>>("/api/system/member/security/update", { avatar })

  return unwrapEnvelope(response.data)
}

export async function markWalletBackup() {
  const response = await apiClient.post<ApiEnvelope<boolean>>("/api/system/member/message/backup-wallet")
  return unwrapEnvelope(response.data)
}

export async function uploadProfileImage(image: UploadableImage) {
  const formData = new FormData()

  formData.append("file", buildImageUploadFormDataPart(image, "avatar.jpg"))

  const response = await apiClient.post<ApiEnvelope<UploadFilePayload>>(
    "/api/system/member/storage/upload-file",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  )

  return resolveUploadedFileUrl(unwrapEnvelope(response.data))
}
