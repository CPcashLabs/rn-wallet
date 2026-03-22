const mockGetString = jest.fn()
const mockSetString = jest.fn()
const mockRemoveItem = jest.fn()

jest.mock("@/shared/storage/kvStorage", () => ({
  getString: (...args: unknown[]) => mockGetString(...args),
  setString: (...args: unknown[]) => mockSetString(...args),
  removeItem: (...args: unknown[]) => mockRemoveItem(...args),
}))

function loadTransferDraftStore() {
  jest.resetModules()
  return require("@/domains/wallet/transfer/store/useTransferDraftStore") as typeof import("@/domains/wallet/transfer/store/useTransferDraftStore")
}

describe("useTransferDraftStore", () => {
  beforeEach(() => {
    mockGetString.mockReset()
    mockSetString.mockReset()
    mockRemoveItem.mockReset()
  })

  it("hydrates the legacy transfer draft payload", () => {
    mockGetString.mockReturnValue(JSON.stringify({
      selectedChannel: {
        key: "tron",
        channelType: "normal",
        receiveChainName: "TRON",
        receiveChainFullName: "TRON",
        receiveChainColor: "#ff0000",
        receiveChainLogo: "tron.png",
        addressRegexes: ["^T"],
        title: "TRON",
        isRebate: false,
      },
      recipientAddress: "T123",
      recipientAddressSource: "recent",
      sendAmount: "10",
      note: "memo",
      selectedSendCoinCode: "USDT",
      selectedRecvCoinCode: "USDT",
      latestOrderSn: "ORDER_1",
      sendHistory: [
        {
          orderSn: "ORDER_1",
          kind: "sendToken",
          createdAt: 1,
        },
      ],
    }))

    const { useTransferDraftStore } = loadTransferDraftStore()

    expect(useTransferDraftStore.getState()).toMatchObject({
      selectedChannel: {
        key: "tron",
      },
      recipientAddress: "T123",
      recipientAddressSource: "recent",
      sendAmount: "10",
      note: "memo",
      selectedSendCoinCode: "USDT",
      selectedRecvCoinCode: "USDT",
      latestOrderSn: "ORDER_1",
      sendHistory: [
        {
          orderSn: "ORDER_1",
          kind: "sendToken",
          createdAt: 1,
        },
      ],
    })
  })

  it("resets draft fields when switching channels and persists the wrapped payload", () => {
    mockGetString.mockReturnValue(JSON.stringify({
      selectedChannel: {
        key: "tron",
        channelType: "normal",
        receiveChainName: "TRON",
        receiveChainFullName: "TRON",
        receiveChainColor: "#ff0000",
        receiveChainLogo: "tron.png",
        addressRegexes: ["^T"],
        title: "TRON",
        isRebate: false,
      },
      recipientAddress: "T123",
      recipientAddressSource: "manual",
      sendAmount: "10",
      note: "memo",
      selectedSendCoinCode: "USDT",
      selectedRecvCoinCode: "USDT",
      latestOrderSn: null,
      sendHistory: [],
    }))

    const { useTransferDraftStore } = loadTransferDraftStore()

    useTransferDraftStore.getState().setSelectedChannel({
      key: "bsc",
      channelType: "normal",
      receiveChainName: "BSC",
      receiveChainFullName: "Binance Smart Chain",
      receiveChainColor: "#ffff00",
      receiveChainLogo: "bsc.png",
      addressRegexes: ["^0x"],
      title: "BSC",
      subtitle: "Binance Smart Chain",
      isRebate: true,
    })

    expect(useTransferDraftStore.getState()).toMatchObject({
      selectedChannel: {
        key: "bsc",
      },
      recipientAddress: "",
      recipientAddressSource: null,
      sendAmount: "",
      note: "",
      selectedSendCoinCode: "",
      selectedRecvCoinCode: "",
    })
    expect(mockSetString).toHaveBeenLastCalledWith(
      "transfer.draft",
      JSON.stringify({
        state: {
          selectedChannel: {
            key: "bsc",
            channelType: "normal",
            receiveChainName: "BSC",
            receiveChainFullName: "Binance Smart Chain",
            receiveChainColor: "#ffff00",
            receiveChainLogo: "bsc.png",
            addressRegexes: ["^0x"],
            title: "BSC",
            isRebate: true,
          },
          recipientAddress: "",
          recipientAddressSource: null,
          sendAmount: "",
          note: "",
          selectedSendCoinCode: "",
          selectedRecvCoinCode: "",
          latestOrderSn: null,
          sendHistory: [],
        },
        version: 0,
      }),
    )
  })

  it("removes persisted transfer drafts when the draft is cleared", () => {
    mockGetString.mockReturnValue(JSON.stringify({
      selectedChannel: {
        key: "tron",
        channelType: "normal",
        receiveChainName: "TRON",
        receiveChainFullName: "TRON",
        receiveChainColor: "#ff0000",
        receiveChainLogo: "tron.png",
        addressRegexes: ["^T"],
        title: "TRON",
        isRebate: false,
      },
      recipientAddress: "T123",
      recipientAddressSource: "manual",
      sendAmount: "10",
      note: "memo",
      selectedSendCoinCode: "USDT",
      selectedRecvCoinCode: "USDT",
      latestOrderSn: "ORDER_1",
      sendHistory: [
        {
          orderSn: "ORDER_1",
          kind: "sendToken",
          createdAt: 1,
        },
      ],
    }))

    const { useTransferDraftStore } = loadTransferDraftStore()

    useTransferDraftStore.getState().clearDraft()

    expect(mockRemoveItem).toHaveBeenCalledWith("transfer.draft")
    expect(useTransferDraftStore.getState()).toMatchObject({
      selectedChannel: null,
      recipientAddress: "",
      recipientAddressSource: null,
      sendAmount: "",
      note: "",
      selectedSendCoinCode: "",
      selectedRecvCoinCode: "",
      latestOrderSn: null,
      sendHistory: [],
    })
  })
})

export {}
