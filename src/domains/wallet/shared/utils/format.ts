function pad(value: number) {
  return String(value).padStart(2, "0")
}

function formatWalletNumber(value: number, options: { minimumFractionDigits: number; maximumFractionDigits: number }) {
  if (!Number.isFinite(value)) {
    return options.minimumFractionDigits > 0 ? "0.00" : "0"
  }

  return value.toLocaleString("en-US", options)
}

export function formatWalletAddress(address?: string, head = 6, tail = 4) {
  if (!address) {
    return ""
  }

  if (address.length <= head + tail + 3) {
    return address
  }

  return `${address.slice(0, head)}...${address.slice(-tail)}`
}

export function formatWalletDateTime(timestamp: number | null) {
  if (!timestamp) {
    return "--"
  }

  try {
    return new Date(timestamp).toLocaleString()
  } catch {
    return "--"
  }
}

export function formatWalletAmount(value: number) {
  return formatWalletNumber(value, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatWalletInteger(value: number) {
  return formatWalletNumber(value, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

export function formatWalletMonthKey(timestamp: number | null) {
  const date = timestamp ? new Date(timestamp) : new Date(0)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`
}

export function formatWalletMonthLabel(monthKey: string) {
  return monthKey
}

export function formatWalletDayKey(timestamp: number | null) {
  const date = timestamp ? new Date(timestamp) : new Date(0)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function formatWalletDayLabel(dateKey: string) {
  return dateKey.length >= 10 ? dateKey.slice(5) : "--"
}

export function formatWalletRecordTime(timestamp: number | null) {
  if (!timestamp) {
    return "--"
  }

  const date = new Date(timestamp)
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}
