import React from "react"

import {
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import { Image as ExpoImage } from "expo-image"
import { useTranslation } from "react-i18next"
import { CropZoom, type CropContextResult, type CropZoomRefType } from "react-native-zoom-toolkit"

import { imageCropAdapter, type PickedImageAsset } from "@/shared/native"
import { useAppTheme } from "@/shared/theme/useAppTheme"
import { useToast } from "@/shared/toast/useToast"

const SCREEN_WIDTH = Dimensions.get("window").width

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
  image: PickedImageAsset
  onConfirm: (cropInfo: CropResult) => void
  onCancel: () => void
  initialRatio?: CropRatio
}

export type CropResult = PickedImageAsset

export function ImageCropModal({ visible, image, onConfirm, onCancel, initialRatio }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const { showToast } = useToast()
  const cropRef = React.useRef<CropZoomRefType | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  const [ratio, setRatio] = React.useState<CropRatio>(initialRatio ?? PRESET_RATIOS[0])

  const cropAreaWidth = SCREEN_WIDTH - 48
  const cropAreaHeight = cropAreaWidth * (ratio.h / ratio.w)

  React.useEffect(() => {
    if (visible) {
      setRatio(initialRatio ?? PRESET_RATIOS[0])
    }
  }, [initialRatio, visible])

  const handleConfirm = async () => {
    const cropResult = cropRef.current?.crop()
    if (!cropResult) {
      showToast({ message: t("home.personal.avatarUploadFailed"), tone: "error" })
      return
    }

    setSubmitting(true)

    try {
      const cropped = await imageCropAdapter.cropImage({
        source: image,
        transform: mapCropContextResult(cropResult),
        format: "jpeg",
        filename: "avatar.jpg",
      })

      if (!cropped.ok) {
        throw cropped.error
      }

      onConfirm(cropped.data)
    } catch {
      showToast({ message: t("home.personal.avatarUploadFailed"), tone: "error" })
    } finally {
      setSubmitting(false)
    }
  }

  const isDark = theme.isDark

  return (
    <Modal animationType="slide" onRequestClose={onCancel} transparent={false} visible={visible}>
      <View style={[styles.root, { backgroundColor: isDark ? "#000000" : "#111111" }]}>
        <View style={styles.topBar}>
          <TouchableOpacity disabled={submitting} hitSlop={12} onPress={onCancel} style={styles.topButton}>
            <Text style={styles.topButtonText}>{t("home.personal.cropCancel")}</Text>
          </TouchableOpacity>
          <Text style={styles.topTitle}>{t("home.personal.cropTitle")}</Text>
          <TouchableOpacity disabled={submitting} hitSlop={12} onPress={() => void handleConfirm()} style={styles.topButton}>
            <Text style={[styles.topButtonText, styles.topButtonConfirm]}>{submitting ? t("common.loading") : t("home.personal.cropConfirm")}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.cropContainer}>
          <View style={[styles.cropBox, { width: cropAreaWidth, height: cropAreaHeight }]}>
            <CropZoom
              key={`${image.uri}:${ratio.label}`}
              cropSize={{ width: cropAreaWidth, height: cropAreaHeight }}
              maxScale={6}
              ref={cropRef}
              resolution={{ width: image.width, height: image.height }}
            >
              <ExpoImage
                cachePolicy="memory-disk"
                contentFit="cover"
                source={image.uri}
                style={styles.cropImage}
                transition={0}
              />
            </CropZoom>
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

function mapCropContextResult(result: CropContextResult) {
  return {
    crop: result.crop,
    context: result.context,
    resize: result.resize,
  }
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
    width: "100%",
    height: "100%",
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
