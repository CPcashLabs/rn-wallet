import { resolveAcceptLanguage } from "@/shared/api/language-header"
import { readTokenPair } from "@/shared/api/auth-session"
import { resolveApiBaseUrl } from "@/shared/config/runtime"
import { documentExportAdapter } from "@/shared/native"

type ExportEnvelope = {
  code?: number | string
  message?: string
  data?: boolean | string
}

export type ExportOrderBillInput = {
  startedAt: string
  endedAt: string
  email: string
  orderSn?: string
  orderType?: string
  startedTimestamp?: number
  endedTimestamp?: number
}

export type ExportOrderBillResult =
  | {
      kind: "file"
      filename: string
    }
  | {
      kind: "confirmed"
      message?: string
    }

export async function exportOrderBillFile(input: ExportOrderBillInput): Promise<ExportOrderBillResult> {
  const tokenPair = await readTokenPair()
  const query = new URLSearchParams()

  appendQuery(query, "started_at", input.startedAt)
  appendQuery(query, "ended_at", input.endedAt)
  appendQuery(query, "email", input.email)
  appendQuery(query, "order_sn", input.orderSn)
  appendQuery(query, "order_type", input.orderType)
  appendQuery(query, "started_timestamp", input.startedTimestamp)
  appendQuery(query, "ended_timestamp", input.endedTimestamp)

  const response = await fetch(`${resolveApiBaseUrl()}/api/order/member/order/cp-cash-export?${query.toString()}`, {
    method: "GET",
    headers: {
      Accept: "text/csv,application/json;q=0.9,*/*;q=0.8",
      "Accept-Language": resolveAcceptLanguage(),
      ...(tokenPair?.accessToken ? { Authorization: `Bearer ${tokenPair.accessToken}` } : {}),
    },
  })

  const contentType = response.headers.get("content-type") ?? ""
  const contentDisposition = response.headers.get("content-disposition") ?? ""
  const body = await response.text()

  if (looksLikeJson(contentType, body)) {
    return handleEnvelopeResponse(response.ok, body)
  }

  if (!response.ok) {
    throw new Error(body.trim() || `Export failed with status ${response.status}`)
  }

  const filename = resolveExportFilename(contentDisposition, input)
  const result = await documentExportAdapter.exportFile({
    filename,
    content: body,
    mimeType: contentType.split(";")[0] || "text/csv",
  })

  if (!result.ok) {
    throw result.error
  }

  return {
    kind: "file",
    filename,
  }
}

function appendQuery(query: URLSearchParams, key: string, value: string | number | undefined) {
  if (value === undefined || value === null || value === "") {
    return
  }

  query.append(key, String(value))
}

function looksLikeJson(contentType: string, body: string) {
  if (contentType.toLowerCase().includes("application/json")) {
    return true
  }

  const trimmed = body.trim()
  return trimmed.startsWith("{") && trimmed.endsWith("}")
}

function handleEnvelopeResponse(ok: boolean, body: string): ExportOrderBillResult {
  let payload: ExportEnvelope | null = null

  try {
    payload = JSON.parse(body) as ExportEnvelope
  } catch {
    if (!ok) {
      throw new Error(body.trim() || "Export failed")
    }

    return {
      kind: "confirmed",
    }
  }

  if (!ok || Number(payload?.code) !== 200) {
    throw new Error(payload?.message || "Export failed")
  }

  return {
    kind: "confirmed",
    message: payload?.message,
  }
}

function resolveExportFilename(contentDisposition: string, input: ExportOrderBillInput) {
  const fromHeader = parseFilenameFromDisposition(contentDisposition)
  if (fromHeader) {
    return fromHeader
  }

  if (input.orderSn) {
    return `order_${input.orderSn}.csv`
  }

  const startedAt = input.startedAt.slice(0, 10)
  const endedAt = input.endedAt.slice(0, 10)
  return `bill_export_${startedAt}_${endedAt}.csv`
}

function parseFilenameFromDisposition(contentDisposition: string) {
  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1].trim())
  }

  const plainMatch = contentDisposition.match(/filename="?([^";]+)"?/i)
  if (plainMatch?.[1]) {
    return plainMatch[1].trim()
  }

  return null
}
