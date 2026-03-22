import React from "react"

import { Image, StyleSheet, View } from "react-native"

import { createJazziconSpec, resolveJazziconSeed } from "@/shared/avatar/jazzicon"
import { useAppTheme } from "@/shared/theme/useAppTheme"

export function SeedAddressAvatar(props: {
  size: number
  uri?: string
  seedSource: string
  borderColor?: string
}) {
  const theme = useAppTheme()
  const normalizedUri = props.uri?.trim() || ""
  const jazzicon = React.useMemo(() => createJazziconSpec(props.size, resolveJazziconSeed(props.seedSource)), [props.seedSource, props.size])

  if (normalizedUri) {
    return (
      <Image
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

const styles = StyleSheet.create({
  avatarShell: {
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
  },
  imageShell: {
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: "#FFFFFF",
  },
  jazziconShape: {
    position: "absolute",
    borderRadius: 999,
  },
})
