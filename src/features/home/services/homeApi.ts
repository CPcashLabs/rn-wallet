import { apiClient } from "@/shared/api/client"
import type { UserProfile } from "@/shared/types/auth"

type ApiEnvelope<T> = {
  code: number
  message: string
  data: T
}

type UserProfilePayload = {
  id?: string
  address?: string
  nickname?: string
  email?: string
  avatar?: string
  level_rank?: number
  invite_bound?: boolean
  wallet_is_backup?: boolean
}

type CoinListPayloadItem = {
  name: string
  logo: string
  code: string
  symbol: string
  chain_name: string
  chain_full_name: string
  chain_logo: string
  chain_color: string
  contract: string
  price: number
  precision: number
}

type UploadFilePayload =
  | string
  | {
      url?: string
      full_url?: string
      path?: string
      filename?: string
    }

export type HomeCoin = {
  code: string
  symbol: string
  name: string
  logo: string
  chainName: string
  chainColor: string
  contract: string
  price: number
  precision: number
}

export type UploadableImage = {
  uri: string
  name?: string
  mimeType?: string
}

function unwrapEnvelope<T>(payload: ApiEnvelope<T>) {
  return payload.data
}

function resolveUploadedFileUrl(payload: UploadFilePayload) {
  if (typeof payload === "string") {
    return payload
  }

  return payload.url ?? payload.full_url ?? payload.path ?? ""
}

function toUserProfile(payload: UserProfilePayload): UserProfile {
  return {
    id: payload.id,
    address: payload.address,
    nickname: payload.nickname,
    email: payload.email,
    avatar: payload.avatar,
    levelRank: payload.level_rank,
    inviteBound: payload.invite_bound,
    walletIsBackup: payload.wallet_is_backup,
  }
}

function toHomeCoin(payload: CoinListPayloadItem): HomeCoin {
  return {
    code: payload.code,
    symbol: payload.symbol,
    name: payload.name,
    logo: payload.logo,
    chainName: payload.chain_name,
    chainColor: payload.chain_color,
    contract: payload.contract,
    price: payload.price,
    precision: payload.precision,
  }
}

export function resolveChainNameById(chainId?: string | number | null) {
  if (String(chainId ?? "") === "199") {
    return "BTT"
  }

  return "BTT_TEST"
}

export async function getCurrentUserProfile() {
  const response = await apiClient.get<ApiEnvelope<UserProfilePayload>>("/api/system/member/security/current")
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

export async function getCoinList(chainName: "BTT" | "BTT_TEST") {
  const response = await apiClient.get<ApiEnvelope<CoinListPayloadItem[]>>("/api/blockchain/member/coin/list", {
    params: {
      chain_name: chainName,
    },
  })

  return unwrapEnvelope(response.data).map(toHomeCoin)
}

export async function uploadProfileImage(image: UploadableImage) {
  const formData = new FormData()

  formData.append("file", {
    uri: image.uri,
    name: image.name ?? "avatar.jpg",
    type: image.mimeType ?? "image/jpeg",
  } as any)

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
