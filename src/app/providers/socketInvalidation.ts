export type SocketInvalidationDomain = "messages" | "copouch" | null

const MESSAGE_EVENT_TYPES = new Set([
  "messageRefresh",
])

const COPOUCH_EVENT_TYPES = new Set([
  "MultisigWalletCreatedSuc",
  "MultisigWalletCreatedFail",
  "MultisigWalletMemberAddSuc",
  "MultisigWalletMemberDelSuc",
  "MultisigWalletMemberRemoved",
])

export function resolveSocketInvalidationDomain(type?: string): SocketInvalidationDomain {
  if (!type) {
    return null
  }

  if (MESSAGE_EVENT_TYPES.has(type)) {
    return "messages"
  }

  if (COPOUCH_EVENT_TYPES.has(type)) {
    return "copouch"
  }

  return null
}
