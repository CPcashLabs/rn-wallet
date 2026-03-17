import type { RootRouteDescriptor } from "@/app/navigation/routeDescriptor"

export function buildCopouchHomeRoute(): RootRouteDescriptor<"CopouchStack"> {
  return {
    name: "CopouchStack",
    params: {
      screen: "CopouchHomeScreen",
    },
  }
}

export function buildCopouchDetailRoute(id: string, walletBgColor?: number): RootRouteDescriptor<"CopouchStack"> {
  return {
    name: "CopouchStack",
    params: {
      screen: "CopouchDetailScreen",
      params: walletBgColor == null ? { id } : { id, walletBgColor },
    },
  }
}

export function buildCopouchAllocationRoute(id: string, orderSn: string): RootRouteDescriptor<"CopouchStack"> {
  return {
    name: "CopouchStack",
    params: {
      screen: "CopouchAllocationScreen",
      params: {
        id,
        orderSn,
      },
    },
  }
}

export function buildCopouchViewAllocationRoute(id: string, orderSn: string): RootRouteDescriptor<"CopouchStack"> {
  return {
    name: "CopouchStack",
    params: {
      screen: "CopouchViewAllocationScreen",
      params: {
        id,
        orderSn,
      },
    },
  }
}

export function openCopouchHome() {
  const { navigateRoot } = require("@/app/navigation/navigationRef") as typeof import("@/app/navigation/navigationRef")

  return navigateRoot("CopouchStack", buildCopouchHomeRoute().params!)
}

export function openCopouchAllocation(id: string, orderSn: string) {
  const { navigateRoot } = require("@/app/navigation/navigationRef") as typeof import("@/app/navigation/navigationRef")

  return navigateRoot("CopouchStack", buildCopouchAllocationRoute(id, orderSn).params!)
}

export function openCopouchViewAllocation(id: string, orderSn: string) {
  const { navigateRoot } = require("@/app/navigation/navigationRef") as typeof import("@/app/navigation/navigationRef")

  return navigateRoot("CopouchStack", buildCopouchViewAllocationRoute(id, orderSn).params!)
}
