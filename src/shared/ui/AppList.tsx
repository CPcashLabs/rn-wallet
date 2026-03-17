import React from "react"

import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native"

import { useAppTheme } from "@/shared/theme/useAppTheme"
import { AppCard, APP_LIST_ROW_MIN_HEIGHT, APP_LIST_ROW_PADDING } from "@/shared/ui/AppCard"

type AppListCardProps = {
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
}

type AppListRowProps = {
  title?: string
  subtitle?: string
  onPress?: () => void
  left?: React.ReactNode
  right?: React.ReactNode
  children?: React.ReactNode
  hideDivider?: boolean
  selected?: boolean
  minHeight?: number
  style?: StyleProp<ViewStyle>
  contentStyle?: StyleProp<ViewStyle>
  titleStyle?: StyleProp<TextStyle>
  subtitleStyle?: StyleProp<TextStyle>
}

export const AppListCard = React.memo(function AppListCard(props: AppListCardProps) {
  return (
    <AppCard gap={0} overflow="hidden" padding={0} style={props.style}>
      {props.children}
    </AppCard>
  )
})

AppListCard.displayName = "AppListCard"

export const AppListRow = React.memo(function AppListRow(props: AppListRowProps) {
  const theme = useAppTheme()
  const content = (
    <>
      {props.left ? <View style={styles.left}>{props.left}</View> : null}
      <View style={[styles.main, props.contentStyle]}>
        {props.children ? (
          props.children
        ) : (
          <>
            {props.title ? (
              <Text numberOfLines={1} style={[styles.title, { color: theme.colors.text }, props.titleStyle]}>
                {props.title}
              </Text>
            ) : null}
            {props.subtitle ? (
              <Text numberOfLines={2} style={[styles.subtitle, { color: theme.colors.mutedText }, props.subtitleStyle]}>
                {props.subtitle}
              </Text>
            ) : null}
          </>
        )}
      </View>
      {props.right ?? (props.onPress ? <Text style={[styles.arrow, { color: theme.colors.mutedText }]}>›</Text> : null)}
    </>
  )

  const rowStyle = [
    styles.row,
    {
      minHeight: props.minHeight ?? APP_LIST_ROW_MIN_HEIGHT,
      borderBottomColor: theme.colors.border,
      backgroundColor: props.selected ? theme.colors.primarySoft ?? `${theme.colors.primary}12` : theme.colors.surfaceElevated ?? theme.colors.surface,
      borderBottomWidth: props.hideDivider ? 0 : StyleSheet.hairlineWidth,
    },
    props.style,
  ]

  if (props.onPress) {
    return (
      <Pressable
        onPress={props.onPress}
        style={({ pressed }) => [
          rowStyle,
          pressed
            ? {
                backgroundColor: props.selected
                  ? theme.colors.primarySoft ?? `${theme.colors.primary}12`
                  : theme.colors.surfaceMuted ?? theme.colors.background,
              }
            : null,
        ]}
      >
        {content}
      </Pressable>
    )
  }

  return <View style={rowStyle}>{content}</View>
})

AppListRow.displayName = "AppListRow"

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: APP_LIST_ROW_PADDING,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  left: {
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  main: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  title: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  arrow: {
    fontSize: 20,
    lineHeight: 20,
    fontWeight: "300",
  },
})
