import { create } from "zustand"

type SocketState = {
  connected: boolean
  lastEventAt: number | null
  lastEvent: { type?: string; payload?: unknown; at: number } | null
  setConnected: (connected: boolean) => void
  touchEvent: (event?: { type?: string; payload?: unknown }) => void
}

export const useSocketStore = create<SocketState>(set => ({
  connected: false,
  lastEventAt: null,
  lastEvent: null,
  setConnected: connected => set({ connected }),
  touchEvent: event =>
    set({
      lastEventAt: Date.now(),
      lastEvent: {
        ...event,
        at: Date.now(),
      },
    }),
}))
