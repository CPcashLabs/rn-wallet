import React from "react"

import { Image, Pressable, StyleSheet, Text, View } from "react-native"

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
  type OrderListStatusTone,
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
}) {
  const theme = useAppTheme()

  return (
    <Pressable
      onPress={props.onPress}
      style={[
        styles.chip,
        {
          borderColor: props.active ? theme.colors.primary : theme.colors.glassBorder,
          backgroundColor: props.active ? theme.colors.primarySoft : theme.colors.glass,
          shadowColor: theme.colors.shadow,
          shadowOpacity: props.active ? (theme.isDark ? 0.14 : 0.08) : theme.isDark ? 0.08 : 0.03,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: props.active ? 2 : 1,
        },
      ]}
    >
      <Text style={[styles.chipText, { color: props.active ? theme.colors.primary : theme.colors.text }]}>{props.label}</Text>
    </Pressable>
  )
}

export function SummaryMetric(props: {
  label: string
  value: string
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
      ]}
    >
      <Text style={[styles.metricLabel, { color: theme.colors.mutedText }]}>{props.label}</Text>
      <Text style={[styles.metricValue, { color: theme.colors.text }]}>{props.value}</Text>
    </View>
  )
}

export function SummaryGrid(props: {
  items: Array<{ label: string; value: string }>
}) {
  return (
    <SectionCard>
      <View style={styles.metricGrid}>
        {props.items.map(item => (
          <SummaryMetric key={item.label} label={item.label} value={item.value} />
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
          {statusBadge ? <Text style={[styles.rowStatusText, { color: resolveStatusTextColor(theme, statusBadge.tone) }]}>{statusBadge.label}</Text> : null}
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
        <Text style={[styles.recordGroupEyebrow, { color: theme.colors.mutedText }]}>{props.t("orders.filters.time")}</Text>
        <Text style={[styles.recordGroupTitle, { color: theme.colors.text }]}>{props.month}</Text>
      </View>

      <View style={styles.recordGroupSummary}>
        <View
          style={[
            styles.recordSummaryMetric,
            {
              backgroundColor: theme.colors.glass,
              borderColor: theme.colors.glassBorder,
            },
          ]}
        >
          <Text style={[styles.recordSummaryLabel, { color: theme.colors.mutedText }]}>{props.t("orders.summary.payment")}</Text>
          <Text style={[styles.recordSummaryValue, { color: theme.colors.text }]}>{summary.payment}</Text>
        </View>
        <View
          style={[
            styles.recordSummaryMetric,
            {
              backgroundColor: theme.colors.glass,
              borderColor: theme.colors.glassBorder,
            },
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
                  <Text numberOfLines={1} style={[styles.recordMeta, { color: theme.colors.mutedText }]}>
                    {resolveCounterpartyLabel(props.t, item.orderType)}{" "}
                    {formatAddress(resolveCounterpartyAddress(item) || item.walletAddress || item.receiveAddress || item.paymentAddress || "")}
                  </Text>
                  <Text style={[styles.recordTime, { color: theme.colors.mutedText }]}>{formatCompactTimestamp(item.createdAt)}</Text>
                </View>
              </View>

              <View style={styles.recordRowRight}>
                <Text
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
                    style={[
                      styles.recordStatusText,
                      {
                        color: resolveStatusTextColor(theme, statusBadge.tone),
                        backgroundColor: resolveStatusBackgroundColor(theme, statusBadge.tone),
                        borderColor: resolveStatusBorderColor(theme, statusBadge.tone),
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

function resolveStatusTextColor(theme: ReturnType<typeof useAppTheme>, tone: OrderListStatusTone) {
  switch (tone) {
    case "warning":
      return theme.colors.warning
    case "danger":
      return theme.colors.danger
    default:
      return theme.colors.info
  }
}

function resolveStatusBackgroundColor(theme: ReturnType<typeof useAppTheme>, tone: OrderListStatusTone) {
  switch (tone) {
    case "warning":
      return theme.colors.warningSoft
    case "danger":
      return theme.colors.dangerSoft
    default:
      return theme.colors.primarySoft
  }
}

function resolveStatusBorderColor(theme: ReturnType<typeof useAppTheme>, tone: OrderListStatusTone) {
  switch (tone) {
    case "warning":
      return theme.colors.warningBorder
    case "danger":
      return theme.colors.dangerBorder
    default:
      return theme.colors.glassBorder
  }
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
    minHeight: 36,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  metric: {
    minWidth: "42%",
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  metricLabel: {
    fontSize: 12,
  },
  metricValue: {
    fontSize: 22,
    letterSpacing: -0.5,
    fontWeight: "700",
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
    fontWeight: "600",
  },
  recordGroupCard: {
    padding: 0,
    gap: 0,
    overflow: "hidden",
  },
  recordGroupHeader: {
    paddingHorizontal: 18,
    paddingTop: 18,
    gap: 4,
  },
  recordGroupEyebrow: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  recordGroupTitle: {
    fontSize: 20,
    letterSpacing: -0.4,
    fontWeight: "700",
  },
  recordGroupSummary: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 6,
  },
  recordSummaryMetric: {
    flex: 1,
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  recordSummaryLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  recordSummaryValue: {
    fontSize: 19,
    fontWeight: "700",
  },
  recordRow: {
    paddingHorizontal: 18,
    paddingVertical: 16,
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
    gap: 4,
    minWidth: 0,
  },
  recordTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  recordMeta: {
    fontSize: 12,
  },
  recordTime: {
    fontSize: 12,
  },
  recordRowRight: {
    minWidth: 88,
    alignItems: "flex-end",
    gap: 6,
    paddingTop: 2,
  },
  recordAmount: {
    fontSize: 18,
    letterSpacing: -0.4,
    fontWeight: "800",
  },
  recordStatusText: {
    fontSize: 12,
    fontWeight: "600",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 4,
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
