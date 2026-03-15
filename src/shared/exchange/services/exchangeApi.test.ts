const mockResolveChainNameById = jest.fn()
const mockGetCoinList = jest.fn()
const mockRequestRebateExchangePairs = jest.fn()
const mockRequestCpCashAllowList = jest.fn()
const mockRequestCoinAllowList = jest.fn()
const mockRequestCpCashShow = jest.fn()

jest.mock("@/shared/api/walletAssets", () => ({
  getCoinList: (...args: unknown[]) => mockGetCoinList(...args),
  resolveChainNameById: (...args: unknown[]) => mockResolveChainNameById(...args),
}))

jest.mock("@/shared/exchange/services/exchangeClient", () => ({
  requestRebateExchangePairs: (...args: unknown[]) => mockRequestRebateExchangePairs(...args),
  requestCpCashAllowList: (...args: unknown[]) => mockRequestCpCashAllowList(...args),
  requestCoinAllowList: (...args: unknown[]) => mockRequestCoinAllowList(...args),
  requestCpCashShow: (...args: unknown[]) => mockRequestCpCashShow(...args),
}))

import {
  getTransferChannels,
  getTransferGasEstimate,
  getTransferOrderOptions,
  getTransferQuote,
} from "@/shared/exchange/services/exchangeApi"

describe("exchangeApi", () => {
  beforeEach(() => {
    mockResolveChainNameById.mockReset()
    mockGetCoinList.mockReset()
    mockRequestRebateExchangePairs.mockReset()
    mockRequestCpCashAllowList.mockReset()
    mockRequestCoinAllowList.mockReset()
    mockRequestCpCashShow.mockReset()
    mockResolveChainNameById.mockReturnValue("BTT")
  })

  it("builds transfer channels from bridge and normal allow-lists", async () => {
    mockRequestRebateExchangePairs.mockResolvedValue([{ recv_coin_code: "REBATE-USDT" }])
    mockRequestCpCashAllowList.mockResolvedValue([
      {
        chain_name: "ETH",
        chain_full_name: "Ethereum",
        chain_logo: "eth.png",
        chain_color: "#627eea",
        chain_address_format_regex: ["^0x"],
        exchange_pairs: [
          {
            recv_coin_code: "REBATE-USDT",
            recv_coin_symbol: "USDT",
            send_coin_code: "BTT-USDT",
            send_coin_symbol: "USDT",
          },
        ],
      },
      {
        chain_name: "ETH",
        chain_full_name: "Ethereum Duplicate",
        chain_logo: "ignored.png",
        chain_color: "#000000",
        chain_address_format_regex: [],
        exchange_pairs: [],
      },
    ])
    mockRequestCoinAllowList.mockResolvedValue([
      {
        chain_name: "BTT",
        chain_full_name: "BitTorrent Chain",
        chain_logo: "btt.png",
        chain_color: "#10d8ff",
        chain_address_format_regex: ["^T"],
        coins: [],
      },
      {
        chain_name: "ETH",
        chain_full_name: "Ethereum",
        chain_logo: "eth.png",
        chain_color: "#627eea",
        chain_address_format_regex: ["^0x"],
        coins: [],
      },
    ])

    await expect(getTransferChannels("199", "transfer")).resolves.toEqual([
      {
        key: "normal:BTT",
        channelType: "normal",
        receiveChainName: "BTT",
        receiveChainFullName: "BitTorrent Chain",
        receiveChainColor: "#10d8ff",
        receiveChainLogo: "btt.png",
        addressRegexes: ["^T"],
        title: "CPCash BTT",
        subtitle: "BitTorrent Chain",
        isRebate: false,
      },
      {
        key: "bridge:ETH",
        channelType: "bridge",
        receiveChainName: "ETH",
        receiveChainFullName: "Ethereum",
        receiveChainColor: "#627eea",
        receiveChainLogo: "eth.png",
        addressRegexes: ["^0x"],
        title: "ETH",
        subtitle: "Ethereum",
        isRebate: true,
      },
    ])

    expect(mockRequestCpCashAllowList).toHaveBeenCalledWith({
      group_by_type: 1,
      send_chain_name: "BTT",
    })
  })

  it("uses receive-intent bridge filters when loading receive channels", async () => {
    mockRequestRebateExchangePairs.mockResolvedValue([])
    mockRequestCpCashAllowList.mockResolvedValue([
      {
        chain_name: "TRON",
        chain_full_name: "TRON",
        chain_logo: "tron.png",
        chain_color: "#ff0013",
        chain_address_format_regex: ["^T"],
        exchange_pairs: [],
      },
    ])
    mockRequestCoinAllowList.mockResolvedValue([])

    await getTransferChannels("199", "receive")

    expect(mockRequestCpCashAllowList).toHaveBeenCalledWith({
      group_by_type: 0,
      recv_chain_name: "BTT",
      recv_coin_symbol: "USDT",
      send_coin_symbol: "USDT",
    })
  })

  it("throws a receive-channel-unavailable error when every source is empty", async () => {
    mockRequestRebateExchangePairs.mockResolvedValue([])
    mockRequestCpCashAllowList.mockRejectedValue(new Error("bridge unavailable"))
    mockRequestCoinAllowList.mockResolvedValue([])

    await expect(getTransferChannels("199")).rejects.toThrow("receive_channel_unavailable")
  })

  it("surfaces upstream allow-list failures when no channels are available", async () => {
    const normalError = new Error("normal allow list failed")
    mockRequestRebateExchangePairs.mockResolvedValue([])
    mockRequestCpCashAllowList.mockRejectedValue(new Error("bridge unavailable"))
    mockRequestCoinAllowList.mockRejectedValue(normalError)

    await expect(getTransferChannels("199")).rejects.toBe(normalError)
  })

  it("surfaces rebate failures when bridge and normal channels are both unavailable", async () => {
    const rebatesError = new Error("rebates failed")
    mockRequestRebateExchangePairs.mockRejectedValue(rebatesError)
    mockRequestCpCashAllowList.mockRejectedValue(new Error("bridge unavailable"))
    mockRequestCoinAllowList.mockResolvedValue([])

    await expect(getTransferChannels("199")).rejects.toBe(rebatesError)
  })

  it("builds bridge-only channels when the normal allow-list is null", async () => {
    mockRequestRebateExchangePairs.mockResolvedValue([])
    mockRequestCpCashAllowList.mockResolvedValue([
      {
        chain_name: "ETH",
        chain_full_name: "Ethereum",
        chain_logo: "eth.png",
        chain_color: "#627eea",
        chain_address_format_regex: ["^0x"],
        exchange_pairs: [],
      },
    ])
    mockRequestCoinAllowList.mockResolvedValue(null)

    await expect(getTransferChannels("199")).resolves.toEqual([
      {
        key: "bridge:ETH",
        channelType: "bridge",
        receiveChainName: "ETH",
        receiveChainFullName: "Ethereum",
        receiveChainColor: "#627eea",
        receiveChainLogo: "eth.png",
        addressRegexes: ["^0x"],
        title: "ETH",
        subtitle: "Ethereum",
        isRebate: false,
      },
    ])
  })

  it("builds bridge order options from exchange pairs and local coins", async () => {
    mockGetCoinList.mockResolvedValue([
      {
        code: "BTT-USDT",
        symbol: "USDT",
        name: "Tether",
        logo: "coin.png",
        chainName: "BTT",
        chainColor: "#10d8ff",
        contract: "0xcoin",
        price: 1,
        precision: 6,
      },
    ])
    mockRequestCpCashAllowList.mockResolvedValue([
      {
        chain_name: "ETH",
        chain_full_name: "Ethereum",
        chain_logo: "eth.png",
        chain_color: "#627eea",
        chain_address_format_regex: ["^0x"],
        exchange_pairs: [
          {
            recv_coin_code: "ETH-USDT",
            recv_coin_symbol: "USDT",
            send_coin_code: "BTT-USDT",
            send_coin_symbol: "",
          },
        ],
      },
    ])
    mockRequestCoinAllowList.mockResolvedValue(null)

    await expect(
      getTransferOrderOptions({
        sendChainName: "BTT",
        receiveChainName: "ETH",
        channelType: "bridge",
      }),
    ).resolves.toEqual({
      chainName: "ETH",
      chainFullName: "Ethereum",
      chainLogo: "eth.png",
      chainColor: "#627eea",
      options: [
        {
          sellerId: "",
          sendCoinCode: "BTT-USDT",
          sendCoinSymbol: "",
          recvCoinCode: "ETH-USDT",
          recvCoinSymbol: "USDT",
          feeAmount: 0,
          recvEstimateAmount: 0,
          sendMinAmount: 0,
          sendCoinContract: "0xcoin",
        },
      ],
    })
  })

  it("builds same-chain order options only from send-enabled coins", async () => {
    mockGetCoinList.mockResolvedValue([
      {
        code: "USDT",
        symbol: "USDT",
        name: "Tether",
        logo: "coin.png",
        chainName: "BTT",
        chainColor: "#10d8ff",
        contract: "0xusdt",
        price: 1,
        precision: 6,
      },
    ])
    mockRequestCpCashAllowList.mockResolvedValue(null)
    mockRequestCoinAllowList.mockResolvedValue([
      {
        chain_name: "BTT",
        chain_full_name: "BitTorrent Chain",
        chain_logo: "btt.png",
        chain_color: "#10d8ff",
        chain_address_format_regex: ["^T"],
        coins: [
          {
            coin_code: "USDT",
            coin_symbol: "USDT",
            is_send_allowed: true,
            is_recv_allowed: true,
          },
          {
            coin_code: "BTT",
            coin_symbol: "BTT",
            is_send_allowed: false,
            is_recv_allowed: true,
          },
        ],
      },
    ])

    await expect(
      getTransferOrderOptions({
        sendChainName: "BTT",
        receiveChainName: "BTT",
        channelType: "normal",
      }),
    ).resolves.toEqual({
      chainName: "BTT",
      chainFullName: "BitTorrent Chain",
      chainLogo: "btt.png",
      chainColor: "#10d8ff",
      options: [
        {
          sellerId: "",
          sendCoinCode: "USDT",
          sendCoinSymbol: "USDT",
          recvCoinCode: "",
          recvCoinSymbol: "",
          feeAmount: 0,
          recvEstimateAmount: 0,
          sendMinAmount: 0,
          sendCoinContract: "0xusdt",
        },
      ],
    })
  })

  it("maps sparse bridge and same-chain option fallbacks", async () => {
    mockGetCoinList.mockResolvedValue([
      {
        code: "USDT",
        symbol: "USDT-SYM",
        name: "Tether",
        logo: "coin.png",
        chainName: "BTT",
        chainColor: "#10d8ff",
        contract: "0xusdt",
        price: 1,
        precision: 6,
      },
      {
        code: "COIN_A",
        symbol: "COIN-SYM",
        name: "Coin A",
        logo: "coin-a.png",
        chainName: "BTT",
        chainColor: "#10d8ff",
        contract: "0xcoin-a",
        price: 1,
        precision: 6,
      },
    ])
    mockRequestRebateExchangePairs.mockRejectedValue(new Error("rebates unavailable"))
    mockRequestCpCashAllowList.mockResolvedValue([
      {
        chain_name: "ETH",
        exchange_pairs: [
          {
            send_coin_code: "COIN_A",
            recv_coin_code: "ETH-USDT",
          },
          {
            send_coin_code: "CODE_ONLY",
            recv_coin_code: "ETH-ONLY",
          },
          {
            send_coin_code: undefined,
            recv_coin_code: undefined,
          },
        ],
      },
    ])
    mockRequestCoinAllowList.mockResolvedValue([
      {
        chain_name: "BTT",
        coins: [
          {
            coin_code: "USDT",
            is_send_allowed: true,
          },
          {
            coin_code: "RAW",
            is_send_allowed: true,
          },
          {
            coin_code: undefined,
            is_send_allowed: true,
          },
        ],
      },
    ])

    await expect(
      getTransferOrderOptions({
        sendChainName: "BTT",
        receiveChainName: "ETH",
        channelType: "bridge",
      }),
    ).resolves.toEqual({
      chainName: "ETH",
      chainFullName: "ETH",
      chainLogo: "",
      chainColor: "",
      options: [
        {
          sellerId: "",
          sendCoinCode: "COIN_A",
          sendCoinSymbol: "COIN-SYM",
          recvCoinCode: "ETH-USDT",
          recvCoinSymbol: "ETH-USDT",
          feeAmount: 0,
          recvEstimateAmount: 0,
          sendMinAmount: 0,
          sendCoinContract: "0xcoin-a",
        },
        {
          sellerId: "",
          sendCoinCode: "CODE_ONLY",
          sendCoinSymbol: "CODE_ONLY",
          recvCoinCode: "ETH-ONLY",
          recvCoinSymbol: "ETH-ONLY",
          feeAmount: 0,
          recvEstimateAmount: 0,
          sendMinAmount: 0,
          sendCoinContract: "",
        },
        {
          sellerId: "",
          sendCoinCode: "",
          sendCoinSymbol: "",
          recvCoinCode: "",
          recvCoinSymbol: "",
          feeAmount: 0,
          recvEstimateAmount: 0,
          sendMinAmount: 0,
          sendCoinContract: "",
        },
      ],
    })
    await expect(
      getTransferOrderOptions({
        sendChainName: "BTT",
        receiveChainName: "BTT",
        channelType: "normal",
      }),
    ).resolves.toEqual({
      chainName: "BTT",
      chainFullName: "BTT",
      chainLogo: "",
      chainColor: "",
      options: [
        {
          sellerId: "",
          sendCoinCode: "USDT",
          sendCoinSymbol: "USDT-SYM",
          recvCoinCode: "",
          recvCoinSymbol: "",
          feeAmount: 0,
          recvEstimateAmount: 0,
          sendMinAmount: 0,
          sendCoinContract: "0xusdt",
        },
        {
          sellerId: "",
          sendCoinCode: "RAW",
          sendCoinSymbol: "RAW",
          recvCoinCode: "",
          recvCoinSymbol: "",
          feeAmount: 0,
          recvEstimateAmount: 0,
          sendMinAmount: 0,
          sendCoinContract: "",
        },
        {
          sellerId: "",
          sendCoinCode: "",
          sendCoinSymbol: "",
          recvCoinCode: "",
          recvCoinSymbol: "",
          feeAmount: 0,
          recvEstimateAmount: 0,
          sendMinAmount: 0,
          sendCoinContract: "",
        },
      ],
    })
  })

  it("returns a fixed transfer gas estimate", async () => {
    await expect(
      getTransferGasEstimate({
        chainName: "BTT",
        contractAddress: "0xcontract",
      }),
    ).resolves.toEqual({
      gasLimit: 100000,
    })
  })

  it("maps transfer quote payloads with number normalization", async () => {
    mockRequestCpCashShow.mockResolvedValue({
      fee_amount: "0.5",
      fee_value: "1.25",
      recv_amount: "10.1",
      recv_coin_code: "USDT",
      recv_coin_name: "Tether USD",
      send_amount: "11.6",
      send_coin_code: "BTT",
      send_coin_name: "BTT",
      send_min_amount: "5",
      send_max_amount: "50",
      seller_id: "77",
    })

    await expect(
      getTransferQuote({
        sendCoinCode: "BTT",
        recvCoinCode: "USDT",
        recvAmount: 10,
      }),
    ).resolves.toEqual({
      feeAmount: 0.5,
      feeValue: 1.25,
      recvAmount: 10.1,
      recvCoinCode: "USDT",
      recvCoinName: "Tether USD",
      sendAmount: 11.6,
      sendCoinCode: "BTT",
      sendCoinName: "BTT",
      sendMinAmount: 5,
      sendMaxAmount: 50,
      sellerId: 77,
    })

    expect(mockRequestCpCashShow).toHaveBeenCalledWith({
      send_coin_code: "BTT",
      recv_coin_code: "USDT",
      recv_amount: 10,
      rate_type: 1,
    })
  })

  it("maps transfer quote fallbacks to coin codes and numeric defaults", async () => {
    mockRequestCpCashShow.mockResolvedValue({
      recv_coin_name: undefined,
      send_coin_name: undefined,
    })

    await expect(
      getTransferQuote({
        sendCoinCode: "BTT",
        recvCoinCode: "USDT",
        recvAmount: 5,
      }),
    ).resolves.toEqual({
      feeAmount: 0,
      feeValue: 0,
      recvAmount: 0,
      recvCoinCode: "",
      recvCoinName: "",
      sendAmount: 0,
      sendCoinCode: "",
      sendCoinName: "",
      sendMinAmount: 0,
      sendMaxAmount: 0,
      sellerId: 0,
    })
  })

  it("falls back to the requested receive chain name when bridge metadata is entirely missing", async () => {
    mockGetCoinList.mockResolvedValue([])
    mockRequestCpCashAllowList.mockResolvedValue([
      {
        chain_name: undefined,
        exchange_pairs: [],
      },
    ])
    mockRequestCoinAllowList.mockResolvedValue(null)

    await expect(
      getTransferOrderOptions({
        sendChainName: "BTT",
        receiveChainName: undefined as never,
        channelType: "bridge",
      }),
    ).resolves.toEqual({
      chainName: "undefined",
      chainFullName: "undefined",
      chainLogo: "",
      chainColor: "",
      options: [],
    })
  })
})
