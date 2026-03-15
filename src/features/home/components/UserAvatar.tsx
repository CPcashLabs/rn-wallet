import React from "react"

import { Image, StyleSheet, Text, View } from "react-native"

import { readCachedAvatarEntry, removeCachedAvatarSource, writeCachedAvatarSource } from "@/features/home/services/avatarCache"
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
  const normalizedAccountKey = props.accountKey?.trim().toLowerCase() || ""
  const normalizedUri = props.uri?.trim() || ""
  const resolvedUri = appendCacheVersion(normalizedUri, props.cacheVersion)
  const cacheEntry = React.useMemo(
    () => readCachedAvatarEntry(normalizedAccountKey),
    [normalizedAccountKey],
  )
  const preferredSource = React.useMemo(() => {
    if (cacheEntry?.avatarUri === normalizedUri && cacheEntry.resolvedUri) {
      return {
        uri: cacheEntry.resolvedUri,
        avatarUri: normalizedUri,
      }
    }

    if (cacheEntry?.resolvedUri) {
      return {
        uri: cacheEntry.resolvedUri,
        avatarUri: cacheEntry.avatarUri,
      }
    }

    if (resolvedUri) {
      return {
        uri: resolvedUri,
        avatarUri: normalizedUri,
      }
    }

    return {
      uri: "",
      avatarUri: "",
    }
  }, [cacheEntry?.avatarUri, cacheEntry?.resolvedUri, normalizedUri, resolvedUri])
  const [displaySource, setDisplaySource] = React.useState(preferredSource)

  React.useEffect(() => {
    setImageFailed(false)
  }, [displaySource.uri])

  React.useEffect(() => {
    setDisplaySource(previous =>
      previous.uri === preferredSource.uri && previous.avatarUri === preferredSource.avatarUri ? previous : preferredSource,
    )
    setImageFailed(false)
  }, [preferredSource])

  React.useEffect(() => {
    if (!normalizedUri || !resolvedUri) {
      return
    }

    if (displaySource.avatarUri === normalizedUri && displaySource.uri === resolvedUri) {
      return
    }

    let cancelled = false

    void Image.prefetch(resolvedUri)
      .then(success => {
        if (cancelled || !success) {
          return
        }

        setDisplaySource({
          uri: resolvedUri,
          avatarUri: normalizedUri,
        })
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
    }
  }, [displaySource.avatarUri, displaySource.uri, normalizedUri, resolvedUri])

  const fallbackLabel = props.label.trim().slice(0, 1).toUpperCase() || "?"
  const fontSize = Math.max(12, Math.round(props.size * 0.38))
  const shellStyle = {
    width: props.size,
    height: props.size,
    borderRadius: props.size / 2,
  } as const

  if (!displaySource.uri || imageFailed) {
    return (
      <View style={[styles.fallback, shellStyle, { backgroundColor: theme.colors.primary }]}>
        <Text style={[styles.fallbackText, { fontSize }]}>{fallbackLabel}</Text>
      </View>
    )
  }

  return (
    <Image
      fadeDuration={0}
      onError={() => {
        setImageFailed(true)
        if (displaySource.avatarUri === normalizedUri) {
          removeCachedAvatarSource(normalizedAccountKey)
        }
      }}
      onLoad={() => {
        writeCachedAvatarSource({
          accountKey: normalizedAccountKey,
          avatarUri: displaySource.avatarUri,
          resolvedUri: displaySource.uri,
        })
      }}
      source={{ uri: displaySource.uri, cache: "force-cache" }}
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
