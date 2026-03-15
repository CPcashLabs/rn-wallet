import React from "react"

import {
  Animated,
  Dimensions,
  Image,
  Modal,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type LayoutChangeEvent,
  type GestureResponderEvent,
  type PanResponderGestureState,
} from "react-native"
import { useTranslation } from "react-i18next"

import { stopAnimatedValueListener } from "@/shared/animation/stopAnimatedValueListener"
import { useAppTheme } from "@/shared/theme/useAppTheme"

const SCREEN_WIDTH = Dimensions.get("window").width
const MIN_SCALE = 1
const MAX_SCALE = 5

type CropRatio = {
  w: number
  h: number
  label: string
}

export const PRESET_RATIOS: CropRatio[] = [
  { w: 1, h: 1, label: "1:1" },
  { w: 4, h: 3, label: "4:3" },
  { w: 16, h: 9, label: "16:9" },
  { w: 3, h: 4, label: "3:4" },
]

type Props = {
  visible: boolean
  imageUri: string
  onConfirm: (cropInfo: CropResult) => void
  onCancel: () => void
  initialRatio?: CropRatio
}

export type CropResult = {
  sourceUri: string
  cropX: number
  cropY: number
  cropWidth: number
  cropHeight: number
  ratio: CropRatio
}

function distance(touches: React.Touch[] | { pageX: number; pageY: number }[]) {
  if (touches.length < 2) return 0
  const dx = touches[0].pageX - touches[1].pageX
  const dy = touches[0].pageY - touches[1].pageY
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * 头像裁剪弹窗（纯 RN Animated + PanResponder，无额外依赖）。
 *
 * 交互：
 *  - 单指拖动平移图片
 *  - 双指捏合缩放图片（1x ~ 5x）
 *  - 底部选择比例预设
 */
export function ImageCropModal({ visible, imageUri, onConfirm, onCancel, initialRatio }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()

  const [ratio, setRatio] = React.useState<CropRatio>(initialRatio ?? PRESET_RATIOS[0])
  const [imageLayout, setImageLayout] = React.useState({ width: 0, height: 0 })
  const [cropBoxSize, setCropBoxSize] = React.useState({ width: 0, height: 0 })

  const translateX = React.useRef(new Animated.Value(0)).current
  const translateY = React.useRef(new Animated.Value(0)).current
  const scaleAnim = React.useRef(new Animated.Value(1)).current

  // 手势逻辑使用同步 ref 作为真值，避免依赖 Animated listener 的异步时序。
  const currentTx = React.useRef(0)
  const currentTy = React.useRef(0)
  const currentScale = React.useRef(1)

  const setTranslateXValue = React.useCallback((value: number) => {
    currentTx.current = value
    translateX.setValue(value)
  }, [translateX])

  const setTranslateYValue = React.useCallback((value: number) => {
    currentTy.current = value
    translateY.setValue(value)
  }, [translateY])

  const setScaleValue = React.useCallback((value: number) => {
    currentScale.current = value
    scaleAnim.setValue(value)
  }, [scaleAnim])

  React.useEffect(() => {
    const idS = scaleAnim.addListener(({ value }) => {
      currentScale.current = value
    })

    return () => {
      stopAnimatedValueListener(scaleAnim, idS)
    }
  }, [scaleAnim])

  // 重置动画值
  const resetTransform = React.useCallback(() => {
    setTranslateXValue(0)
    setTranslateYValue(0)
    setScaleValue(1)
  }, [setScaleValue, setTranslateXValue, setTranslateYValue])

  React.useEffect(() => {
    if (visible) resetTransform()
  }, [visible, ratio, resetTransform])

  // 手势状态
  const lastTouchDist = React.useRef(0)
  const lastScale = React.useRef(1)
  const lastTx = React.useRef(0)
  const lastTy = React.useRef(0)
  const isPinching = React.useRef(false)

  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt: GestureResponderEvent) => {
          lastTx.current = currentTx.current
          lastTy.current = currentTy.current
          lastScale.current = currentScale.current
          isPinching.current = evt.nativeEvent.touches.length >= 2

          if (isPinching.current) {
            lastTouchDist.current = distance(evt.nativeEvent.touches as any)
          }
        },
        onPanResponderMove: (evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
          const touches = evt.nativeEvent.touches as any[]

          if (touches.length >= 2) {
            isPinching.current = true
            const dist = distance(touches)
            if (lastTouchDist.current > 0) {
              const newScale = Math.min(
                MAX_SCALE,
                Math.max(MIN_SCALE, lastScale.current * (dist / lastTouchDist.current)),
              )
              setScaleValue(newScale)
            }
          } else if (!isPinching.current) {
            setTranslateXValue(lastTx.current + gestureState.dx)
            setTranslateYValue(lastTy.current + gestureState.dy)
          }
        },
        onPanResponderRelease: () => {
          // 回弹到最小缩放
          if (currentScale.current < MIN_SCALE) {
            Animated.spring(scaleAnim, { toValue: MIN_SCALE, useNativeDriver: true }).start()
          }
          isPinching.current = false
          lastTouchDist.current = 0
        },
      }),
    [scaleAnim, setScaleValue, setTranslateXValue, setTranslateYValue],
  )

  const cropAreaWidth = SCREEN_WIDTH - 48
  const cropAreaHeight = cropAreaWidth * (ratio.h / ratio.w)

  const handleImageLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout
    setImageLayout({ width, height })
  }

  const handleCropBoxLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout
    setCropBoxSize({ width, height })
  }

  const handleConfirm = () => {
    if (!imageLayout.width || !imageLayout.height || !cropBoxSize.width || !cropBoxSize.height) {
      onConfirm({ sourceUri: imageUri, cropX: 0, cropY: 0, cropWidth: 1, cropHeight: 1, ratio })
      return
    }

    const sc = currentScale.current
    const renderedW = imageLayout.width * sc
    const renderedH = imageLayout.height * sc
    const imgCenterX = imageLayout.width / 2 + currentTx.current
    const imgCenterY = imageLayout.height / 2 + currentTy.current
    const cropLeft = cropBoxSize.width / 2 - imgCenterX
    const cropTop = cropBoxSize.height / 2 - imgCenterY
    const normX = Math.max(0, Math.min(1, cropLeft / renderedW))
    const normY = Math.max(0, Math.min(1, cropTop / renderedH))
    const normW = Math.min(1 - normX, cropBoxSize.width / renderedW)
    const normH = Math.min(1 - normY, cropBoxSize.height / renderedH)

    onConfirm({ sourceUri: imageUri, cropX: normX, cropY: normY, cropWidth: normW, cropHeight: normH, ratio })
  }

  const isDark = theme.isDark

  return (
    <Modal animationType="slide" onRequestClose={onCancel} transparent={false} visible={visible}>
      <View style={[styles.root, { backgroundColor: isDark ? "#000000" : "#111111" }]}>
        {/* 顶部工具栏 */}
        <View style={styles.topBar}>
          <TouchableOpacity hitSlop={12} onPress={onCancel} style={styles.topButton}>
            <Text style={styles.topButtonText}>{t("home.personal.cropCancel")}</Text>
          </TouchableOpacity>
          <Text style={styles.topTitle}>{t("home.personal.cropTitle")}</Text>
          <TouchableOpacity hitSlop={12} onPress={handleConfirm} style={styles.topButton}>
            <Text style={[styles.topButtonText, styles.topButtonConfirm]}>{t("home.personal.cropConfirm")}</Text>
          </TouchableOpacity>
        </View>

        {/* 裁剪区域 */}
        <View style={styles.cropContainer}>
          <View
            onLayout={handleCropBoxLayout}
            style={[styles.cropBox, { width: cropAreaWidth, height: cropAreaHeight }]}
            {...panResponder.panHandlers}
          >
            <Animated.Image
              onLayout={handleImageLayout}
              resizeMode="contain"
              source={{ uri: imageUri }}
              style={[
                styles.cropImage,
                { width: cropAreaWidth, height: cropAreaHeight },
                { transform: [{ translateX }, { translateY }, { scale: scaleAnim }] },
              ]}
            />
            {/* 裁剪框叠层 */}
            <View pointerEvents="none" style={styles.cropFrame}>
              <View style={[styles.gridLine, styles.gridLineH, { top: "33.33%" }]} />
              <View style={[styles.gridLine, styles.gridLineH, { top: "66.66%" }]} />
              <View style={[styles.gridLine, styles.gridLineV, { left: "33.33%" }]} />
              <View style={[styles.gridLine, styles.gridLineV, { left: "66.66%" }]} />
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
          </View>

          <Text style={styles.hint}>{t("home.personal.cropHint")}</Text>
        </View>

        {/* 比例选择器 */}
        <View style={styles.ratioBar}>
          {PRESET_RATIOS.map(r => {
            const active = r.label === ratio.label
            return (
              <TouchableOpacity
                key={r.label}
                onPress={() => setRatio(r)}
                style={[styles.ratioButton, active && styles.ratioButtonActive]}
              >
                <Text style={[styles.ratioLabel, active && styles.ratioLabelActive]}>{r.label}</Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>
    </Modal>
  )
}

const CORNER_SIZE = 18
const CORNER_THICK = 3

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  topTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  topButton: {
    minWidth: 56,
  },
  topButtonText: {
    color: "#94A3B8",
    fontSize: 15,
  },
  topButtonConfirm: {
    color: "#2DD4BF",
    fontWeight: "700",
    textAlign: "right",
  },
  cropContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cropBox: {
    overflow: "hidden",
    position: "relative",
  },
  cropImage: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  cropFrame: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.85)",
  },
  gridLine: {
    position: "absolute",
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  gridLineH: {
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
  gridLineV: {
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
  },
  corner: {
    position: "absolute",
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: "#FFFFFF",
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_THICK,
    borderLeftWidth: CORNER_THICK,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_THICK,
    borderRightWidth: CORNER_THICK,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_THICK,
    borderLeftWidth: CORNER_THICK,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_THICK,
    borderRightWidth: CORNER_THICK,
  },
  hint: {
    marginTop: 12,
    color: "rgba(255,255,255,0.45)",
    fontSize: 12,
    textAlign: "center",
  },
  ratioBar: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 24,
    paddingBottom: 48,
    paddingTop: 20,
  },
  ratioButton: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  ratioButtonActive: {
    borderColor: "#2DD4BF",
    backgroundColor: "rgba(45,212,191,0.12)",
  },
  ratioLabel: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 13,
    fontWeight: "500",
  },
  ratioLabelActive: {
    color: "#2DD4BF",
    fontWeight: "700",
  },
})
