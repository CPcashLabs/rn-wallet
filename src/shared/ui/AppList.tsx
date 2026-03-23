import React from "react"

import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native"

import { useAppTheme } from "@/shared/theme/useAppTheme"
import { AppCard, APP_LIST_ROW_MIN_HEIGHT } from "@/shared/ui/AppCard"
import { SFSymbolIcon } from "@/shared/ui/SFSymbolIcon"

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
  const metrics = theme.components.list
  const content = (
    <>
      {props.left ? <View style={styles.left}>{props.left}</View> : null}
      <View style={[styles.main, props.contentStyle]}>
        {props.children ? (
          props.children
        ) : (
          <>
            {props.title ? (
              <Text
                numberOfLines={1}
                style={[
                  styles.title,
                  theme.typography.bodyEmphasized,
                  {
                    color: theme.colors.text,
                  },
                  props.titleStyle,
                ]}
              >
                {props.title}
              </Text>
            ) : null}
            {props.subtitle ? (
              <Text
                numberOfLines={2}
                style={[
                  styles.subtitle,
                  theme.typography.subheadline,
                  {
                    color: theme.colors.mutedText,
                  },
                  props.subtitleStyle,
                ]}
              >
                {props.subtitle}
              </Text>
            ) : null}
          </>
        )}
      </View>
      {props.right ?? (props.onPress ? <SFSymbolIcon color={theme.colors.mutedText} fallbackName="chevron-right" name="chevron.right" size={13} weight="semibold" /> : null)}
    </>
  )

  const rowStyle = [
    styles.row,
    {
      minHeight: props.minHeight ?? APP_LIST_ROW_MIN_HEIGHT,
      paddingHorizontal: metrics.rowPaddingX,
      paddingVertical: metrics.rowPaddingY,
      gap: metrics.rowGap,
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
    flexDirection: "row",
    alignItems: "center",
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
  },
  subtitle: {
  },
})
