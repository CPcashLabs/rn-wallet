import React from "react"

import { Pressable, StyleSheet, Text, View } from "react-native"

import { SectionCard } from "@/features/transfer/components/TransferUi"
import { useAppTheme } from "@/shared/theme/useAppTheme"

export function SegmentedTabs<T extends string>(props: {
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (value: T) => void
}) {
  const theme = useAppTheme()

  return (
    <View style={[styles.segmentWrap, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      {props.options.map(item => {
        const active = item.value === props.value

        return (
          <Pressable
            key={item.value}
            onPress={() => props.onChange(item.value)}
            style={[
              styles.segmentItem,
              {
                backgroundColor: active ? theme.colors.primary : "transparent",
              },
            ]}
          >
            <Text style={[styles.segmentText, { color: active ? "#FFFFFF" : theme.colors.text }]}>{item.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

export function ReceiveOrderCard(props: {
  title: string
  subtitle: string
  address: string
  amountLabel: string
  orderSn?: string
  extra?: string
  onPrimaryPress?: () => void
  onSecondaryPress?: () => void
  primaryLabel?: string
  secondaryLabel?: string
  accentColor?: string
}) {
  const theme = useAppTheme()

  return (
    <SectionCard>
      <View style={styles.titleRow}>
        <View style={[styles.dot, { backgroundColor: props.accentColor || theme.colors.primary }]} />
        <View style={styles.titleMeta}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{props.title}</Text>
          <Text style={[styles.cardSubtitle, { color: theme.colors.mutedText }]}>{props.subtitle}</Text>
        </View>
      </View>

      <View style={[styles.codeBox, { borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}>
        <Text style={[styles.codeHint, { color: theme.colors.mutedText }]}>QR / 分享卡片</Text>
        <Text numberOfLines={3} style={[styles.codeValue, { color: theme.colors.text }]}>
          {props.address || "-"}
        </Text>
      </View>

      <View style={styles.metaBlock}>
        {props.orderSn ? <InfoRow label="Order SN" value={props.orderSn} /> : null}
        <InfoRow label={props.amountLabel} value={props.extra || "-"} />
      </View>

      <View style={styles.buttonRow}>
        {props.secondaryLabel && props.onSecondaryPress ? (
          <Pressable style={[styles.secondaryButton, { borderColor: theme.colors.border }]} onPress={props.onSecondaryPress}>
            <Text style={[styles.secondaryText, { color: theme.colors.text }]}>{props.secondaryLabel}</Text>
          </Pressable>
        ) : null}
        {props.primaryLabel && props.onPrimaryPress ? (
          <Pressable style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]} onPress={props.onPrimaryPress}>
            <Text style={styles.primaryText}>{props.primaryLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </SectionCard>
  )
}

export function InfoRow(props: { label: string; value: string }) {
  const theme = useAppTheme()

  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: theme.colors.mutedText }]}>{props.label}</Text>
      <Text style={[styles.infoValue, { color: theme.colors.text }]}>{props.value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  segmentWrap: {
    padding: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    flexDirection: "row",
    gap: 6,
  },
  segmentItem: {
    flex: 1,
    minHeight: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: "700",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 999,
  },
  titleMeta: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  cardSubtitle: {
    fontSize: 12,
  },
  codeBox: {
    minHeight: 164,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    gap: 10,
  },
  codeHint: {
    fontSize: 12,
    fontWeight: "600",
  },
  codeValue: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  metaBlock: {
    gap: 8,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  infoLabel: {
    fontSize: 13,
  },
  infoValue: {
    flex: 1,
    textAlign: "right",
    fontSize: 13,
    fontWeight: "600",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
  },
  primaryButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  primaryText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  secondaryText: {
    fontSize: 14,
    fontWeight: "700",
  },
})
