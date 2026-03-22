import { StyleSheet, type TextStyle } from "react-native"

export type AppTypographyStyle = Readonly<Pick<TextStyle, "fontSize" | "lineHeight" | "fontWeight" | "letterSpacing">>

export const appSpacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 28,
  xxxl: 32,
} as const

export const appRadius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 28,
  pill: 999,
} as const

export const appLayout = {
  screenPadding: appSpacing.md,
  comfortableScreenPadding: 18,
  sectionGap: appSpacing.md,
  compactSectionGap: appSpacing.sm,
} as const

export const appControls = {
  minTouchTarget: 44,
  navigationBarMinHeight: 44,
  navigationBarLargeMinHeight: 56,
  navigationSideWidth: 88,
  buttonMinHeight: 52,
  textFieldMinHeight: 52,
  listRowMinHeight: 60,
  listRowProminentMinHeight: 64,
  compactPillMinHeight: 36,
  iconButtonSize: 44,
} as const

export const appTypography = {
  largeTitle: {
    fontSize: 34,
    lineHeight: 41,
    fontWeight: "700",
    letterSpacing: 0.37,
  },
  title2: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
    letterSpacing: -0.26,
  },
  title3: {
    fontSize: 20,
    lineHeight: 25,
    fontWeight: "600",
    letterSpacing: -0.45,
  },
  headline: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "600",
    letterSpacing: -0.41,
  },
  body: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "400",
    letterSpacing: -0.41,
  },
  bodyEmphasized: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "600",
    letterSpacing: -0.41,
  },
  callout: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "400",
    letterSpacing: -0.32,
  },
  calloutEmphasized: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "600",
    letterSpacing: -0.32,
  },
  subheadline: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "400",
    letterSpacing: -0.24,
  },
  subheadlineEmphasized: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",
    letterSpacing: -0.24,
  },
  footnote: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "400",
    letterSpacing: -0.08,
  },
  footnoteEmphasized: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    letterSpacing: -0.08,
  },
  caption1: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400",
    letterSpacing: 0,
  },
  caption1Emphasized: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
    letterSpacing: 0,
  },
  caption2: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: "400",
    letterSpacing: 0.06,
  },
  button: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "600",
    letterSpacing: -0.41,
  },
} as const satisfies Record<string, AppTypographyStyle>

export const appComponentMetrics = {
  card: {
    radius: appRadius.lg,
    padding: appSpacing.lg,
    gap: appSpacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  list: {
    rowMinHeight: appControls.listRowMinHeight,
    rowPaddingX: appLayout.screenPadding,
    rowPaddingY: appSpacing.xxs,
    rowGap: 14,
  },
  button: {
    minHeight: appControls.buttonMinHeight,
    radius: appRadius.md,
    paddingX: appSpacing.xl,
    borderWidth: StyleSheet.hairlineWidth,
  },
  textField: {
    default: {
      minHeight: appControls.textFieldMinHeight,
      radius: appRadius.md,
      paddingX: appSpacing.md,
    },
    auth: {
      minHeight: appControls.textFieldMinHeight,
      radius: 18,
      paddingX: appSpacing.md,
    },
    borderWidth: StyleSheet.hairlineWidth,
    multilineMinHeight: 112,
  },
  scaffold: {
    headerMinHeight: appControls.navigationBarMinHeight,
    headerLargeMinHeight: appControls.navigationBarLargeMinHeight,
    headerSideWidth: appControls.navigationSideWidth,
    contentPaddingX: appLayout.comfortableScreenPadding,
    topInsetOffset: appSpacing.xxs,
    headerBottomInset: appSpacing.xxs,
  },
  headerAction: {
    minHeight: appControls.minTouchTarget,
    minWidth: appControls.minTouchTarget,
    pillRadius: appRadius.md,
    paddingX: appSpacing.sm,
  },
  secureToggle: {
    minHeight: appControls.minTouchTarget,
    minWidth: appControls.minTouchTarget,
  },
  inlineIconButton: {
    size: appControls.iconButtonSize,
  },
} as const

export const APP_CARD_RADIUS = appComponentMetrics.card.radius
export const APP_CARD_PADDING = appComponentMetrics.card.padding
export const APP_CARD_GAP = appComponentMetrics.card.gap
export const APP_LIST_ROW_MIN_HEIGHT = appComponentMetrics.list.rowMinHeight
export const APP_LIST_ROW_PADDING = appComponentMetrics.list.rowPaddingX
