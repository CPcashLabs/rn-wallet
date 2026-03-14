export function parseDecimalInput(value: string) {
  const normalized = value.replace(/[^0-9.]/g, "")
  const [integer = "", decimal = ""] = normalized.split(".")

  if (!normalized.includes(".")) {
    return integer
  }

  return `${integer}.${decimal.slice(0, 6)}`
}

export function formatAmount(value: number, digits = 4) {
  if (!Number.isFinite(value)) {
    return "0"
  }

  return value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  })
}

export function makeMockTxid(signature: string) {
  const compact = signature.replace(/^0x/, "").slice(0, 64).padEnd(64, "0")
  return `0x${compact}`
}

export function isCancelledAction(error: unknown) {
  if (!(error instanceof Error)) {
    return false
  }

  const code = Reflect.get(error, "code")

  return (
    (typeof code === "string" && /cancel|reject/i.test(code)) ||
    /cancel|reject|denied/i.test(error.message) ||
    /cancel|reject/i.test(error.name)
  )
}

export function resolveCountdownStorageKey(orderSn: string) {
  return `paying_countdown_${orderSn}`
}

export function resolveOrderProgress(input: {
  statusName: string
  status: number
  txid: string
}) {
  const statusText = input.statusName.toLowerCase()

  if (input.status === 4) {
    return "success" as const
  }

  if (input.status < 0) {
    return "closed" as const
  }

  if (input.status === 5) {
    return "broadcasted" as const
  }

  if (/close|cancel|timeout|expired|fail/.test(statusText)) {
    return "closed" as const
  }

  if (/success|completed|finished|paid|received|accounted|done/.test(statusText)) {
    return "success" as const
  }

  if (input.status >= 20) {
    return "success" as const
  }

  if (input.status < 0) {
    return "closed" as const
  }

  if (input.txid) {
    return "broadcasted" as const
  }

  return "pending" as const
}
