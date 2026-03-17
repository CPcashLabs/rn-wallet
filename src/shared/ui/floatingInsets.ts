const TAB_SHELL_ROUTE_NAMES = new Set(["HomeShellScreen", "MeShellScreen"])
const DEV_BUTTON_HEIGHT = 34

export function isTabShellRouteName(routeName: string | null | undefined) {
  return routeName ? TAB_SHELL_ROUTE_NAMES.has(routeName) : false
}

export function getDevConsoleBottomOffset(routeName: string | null | undefined, bottomInset: number) {
  const resolvedInset = Math.max(bottomInset, 12)

  if (isTabShellRouteName(routeName)) {
    return resolvedInset + 60
  }

  return resolvedInset + 18
}

export function getFloatingOverlayContentInset(routeName: string | null | undefined, bottomInset: number) {
  const additionalSpacing = isTabShellRouteName(routeName) ? 16 : 18

  return getDevConsoleBottomOffset(routeName, bottomInset) + DEV_BUTTON_HEIGHT + additionalSpacing
}
