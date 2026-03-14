import { create } from "zustand"

import type { RootRouteDescriptor } from "@/app/navigation/routeDescriptor"

type NavigationState = {
  lastRouteName: string | null
  pendingSupportReason: string | null
  recoverableRoute: RootRouteDescriptor | null
  pendingProtectedUrl: string | null
  setLastRouteName: (routeName: string | null) => void
  setPendingSupportReason: (reason: string | null) => void
  setRecoverableRoute: (route: RootRouteDescriptor | null) => void
  setPendingProtectedUrl: (url: string | null) => void
}

export const useNavigationStateStore = create<NavigationState>(set => ({
  lastRouteName: null,
  pendingSupportReason: null,
  recoverableRoute: null,
  pendingProtectedUrl: null,
  setLastRouteName: lastRouteName => set({ lastRouteName }),
  setPendingSupportReason: pendingSupportReason => set({ pendingSupportReason }),
  setRecoverableRoute: recoverableRoute => set({ recoverableRoute }),
  setPendingProtectedUrl: pendingProtectedUrl => set({ pendingProtectedUrl }),
}))
