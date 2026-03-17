import { create } from "zustand"

type SocketState = {
  connected: boolean
  messageRevision: number
  copouchRevision: number
  setConnected: (connected: boolean) => void
  bumpMessageRevision: () => void
  bumpCopouchRevision: () => void
  reset: () => void
}

export const useSocketStore = create<SocketState>(set => ({
  connected: false,
  messageRevision: 0,
  copouchRevision: 0,
  setConnected: connected => set({ connected }),
  bumpMessageRevision: () =>
    set(state => ({
      messageRevision: state.messageRevision + 1,
    })),
  bumpCopouchRevision: () =>
    set(state => ({
      copouchRevision: state.copouchRevision + 1,
    })),
  reset: () =>
    set({
      connected: false,
      messageRevision: 0,
      copouchRevision: 0,
    }),
}))
