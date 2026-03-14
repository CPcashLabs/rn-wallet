import {
  OrderStatus,
  buildFlowProofRange,
  buildRangeSelection,
  isIncomingOrderType,
  resolveCounterpartyAddress,
  resolveDetailCounterparty,
  resolveOrderExplorerUrl,
  resolveOrderTypeLabel,
  resolveQuickRange,
  shouldShowVoucherAction,
} from "@/features/orders/utils/orderHelpers"

const t = (key: string) => key

describe("orderHelpers", () => {
  afterEach(() => {
    jest.useRealTimers()
  })

  it("detects incoming order types case-insensitively", () => {
    expect(isIncomingOrderType("receipt")).toBe(true)
    expect(isIncomingOrderType("TRACE_CHILD")).toBe(true)
    expect(isIncomingOrderType("payment")).toBe(false)
  })

  it("maps order type labels to translation keys", () => {
    expect(resolveOrderTypeLabel(t, "send_token_receive")).toBe("orders.types.sendToken")
    expect(resolveOrderTypeLabel(t, "SEND")).toBe("orders.types.sendCode")
    expect(resolveOrderTypeLabel(t, "receipt_fixed")).toBe("orders.types.receipt")
    expect(resolveOrderTypeLabel(t, "")).toBe("orders.types.unknown")
  })

  it("resolves the counterparty address for incoming orders", () => {
    const order = {
      orderType: "RECEIPT",
      paymentAddress: "payment-address",
      transferAddress: "transfer-address",
      depositAddress: "deposit-address",
      receiveAddress: "receive-address",
    }

    expect(resolveCounterpartyAddress(order)).toBe("payment-address")
    expect(resolveDetailCounterparty(order)).toBe("payment-address")
  })

  it("resolves the counterparty address for outgoing orders", () => {
    const order = {
      orderType: "SEND",
      paymentAddress: "payment-address",
      transferAddress: "transfer-address",
      depositAddress: "deposit-address",
      receiveAddress: "receive-address",
    }

    expect(resolveCounterpartyAddress(order)).toBe("receive-address")
    expect(resolveDetailCounterparty(order)).toBe("receive-address")
  })

  it("builds quick ranges from the current local day", () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date(2026, 2, 15, 10, 20, 30, 456))

    const range = resolveQuickRange("today")

    expect(range).not.toBeNull()
    expect(range?.startedTimestamp).toBe(new Date(2026, 2, 15, 0, 0, 0, 0).getTime())
    expect(range?.endedTimestamp).toBe(new Date(2026, 2, 15, 23, 59, 59, 999).getTime())
    expect(range?.startedAt).toBe("2026-03-15 00:00:00")
    expect(range?.endedAt).toBe("2026-03-15 23:59:59")
  })

  it("keeps all-range selections empty", () => {
    expect(buildRangeSelection("all")).toEqual({
      preset: "all",
      startedAt: undefined,
      endedAt: undefined,
      startedTimestamp: undefined,
      endedTimestamp: undefined,
    })
  })

  it("builds flow proof ranges from the order creation date", () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date(2026, 2, 15, 10, 20, 30, 456))

    const range = buildFlowProofRange({ createdAt: new Date(2026, 1, 10, 18, 45, 0, 0).getTime() }, "sinceCreated")

    expect(range.startedTimestamp).toBe(new Date(2026, 1, 10, 0, 0, 0, 0).getTime())
    expect(range.endedTimestamp).toBe(new Date(2026, 2, 15, 23, 59, 59, 999).getTime())
    expect(range.startedAt).toBe("2026-02-10 00:00:00")
    expect(range.endedAt).toBe("2026-03-15 23:59:59")
  })

  it("shows voucher actions only for supported outgoing statuses", () => {
    expect(shouldShowVoucherAction("SEND", OrderStatus.BuyerPaid)).toBe(true)
    expect(shouldShowVoucherAction("SEND", OrderStatus.TimeoutClosed)).toBe(false)
    expect(shouldShowVoucherAction("RECEIPT", OrderStatus.BuyerPaid)).toBe(false)
  })

  it("picks the correct explorer URL source for each order direction", () => {
    expect(
      resolveOrderExplorerUrl({
        orderType: "RECEIPT",
        sendChainBrowsers: [{ addressUrl: "", logo: "", txIdUrl: "https://send.example/tx", url: "" }],
        recvChainBrowsers: [{ addressUrl: "", logo: "", txIdUrl: "https://recv.example/tx", url: "" }],
      }),
    ).toBe("https://send.example/tx")

    expect(
      resolveOrderExplorerUrl({
        orderType: "SEND",
        sendChainBrowsers: [{ addressUrl: "", logo: "", txIdUrl: "https://send.example/tx", url: "" }],
        recvChainBrowsers: [{ addressUrl: "https://recv.example/address", logo: "", txIdUrl: "", url: "" }],
      }),
    ).toBe("https://recv.example/address")
  })
})
