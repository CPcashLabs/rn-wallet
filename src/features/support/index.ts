// Public surface of the support feature.
// Callers outside this feature must import only from this file.

// Screens
export { AddDesktopGuideScreen } from "./screens/AddDesktopGuideScreen"
export { MaintenanceScreen } from "./screens/MaintenanceScreen"
export { NoNetworkScreen } from "./screens/NoNetworkScreen"
export { NoWechatScreen } from "./screens/NoWechatScreen"
export { NotFoundScreen } from "./screens/NotFoundScreen"
export { WechatInterceptorScreen } from "./screens/WechatInterceptorScreen"

// Utils
export { resolveSupportRoute } from "./utils/supportRoutes"
export type { SupportRouteName, SupportRouteTarget } from "./utils/supportRoutes"
