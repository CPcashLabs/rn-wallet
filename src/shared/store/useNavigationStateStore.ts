import { create } from "zustand"

type NavigationState = {
  lastRouteName: string | null
  pendingSupportReason: string | null
  setLastRouteName: (routeName: string | null) => void
  setPendingSupportReason: (reason: string | null) => void
}

export const useNavigationStateStore = create<NavigationState>(set => ({
  lastRouteName: null,
  pendingSupportReason: null,
  setLastRouteName: lastRouteName => set({ lastRouteName }),
  setPendingSupportReason: pendingSupportReason => set({ pendingSupportReason }),
}))

