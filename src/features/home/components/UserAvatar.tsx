import React from "react"

import { Image, StyleSheet, Text, View } from "react-native"

import { useAppTheme } from "@/shared/theme/useAppTheme"

type Props = {
  uri?: string | null
  label: string
  size: number
  cacheVersion?: number
}

export function UserAvatar(props: Props) {
  const theme = useAppTheme()
  const [imageFailed, setImageFailed] = React.useState(false)

  React.useEffect(() => {
    setImageFailed(false)
  }, [props.uri])

  const normalizedUri = props.uri?.trim() || ""
  const resolvedUri = normalizedUri
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
      key={resolvedUri}
      onError={() => setImageFailed(true)}
      source={{ uri: resolvedUri }}
      style={[styles.image, shellStyle]}
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
