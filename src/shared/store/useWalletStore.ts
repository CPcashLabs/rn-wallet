import { create } from "zustand"

type WalletStatus = "idle" | "connected" | "disconnected"

type WalletState = {
  status: WalletStatus
  address: string | null
  chainId: string | null
  setWalletState: (payload: { status: WalletStatus; address?: string | null; chainId?: string | null }) => void
  reset: () => void
}

export const useWalletStore = create<WalletState>(set => ({
  status: "idle",
  address: null,
  chainId: null,
  setWalletState: payload =>
    set({
      status: payload.status,
      address: payload.address ?? null,
      chainId: payload.chainId ?? null,
    }),
  reset: () =>
    set({
      status: "idle",
      address: null,
      chainId: null,
    }),
}))

