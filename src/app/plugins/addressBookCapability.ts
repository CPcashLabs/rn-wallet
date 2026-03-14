import { navigationRef } from "@/app/navigation/navigationRef"
import type { AddressBookEntry } from "@/features/address-book/services/addressBookApi"
import type { AddressBookChainType, PluginAddressBookEntry, PluginAddressBookResult } from "@/shared/plugins/types"

type PendingAddressBookRequest = {
  resolve: (value: PluginAddressBookResult) => void
}

const pendingAddressBookRequests = new Map<string, PendingAddressBookRequest>()
let requestSequence = 0

function nextRequestId() {
  requestSequence += 1
  return `plugin-address-book-${Date.now()}-${requestSequence}`
}

function toPluginAddressBookEntry(entry: AddressBookEntry): PluginAddressBookEntry {
  return {
    id: entry.id,
    name: entry.name,
    walletAddress: entry.walletAddress,
    chainType: entry.chainType,
    chainName: entry.chainName,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  }
}

function settleAddressBookRequest(requestId: string | undefined, value: PluginAddressBookResult) {
  if (!requestId) {
    return
  }

  const request = pendingAddressBookRequests.get(requestId)
  if (!request) {
    return
  }

  pendingAddressBookRequests.delete(requestId)
  request.resolve(value)
}

export function openAddressBookCapability(input?: { chainType?: AddressBookChainType }) {
  if (!navigationRef.isReady()) {
    return Promise.reject(new Error("Navigation is not ready."))
  }

  const requestId = nextRequestId()

  return new Promise<PluginAddressBookResult>(resolve => {
    pendingAddressBookRequests.set(requestId, { resolve })

    navigationRef.navigate("AddressBookStack", {
      screen: "AddressBookListScreen",
      params: {
        mode: "select",
        chainType: input?.chainType,
        requestId,
      },
    })
  })
}

export function resolveAddressBookCapabilitySelection(requestId: string | undefined, entry: AddressBookEntry) {
  settleAddressBookRequest(requestId, {
    action: "selected",
    entry: toPluginAddressBookEntry(entry),
  })
}

export function clearAddressBookCapabilityRequest(requestId: string | undefined) {
  settleAddressBookRequest(requestId, {
    action: "cleared",
  })
}

export function closeAddressBookCapabilityRequest(requestId: string | undefined) {
  settleAddressBookRequest(requestId, {
    action: "closed",
  })
}
