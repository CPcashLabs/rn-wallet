import React from "react"

import { Image } from "expo-image"
import { StyleSheet, Text, View } from "react-native"

import { useAppTheme } from "@/shared/theme/useAppTheme"

type Props = {
  uri?: string | null
  label: string
  size: number
  cacheVersion?: number
  accountKey?: string | null
}

function appendCacheVersion(uri: string, cacheVersion?: number) {
  if (!uri) {
    return ""
  }

  if (typeof cacheVersion !== "number") {
    return uri
  }

  return `${uri}${uri.includes("?") ? "&" : "?"}avatarCache=${cacheVersion}`
}

export function UserAvatar(props: Props) {
  const theme = useAppTheme()
  const [imageFailed, setImageFailed] = React.useState(false)
  const normalizedUri = props.uri?.trim() || ""
  const resolvedUri = appendCacheVersion(normalizedUri, props.cacheVersion)

  React.useEffect(() => {
    setImageFailed(false)
  }, [resolvedUri])

  const fallbackLabel = props.label.trim().slice(0, 1).toUpperCase() || "?"
  const fontSize = Math.max(12, Math.round(props.size * 0.38))
  const shellStyle = {
    width: props.size,
    height: props.size,
    borderRadius: props.size / 2,
  } as const

  if (!resolvedUri || imageFailed) {
    return (
      <View style={[styles.fallback, shellStyle, { backgroundColor: theme.colors.primary }]}>
        <Text style={[styles.fallbackText, { fontSize }]}>{fallbackLabel}</Text>
      </View>
    )
  }

  return (
    <Image
      cachePolicy="memory-disk"
      contentFit="cover"
      onError={() => {
        setImageFailed(true)
      }}
      recyclingKey={resolvedUri}
      source={resolvedUri}
      style={[styles.image, shellStyle]}
      transition={0}
    />
  )
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: "#E2E8F0",
  },
  fallback: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  fallbackText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
})
