import React from "react"

import { Pressable, StyleSheet, Text, TextInput, View } from "react-native"

import { SectionCard } from "@/features/transfer/components/TransferUi"
import { formatAddress } from "@/features/home/utils/format"
import type { OrderListItem } from "@/features/orders/services/ordersApi"
import { formatMonthKey, formatSignedTokenAmount, formatTimestamp, resolveCounterpartyAddress, resolveOrderStatusLabel, resolveOrderTypeLabel } from "@/features/orders/utils/orderHelpers"
import { useAppTheme } from "@/shared/theme/useAppTheme"

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
          <Text style={[styles.rowMeta, { color: theme.colors.mutedText }]}>
            {formatAddress(counterparty || props.item.walletAddress || props.item.receiveAddress || props.item.paymentAddress || "")}
          </Text>
          <Text style={[styles.rowMeta, { color: theme.colors.mutedText }]}>
            {resolveOrderStatusLabel(props.t, props.item.status)}
          </Text>
        </View>
        <Text style={[styles.rowTime, { color: theme.colors.mutedText }]}>{formatTimestamp(props.item.createdAt)}</Text>
      </SectionCard>
    </Pressable>
  )
}

export function ActionRow(props: {
  label: string
  body?: string
  onPress: () => void
}) {
  const theme = useAppTheme()

  return (
    <Pressable onPress={props.onPress} style={styles.actionRow}>
      <View style={styles.actionCopy}>
        <Text style={[styles.actionLabel, { color: theme.colors.text }]}>{props.label}</Text>
        {props.body ? <Text style={[styles.actionBody, { color: theme.colors.mutedText }]}>{props.body}</Text> : null}
      </View>
      <Text style={[styles.actionArrow, { color: theme.colors.mutedText }]}>›</Text>
    </Pressable>
  )
}

export function StatusHero(props: {
  title: string
  amount: string
  subtitle?: string
}) {
  const theme = useAppTheme()

  return (
    <View style={[styles.hero, { backgroundColor: theme.colors.primary }]}>
      <Text style={styles.heroTitle}>{props.title}</Text>
      <Text style={styles.heroAmount}>{props.amount}</Text>
      {props.subtitle ? <Text style={styles.heroSubtitle}>{props.subtitle}</Text> : null}
    </View>
  )
}

export function LabeledInput(props: {
  label: string
  value: string
  placeholder: string
  keyboardType?: "default" | "email-address"
  onChangeText: (value: string) => void
}) {
  const theme = useAppTheme()

  return (
    <View style={styles.inputWrap}>
      <Text style={[styles.inputLabel, { color: theme.colors.text }]}>{props.label}</Text>
      <TextInput
        autoCapitalize="none"
        keyboardType={props.keyboardType}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        placeholderTextColor={theme.colors.mutedText}
        style={[
          styles.input,
          {
            borderColor: theme.colors.border,
            color: theme.colors.text,
            backgroundColor: theme.colors.surface,
          },
        ]}
        value={props.value}
      />
    </View>
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
    flex: 1,
  },
  rowTime: {
    fontSize: 12,
  },
  actionRow: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  actionCopy: {
    flex: 1,
    gap: 4,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  actionBody: {
    fontSize: 12,
    lineHeight: 18,
  },
  actionArrow: {
    fontSize: 20,
  },
  hero: {
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 6,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  heroAmount: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
  },
  heroSubtitle: {
    color: "#FFFFFF",
    opacity: 0.92,
    fontSize: 13,
    textAlign: "center",
  },
  inputWrap: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    minHeight: 48,
    paddingHorizontal: 14,
    fontSize: 15,
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
