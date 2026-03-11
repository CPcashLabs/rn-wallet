import { create } from "zustand"

type SocketState = {
  connected: boolean
  lastEventAt: number | null
  setConnected: (connected: boolean) => void
  touchEvent: () => void
}

export const useSocketStore = create<SocketState>(set => ({
  connected: false,
  lastEventAt: null,
  setConnected: connected => set({ connected }),
  touchEvent: () => set({ lastEventAt: Date.now() }),
}))

