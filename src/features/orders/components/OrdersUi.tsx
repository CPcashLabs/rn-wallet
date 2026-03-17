import React from "react"

import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native"

import { SectionCard } from "@/shared/ui/AppFlowUi"
import { formatAddress } from "@/features/home/utils/format"
import { OrderCounterpartyAvatar } from "@/features/orders/components/OrderCounterpartyAvatar"
import type { OrderListItem } from "@/features/orders/services/ordersApi"
import {
  formatCompactTimestamp,
  formatMonthKey,
  formatTokenAmount,
  isIncomingOrderType,
  resolveCounterpartyAddress,
  resolveCounterpartyLabel,
  resolveOrderListStatusBadge,
  resolveOrderTypeLabel,
} from "@/features/orders/utils/orderHelpers"
import { useAppTheme } from "@/shared/theme/useAppTheme"
import { AppListRow } from "@/shared/ui/AppList"
import { AppStatusHero } from "@/shared/ui/AppStatusHero"
import { AppTextField } from "@/shared/ui/AppTextField"

type Translator = (key: string, options?: Record<string, unknown>) => string

export function FilterChip(props: {
  label: string
  active?: boolean
  onPress: () => void
  style?: StyleProp<ViewStyle>
  labelStyle?: StyleProp<TextStyle>
}) {
  const theme = useAppTheme()
  const backgroundColor = props.active ? theme.colors.primarySoft ?? `${theme.colors.primary}14` : theme.colors.surfaceElevated ?? theme.colors.surface
  const borderColor = props.active ? theme.colors.primary : theme.colors.glassBorder ?? theme.colors.border

  return (
    <Pressable
      onPress={props.onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor,
          borderColor,
          shadowColor: theme.colors.shadow,
          shadowOpacity: theme.isDark ? 0.1 : 0.025,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 3 },
          elevation: 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
        props.style,
      ]}
    >
      <Text numberOfLines={1} style={[styles.chipText, props.active ? styles.chipTextActive : null, { color: props.active ? theme.colors.primary : theme.colors.text }, props.labelStyle]}>
        {props.label}
      </Text>
    </Pressable>
  )
}

export function SummaryMetric(props: {
  label: string
  value: string
  style?: StyleProp<ViewStyle>
  labelStyle?: StyleProp<TextStyle>
  valueStyle?: StyleProp<TextStyle>
}) {
  const theme = useAppTheme()

  return (
    <View
      style={[
        styles.metric,
        {
          backgroundColor: theme.colors.glass,
          borderColor: theme.colors.glassBorder,
        },
        props.style,
      ]}
    >
      <Text style={[styles.metricLabel, { color: theme.colors.mutedText }, props.labelStyle]}>{props.label}</Text>
      <Text style={[styles.metricValue, { color: theme.colors.text }, props.valueStyle]}>{props.value}</Text>
    </View>
  )
}

export function SummaryGrid(props: {
  items: Array<{ label: string; value: string }>
  cardStyle?: StyleProp<ViewStyle>
  gridStyle?: StyleProp<ViewStyle>
  metricStyle?: StyleProp<ViewStyle>
  metricLabelStyle?: StyleProp<TextStyle>
  metricValueStyle?: StyleProp<TextStyle>
}) {
  return (
    <SectionCard style={props.cardStyle}>
      <View style={[styles.metricGrid, props.gridStyle]}>
        {props.items.map(item => (
          <SummaryMetric
            key={item.label}
            label={item.label}
            labelStyle={props.metricLabelStyle}
            style={props.metricStyle}
            value={item.value}
            valueStyle={props.metricValueStyle}
          />
        ))}
      </View>
    </SectionCard>
  )
}

export function MonthHeader(props: { value: string }) {
  const theme = useAppTheme()

  return <Text style={[styles.monthHeader, { color: theme.colors.text }]}>{props.value}</Text>
}

export function OrderListCard(props: {
  item: OrderListItem
  t: Translator
  onPress: () => void
}) {
  const theme = useAppTheme()
  const counterparty = resolveCounterpartyAddress(props.item)
  const statusBadge = resolveOrderListStatusBadge(props.t, props.item.status)

  return (
    <Pressable onPress={props.onPress}>
      <SectionCard>
        <View style={styles.rowTop}>
          <Text style={[styles.rowTitle, { color: theme.colors.text }]}>
            {resolveOrderTypeLabel(props.t, props.item.orderType)}
          </Text>
          <Text style={[styles.rowAmount, { color: theme.colors.text }]}>
            {formatAmountWithSign(props.item)}
          </Text>
        </View>
        <View style={styles.rowBottom}>
          <Text style={[styles.rowMeta, styles.rowMetaAddress, { color: theme.colors.mutedText }]}>
            {formatAddress(counterparty || props.item.walletAddress || props.item.receiveAddress || props.item.paymentAddress || "")}
          </Text>
          {statusBadge ? <Text style={[styles.rowStatusText, { color: theme.colors.mutedText }]}>{statusBadge.label}</Text> : null}
        </View>
        <Text style={[styles.rowTime, { color: theme.colors.mutedText }]}>{formatCompactTimestamp(props.item.createdAt)}</Text>
      </SectionCard>
    </Pressable>
  )
}

export function OrderMonthSection(props: {
  month: string
  items: OrderListItem[]
  t: Translator
  onPressItem: (item: OrderListItem) => void
}) {
  const theme = useAppTheme()
  const summary = summarizeOrderMonthItems(props.items)

  return (
    <SectionCard style={styles.recordGroupCard}>
      <View style={styles.recordGroupHeader}>
        <Text style={[styles.recordGroupTitle, { color: theme.colors.text }]}>{props.month}</Text>
      </View>

      <View style={styles.recordGroupSummary}>
        <View
          style={[
            styles.recordSummaryMetric,
            styles.recordSummaryMetricPlain,
          ]}
        >
          <Text style={[styles.recordSummaryLabel, { color: theme.colors.mutedText }]}>{props.t("orders.summary.payment")}</Text>
          <Text style={[styles.recordSummaryValue, { color: theme.colors.text }]}>{summary.payment}</Text>
        </View>
        <View
          style={[
            styles.recordSummaryMetric,
            styles.recordSummaryMetricPlain,
          ]}
        >
          <Text style={[styles.recordSummaryLabel, { color: theme.colors.mutedText }]}>{props.t("orders.summary.receipt")}</Text>
          <Text style={[styles.recordSummaryValue, { color: theme.colors.success }]}>{summary.receipt}</Text>
        </View>
      </View>

      <View>
        {props.items.map((item, index) => {
          const typeLabel = resolveOrderTypeLabel(props.t, item.orderType)
          const statusBadge = resolveOrderListStatusBadge(props.t, item.status)

          return (
            <Pressable
              key={item.orderSn}
              onPress={() => props.onPressItem(item)}
              style={[
                styles.recordRow,
                index < props.items.length - 1 ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.glassBorder } : null,
              ]}
            >
              <View style={styles.recordRowLeft}>
                <OrderCounterpartyAvatar item={item} />
                <View style={styles.recordTextWrap}>
                  <Text numberOfLines={1} style={[styles.recordTitle, { color: theme.colors.text }]}>
                    {typeLabel}
                  </Text>
                  <Text ellipsizeMode="middle" numberOfLines={1} style={[styles.recordMeta, { color: theme.colors.mutedText }]}>
                    {resolveCounterpartyLabel(props.t, item.orderType)}{" "}
                    {formatAddress(resolveCounterpartyAddress(item) || item.walletAddress || item.receiveAddress || item.paymentAddress || "")}
                  </Text>
                  <Text style={[styles.recordTime, { color: theme.colors.mutedText }]}>{formatCompactTimestamp(item.createdAt)}</Text>
                </View>
              </View>

              <View style={styles.recordRowRight}>
                <Text
                  adjustsFontSizeToFit
                  minimumFontScale={0.88}
                  numberOfLines={1}
                  style={[
                    styles.recordAmount,
                    {
                      color: isIncomingOrderType(item.orderType) ? theme.colors.success : theme.colors.text,
                    },
                  ]}
                >
                  {formatAmountWithSign(item)}
                </Text>
                {statusBadge ? (
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.recordStatusText,
                      {
                        color: theme.colors.mutedText,
                      },
                    ]}
                  >
                    {statusBadge.label}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          )
        })}
      </View>
    </SectionCard>
  )
}

function summarizeOrderMonthItems(items: OrderListItem[]) {
  let payment = 0
  let receipt = 0

  items.forEach(item => {
    if (isIncomingOrderType(item.orderType)) {
      receipt += item.recvActualAmount || item.recvAmount
      return
    }

    payment += item.sendActualAmount || item.sendAmount
  })

  return {
    payment: formatTokenAmount(payment, 2),
    receipt: formatTokenAmount(receipt, 2),
  }
}

function formatAmountWithSign(item: OrderListItem) {
  const isIncoming = isIncomingOrderType(item.orderType)
  const amount = isIncoming ? item.recvActualAmount || item.recvAmount : item.sendActualAmount || item.sendAmount
  const sign = isIncoming ? "+" : "-"

  return `${sign}${formatTokenAmount(amount, 2)}`
}

export function ActionRow(props: {
  label: string
  body?: string
  onPress: () => void
}) {
  return <AppListRow onPress={props.onPress} subtitle={props.body} title={props.label} />
}

export function StatusHero(props: {
  title: string
  amount: string
  subtitle?: string
}) {
  return <AppStatusHero amount={props.amount} subtitle={props.subtitle} title={props.title} />
}

export function LabeledInput(props: {
  label: string
  value: string
  placeholder: string
  keyboardType?: "default" | "email-address"
  onChangeText: (value: string) => void
}) {
  return (
    <AppTextField
      autoCapitalize="none"
      backgroundTone="surface"
      keyboardType={props.keyboardType}
      label={props.label}
      onChangeText={props.onChangeText}
      placeholder={props.placeholder}
      value={props.value}
    />
  )
}

export function SuccessStateCard(props: {
  title: string
  body: string
}) {
  const theme = useAppTheme()

  return (
    <SectionCard>
      <Text style={[styles.successTitle, { color: theme.colors.text }]}>{props.title}</Text>
      <Text style={[styles.successBody, { color: theme.colors.mutedText }]}>{props.body}</Text>
    </SectionCard>
  )
}

export function resolveSectionTitle(timestamp: number | null) {
  return formatMonthKey(timestamp)
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 34,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  chipText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600",
    letterSpacing: -0.15,
  },
  chipTextActive: {
    fontWeight: "700",
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metric: {
    flexBasis: "47%",
    flexGrow: 1,
    minHeight: 92,
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  metricLabel: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "500",
  },
  metricValue: {
    fontSize: 21,
    lineHeight: 26,
    letterSpacing: -0.45,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  monthHeader: {
    fontSize: 15,
    fontWeight: "700",
  },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  rowBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
  },
  rowAmount: {
    fontSize: 15,
    fontWeight: "700",
    textAlign: "right",
  },
  rowMeta: {
    fontSize: 12,
  },
  rowMetaAddress: {
    flex: 1,
    paddingRight: 12,
  },
  rowTime: {
    fontSize: 12,
  },
  rowStatusText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
  },
  recordGroupCard: {
    padding: 0,
    gap: 0,
    overflow: "hidden",
  },
  recordGroupHeader: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 6,
  },
  recordGroupTitle: {
    fontSize: 20,
    lineHeight: 25,
    letterSpacing: -0.4,
    fontWeight: "700",
  },
  recordGroupSummary: {
    flexDirection: "row",
    gap: 36,
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 10,
  },
  recordSummaryMetric: {
    gap: 6,
  },
  recordSummaryMetricPlain: {
    minWidth: 108,
  },
  recordSummaryLabel: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "400",
  },
  recordSummaryValue: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "700",
  },
  recordRow: {
    paddingHorizontal: 18,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14,
  },
  recordRowLeft: {
    flexDirection: "row",
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  recordTextWrap: {
    flex: 1,
    gap: 6,
    minWidth: 0,
  },
  recordTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  recordMeta: {
    fontSize: 12,
    lineHeight: 17,
  },
  recordTime: {
    fontSize: 12,
    lineHeight: 17,
  },
  recordRowRight: {
    minWidth: 92,
    maxWidth: 116,
    flexShrink: 0,
    alignItems: "flex-end",
    gap: 4,
    paddingTop: 2,
  },
  recordAmount: {
    fontSize: 15,
    lineHeight: 21,
    letterSpacing: -0.25,
    fontWeight: "700",
  },
  recordStatusText: {
    maxWidth: "100%",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
    textAlign: "right",
    alignSelf: "flex-end",
  },
  successTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  successBody: {
    fontSize: 13,
    lineHeight: 20,
  },
})
