import type { RootRouteDescriptor } from "@/app/navigation/routeDescriptor"
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
  return toResolution([
    {
      name: "SupportStack",
      params: {
        screen: "NotFoundScreen",
        params: {
          path: url,
        },
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

function readString(value?: string) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function readReceiveCollapse(value?: string) {
  return value === "individuals" || value === "business" ? value : undefined
}

function readReceiveMode(value?: string) {
  return value === "normal" || value === "trace" ? value : undefined
}

function readChainColor(value?: string) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
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
      const orderSn = readString(segments[1])
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
      const orderSn = readString(segments[1])
      if (!orderSn || segments.length !== 2) {
        return toNotFound(url)
      }

      return withAuth([toHomeTab(), toOrderStackScreen("OrderVoucherScreen", orderSn)], url, authenticated, 1)
    }

    case "digitalreceipt": {
      const orderSn = readString(segments[1])
      if (!orderSn || segments.length !== 2) {
        return toNotFound(url)
      }

      return withAuth([toHomeTab(), toOrderStackScreen("DigitalReceiptScreen", orderSn)], url, authenticated, 1)
    }

    case "flowproof": {
      const orderSn = readString(segments[1])
      if (!orderSn || segments.length !== 2) {
        return toNotFound(url)
      }

      return withAuth([toHomeTab(), toOrderStackScreen("FlowProofScreen", orderSn)], url, authenticated, 1)
    }

    case "refund": {
      const orderSn = readString(segments[1])
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
      const orderSn = readString(segments[2])
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
      const id = readString(isDetailPath ? segments[2] : segments[1])
      if (!id || (!isDirectDetail && !isDetailPath)) {
        return toNotFound(url)
      }

      return withAuth([toMeTab(), toCopouchDetail(id)], url, authenticated, 1)
    }

    case "invite": {
      const inviteCode = readString(parsed.query.code)
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

    case "receive":
    case "receive-detail":
    case "new-receive-detail": {
      if (segments.length !== 1) {
        return toNotFound(url)
      }

      return withAuth(
        [
          toHomeTab(),
          toReceiveHome({
            payChain: readString(parsed.query.payChain),
            copouch: readString(parsed.query.copouch) ?? readString(parsed.query.cowallet),
            cowallet: readString(parsed.query.cowallet),
            multisigWalletId: readString(parsed.query.multisig_wallet_id) ?? readString(parsed.query.multisigWalletId),
            collapse: readReceiveCollapse(parsed.query.collapse),
            chainColor: readChainColor(parsed.query.chain_color) ?? readChainColor(parsed.query.chainColor),
            receiveMode: readReceiveMode(parsed.query.receiveMode),
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

      const targetPath = readString(parsed.query.target) ?? readString(parsed.query.path) ?? readString(parsed.query.redirect)
      return toResolution([toWechatInterceptor(targetPath)], 0)
    }

    case "send": {
      const publicBaseUrl =
        parsed.scheme === "http" || parsed.scheme === "https" ? `${parsed.scheme}://${parsed.host}` : undefined

      if (segments.length === 2 && segments[1]?.toLowerCase() === "detail") {
        const txid = readString(parsed.query.txid)
        if (!txid) {
          return toNotFound(url)
        }

        return toResolution([toPublicTxPayStatus(txid, publicBaseUrl)], 0)
      }

      if (segments.length !== 1) {
        return toNotFound(url)
      }

      const orderSn = readString(parsed.query.share)
      if (!orderSn) {
        return toNotFound(url)
      }

      return toResolution([toPublicSendPaymentInfo(orderSn, publicBaseUrl)], 0)
    }

    case "share": {
      if (segments.length !== 1) {
        return toNotFound(url)
      }

      const txid = readString(parsed.query.txid)
      if (!txid) {
        return toNotFound(url)
      }

      const publicBaseUrl =
        parsed.scheme === "http" || parsed.scheme === "https" ? `${parsed.scheme}://${parsed.host}` : undefined

      return toResolution([toPublicTxPayStatus(txid, publicBaseUrl)], 0)
    }

    default:
      return toNotFound(url)
  }
}
