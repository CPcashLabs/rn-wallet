import { Buffer } from "buffer"
import React from "react"

import { Image, StyleSheet, View } from "react-native"

import type { OrderListItem } from "@/features/orders/services/ordersApi"
import { useAppTheme } from "@/shared/theme/useAppTheme"

const SEND_CODE_TYPES = new Set(["SEND", "SEND_RECEIVE"])
const SEND_TOKEN_TYPES = new Set(["SEND_TOKEN", "SEND_TOKEN_RECEIVE"])
const ADDRESS_FROM_PAYMENT_TYPES = new Set([
  "RECEIPT",
  "RECEIPT_FIXED",
  "RECEIPT_NORMAL",
  "TRACE",
  "TRACE_LONG_TERM",
  "TRACE_CHILD",
  "SEND_TOKEN_RECEIVE",
])

const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
const BASE58_INDEX: Record<string, number> = Object.fromEntries(BASE58_ALPHABET.split("").map((char, index) => [char, index]))
const DEFAULT_SEED = 0x13579bdf

type Props = {
  item: OrderListItem
  size?: number
}

type AbstractAvatarModel = {
  backgroundColor: string
  bandColor: string
  bandWidth: number
  bandTop: number
  bandLeft: number
  bandRotate: number
  blobColor: string
  blobSize: number
  blobTop: number
  blobLeft: number
  accentColor: string
  accentWidth: number
  accentHeight: number
  accentRadius: number
  accentTop: number
  accentLeft: number
  accentRotate: number
  dotColor: string
  dotSize: number
  dotTop: number
  dotLeft: number
}

const SEND_CODE_AVATAR_MODEL: AbstractAvatarModel = {
  backgroundColor: "#FFEA00",
  bandColor: "#F59E0B",
  bandWidth: 0.22,
  bandTop: -0.14,
  bandLeft: 0.55,
  bandRotate: 31,
  blobColor: "#3563E9",
  blobSize: 0.56,
  blobTop: -0.1,
  blobLeft: -0.04,
  accentColor: "#FFD84D",
  accentWidth: 0.26,
  accentHeight: 0.26,
  accentRadius: 0.13,
  accentTop: 0.2,
  accentLeft: 0.46,
  accentRotate: 0,
  dotColor: "#FFF7AE",
  dotSize: 0.18,
  dotTop: 0.62,
  dotLeft: 0.12,
}

const SEND_TOKEN_AVATAR_MODEL: AbstractAvatarModel = {
  backgroundColor: "#F97316",
  bandColor: "#FFD84D",
  bandWidth: 0.24,
  bandTop: -0.18,
  bandLeft: 0.44,
  bandRotate: -35,
  blobColor: "#2F5BFF",
  blobSize: 0.52,
  blobTop: -0.05,
  blobLeft: 0.48,
  accentColor: "#EA580C",
  accentWidth: 0.34,
  accentHeight: 0.5,
  accentRadius: 0.12,
  accentTop: 0.22,
  accentLeft: 0.18,
  accentRotate: -12,
  dotColor: "#FB923C",
  dotSize: 0.16,
  dotTop: 0.08,
  dotLeft: 0.18,
}

const NATIVE_AVATAR_MODEL: AbstractAvatarModel = {
  backgroundColor: "#E2E8F0",
  bandColor: "#0F172A",
  bandWidth: 0.18,
  bandTop: -0.14,
  bandLeft: 0.56,
  bandRotate: 18,
  blobColor: "#60A5FA",
  blobSize: 0.48,
  blobTop: -0.02,
  blobLeft: 0.04,
  accentColor: "#14B8A6",
  accentWidth: 0.42,
  accentHeight: 0.22,
  accentRadius: 0.11,
  accentTop: 0.58,
  accentLeft: 0.22,
  accentRotate: 12,
  dotColor: "#0F172A",
  dotSize: 0.18,
  dotTop: 0.18,
  dotLeft: 0.62,
}

export function OrderCounterpartyAvatar(props: Props) {
  const size = props.size ?? 44
  const normalizedType = props.item.orderType.toUpperCase()

  if (SEND_CODE_TYPES.has(normalizedType)) {
    return <AbstractAvatar model={SEND_CODE_AVATAR_MODEL} size={size} />
  }

  if (normalizedType === "NATIVE") {
    return <AbstractAvatar model={NATIVE_AVATAR_MODEL} size={size} />
  }

  if (SEND_TOKEN_TYPES.has(normalizedType)) {
    return <AbstractAvatar model={SEND_TOKEN_AVATAR_MODEL} size={size} />
  }

  return (
    <AddressAvatar
      seedSource={resolveAvatarSeedSource(props.item)}
      size={size}
      uri={props.item.avatar}
    />
  )
}

function AddressAvatar(props: {
  size: number
  uri?: string
  seedSource: string
}) {
  const theme = useAppTheme()
  const [imageFailed, setImageFailed] = React.useState(false)
  const normalizedUri = props.uri?.trim() || ""
  const generatedModel = React.useMemo(
    () => createGeneratedAvatarModel(props.seedSource, theme.isDark),
    [props.seedSource, theme.isDark],
  )

  React.useEffect(() => {
    setImageFailed(false)
  }, [normalizedUri])

  if (normalizedUri && !imageFailed) {
    return (
      <Image
        onError={() => setImageFailed(true)}
        source={{ uri: normalizedUri }}
        style={[
          styles.imageShell,
          {
            width: props.size,
            height: props.size,
            borderRadius: props.size / 2,
            borderColor: theme.colors.glassBorder,
          },
        ]}
      />
    )
  }

  return <AbstractAvatar model={generatedModel} size={props.size} />
}

function AbstractAvatar(props: {
  size: number
  model: AbstractAvatarModel
}) {
  const theme = useAppTheme()
  const { model, size } = props

  return (
    <View
      style={[
        styles.avatarShell,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: model.backgroundColor,
          borderColor: theme.colors.glassBorder,
        },
      ]}
    >
      <View
        style={[
          styles.band,
          {
            width: size * model.bandWidth,
            height: size * 1.18,
            borderRadius: size * 0.16,
            backgroundColor: model.bandColor,
            top: size * model.bandTop,
            left: size * model.bandLeft,
            transform: [{ rotate: `${model.bandRotate}deg` }],
          },
        ]}
      />
      <View
        style={[
          styles.blob,
          {
            width: size * model.blobSize,
            height: size * model.blobSize,
            borderRadius: (size * model.blobSize) / 2,
            backgroundColor: model.blobColor,
            top: size * model.blobTop,
            left: size * model.blobLeft,
          },
        ]}
      />
      <View
        style={[
          styles.accent,
          {
            width: size * model.accentWidth,
            height: size * model.accentHeight,
            borderRadius: size * model.accentRadius,
            backgroundColor: model.accentColor,
            top: size * model.accentTop,
            left: size * model.accentLeft,
            transform: [{ rotate: `${model.accentRotate}deg` }],
          },
        ]}
      />
      <View
        style={[
          styles.dot,
          {
            width: size * model.dotSize,
            height: size * model.dotSize,
            borderRadius: (size * model.dotSize) / 2,
            backgroundColor: model.dotColor,
            top: size * model.dotTop,
            left: size * model.dotLeft,
          },
        ]}
      />
    </View>
  )
}

function resolveAvatarSeedSource(item: OrderListItem) {
  return resolveAvatarAddress(item) || item.walletAddress || item.orderSn || item.orderType || "counterparty"
}

function resolveAvatarAddress(item: Pick<OrderListItem, "orderType" | "paymentAddress" | "receiveAddress" | "transferAddress" | "depositAddress">) {
  const normalizedType = item.orderType.toUpperCase()

  if (ADDRESS_FROM_PAYMENT_TYPES.has(normalizedType)) {
    return item.paymentAddress || item.transferAddress || item.depositAddress || item.receiveAddress
  }

  return item.receiveAddress || item.transferAddress || item.depositAddress || item.paymentAddress
}

function createGeneratedAvatarModel(seedSource: string, isDark: boolean): AbstractAvatarModel {
  const seed = createAddressSeed(seedSource)
  const next = createSeededRandom(seed)
  const hue = Math.floor(next() * 360)
  const rotate = pickNumber(next, -42, 42)

  return {
    backgroundColor: toHsl(hue, 88, isDark ? 54 : 58),
    bandColor: toHsl((hue + 30 + Math.floor(next() * 72)) % 360, 82, isDark ? 68 : 64),
    bandWidth: pickNumber(next, 0.18, 0.26),
    bandTop: pickNumber(next, -0.18, -0.08),
    bandLeft: pickNumber(next, 0.16, 0.62),
    bandRotate: rotate,
    blobColor: toHsl((hue + 150 + Math.floor(next() * 54)) % 360, 74, isDark ? 46 : 49),
    blobSize: pickNumber(next, 0.42, 0.62),
    blobTop: pickNumber(next, -0.1, 0.16),
    blobLeft: pickNumber(next, -0.16, 0.2),
    accentColor: toHsl((hue + 232 + Math.floor(next() * 72)) % 360, 84, isDark ? 70 : 66),
    accentWidth: pickNumber(next, 0.24, 0.42),
    accentHeight: pickNumber(next, 0.2, 0.36),
    accentRadius: pickNumber(next, 0.08, 0.16),
    accentTop: pickNumber(next, 0.38, 0.64),
    accentLeft: pickNumber(next, 0.22, 0.6),
    accentRotate: pickNumber(next, -40, 40),
    dotColor: toHsl((hue + 300 + Math.floor(next() * 48)) % 360, 74, isDark ? 30 : 34),
    dotSize: pickNumber(next, 0.14, 0.2),
    dotTop: pickNumber(next, 0.08, 0.66),
    dotLeft: pickNumber(next, 0.08, 0.66),
  }
}

function createAddressSeed(source: string) {
  const normalized = source.trim()

  if (!normalized) {
    return DEFAULT_SEED
  }

  if (normalized.startsWith("T")) {
    const tronHexAddress = tronToEthereumHex(normalized)

    if (tronHexAddress) {
      return parseHexSeed(tronHexAddress)
    }
  }

  if (normalized.startsWith("0x")) {
    return parseHexSeed(normalized)
  }

  return hashString(normalized) || DEFAULT_SEED
}

function parseHexSeed(value: string) {
  if (!value.startsWith("0x") || value.length < 10) {
    return hashString(value) || DEFAULT_SEED
  }

  const parsed = Number.parseInt(value.slice(2, 10), 16)
  return Number.isFinite(parsed) ? parsed >>> 0 : hashString(value) || DEFAULT_SEED
}

function tronToEthereumHex(address: string) {
  try {
    const decoded = decodeBase58(address)

    if (decoded.length !== 25) {
      return ""
    }

    return `0x${Buffer.from(decoded.slice(1, 21)).toString("hex")}`
  } catch {
    return ""
  }
}

function decodeBase58(value: string) {
  const bytes: number[] = [0]

  for (const char of value) {
    const carryValue = BASE58_INDEX[char]

    if (carryValue === undefined) {
      throw new Error("invalid base58")
    }

    let carry = carryValue

    for (let index = 0; index < bytes.length; index += 1) {
      const result = bytes[index] * 58 + carry
      bytes[index] = result & 0xff
      carry = result >> 8
    }

    while (carry > 0) {
      bytes.push(carry & 0xff)
      carry >>= 8
    }
  }

  for (const char of value) {
    if (char !== "1") {
      break
    }

    bytes.push(0)
  }

  return Uint8Array.from(bytes.reverse())
}

function hashString(value: string) {
  let hash = 2166136261

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

function createSeededRandom(seed: number) {
  let state = seed >>> 0 || DEFAULT_SEED

  return function next() {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    return ((state >>> 0) % 1000) / 1000
  }
}

function pickNumber(next: () => number, min: number, max: number) {
  return min + (max - min) * next()
}

function toHsl(hue: number, saturation: number, lightness: number) {
  return `hsl(${hue} ${saturation}% ${lightness}%)`
}

const styles = StyleSheet.create({
  imageShell: {
    backgroundColor: "#E2E8F0",
    borderWidth: StyleSheet.hairlineWidth,
  },
  avatarShell: {
    overflow: "hidden",
    position: "relative",
    borderWidth: StyleSheet.hairlineWidth,
  },
  band: {
    position: "absolute",
  },
  blob: {
    position: "absolute",
  },
  accent: {
    position: "absolute",
  },
  dot: {
    position: "absolute",
  },
})
