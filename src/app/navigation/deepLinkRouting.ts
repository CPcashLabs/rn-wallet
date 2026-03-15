import type { RootRouteDescriptor } from "@/app/navigation/routeDescriptor"
import { resolveApiBaseUrl } from "@/shared/config/runtime"
import { deepLinkAdapter } from "@/shared/native"

export type DeepLinkResolution = {
  routes: RootRouteDescriptor[]
  index?: number
  pendingProtectedUrl?: string
}

const ALLOWED_WEB_HOSTS = new Set([
  "cp.cash",
  "charprotocol.com",
  "wallet.cp.cash",
  "wallet-preview.cp.cash",
  "charprotocol.dev",
  "wallet.charprotocol.com",
  "wallet.charprotocol.dev",
  "share.cpcash.app",
])

const CONTROL_CHARACTERS_PATTERN = /[\u0000-\u001F\u007F]/g
const SAFE_DIAGNOSTIC_HOST_PATTERN = /^[A-Za-z0-9.-]+(?::\d+)?$/
const SAFE_PUBLIC_BASE_URL_PATTERN = /^https?:\/\/[A-Za-z0-9.-]+(?::\d+)?$/i
const SAFE_ROUTE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/
const SAFE_INVITE_CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/
const SAFE_CHAIN_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_-]{0,31}$/
const SAFE_TXID_PATTERN = /^(?:0x)?[A-Fa-f0-9]{64}$/
const SAFE_EVM_ADDRESS_PATTERN = /^(?:0x|0X)?[A-Fa-f0-9]{40}$/
const SAFE_TRON_ADDRESS_PATTERN = /^T[a-zA-Z0-9]{33}$/
const SAFE_CHAIN_COLOR_PATTERN = /^#(?:[A-Fa-f0-9]{3}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/
const MAX_DIAGNOSTIC_PATH_LENGTH = 512
const MAX_TARGET_PATH_LENGTH = 1024

type InviteScreenName =
  | "InviteHomeScreen"
  | "InviteCodeScreen"
  | "InvitePromotionScreen"
  | "InviteHowItWorksScreen"

type NestedScreenParams = {
  screen?: string
  params?: Record<string, unknown> | NestedScreenParams
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object"
}

function stripControlCharacters(value: string) {
  return value.replace(CONTROL_CHARACTERS_PATTERN, "")
}

function hasControlCharacters(value: string) {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index)
    if (code <= 0x1f || code === 0x7f) {
      return true
    }
  }

  return false
}

function truncateWithEllipsis(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value
  }

  return `${value.slice(0, maxLength - 1)}…`
}

function buildRelativeDeepLink(
  pathSegments: string[],
  queryEntries: Array<[string, string | undefined]> = [],
) {
  const path = pathSegments.length ? `/${pathSegments.map(segment => encodeURIComponent(segment)).join("/")}` : "/"
  const query = new URLSearchParams()

  for (const [key, value] of queryEntries) {
    if (value) {
      query.set(key, value)
    }
  }

  const serializedQuery = query.toString()

  return serializedQuery ? `${path}?${serializedQuery}` : path
}

function buildAbsoluteDeepLink(
  baseUrl: string | undefined,
  pathSegments: string[],
  queryEntries: Array<[string, string | undefined]>,
) {
  const relativePath = buildRelativeDeepLink(pathSegments, queryEntries)

  if (!baseUrl) {
    return relativePath
  }

  return `${baseUrl.replace(/\/+$/, "")}${relativePath}`
}

function asNestedScreenParams(value: unknown) {
  return isRecord(value) ? (value as NestedScreenParams) : undefined
}

function readRecordString(record: Record<string, unknown> | undefined, key: string) {
  const value = record?.[key]
  return typeof value === "string" ? value : undefined
}

function readRecordBoolean(record: Record<string, unknown> | undefined, key: string) {
  return record?.[key] === true
}

function readPublicBaseUrl(value: unknown) {
  return typeof value === "string" && SAFE_PUBLIC_BASE_URL_PATTERN.test(value) ? value.replace(/\/+$/, "") : undefined
}

function toResolution(routes: RootRouteDescriptor[], index = routes.length - 1): DeepLinkResolution {
  return {
    routes,
    index,
  }
}

function toNotFound(url: string): DeepLinkResolution {
  const path = sanitizeDiagnosticPath(url)

  return toResolution([
    {
      name: "SupportStack",
      params: {
        screen: "NotFoundScreen",
        params: path ? { path } : undefined,
      },
    },
  ])
}

function toLogin(inviteCode?: string): RootRouteDescriptor<"AuthStack"> {
  return {
    name: "AuthStack",
    params: {
      screen: "LoginScreen",
      params: inviteCode ? { inviteCode } : undefined,
    },
  }
}

function toHomeTab(inviteCode?: string): RootRouteDescriptor<"MainTabs"> {
  return {
    name: "MainTabs",
    params: {
      screen: "HomeTab",
      params: {
        screen: "HomeShellScreen",
        params: inviteCode ? { inviteCode } : undefined,
      },
    },
  }
}

function toMeTab(screen: InviteScreenName | "MeShellScreen" = "MeShellScreen"): RootRouteDescriptor<"MainTabs"> {
  return {
    name: "MainTabs",
    params: {
      screen: "MeTab",
      params: {
        screen,
      },
    },
  }
}

function toOrderDetail(orderSn: string): RootRouteDescriptor<"OrdersStack"> {
  return {
    name: "OrdersStack",
    params: {
      screen: "OrderDetailScreen",
      params: {
        orderSn,
        source: "manual",
      },
    },
  }
}

function toOrderStackScreen(
  screen:
    | "SplitDetailScreen"
    | "OrderVoucherScreen"
    | "DigitalReceiptScreen"
    | "FlowProofScreen"
    | "RefundDetailScreen",
  orderSn: string,
): RootRouteDescriptor<"OrdersStack"> {
  return {
    name: "OrdersStack",
    params: {
      screen,
      params: {
        orderSn,
      },
    },
  }
}

function toOrderBill(): RootRouteDescriptor<"OrdersStack"> {
  return {
    name: "OrdersStack",
    params: {
      screen: "OrderBillScreen",
    },
  }
}

function toTxPayStatus(orderSn: string): RootRouteDescriptor<"TransferStack"> {
  return {
    name: "TransferStack",
    params: {
      screen: "TxPayStatusScreen",
      params: {
        orderSn,
      },
    },
  }
}

function toCopouchDetail(id: string): RootRouteDescriptor<"CopouchStack"> {
  return {
    name: "CopouchStack",
    params: {
      screen: "CopouchDetailScreen",
      params: {
        id,
      },
    },
  }
}

function toReceiveHome(params: {
  payChain?: string
  copouch?: string
  cowallet?: string
  multisigWalletId?: string
  collapse?: "individuals" | "business"
  chainColor?: string
  receiveMode?: "normal" | "trace"
}): RootRouteDescriptor<"ReceiveStack"> {
  return {
    name: "ReceiveStack",
    params: {
      screen: "ReceiveHomeScreen",
      params: {
        payChain: params.payChain,
        copouch: params.copouch ?? params.cowallet,
        cowallet: params.cowallet,
        multisigWalletId: params.multisigWalletId,
        collapse: params.collapse,
        chainColor: params.chainColor,
        receiveMode: params.receiveMode,
      },
    },
  }
}

function toPublicSendPaymentInfo(orderSn: string, publicBaseUrl?: string): RootRouteDescriptor<"TransferStack"> {
  return {
    name: "TransferStack",
    params: {
      screen: "SendPaymentInfoScreen",
      params: {
        orderSn,
        publicAccess: true,
        publicBaseUrl,
      },
    },
  }
}

function toPublicTxPayStatus(txid: string, publicBaseUrl?: string): RootRouteDescriptor<"TransferStack"> {
  return {
    name: "TransferStack",
    params: {
      screen: "TxPayStatusScreen",
      params: {
        publicAccess: true,
        publicTxid: txid,
        publicBaseUrl,
      },
    },
  }
}

function toWechatInterceptor(targetPath?: string): RootRouteDescriptor<"SupportStack"> {
  return {
    name: "SupportStack",
    params: {
      screen: "WechatInterceptorScreen",
      params: targetPath
        ? {
            targetPath,
          }
        : undefined,
    },
  }
}

function serializeAuthDeepLink(route: RootRouteDescriptor<"AuthStack">) {
  const params = asNestedScreenParams(route.params)
  const screenParams = isRecord(params?.params) ? (params.params as Record<string, unknown>) : undefined
  const inviteCode = readInviteCode(readRecordString(screenParams, "inviteCode"))

  if (params?.screen !== "LoginScreen" || !inviteCode) {
    return undefined
  }

  return buildRelativeDeepLink(["invite"], [["code", inviteCode]])
}

function serializeMainTabsDeepLink(route: RootRouteDescriptor<"MainTabs">) {
  const params = asNestedScreenParams(route.params)
  const nestedParams = asNestedScreenParams(params?.params)
  const screenParams = isRecord(nestedParams?.params) ? (nestedParams.params as Record<string, unknown>) : undefined

  if (params?.screen === "HomeTab" && nestedParams?.screen === "HomeShellScreen") {
    const inviteCode = readInviteCode(readRecordString(screenParams, "inviteCode"))
    return inviteCode ? buildRelativeDeepLink(["invite"], [["code", inviteCode]]) : undefined
  }

  if (params?.screen !== "MeTab") {
    return undefined
  }

  switch (nestedParams?.screen) {
    case "InviteHomeScreen":
      return buildRelativeDeepLink(["invite"])
    case "InviteCodeScreen":
      return buildRelativeDeepLink(["invite", "invitecode"])
    case "InvitePromotionScreen":
      return buildRelativeDeepLink(["invite", "promotion"])
    case "InviteHowItWorksScreen":
      return buildRelativeDeepLink(["invite", "how-it-works"])
    default:
      return undefined
  }
}

function serializeOrdersDeepLink(route: RootRouteDescriptor<"OrdersStack">) {
  const params = asNestedScreenParams(route.params)
  const screenParams = isRecord(params?.params) ? (params.params as Record<string, unknown>) : undefined
  const orderSn = readRouteId(readRecordString(screenParams, "orderSn"))

  switch (params?.screen) {
    case "OrderDetailScreen":
      return orderSn ? buildRelativeDeepLink(["orders", orderSn]) : undefined
    case "OrderVoucherScreen":
      return orderSn ? buildRelativeDeepLink(["order-voucher", orderSn]) : undefined
    case "DigitalReceiptScreen":
      return orderSn ? buildRelativeDeepLink(["digitalreceipt", orderSn]) : undefined
    case "FlowProofScreen":
      return orderSn ? buildRelativeDeepLink(["flowproof", orderSn]) : undefined
    case "RefundDetailScreen":
      return orderSn ? buildRelativeDeepLink(["refund", orderSn]) : undefined
    case "SplitDetailScreen":
      return orderSn ? buildRelativeDeepLink(["txlogs", "splitdetail", orderSn]) : undefined
    case "OrderBillScreen":
      return buildRelativeDeepLink(["orderbill"])
    default:
      return undefined
  }
}

function serializeTransferDeepLink(route: RootRouteDescriptor<"TransferStack">) {
  const params = asNestedScreenParams(route.params)
  const screenParams = isRecord(params?.params) ? (params.params as Record<string, unknown>) : undefined
  const publicBaseUrl = readPublicBaseUrl(readRecordString(screenParams, "publicBaseUrl"))

  if (params?.screen === "TxPayStatusScreen") {
    const orderSn = readRouteId(readRecordString(screenParams, "orderSn"))
    if (orderSn) {
      return buildRelativeDeepLink(["orders", orderSn, "status"])
    }

    const publicTxid = readTxid(readRecordString(screenParams, "publicTxid"))
    const publicAccess = readRecordBoolean(screenParams, "publicAccess")

    if (publicAccess && publicTxid) {
      return buildAbsoluteDeepLink(publicBaseUrl, ["share"], [["txid", publicTxid]])
    }

    return undefined
  }

  if (params?.screen === "SendPaymentInfoScreen") {
    const orderSn = readRouteId(readRecordString(screenParams, "orderSn"))
    const publicAccess = readRecordBoolean(screenParams, "publicAccess")

    if (publicAccess && orderSn) {
      return buildAbsoluteDeepLink(publicBaseUrl, ["send"], [["share", orderSn]])
    }
  }

  return undefined
}

function serializeReceiveDeepLink(route: RootRouteDescriptor<"ReceiveStack">) {
  const params = asNestedScreenParams(route.params)
  const screenParams = isRecord(params?.params) ? (params.params as Record<string, unknown>) : undefined

  if (params?.screen !== "ReceiveHomeScreen") {
    return undefined
  }

  const payChain = readPayChain(readRecordString(screenParams, "payChain"))
  const copouch = readWalletAddress(readRecordString(screenParams, "copouch"))
  const cowallet = readWalletAddress(readRecordString(screenParams, "cowallet"))
  const multisigWalletId = readRouteId(readRecordString(screenParams, "multisigWalletId"))
  const collapse = readReceiveCollapse(readRecordString(screenParams, "collapse"))
  const chainColor = readChainColor(readRecordString(screenParams, "chainColor"))
  const receiveMode = readReceiveMode(readRecordString(screenParams, "receiveMode"))

  return buildRelativeDeepLink(["receive"], [
    ["payChain", payChain],
    ["copouch", cowallet ? undefined : copouch],
    ["cowallet", cowallet],
    ["multisigWalletId", multisigWalletId],
    ["collapse", collapse],
    ["chainColor", chainColor],
    ["receiveMode", receiveMode],
  ])
}

function serializeCopouchDeepLink(route: RootRouteDescriptor<"CopouchStack">) {
  const params = asNestedScreenParams(route.params)
  const screenParams = isRecord(params?.params) ? (params.params as Record<string, unknown>) : undefined
  const id = readRouteId(readRecordString(screenParams, "id"))

  if (params?.screen !== "CopouchDetailScreen" || !id) {
    return undefined
  }

  return buildRelativeDeepLink(["copouch", id])
}

export function serializeRouteDescriptorsAsDeepLink(routes: RootRouteDescriptor[]) {
  const route = routes[routes.length - 1]

  if (!route) {
    return undefined
  }

  switch (route.name) {
    case "AuthStack":
      return serializeAuthDeepLink(route as RootRouteDescriptor<"AuthStack">)
    case "MainTabs":
      return serializeMainTabsDeepLink(route as RootRouteDescriptor<"MainTabs">)
    case "OrdersStack":
      return serializeOrdersDeepLink(route as RootRouteDescriptor<"OrdersStack">)
    case "TransferStack":
      return serializeTransferDeepLink(route as RootRouteDescriptor<"TransferStack">)
    case "ReceiveStack":
      return serializeReceiveDeepLink(route as RootRouteDescriptor<"ReceiveStack">)
    case "CopouchStack":
      return serializeCopouchDeepLink(route as RootRouteDescriptor<"CopouchStack">)
    default:
      return undefined
  }
}

function withAuth(routes: RootRouteDescriptor[], authenticated: boolean, index = routes.length - 1): DeepLinkResolution {
  if (authenticated) {
    return toResolution(routes, index)
  }

  return {
    routes: [toLogin()],
    index: 0,
    pendingProtectedUrl: serializeRouteDescriptorsAsDeepLink(routes),
  }
}

function normalizeSegments(url: string) {
  const normalizedUrl = url.startsWith("/") ? `https://share.cpcash.app${url}` : url
  const parsed = deepLinkAdapter.parse(normalizedUrl)
  if (!parsed.isValid) {
    return null
  }

  const scheme = parsed.scheme?.toLowerCase() ?? null
  const host = parsed.host?.toLowerCase() ?? null

  if (scheme === "http" || scheme === "https") {
    if (!host || !ALLOWED_WEB_HOSTS.has(host)) {
      return null
    }

    return {
      parsed,
      segments: parsed.pathSegments,
    }
  }

  if (scheme !== "app" && scheme !== "cpcash") {
    return null
  }

  return {
    parsed,
    segments: parsed.host ? [parsed.host, ...parsed.pathSegments] : parsed.pathSegments,
  }
}

function resolvePublicBaseUrl(scheme?: string | null, host?: string | null) {
  if ((scheme !== "http" && scheme !== "https") || !host) {
    return undefined
  }

  if (host === "share.cpcash.app") {
    return resolveApiBaseUrl()
  }

  return `${scheme}://${host}`
}

function readString(value?: string) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function readBoundedString(value: string | undefined, maxLength: number) {
  const trimmed = readString(value)

  if (!trimmed || trimmed.length > maxLength || hasControlCharacters(trimmed)) {
    return undefined
  }

  return trimmed
}

function readPatternString(value: string | undefined, pattern: RegExp, maxLength: number) {
  const trimmed = readBoundedString(value, maxLength)

  if (!trimmed || !pattern.test(trimmed)) {
    return undefined
  }

  return trimmed
}

function readRouteId(value?: string) {
  return readPatternString(value, SAFE_ROUTE_ID_PATTERN, 128)
}

function readInviteCode(value?: string) {
  return readPatternString(value, SAFE_INVITE_CODE_PATTERN, 64)
}

function readPayChain(value?: string) {
  return readPatternString(value, SAFE_CHAIN_NAME_PATTERN, 32)
}

function readReceiveCollapse(value?: string) {
  return value === "individuals" || value === "business" ? value : undefined
}

function readReceiveMode(value?: string) {
  return value === "normal" || value === "trace" ? value : undefined
}

function readChainColor(value?: string) {
  return readPatternString(value, SAFE_CHAIN_COLOR_PATTERN, 16)
}

function readWalletAddress(value?: string) {
  const trimmed = readBoundedString(value, 64)

  if (!trimmed) {
    return undefined
  }

  if (SAFE_EVM_ADDRESS_PATTERN.test(trimmed) || SAFE_TRON_ADDRESS_PATTERN.test(trimmed)) {
    return trimmed
  }

  return undefined
}

function readTxid(value?: string) {
  return readPatternString(value, SAFE_TXID_PATTERN, 66)
}

function sanitizeDiagnosticPath(value: string) {
  const withoutControls = stripControlCharacters(value).trim()

  if (!withoutControls) {
    return undefined
  }

  if (withoutControls.startsWith("/")) {
    return truncateWithEllipsis(buildRelativeDeepLink(deepLinkAdapter.parse(`https://share.cpcash.app${withoutControls}`).pathSegments), MAX_DIAGNOSTIC_PATH_LENGTH)
  }

  const parsed = deepLinkAdapter.parse(withoutControls)

  if (!parsed.isValid) {
    return "invalid-link"
  }

  const scheme = parsed.scheme?.toLowerCase()

  if (scheme === "http" || scheme === "https") {
    const host = parsed.host?.toLowerCase()
    if (!host || !SAFE_DIAGNOSTIC_HOST_PATTERN.test(host)) {
      return "invalid-link"
    }

    return truncateWithEllipsis(`${scheme}://${host}${buildRelativeDeepLink(parsed.pathSegments)}`, MAX_DIAGNOSTIC_PATH_LENGTH)
  }

  if (scheme === "app" || scheme === "cpcash") {
    const head = readBoundedString(stripControlCharacters(parsed.host ?? ""), 128)
    const pathSegments = [head, ...parsed.pathSegments.map(segment => readBoundedString(stripControlCharacters(segment), 128))].filter(
      (segment): segment is string => Boolean(segment),
    )

    if (!pathSegments.length) {
      return `${scheme}://`
    }

    const [first, ...rest] = pathSegments
    const path = rest.length ? `/${rest.map(segment => encodeURIComponent(segment)).join("/")}` : ""

    return truncateWithEllipsis(`${scheme}://${encodeURIComponent(first)}${path}`, MAX_DIAGNOSTIC_PATH_LENGTH)
  }

  return "unsupported-link"
}

function readValidatedQueryValue<T extends string>(
  query: Record<string, string>,
  keys: string[],
  reader: (value: string) => T | undefined,
): T | undefined | null {
  let resolved: T | undefined

  for (const key of keys) {
    const rawValue = readString(query[key])

    if (!rawValue) {
      continue
    }

    const value = reader(rawValue)

    if (!value) {
      return null
    }

    if (resolved && resolved !== value) {
      return null
    }

    resolved = value
  }

  return resolved
}

export function sanitizeWechatTargetPath(value?: string) {
  const trimmed = readBoundedString(value, MAX_TARGET_PATH_LENGTH)

  if (!trimmed) {
    return undefined
  }

  const nested = normalizeSegments(trimmed)
  const nestedHead = nested?.segments[0]?.toLowerCase()

  if (!nested || !nestedHead || nestedHead === "wechat-interceptor") {
    return undefined
  }

  const canonicalTargetPath = serializeRouteDescriptorsAsDeepLink(resolveDeepLink(trimmed, true).routes)

  return canonicalTargetPath
}

export function resolveDeepLink(url: string, authenticated: boolean): DeepLinkResolution {
  const normalized = normalizeSegments(url)
  if (!normalized) {
    return toNotFound(url)
  }

  const { parsed, segments } = normalized
  const head = segments[0]?.toLowerCase()

  if (!head) {
    return toNotFound(url)
  }

  switch (head) {
    case "orders": {
      const orderSn = readRouteId(segments[1])
      if (!orderSn) {
        return toNotFound(url)
      }

      if (segments.length === 2) {
        return withAuth([toHomeTab(), toOrderDetail(orderSn)], authenticated, 1)
      }

      if (segments.length === 3 && segments[2]?.toLowerCase() === "status") {
        return withAuth([toHomeTab(), toTxPayStatus(orderSn)], authenticated, 1)
      }

      return toNotFound(url)
    }

    case "order-voucher": {
      const orderSn = readRouteId(segments[1])
      if (!orderSn || segments.length !== 2) {
        return toNotFound(url)
      }

      return withAuth([toHomeTab(), toOrderStackScreen("OrderVoucherScreen", orderSn)], authenticated, 1)
    }

    case "digitalreceipt": {
      const orderSn = readRouteId(segments[1])
      if (!orderSn || segments.length !== 2) {
        return toNotFound(url)
      }

      return withAuth([toHomeTab(), toOrderStackScreen("DigitalReceiptScreen", orderSn)], authenticated, 1)
    }

    case "flowproof": {
      const orderSn = readRouteId(segments[1])
      if (!orderSn || segments.length !== 2) {
        return toNotFound(url)
      }

      return withAuth([toHomeTab(), toOrderStackScreen("FlowProofScreen", orderSn)], authenticated, 1)
    }

    case "refund": {
      const orderSn = readRouteId(segments[1])
      if (!orderSn || segments.length !== 2) {
        return toNotFound(url)
      }

      return withAuth([toHomeTab(), toOrderStackScreen("RefundDetailScreen", orderSn)], authenticated, 1)
    }

    case "orderbill": {
      if (segments.length !== 1) {
        return toNotFound(url)
      }

      return withAuth([toHomeTab(), toOrderBill()], authenticated, 1)
    }

    case "txlogs": {
      const section = segments[1]?.toLowerCase()
      const orderSn = readRouteId(segments[2])
      if (!section || !orderSn || segments.length !== 3) {
        return toNotFound(url)
      }

      if (section === "orderdetail") {
        return withAuth([toHomeTab(), toOrderDetail(orderSn)], authenticated, 1)
      }

      if (section === "txpaystatus") {
        return withAuth([toHomeTab(), toTxPayStatus(orderSn)], authenticated, 1)
      }

      if (section === "splitdetail") {
        return withAuth([toHomeTab(), toOrderStackScreen("SplitDetailScreen", orderSn)], authenticated, 1)
      }

      return toNotFound(url)
    }

    case "copouch":
    case "cowallet": {
      const isDirectDetail = segments.length === 2
      const isDetailPath = segments.length === 3 && segments[1]?.toLowerCase() === "detail"
      const id = readRouteId(isDetailPath ? segments[2] : segments[1])
      if (!id || (!isDirectDetail && !isDetailPath)) {
        return toNotFound(url)
      }

      return withAuth([toMeTab(), toCopouchDetail(id)], authenticated, 1)
    }

    case "invite": {
      const inviteCode = readValidatedQueryValue(parsed.query, ["code"], readInviteCode)
      if (inviteCode === null) {
        return toNotFound(url)
      }

      const screen = segments[1]?.toLowerCase()

      if (!screen) {
        if (inviteCode) {
          if (!authenticated) {
            return toResolution([toLogin(inviteCode)], 0)
          }

          return toResolution([toHomeTab(inviteCode)], 0)
        }

        return withAuth([toMeTab("InviteHomeScreen")], authenticated)
      }

      if (segments.length !== 2) {
        return toNotFound(url)
      }

      const screenMap: Record<string, InviteScreenName> = {
        invitecode: "InviteCodeScreen",
        promotion: "InvitePromotionScreen",
        "how-it-works": "InviteHowItWorksScreen",
      }
      const inviteScreen = screenMap[screen]
      if (!inviteScreen) {
        return toNotFound(url)
      }

      return withAuth([toMeTab(inviteScreen)], authenticated)
    }

    // These deep-link variants intentionally resolve to the same receive flow.
    case "receive":
    case "receive-detail":
    case "new-receive-detail": {
      if (segments.length !== 1) {
        return toNotFound(url)
      }

      const payChain = readValidatedQueryValue(parsed.query, ["payChain"], readPayChain)
      const copouch = readValidatedQueryValue(parsed.query, ["copouch", "cowallet"], readWalletAddress)
      const cowallet = readValidatedQueryValue(parsed.query, ["cowallet"], readWalletAddress)
      const multisigWalletId = readValidatedQueryValue(parsed.query, ["multisig_wallet_id", "multisigWalletId"], readRouteId)
      const collapse = readValidatedQueryValue(parsed.query, ["collapse"], readReceiveCollapse)
      const chainColor = readValidatedQueryValue(parsed.query, ["chain_color", "chainColor"], readChainColor)
      const receiveMode = readValidatedQueryValue(parsed.query, ["receiveMode"], readReceiveMode)

      if (
        payChain === null ||
        copouch === null ||
        cowallet === null ||
        multisigWalletId === null ||
        collapse === null ||
        chainColor === null ||
        receiveMode === null
      ) {
        return toNotFound(url)
      }

      return withAuth(
        [
          toHomeTab(),
          toReceiveHome({
            payChain: payChain ?? undefined,
            copouch: copouch ?? undefined,
            cowallet: cowallet ?? undefined,
            multisigWalletId: multisigWalletId ?? undefined,
            collapse: collapse ?? undefined,
            chainColor: chainColor ?? undefined,
            receiveMode: receiveMode ?? undefined,
          }),
        ],
        authenticated,
        1,
      )
    }

    case "wechat-interceptor": {
      if (segments.length !== 1) {
        return toNotFound(url)
      }

      const targetPath = readValidatedQueryValue(parsed.query, ["target", "path", "redirect"], sanitizeWechatTargetPath)
      if (targetPath === null) {
        return toNotFound(url)
      }

      return toResolution([toWechatInterceptor(targetPath)], 0)
    }

    case "send": {
      const publicBaseUrl = resolvePublicBaseUrl(parsed.scheme, parsed.host)

      if (segments.length === 2 && segments[1]?.toLowerCase() === "detail") {
        const txid = readValidatedQueryValue(parsed.query, ["txid"], readTxid)
        if (txid === null) {
          return toNotFound(url)
        }

        if (!txid) {
          return toNotFound(url)
        }

        return toResolution([toPublicTxPayStatus(txid, publicBaseUrl)], 0)
      }

      if (segments.length !== 1) {
        return toNotFound(url)
      }

      const orderSn = readValidatedQueryValue(parsed.query, ["share"], readRouteId)
      if (orderSn === null) {
        return toNotFound(url)
      }

      if (!orderSn) {
        return toNotFound(url)
      }

      return toResolution([toPublicSendPaymentInfo(orderSn, publicBaseUrl)], 0)
    }

    case "share": {
      if (segments.length !== 1) {
        return toNotFound(url)
      }

      const txid = readValidatedQueryValue(parsed.query, ["txid"], readTxid)
      if (txid === null) {
        return toNotFound(url)
      }

      if (!txid) {
        return toNotFound(url)
      }

      const publicBaseUrl = resolvePublicBaseUrl(parsed.scheme, parsed.host)

      return toResolution([toPublicTxPayStatus(txid, publicBaseUrl)], 0)
    }

    default:
      return toNotFound(url)
  }
}
