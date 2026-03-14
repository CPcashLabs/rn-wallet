import React from "react"

import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native"

import { useAppTheme } from "@/shared/theme/useAppTheme"

type AppStatusHeroProps = {
  title: string
  amount: string
  subtitle?: string
  backgroundColor?: string
  style?: StyleProp<ViewStyle>
}

export const AppStatusHero = React.memo(function AppStatusHero(props: AppStatusHeroProps) {
  const theme = useAppTheme()

  return (
    <View style={[styles.container, { backgroundColor: props.backgroundColor ?? theme.colors.primary }, props.style]}>
      <Text style={styles.title}>{props.title}</Text>
      <Text style={styles.amount}>{props.amount}</Text>
      {props.subtitle ? <Text style={styles.subtitle}>{props.subtitle}</Text> : null}
    </View>
  )
})

AppStatusHero.displayName = "AppStatusHero"

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 6,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  amount: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
  },
  subtitle: {
    color: "#FFFFFF",
    opacity: 0.92,
    fontSize: 13,
    textAlign: "center",
  },
})
