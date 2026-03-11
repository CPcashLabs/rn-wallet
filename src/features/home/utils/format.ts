export function formatAddress(address?: string, head = 6, tail = 4) {
  if (!address) return ""
  if (address.length <= head + tail + 3) return address
  return `${address.slice(0, head)}...${address.slice(-tail)}`
}

export function formatCurrency(value: number, currencySymbol = "$") {
  if (!Number.isFinite(value)) {
    return `${currencySymbol} --.--`
  }

  const formatter = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  return `${currencySymbol} ${formatter.format(value)}`
}

export function formatTokenAmount(value: number) {
  if (!Number.isFinite(value)) {
    return "--"
  }

  const formatter = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  })

  return formatter.format(value)
}

export function formatDateTime(timestamp: number | null) {
  if (!timestamp) {
    return "--"
  }

  try {
    return new Date(timestamp).toLocaleString()
  } catch {
    return "--"
  }
}
