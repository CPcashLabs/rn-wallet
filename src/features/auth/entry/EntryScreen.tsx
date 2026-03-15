import React, { useMemo } from "react"

import { Pressable, StatusBar, StyleSheet, useWindowDimensions, View } from "react-native"
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context"

import { ENTRY_BACKGROUND } from "@/features/auth/entry/constants"
import { ChainTrajectoryField } from "@/features/auth/entry/components/ChainTrajectoryField"
import { EntryButtons } from "@/features/auth/entry/components/EntryButtons"
import { EntryStatement } from "@/features/auth/entry/components/EntryStatement"
import { PrivacyCore } from "@/features/auth/entry/components/PrivacyCore"
import { useEntryAnimation } from "@/features/auth/entry/hooks/useEntryAnimation"
import type { EntryOption } from "@/features/auth/entry/types"

type Props = {
  onCreateWallet: () => void
  onImportWallet: () => void
  onWatchMode: () => void
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function EntryScreen({ onCreateWallet, onImportWallet, onWatchMode }: Props) {
  const { width, height } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const animation = useEntryAnimation()

  const coreSize = clamp(Math.min(width * 0.42, height * 0.24, 192), 144, 192)
  const topInset = Math.max(insets.top + 44, height * 0.18)
  const statementTop = topInset + coreSize + 26
  const buttonsTop = Math.min(statementTop + 110, height - insets.bottom - 212)

  const options = useMemo<EntryOption[]>(
    () => [
      {
        key: "create",
        labelKey: "auth.entry.createWallet",
        onPress: onCreateWallet,
      },
      {
        key: "import",
        labelKey: "auth.entry.importWallet",
        onPress: onImportWallet,
      },
      {
        key: "watch",
        labelKey: "auth.entry.watchMode",
        onPress: onWatchMode,
      },
    ],
    [onCreateWallet, onImportWallet, onWatchMode],
  )

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar backgroundColor={ENTRY_BACKGROUND} barStyle="light-content" />
      <View style={styles.screen}>
        <ChainTrajectoryField
          activatedAt={animation.activatedAt}
          height={height}
          timeMs={animation.timeMs}
          width={width}
        />
        <View style={styles.overlay} pointerEvents="none" />
        {animation.gestureEnabled ? (
          <Pressable onPress={animation.trigger} style={StyleSheet.absoluteFill} />
        ) : null}
        <View style={styles.content}>
          <View style={[styles.coreSlot, { marginTop: topInset }]}>
            <PrivacyCore
              activatedAt={animation.activatedAt}
              coreScale={animation.coreScale}
              size={coreSize}
              timeMs={animation.timeMs}
            />
          </View>
          <View style={[styles.statementBlock, { top: statementTop }]}>
            <EntryStatement
              line1Progress={animation.line1Progress}
              line2Progress={animation.line2Progress}
            />
          </View>
          <View style={[styles.buttonsBlock, { top: buttonsTop }]}>
            <EntryButtons
              interactive={animation.buttonsInteractive}
              options={options}
              revealProgress={animation.buttonRevealProgress}
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: ENTRY_BACKGROUND,
  },
  screen: {
    flex: 1,
    backgroundColor: ENTRY_BACKGROUND,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(6,7,10,0.08)",
  },
  content: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
  },
  coreSlot: {
    alignItems: "center",
  },
  statementBlock: {
    position: "absolute",
    alignItems: "center",
    left: 0,
    right: 0,
    minHeight: 84,
  },
  buttonsBlock: {
    position: "absolute",
    left: 0,
    right: 0,
  },
})
