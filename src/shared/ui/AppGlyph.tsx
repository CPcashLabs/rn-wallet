import React from "react"

import { StyleSheet, View } from "react-native"

import { useAppTheme } from "@/shared/theme/useAppTheme"
import { SFSymbolIcon, type MaterialIconName, type SFSymbolName, type SFSymbolScale, type SFSymbolWeight } from "@/shared/ui/SFSymbolIcon"

export type AppGlyphName =
  | "person"
  | "addressBook"
  | "invite"
  | "gear"
  | "help"
  | "info"
  | "lock"
  | "globe"
  | "node"
  | "mail"
  | "bell"
  | "wallet"
  | "photo"
  | "edit"
  | "book"
  | "bubble"
  | "spark"
  | "scan"

type AppGlyphProps = {
  name: AppGlyphName
  size?: number
  tintColor?: string
  backgroundColor?: string
}

type AppGlyphSymbolConfig = {
  fallbackName: MaterialIconName
  scale?: SFSymbolScale
  symbol: SFSymbolName
  weight?: SFSymbolWeight
}

const APP_GLYPH_SYMBOLS: Record<AppGlyphName, AppGlyphSymbolConfig> = {
  person: {
    fallbackName: "account-circle",
    symbol: "person.fill",
    weight: "medium",
  },
  addressBook: {
    fallbackName: "card-account-details-outline",
    symbol: "person.text.rectangle.fill",
  },
  invite: {
    fallbackName: "account-plus",
    symbol: "person.badge.plus",
  },
  gear: {
    fallbackName: "cog",
    symbol: "gearshape.fill",
  },
  help: {
    fallbackName: "help-circle",
    symbol: "questionmark.circle.fill",
  },
  info: {
    fallbackName: "information",
    symbol: "info.circle.fill",
  },
  lock: {
    fallbackName: "lock",
    symbol: "lock.fill",
  },
  globe: {
    fallbackName: "earth",
    symbol: "globe",
    weight: "regular",
  },
  node: {
    fallbackName: "server",
    symbol: "server.rack",
    weight: "regular",
  },
  mail: {
    fallbackName: "email",
    symbol: "envelope.fill",
  },
  bell: {
    fallbackName: "bell",
    symbol: "bell.fill",
  },
  wallet: {
    fallbackName: "wallet",
    symbol: "wallet.pass.fill",
  },
  photo: {
    fallbackName: "image",
    symbol: "photo.fill",
  },
  edit: {
    fallbackName: "pencil",
    symbol: "pencil",
    weight: "semibold",
  },
  book: {
    fallbackName: "book-open-page-variant",
    symbol: "text.book.closed.fill",
  },
  bubble: {
    fallbackName: "message",
    symbol: "message.fill",
  },
  spark: {
    fallbackName: "star-four-points",
    symbol: "sparkles",
    weight: "medium",
  },
  scan: {
    fallbackName: "qrcode-scan",
    symbol: "qrcode.viewfinder",
    weight: "medium",
  },
}

export function AppGlyph({ name, size = 28, tintColor, backgroundColor }: AppGlyphProps) {
  const theme = useAppTheme()
  const stroke = tintColor ?? theme.colors.primary
  const shellColor = backgroundColor ?? theme.colors.primarySoft ?? `${theme.colors.primary}14`
  const symbol = APP_GLYPH_SYMBOLS[name]
  const iconSize = size <= 22 ? Math.max(15, Math.round(size * 0.8)) : Math.max(18, Math.round(size * 0.62))

  return (
    <View
      style={[
        styles.shell,
        {
          width: size,
          height: size,
          borderRadius: size * 0.34,
          backgroundColor: shellColor,
        },
      ]}
    >
      <SFSymbolIcon
        color={stroke}
        fallbackName={symbol.fallbackName}
        name={symbol.symbol}
        scale={symbol.scale ?? "medium"}
        size={iconSize}
        weight={symbol.weight ?? "semibold"}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  shell: {
    alignItems: "center",
    justifyContent: "center",
  },
})
