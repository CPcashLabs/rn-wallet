import { apiClient } from "@/shared/api/client"

type ApiEnvelope<T> = {
  code: number
  message: string
  data: T
}

type AddressBookPayload = {
  id: number | string
  name: string
  wallet_address: string
  chain_type: "EVM" | "TRON"
  chain_name?: string | null
  created_at?: number
  updated_at?: number
}

export type AddressBookEntry = {
  id: string
  name: string
  walletAddress: string
  chainType: "EVM" | "TRON"
  chainName?: string | null
  createdAt?: number
  updatedAt?: number
}

export type AddressBookDraft = {
  name: string
  walletAddress: string
  chainType: "EVM" | "TRON"
}

function unwrapEnvelope<T>(payload: ApiEnvelope<T>) {
  return payload.data
}

function toAddressBookEntry(payload: AddressBookPayload): AddressBookEntry {
  return {
    id: String(payload.id),
    name: payload.name,
    walletAddress: payload.wallet_address,
    chainType: payload.chain_type,
    chainName: payload.chain_name,
    createdAt: payload.created_at,
    updatedAt: payload.updated_at,
  }
}

function toDraftPayload(draft: AddressBookDraft) {
  return {
    name: draft.name,
    wallet_address: draft.walletAddress,
    chain_type: draft.chainType,
  }
}

export async function getAddressBookList() {
  const response = await apiClient.get<ApiEnvelope<AddressBookPayload[]>>("/api/system/member/address-book/list")
  return unwrapEnvelope(response.data).map(toAddressBookEntry)
}

export async function getAddressBookDetail(id: string) {
  const response = await apiClient.get<ApiEnvelope<AddressBookPayload>>(`/api/system/member/address-book/get/${id}`)
  return toAddressBookEntry(unwrapEnvelope(response.data))
}

export async function createAddressBookEntry(draft: AddressBookDraft) {
  const response = await apiClient.post<ApiEnvelope<boolean>>(
    "/api/system/member/address-book/create",
    toDraftPayload(draft),
  )

  return unwrapEnvelope(response.data)
}

export async function updateAddressBookEntry(id: string, draft: AddressBookDraft) {
  const response = await apiClient.put<ApiEnvelope<boolean>>(
    `/api/system/member/address-book/update/${id}`,
    toDraftPayload(draft),
  )

  return unwrapEnvelope(response.data)
}

export async function deleteAddressBookEntry(id: string) {
  const response = await apiClient.delete<ApiEnvelope<boolean>>(`/api/system/member/address-book/delete/${id}`)
  return unwrapEnvelope(response.data)
}
