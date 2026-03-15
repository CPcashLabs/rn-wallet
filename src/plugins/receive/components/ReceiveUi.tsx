import React from "react"

import { Pressable, StyleSheet, Text, View } from "react-native"

import { SectionCard } from "@/shared/ui/AppFlowUi"
import type { QrMatrix } from "@/plugins/receive/utils/qrcode"
import { AppButton } from "@/shared/ui/AppButton"
import { useAppTheme } from "@/shared/theme/useAppTheme"

export function SegmentedTabs<T extends string>(props: {
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (value: T) => void
}) {
  const theme = useAppTheme()

  return (
    <View style={[styles.segmentWrap, { backgroundColor: theme.colors.glassStrong, borderColor: theme.colors.glassBorder }]}>
      {props.options.map(item => {
        const active = item.value === props.value

        return (
          <Pressable
            key={item.value}
            onPress={() => props.onChange(item.value)}
            style={[
              styles.segmentItem,
              {
                backgroundColor: active ? theme.colors.primarySoft : "transparent",
                borderColor: active ? theme.colors.primary : "transparent",
              },
            ]}
          >
            <Text style={[styles.segmentText, { color: active ? theme.colors.primary : theme.colors.text }]}>{item.label}</Text>
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
  qrMatrix?: QrMatrix | null
  onPrimaryPress?: () => void
  onSecondaryPress?: () => void
  primaryLabel?: string
  secondaryLabel?: string
  accentColor?: string
}) {
  const theme = useAppTheme()

  return (
    <SectionCard style={[styles.receiveCard, { backgroundColor: theme.colors.glassStrong, borderColor: theme.colors.glassBorder }]}>
      <View style={styles.titleRow}>
        <View style={[styles.dot, { backgroundColor: props.accentColor || theme.colors.primary, borderColor: theme.colors.glassBorder }]} />
        <View style={styles.titleMeta}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{props.title}</Text>
          <Text style={[styles.cardSubtitle, { color: theme.colors.mutedText }]}>{props.subtitle}</Text>
        </View>
      </View>

      <View style={[styles.codeBox, { borderColor: theme.colors.glassBorder, backgroundColor: theme.colors.glass }]}>
        {props.qrMatrix ? (
          <QrMatrixView matrix={props.qrMatrix} />
        ) : (
          <>
            <Text style={[styles.codeHint, { color: theme.colors.mutedText }]}>QR / 分享卡片</Text>
            <Text numberOfLines={3} style={[styles.codeValue, { color: theme.colors.text }]}>
              {props.address || "-"}
            </Text>
          </>
        )}
      </View>

      <View style={styles.metaBlock}>
        {props.orderSn ? <InfoRow label="Order SN" value={props.orderSn} /> : null}
        <InfoRow label={props.amountLabel} value={props.extra || "-"} />
      </View>

      <View style={styles.buttonRow}>
        {props.secondaryLabel && props.onSecondaryPress ? (
          <AppButton label={props.secondaryLabel} onPress={props.onSecondaryPress} style={styles.flexButton} variant="secondary" />
        ) : null}
        {props.primaryLabel && props.onPrimaryPress ? (
          <AppButton label={props.primaryLabel} onPress={props.onPrimaryPress} style={styles.flexButton} />
        ) : null}
      </View>
    </SectionCard>
  )
}

function QrMatrixView(props: { matrix: QrMatrix }) {
  const cellSize = Math.max(4, Math.floor(180 / props.matrix.size))

  return (
    <View style={styles.qrWrap}>
      {props.matrix.rows.map((row, rowIndex) => (
        <View key={`row-${rowIndex}`} style={styles.qrRow}>
          {row.map((filled, columnIndex) => (
            <View
              key={`cell-${rowIndex}-${columnIndex}`}
              style={[
                styles.qrCell,
                {
                  width: cellSize,
                  height: cellSize,
                  backgroundColor: filled ? "#111827" : "#FFFFFF",
                },
              ]}
            />
          ))}
        </View>
      ))}
    </View>
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
    borderRadius: 22,
    flexDirection: "row",
    gap: 6,
  },
  segmentItem: {
    flex: 1,
    minHeight: 40,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: "700",
  },
  receiveCard: {
    gap: 16,
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
    borderWidth: StyleSheet.hairlineWidth,
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
    borderRadius: 24,
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
  qrWrap: {
    width: 180,
    height: 180,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    padding: 6,
  },
  qrRow: {
    flexDirection: "row",
  },
  qrCell: {
    flexShrink: 0,
  },
  metaBlock: {
    gap: 0,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 10,
  },
  infoLabel: {
    fontSize: 13,
    maxWidth: "42%",
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
  flexButton: {
    flex: 1,
  },
})
