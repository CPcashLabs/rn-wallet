import React from "react"

import { Image, StyleSheet, Text, View } from "react-native"
import { SvgUri } from "react-native-svg"

import { useAppTheme } from "@/shared/theme/useAppTheme"
import {
  buildNetworkLogoCacheKey,
  readCachedNetworkLogoEntry,
  removeCachedNetworkLogoEntry,
  writeCachedNetworkLogoEntry,
} from "@/shared/ui/networkLogoCache"
import { cacheNetworkLogoToFile, removeNetworkLogoFile, supportsNetworkLogoFileCache } from "@/shared/ui/networkLogoFileCache"

type NetworkLogoProps = {
  logoUri?: string | null
  chainName: string
  chainColor?: string | null
  fallbackMode?: "initials" | "cpcash"
  size?: number
}

type DisplaySource = {
  uri: string
  kind: "local" | "remote"
  remoteUri: string
}

function buildLogoCandidates(logoUri?: string | null) {
  const normalized = String(logoUri ?? "").trim()
  if (!normalized) {
    return []
  }

  const candidates = [normalized]
  const pngVariant = normalized.replace(/\.svg(?=([?#].*)?$)/i, ".png")

  if (pngVariant !== normalized) {
    candidates.push(pngVariant)
  }

  return candidates
}

function isSvgUri(uri?: string | null) {
  return /\.svg(?=([?#].*)?$)/i.test(String(uri ?? "").trim())
}

export function NetworkLogo(props: NetworkLogoProps) {
  const theme = useAppTheme()
  const size = props.size ?? 34
  const fallbackMode = props.fallbackMode ?? "initials"
  const normalizedChainName = props.chainName.trim()
  const logoSize = Math.round(size * 0.72)
  const candidates = React.useMemo(() => buildLogoCandidates(props.logoUri), [props.logoUri])
  const logoKey = React.useMemo(
    () =>
      buildNetworkLogoCacheKey({
        chainName: normalizedChainName,
        fallbackMode,
      }),
    [fallbackMode, normalizedChainName],
  )
  const cacheEntry = readCachedNetworkLogoEntry(logoKey)
  const [candidateIndex, setCandidateIndex] = React.useState(candidates.length > 0 ? 0 : -1)
  const activeUri = candidateIndex >= 0 ? candidates[candidateIndex] ?? "" : ""
  const preferredSource = React.useMemo<DisplaySource>(() => {
    if (activeUri && cacheEntry?.remoteUri === activeUri && cacheEntry.localUri) {
      return {
        uri: cacheEntry.localUri,
        kind: "local",
        remoteUri: activeUri,
      }
    }

    if (activeUri) {
      return {
        uri: activeUri,
        kind: "remote",
        remoteUri: activeUri,
      }
    }

    return {
      uri: "",
      kind: "remote",
      remoteUri: "",
    }
  }, [activeUri, cacheEntry?.localUri, cacheEntry?.remoteUri])
  const [displaySource, setDisplaySource] = React.useState(preferredSource)

  const advanceCandidate = React.useCallback(() => {
    setCandidateIndex(current => {
      if (current < 0) {
        return -1
      }

      return current + 1 < candidates.length ? current + 1 : -1
    })
  }, [candidates.length])

  const handleAssetError = React.useCallback(() => {
    if (displaySource.kind === "local") {
      void removeCachedNetworkLogoEntry(logoKey).catch(() => undefined)

      if (displaySource.remoteUri) {
        setDisplaySource({
          uri: displaySource.remoteUri,
          kind: "remote",
          remoteUri: displaySource.remoteUri,
        })
        return
      }
    }

    advanceCandidate()
  }, [advanceCandidate, displaySource.kind, displaySource.remoteUri, displaySource.uri, logoKey])

  React.useEffect(() => {
    setCandidateIndex(candidates.length > 0 ? 0 : -1)
  }, [candidates])

  React.useEffect(() => {
    setDisplaySource(previous =>
      previous.uri === preferredSource.uri &&
      previous.kind === preferredSource.kind &&
      previous.remoteUri === preferredSource.remoteUri
        ? previous
        : preferredSource,
    )
  }, [preferredSource])

  React.useEffect(() => {
    if (!logoKey || !activeUri || !supportsNetworkLogoFileCache()) {
      return
    }

    if (cacheEntry?.remoteUri === activeUri && cacheEntry.localUri) {
      return
    }

    let cancelled = false

    void cacheNetworkLogoToFile({
      logoKey,
      remoteUri: activeUri,
    })
      .then(localUri => {
        if (!localUri) {
          return
        }

        if (cancelled) {
          void removeNetworkLogoFile(localUri).catch(() => undefined)
          return
        }

        void writeCachedNetworkLogoEntry({
          logoKey,
          remoteUri: activeUri,
          localUri,
        }).catch(() => undefined)
        setDisplaySource({
          uri: localUri,
          kind: "local",
          remoteUri: activeUri,
        })
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
    }
  }, [activeUri, cacheEntry?.localUri, cacheEntry?.remoteUri, logoKey])

  if (displaySource.uri) {
    return (
      <View
        style={[
          styles.shell,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: theme.colors.glassBorder ?? theme.colors.border,
            backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface,
          },
        ]}
      >
        {isSvgUri(displaySource.uri) ? (
          <SvgUri
            fallback={
              <View
                style={[
                  styles.image,
                  {
                    width: logoSize,
                    height: logoSize,
                    borderRadius: logoSize / 2,
                    backgroundColor: theme.colors.surfaceMuted ?? theme.colors.backgroundMuted,
                  },
                ]}
              />
            }
            height={logoSize}
            onError={handleAssetError}
            uri={displaySource.uri}
            width={logoSize}
          />
        ) : (
          <Image
            fadeDuration={0}
            onError={handleAssetError}
            resizeMode="contain"
            source={{ uri: displaySource.uri, cache: "force-cache" }}
            style={[
              styles.image,
              {
                width: logoSize,
                height: logoSize,
                borderRadius: logoSize / 2,
              },
            ]}
          />
        )}
      </View>
    )
  }

  if (fallbackMode === "cpcash") {
    return (
      <View
        style={[
          styles.cpcashBadge,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
        ]}
      >
        <View style={styles.cpcashGlyphOuter} />
        <View style={styles.cpcashGlyphInner} />
      </View>
    )
  }

  return (
    <View
      style={[
        styles.initialsBadge,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: props.chainColor || theme.colors.primary,
        },
      ]}
    >
      <Text style={styles.initialsText}>{normalizedChainName.slice(0, 2).toUpperCase()}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  shell: {
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  image: {
    alignItems: "center",
    justifyContent: "center",
  },
  initialsBadge: {
    alignItems: "center",
    justifyContent: "center",
  },
  initialsText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  cpcashBadge: {
    backgroundColor: "#1769FF",
    alignItems: "center",
    justifyContent: "center",
  },
  cpcashGlyphOuter: {
    position: "absolute",
    width: 16,
    height: 16,
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
    transform: [{ rotate: "45deg" }],
  },
  cpcashGlyphInner: {
    width: 8,
    height: 8,
    borderRadius: 2,
    backgroundColor: "#1769FF",
    transform: [{ rotate: "45deg" }],
  },
})
