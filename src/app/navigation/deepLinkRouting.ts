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

function withAuth(routes: RootRouteDescriptor[], url: string, authenticated: boolean, index = routes.length - 1): DeepLinkResolution {
  if (authenticated) {
    return toResolution(routes, index)
  }

  return {
    routes: [toLogin()],
    index: 0,
    pendingProtectedUrl: url,
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

  if (!trimmed || trimmed.length > maxLength || CONTROL_CHARACTERS_PATTERN.test(trimmed)) {
    CONTROL_CHARACTERS_PATTERN.lastIndex = 0
    return undefined
  }

  CONTROL_CHARACTERS_PATTERN.lastIndex = 0
  return trimmed
}

function readPatternString(value: string | undefined, pattern: RegExp, maxLength = 128) {
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

function sanitizeDiagnosticPath(value?: string) {
  if (typeof value !== "string") {
    return undefined
  }

  const withoutControls = value.replace(CONTROL_CHARACTERS_PATTERN, "").trim()

  if (!withoutControls) {
    return undefined
  }

  if (withoutControls.length <= MAX_DIAGNOSTIC_PATH_LENGTH) {
    return withoutControls
  }

  return `${withoutControls.slice(0, MAX_DIAGNOSTIC_PATH_LENGTH - 1)}…`
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

  return trimmed
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
        return withAuth([toHomeTab(), toOrderDetail(orderSn)], url, authenticated, 1)
      }

      if (segments.length === 3 && segments[2]?.toLowerCase() === "status") {
        return withAuth([toHomeTab(), toTxPayStatus(orderSn)], url, authenticated, 1)
      }

      return toNotFound(url)
    }

    case "order-voucher": {
      const orderSn = readRouteId(segments[1])
      if (!orderSn || segments.length !== 2) {
        return toNotFound(url)
      }

      return withAuth([toHomeTab(), toOrderStackScreen("OrderVoucherScreen", orderSn)], url, authenticated, 1)
    }

    case "digitalreceipt": {
      const orderSn = readRouteId(segments[1])
      if (!orderSn || segments.length !== 2) {
        return toNotFound(url)
      }

      return withAuth([toHomeTab(), toOrderStackScreen("DigitalReceiptScreen", orderSn)], url, authenticated, 1)
    }

    case "flowproof": {
      const orderSn = readRouteId(segments[1])
      if (!orderSn || segments.length !== 2) {
        return toNotFound(url)
      }

      return withAuth([toHomeTab(), toOrderStackScreen("FlowProofScreen", orderSn)], url, authenticated, 1)
    }

    case "refund": {
      const orderSn = readRouteId(segments[1])
      if (!orderSn || segments.length !== 2) {
        return toNotFound(url)
      }

      return withAuth([toHomeTab(), toOrderStackScreen("RefundDetailScreen", orderSn)], url, authenticated, 1)
    }

    case "orderbill": {
      if (segments.length !== 1) {
        return toNotFound(url)
      }

      return withAuth([toHomeTab(), toOrderBill()], url, authenticated, 1)
    }

    case "txlogs": {
      const section = segments[1]?.toLowerCase()
      const orderSn = readRouteId(segments[2])
      if (!section || !orderSn || segments.length !== 3) {
        return toNotFound(url)
      }

      if (section === "orderdetail") {
        return withAuth([toHomeTab(), toOrderDetail(orderSn)], url, authenticated, 1)
      }

      if (section === "txpaystatus") {
        return withAuth([toHomeTab(), toTxPayStatus(orderSn)], url, authenticated, 1)
      }

      if (section === "splitdetail") {
        return withAuth([toHomeTab(), toOrderStackScreen("SplitDetailScreen", orderSn)], url, authenticated, 1)
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

      return withAuth([toMeTab(), toCopouchDetail(id)], url, authenticated, 1)
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

        return withAuth([toMeTab("InviteHomeScreen")], url, authenticated)
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

      return withAuth([toMeTab(inviteScreen)], url, authenticated)
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
        url,
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
