import React from "react"

import { Image, StyleSheet, Text, View } from "react-native"
import { SvgUri } from "react-native-svg"

import { useAppTheme } from "@/shared/theme/useAppTheme"

type NetworkLogoProps = {
  logoUri?: string | null
  chainName: string
  chainColor?: string | null
  fallbackMode?: "initials" | "cpcash"
  size?: number
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
  const candidates = React.useMemo(() => buildLogoCandidates(props.logoUri), [props.logoUri])
  const [candidateIndex, setCandidateIndex] = React.useState(candidates.length > 0 ? 0 : -1)
  const size = props.size ?? 34
  const fallbackMode = props.fallbackMode ?? "initials"
  const activeUri = candidateIndex >= 0 ? candidates[candidateIndex] : null
  const logoSize = Math.round(size * 0.72)

  const handleAssetError = React.useCallback(() => {
    setCandidateIndex(current => {
      if (current < 0) {
        return -1
      }

      return current + 1 < candidates.length ? current + 1 : -1
    })
  }, [candidates.length])

  React.useEffect(() => {
    setCandidateIndex(candidates.length > 0 ? 0 : -1)
  }, [candidates])

  if (activeUri) {
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
        {isSvgUri(activeUri) ? (
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
            uri={activeUri}
            width={logoSize}
          />
        ) : (
          <Image
            onError={handleAssetError}
            resizeMode="contain"
            source={{ uri: activeUri }}
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
      <Text style={styles.initialsText}>{props.chainName.slice(0, 2).toUpperCase()}</Text>
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
