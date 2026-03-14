import type { SupportStackParamList } from "@/app/navigation/types"

export type SupportRouteName = keyof SupportStackParamList

export type SupportRouteTarget<T extends SupportRouteName = SupportRouteName> = {
  screen: T
  params?: SupportStackParamList[T]
}

export function resolveSupportRoute(reason?: string): SupportRouteTarget {
  switch (reason) {
    case "no_network":
      return {
        screen: "NoNetworkScreen",
        params: { mode: "summary" },
      }
    case "no_network_info":
    case "route_load_failed":
      return {
        screen: "NoNetworkScreen",
        params: { mode: "details" },
      }
    case "unsupported_environment":
      return {
        screen: "NoWechatScreen",
      }
    case "wechat_interceptor":
      return {
        screen: "WechatInterceptorScreen",
      }
    case "not_found":
      return {
        screen: "NotFoundScreen",
      }
    case "add_desktop":
      return {
        screen: "AddDesktopGuideScreen",
      }
    default:
      return {
        screen: "MaintenanceScreen",
        params: reason ? { reason } : undefined,
      }
  }
}
