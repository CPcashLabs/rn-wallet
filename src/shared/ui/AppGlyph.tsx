import React from "react"

import { StyleSheet, View } from "react-native"

import { useAppTheme } from "@/shared/theme/useAppTheme"

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

type AppGlyphProps = {
  name: AppGlyphName
  size?: number
  tintColor?: string
  backgroundColor?: string
}

export function AppGlyph({ name, size = 30, tintColor, backgroundColor }: AppGlyphProps) {
  const theme = useAppTheme()
  const stroke = tintColor ?? theme.colors.primary
  const shellColor = backgroundColor ?? theme.colors.primarySoft ?? `${theme.colors.primary}14`
  const scale = size / 30

  return (
    <View
      style={[
        styles.shell,
        {
          width: size,
          height: size,
          borderRadius: size * 0.36,
          backgroundColor: shellColor,
        },
      ]}
    >
      <View style={[styles.canvas, { transform: [{ scale }] }]}>{renderGlyph(name, stroke)}</View>
    </View>
  )
}

function renderGlyph(name: AppGlyphName, stroke: string) {
  switch (name) {
    case "person":
      return (
        <>
          <View style={[styles.personHead, { borderColor: stroke }]} />
          <View style={[styles.personBody, { borderColor: stroke }]} />
        </>
      )
    case "addressBook":
      return (
        <>
          <View style={[styles.bookFrame, { borderColor: stroke }]} />
          <View style={[styles.bookSpine, { backgroundColor: stroke }]} />
          <View style={[styles.bookLineTop, { backgroundColor: stroke }]} />
          <View style={[styles.bookLineBottom, { backgroundColor: stroke }]} />
        </>
      )
    case "invite":
      return (
        <>
          <View style={[styles.personHead, { borderColor: stroke }]} />
          <View style={[styles.personBody, { borderColor: stroke }]} />
          <View style={[styles.plusHorizontal, { backgroundColor: stroke }]} />
          <View style={[styles.plusVertical, { backgroundColor: stroke }]} />
        </>
      )
    case "gear":
      return (
        <>
          <View style={[styles.gearRing, { borderColor: stroke }]} />
          <View style={[styles.gearTickTop, { backgroundColor: stroke }]} />
          <View style={[styles.gearTickBottom, { backgroundColor: stroke }]} />
          <View style={[styles.gearTickLeft, { backgroundColor: stroke }]} />
          <View style={[styles.gearTickRight, { backgroundColor: stroke }]} />
        </>
      )
    case "help":
      return (
        <>
          <View style={[styles.bubbleFrame, { borderColor: stroke }]} />
          <View style={[styles.bubbleTail, { borderColor: stroke }]} />
          <View style={[styles.helpArc, { borderColor: stroke }]} />
          <View style={[styles.helpDot, { backgroundColor: stroke }]} />
        </>
      )
    case "info":
      return (
        <>
          <View style={[styles.infoRing, { borderColor: stroke }]} />
          <View style={[styles.infoDot, { backgroundColor: stroke }]} />
          <View style={[styles.infoStem, { backgroundColor: stroke }]} />
        </>
      )
    case "lock":
      return (
        <>
          <View style={[styles.lockShackle, { borderColor: stroke }]} />
          <View style={[styles.lockBody, { borderColor: stroke }]} />
        </>
      )
    case "globe":
      return (
        <>
          <View style={[styles.globeRing, { borderColor: stroke }]} />
          <View style={[styles.globeVertical, { borderColor: stroke }]} />
          <View style={[styles.globeHorizontal, { borderColor: stroke }]} />
        </>
      )
    case "node":
      return (
        <>
          <View style={[styles.nodeRackTop, { borderColor: stroke }]} />
          <View style={[styles.nodeRackBottom, { borderColor: stroke }]} />
          <View style={[styles.nodeDotTop, { backgroundColor: stroke }]} />
          <View style={[styles.nodeDotBottom, { backgroundColor: stroke }]} />
        </>
      )
    case "mail":
      return (
        <>
          <View style={[styles.mailFrame, { borderColor: stroke }]} />
          <View style={[styles.mailFlapLeft, { borderColor: stroke }]} />
          <View style={[styles.mailFlapRight, { borderColor: stroke }]} />
        </>
      )
    case "bell":
      return (
        <>
          <View style={[styles.bellBody, { borderColor: stroke }]} />
          <View style={[styles.bellClapper, { backgroundColor: stroke }]} />
        </>
      )
    case "wallet":
      return (
        <>
          <View style={[styles.walletFrame, { borderColor: stroke }]} />
          <View style={[styles.walletLatch, { backgroundColor: stroke }]} />
        </>
      )
    case "photo":
      return (
        <>
          <View style={[styles.photoFrame, { borderColor: stroke }]} />
          <View style={[styles.photoSun, { backgroundColor: stroke }]} />
          <View style={[styles.photoHillLeft, { borderColor: stroke }]} />
          <View style={[styles.photoHillRight, { borderColor: stroke }]} />
        </>
      )
    case "edit":
      return (
        <>
          <View style={[styles.editStem, { backgroundColor: stroke }]} />
          <View style={[styles.editTip, { borderColor: stroke }]} />
        </>
      )
    case "book":
      return (
        <>
          <View style={[styles.openBookLeft, { borderColor: stroke }]} />
          <View style={[styles.openBookRight, { borderColor: stroke }]} />
        </>
      )
    case "bubble":
      return (
        <>
          <View style={[styles.bubbleFrame, { borderColor: stroke }]} />
          <View style={[styles.bubbleTail, { borderColor: stroke }]} />
        </>
      )
    case "spark":
      return (
        <>
          <View style={[styles.sparkVertical, { backgroundColor: stroke }]} />
          <View style={[styles.sparkHorizontal, { backgroundColor: stroke }]} />
          <View style={[styles.sparkDiagonalA, { backgroundColor: stroke }]} />
          <View style={[styles.sparkDiagonalB, { backgroundColor: stroke }]} />
        </>
      )
  }
}

const styles = StyleSheet.create({
  shell: {
    alignItems: "center",
    justifyContent: "center",
  },
  canvas: {
    width: 30,
    height: 30,
  },
  personHead: {
    position: "absolute",
    top: 5,
    left: 10,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.7,
  },
  personBody: {
    position: "absolute",
    top: 16,
    left: 7,
    width: 16,
    height: 9,
    borderRadius: 6,
    borderWidth: 1.7,
  },
  bookFrame: {
    position: "absolute",
    top: 6,
    left: 7,
    width: 16,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.7,
  },
  bookSpine: {
    position: "absolute",
    top: 8,
    left: 10,
    width: 1.7,
    height: 14,
    borderRadius: 1,
  },
  bookLineTop: {
    position: "absolute",
    top: 11,
    left: 14,
    width: 6,
    height: 1.7,
    borderRadius: 1,
  },
  bookLineBottom: {
    position: "absolute",
    top: 16,
    left: 14,
    width: 5,
    height: 1.7,
    borderRadius: 1,
  },
  plusHorizontal: {
    position: "absolute",
    top: 7,
    right: 3,
    width: 7,
    height: 1.7,
    borderRadius: 1,
  },
  plusVertical: {
    position: "absolute",
    top: 4,
    right: 5.65,
    width: 1.7,
    height: 7,
    borderRadius: 1,
  },
  gearRing: {
    position: "absolute",
    top: 9,
    left: 9,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.7,
  },
  gearTickTop: {
    position: "absolute",
    top: 5,
    left: 14.15,
    width: 1.7,
    height: 4,
    borderRadius: 1,
  },
  gearTickBottom: {
    position: "absolute",
    top: 21,
    left: 14.15,
    width: 1.7,
    height: 4,
    borderRadius: 1,
  },
  gearTickLeft: {
    position: "absolute",
    top: 14.15,
    left: 5,
    width: 4,
    height: 1.7,
    borderRadius: 1,
  },
  gearTickRight: {
    position: "absolute",
    top: 14.15,
    right: 5,
    width: 4,
    height: 1.7,
    borderRadius: 1,
  },
  bubbleFrame: {
    position: "absolute",
    top: 7,
    left: 6,
    width: 18,
    height: 13,
    borderRadius: 6,
    borderWidth: 1.7,
  },
  bubbleTail: {
    position: "absolute",
    top: 17,
    left: 10,
    width: 6,
    height: 6,
    borderLeftWidth: 1.7,
    borderBottomWidth: 1.7,
    transform: [{ skewX: "-18deg" }, { rotate: "-8deg" }],
  },
  helpArc: {
    position: "absolute",
    top: 9,
    left: 12,
    width: 6,
    height: 7,
    borderTopWidth: 1.7,
    borderRightWidth: 1.7,
    borderRadius: 4,
    transform: [{ rotate: "20deg" }],
  },
  helpDot: {
    position: "absolute",
    top: 18,
    left: 14,
    width: 2.6,
    height: 2.6,
    borderRadius: 1.3,
  },
  infoRing: {
    position: "absolute",
    top: 6,
    left: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.7,
  },
  infoDot: {
    position: "absolute",
    top: 10,
    left: 14,
    width: 2.4,
    height: 2.4,
    borderRadius: 1.2,
  },
  infoStem: {
    position: "absolute",
    top: 14,
    left: 14.15,
    width: 1.7,
    height: 6,
    borderRadius: 1,
  },
  lockShackle: {
    position: "absolute",
    top: 5,
    left: 10,
    width: 10,
    height: 9,
    borderRadius: 5,
    borderWidth: 1.7,
  },
  lockBody: {
    position: "absolute",
    top: 12,
    left: 8,
    width: 14,
    height: 11,
    borderRadius: 4,
    borderWidth: 1.7,
  },
  globeRing: {
    position: "absolute",
    top: 6,
    left: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.7,
  },
  globeVertical: {
    position: "absolute",
    top: 7,
    left: 11,
    width: 8,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.3,
  },
  globeHorizontal: {
    position: "absolute",
    top: 14,
    left: 7,
    width: 16,
    height: 1.7,
    borderRadius: 1,
  },
  nodeRackTop: {
    position: "absolute",
    top: 7,
    left: 7,
    width: 16,
    height: 6,
    borderRadius: 3,
    borderWidth: 1.7,
  },
  nodeRackBottom: {
    position: "absolute",
    top: 17,
    left: 7,
    width: 16,
    height: 6,
    borderRadius: 3,
    borderWidth: 1.7,
  },
  nodeDotTop: {
    position: "absolute",
    top: 9.1,
    left: 18,
    width: 2.4,
    height: 2.4,
    borderRadius: 1.2,
  },
  nodeDotBottom: {
    position: "absolute",
    top: 19.1,
    left: 18,
    width: 2.4,
    height: 2.4,
    borderRadius: 1.2,
  },
  mailFrame: {
    position: "absolute",
    top: 8,
    left: 6,
    width: 18,
    height: 13,
    borderRadius: 3,
    borderWidth: 1.7,
  },
  mailFlapLeft: {
    position: "absolute",
    top: 10,
    left: 8,
    width: 8,
    height: 6,
    borderBottomWidth: 1.7,
    borderRightWidth: 1.7,
    transform: [{ skewX: "10deg" }, { rotate: "-8deg" }],
  },
  mailFlapRight: {
    position: "absolute",
    top: 10,
    left: 14,
    width: 8,
    height: 6,
    borderBottomWidth: 1.7,
    borderLeftWidth: 1.7,
    transform: [{ skewX: "-10deg" }, { rotate: "8deg" }],
  },
  bellBody: {
    position: "absolute",
    top: 7,
    left: 8,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.7,
  },
  bellClapper: {
    position: "absolute",
    top: 20,
    left: 13,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  walletFrame: {
    position: "absolute",
    top: 9,
    left: 6,
    width: 18,
    height: 12,
    borderRadius: 4,
    borderWidth: 1.7,
  },
  walletLatch: {
    position: "absolute",
    top: 13.5,
    left: 18,
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  photoFrame: {
    position: "absolute",
    top: 7,
    left: 6,
    width: 18,
    height: 15,
    borderRadius: 4,
    borderWidth: 1.7,
  },
  photoSun: {
    position: "absolute",
    top: 10,
    left: 18,
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  photoHillLeft: {
    position: "absolute",
    top: 14,
    left: 9,
    width: 7,
    height: 5,
    borderLeftWidth: 1.7,
    borderBottomWidth: 1.7,
    transform: [{ rotate: "-32deg" }],
  },
  photoHillRight: {
    position: "absolute",
    top: 12,
    left: 14,
    width: 8,
    height: 7,
    borderLeftWidth: 1.7,
    borderBottomWidth: 1.7,
    transform: [{ rotate: "-12deg" }],
  },
  editStem: {
    position: "absolute",
    top: 11,
    left: 9,
    width: 12,
    height: 2.3,
    borderRadius: 1.2,
    transform: [{ rotate: "-38deg" }],
  },
  editTip: {
    position: "absolute",
    top: 8,
    left: 18,
    width: 4,
    height: 4,
    borderTopWidth: 1.7,
    borderRightWidth: 1.7,
    transform: [{ rotate: "8deg" }],
  },
  openBookLeft: {
    position: "absolute",
    top: 7,
    left: 7,
    width: 8,
    height: 15,
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
    borderWidth: 1.7,
  },
  openBookRight: {
    position: "absolute",
    top: 7,
    left: 15,
    width: 8,
    height: 15,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    borderWidth: 1.7,
  },
  sparkVertical: {
    position: "absolute",
    top: 7,
    left: 14,
    width: 2,
    height: 16,
    borderRadius: 1,
  },
  sparkHorizontal: {
    position: "absolute",
    top: 14,
    left: 7,
    width: 16,
    height: 2,
    borderRadius: 1,
  },
  sparkDiagonalA: {
    position: "absolute",
    top: 14,
    left: 7,
    width: 16,
    height: 2,
    borderRadius: 1,
    transform: [{ rotate: "45deg" }],
  },
  sparkDiagonalB: {
    position: "absolute",
    top: 14,
    left: 7,
    width: 16,
    height: 2,
    borderRadius: 1,
    transform: [{ rotate: "-45deg" }],
  },
})
