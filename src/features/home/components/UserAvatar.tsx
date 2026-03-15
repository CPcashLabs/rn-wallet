import React from "react"

import { Image, StyleSheet, Text, View } from "react-native"

import { readCachedAvatarEntry, removeCachedAvatarEntry, writeCachedAvatarEntry } from "@/features/home/services/avatarCache"
import { cacheAvatarToFile, removeAvatarFile, supportsAvatarFileCache } from "@/features/home/services/avatarFileCache"
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
  const cacheEntry = readCachedAvatarEntry(normalizedAccountKey)
  const preferredSource = React.useMemo(() => {
    if (cacheEntry?.localUri) {
      return {
        uri: cacheEntry.localUri,
        kind: "local" as const,
        remoteUri: cacheEntry.remoteUri || resolvedUri,
      }
    }

    const fallbackRemoteUri = resolvedUri || cacheEntry?.fallbackRemoteUri || ""
    if (fallbackRemoteUri) {
      return {
        uri: fallbackRemoteUri,
        kind: "remote" as const,
        remoteUri: fallbackRemoteUri,
      }
    }

    return {
      uri: "",
      kind: "remote" as const,
      remoteUri: "",
    }
  }, [cacheEntry?.fallbackRemoteUri, cacheEntry?.localUri, cacheEntry?.remoteUri, resolvedUri])
  const [displaySource, setDisplaySource] = React.useState(preferredSource)

  React.useEffect(() => {
    setImageFailed(false)
  }, [displaySource.uri])

  React.useEffect(() => {
    setDisplaySource(previous =>
      previous.uri === preferredSource.uri &&
      previous.kind === preferredSource.kind &&
      previous.remoteUri === preferredSource.remoteUri
        ? previous
        : preferredSource,
    )
    setImageFailed(false)
  }, [preferredSource])

  React.useEffect(() => {
    if (!normalizedAccountKey || !resolvedUri || !supportsAvatarFileCache()) {
      return
    }

    if (cacheEntry?.remoteUri === resolvedUri && cacheEntry.localUri) {
      return
    }

    let cancelled = false
    const previousLocalUri = cacheEntry?.localUri || ""

    void cacheAvatarToFile({
      accountKey: normalizedAccountKey,
      remoteUri: resolvedUri,
    })
      .then(localUri => {
        if (cancelled || !localUri) {
          return
        }

        writeCachedAvatarEntry({
          accountKey: normalizedAccountKey,
          remoteUri: resolvedUri,
          localUri,
        })
        setDisplaySource({
          uri: localUri,
          kind: "local",
          remoteUri: resolvedUri,
        })
        if (previousLocalUri && previousLocalUri !== localUri) {
          void removeAvatarFile(previousLocalUri).catch(() => undefined)
        }
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
    }
  }, [cacheEntry?.localUri, cacheEntry?.remoteUri, normalizedAccountKey, resolvedUri])

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
        if (displaySource.kind === "local") {
          removeCachedAvatarEntry(normalizedAccountKey)
          void removeAvatarFile(displaySource.uri).catch(() => undefined)
          if (resolvedUri) {
            setDisplaySource({
              uri: resolvedUri,
              kind: "remote",
              remoteUri: resolvedUri,
            })
            setImageFailed(false)
            return
          }
        }

        setImageFailed(true)
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
