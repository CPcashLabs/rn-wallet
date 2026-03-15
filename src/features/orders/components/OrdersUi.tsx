import React from "react"

import { Pressable, StyleSheet, Text, View } from "react-native"

import { SectionCard } from "@/shared/ui/AppFlowUi"
import { formatAddress } from "@/features/home/utils/format"
import type { OrderListItem } from "@/features/orders/services/ordersApi"
import {
  formatMonthKey,
  formatSignedTokenAmount,
  formatTimestamp,
  resolveCounterpartyAddress,
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
          borderColor: props.active ? theme.colors.primary : theme.colors.border,
          backgroundColor: props.active ? `${theme.colors.primary}12` : theme.colors.surface,
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
    <View style={styles.metric}>
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
            {formatSignedTokenAmount(props.item.orderType, props.item.sendAmount || props.item.recvAmount)} {props.item.sendCoinName || props.item.recvCoinName}
          </Text>
        </View>
        <View style={styles.rowBottom}>
          <Text style={[styles.rowMeta, styles.rowMetaAddress, { color: theme.colors.mutedText }]}>
            {formatAddress(counterparty || props.item.walletAddress || props.item.receiveAddress || props.item.paymentAddress || "")}
          </Text>
          {statusBadge ? <OrderStatusBadge label={statusBadge.label} tone={statusBadge.tone} /> : null}
        </View>
        <Text style={[styles.rowTime, { color: theme.colors.mutedText }]}>{formatTimestamp(props.item.createdAt)}</Text>
      </SectionCard>
    </Pressable>
  )
}

function OrderStatusBadge(props: {
  label: string
  tone: OrderListStatusTone
}) {
  const theme = useAppTheme()
  const isDanger = props.tone === "danger"

  return (
    <View
      style={[
        styles.statusBadge,
        {
          backgroundColor: isDanger ? "rgba(220,38,38,0.12)" : theme.colors.primarySoft ?? `${theme.colors.primary}14`,
        },
      ]}
    >
      <Text
        style={[
          styles.statusBadgeText,
          {
            color: isDanger ? "#DC2626" : theme.colors.primary,
          },
        ]}
      >
        {props.label}
      </Text>
    </View>
  )
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
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
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
    gap: 4,
  },
  metricLabel: {
    fontSize: 12,
  },
  metricValue: {
    fontSize: 20,
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
  statusBadge: {
    minHeight: 24,
    borderRadius: 999,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "600",
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
