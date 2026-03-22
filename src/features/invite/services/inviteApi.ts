import { apiClient } from "@/shared/api/client"
import { type ApiEnvelope, unwrapEnvelope } from "@/shared/api/envelope"

type InviteCodePayload = {
  invite_code: string
  target_level_rank: number
}

type InviteStatsPayload = {
  stats: Array<{
    relation_level: number
    number: number
    order_count: number
  }>
}

export type InviteCodeItem = {
  inviteCode: string
  level: number
}

export type InviteStatsItem = {
  relationLevel: number
  number: number
  orderCount: number
}

export async function getInviteCodes() {
  const response = await apiClient.get<ApiEnvelope<InviteCodePayload[]>>("/api/system/member/memberrelation/invite-codes")
  return unwrapEnvelope(response.data).map(item => ({
    inviteCode: item.invite_code,
    level: item.target_level_rank,
  }))
}

export async function validateInviteCode(inviteCode: string) {
  const response = await apiClient.get<ApiEnvelope<boolean>>("/api/system/member/memberrelation/validate", {
    params: {
      invite_code: inviteCode,
    },
  })

  return unwrapEnvelope(response.data)
}

export async function getInviteStats() {
  const response = await apiClient.get<ApiEnvelope<InviteStatsPayload>>("/api/system/member/memberrelation/stats/v2")
  return unwrapEnvelope(response.data).stats.map(item => ({
    relationLevel: item.relation_level,
    number: item.number,
    orderCount: item.order_count,
  }))
}
