export function isSocketAuthAckEvent(type?: string) {
  if (!type) {
    return false
  }

  const normalized = type.trim().toLowerCase()
  return normalized === "authenticated" || normalized === "auth_success" || normalized === "auth-ok"
}

export function isInternalSocketEvent(type?: string) {
  if (!type) {
    return false
  }

  const normalized = type.trim().toLowerCase()
  return normalized === "pong" || isSocketAuthAckEvent(normalized)
}
