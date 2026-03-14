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
            {props.title ? <Text style={[styles.title, { color: theme.colors.text }, props.titleStyle]}>{props.title}</Text> : null}
            {props.subtitle ? (
              <Text style={[styles.subtitle, { color: theme.colors.mutedText }, props.subtitleStyle]}>{props.subtitle}</Text>
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
      backgroundColor: props.selected ? `${theme.colors.primary}12` : theme.colors.surface,
      borderBottomWidth: props.hideDivider ? 0 : StyleSheet.hairlineWidth,
    },
    props.style,
  ]

  if (props.onPress) {
    return (
      <Pressable onPress={props.onPress} style={rowStyle}>
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
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  left: {
    alignItems: "center",
    justifyContent: "center",
  },
  main: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: 13,
  },
  arrow: {
    fontSize: 18,
  },
})
