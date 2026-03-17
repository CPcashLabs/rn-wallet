import React from "react"

import { Image, StyleSheet, View } from "react-native"

import type { OrderListItem } from "@/features/orders/services/ordersApi"
import { createJazziconSpec, resolveJazziconSeed } from "@/features/orders/utils/jazzicon"
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
  const size = props.size ?? 32
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
    <SeedAddressAvatar
      seedSource={resolveAvatarSeedSource(props.item)}
      size={size}
      uri={props.item.avatar}
    />
  )
}

export function SeedAddressAvatar(props: {
  size: number
  uri?: string
  seedSource: string
  borderColor?: string
}) {
  const theme = useAppTheme()
  const [imageFailed, setImageFailed] = React.useState(false)
  const normalizedUri = props.uri?.trim() || ""
  const jazzicon = React.useMemo(() => createJazziconSpec(props.size, resolveJazziconSeed(props.seedSource)), [props.seedSource, props.size])

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
            borderColor: props.borderColor ?? theme.colors.glassBorder,
          },
        ]}
      />
    )
  }

  return (
    <View
      style={[
        styles.avatarShell,
        {
          width: props.size,
          height: props.size,
          borderRadius: props.size / 2,
          backgroundColor: jazzicon.background,
          borderColor: props.borderColor ?? theme.colors.glassBorder,
        },
      ]}
    >
      {jazzicon.shapes.map((shape, index) => (
        <View
          key={`${shape.fill}-${shape.rotateDeg}-${index}`}
          style={[
            styles.jazziconShape,
            {
              width: props.size,
              height: props.size,
              backgroundColor: shape.fill,
              transform: [
                { translateX: shape.translateX },
                { translateY: shape.translateY },
                { rotate: shape.rotateDeg },
              ],
            },
          ]}
        />
      ))}
    </View>
  )
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
  jazziconShape: {
    position: "absolute",
    top: 0,
    left: 0,
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
