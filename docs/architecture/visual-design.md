# Visual Design System

Coding requirements and foundational principles for UI implementation. All UI work must follow these rules.

---

## 1. Theme tokens — never hardcode colors or sizes

**Rule:** Use `theme.colors.*` for every color. Never write hex literals, `rgb()`, or named colors inline.

```tsx
// BAD
<Text style={{ color: "#6E6E73" }}>label</Text>
<View style={{ backgroundColor: "#FFFFFF" }} />

// GOOD
<Text style={{ color: theme.colors.mutedText }}>label</Text>
<View style={{ backgroundColor: theme.colors.surface }} />
```

**Available color tokens** (from `useAppTheme().colors`):

| Token | Purpose |
|---|---|
| `text` | Primary text |
| `mutedText` | Secondary / caption text |
| `background` | Screen background |
| `surface` | Card / sheet background |
| `surfaceElevated` | Elevated card (e.g. inside another card) |
| `surfaceMuted` | Subtle tinted surface (pressed states, tags) |
| `border` | Dividers and input borders |
| `primary` | Brand accent — buttons, links, active indicators |
| `primarySoft` | Tinted primary wash (selected row backgrounds) |
| `danger` | Destructive action text / border |
| `dangerSoft` | Destructive tinted surface |
| `dangerBorder` | Destructive border |
| `brandInverse` | Text on primary-colored backgrounds (e.g. button labels) |

---

## 2. Typography scale — use `theme.typography.*`

**Rule:** Use typography tokens instead of specifying `fontSize` / `fontWeight` / `lineHeight` ad hoc.

```tsx
// BAD
<Text style={{ fontSize: 17, fontWeight: "600" }}>title</Text>

// GOOD
<Text style={[theme.typography.headline, { color: theme.colors.text }]}>title</Text>
```

**Available typography tokens** (from `useAppTheme().typography`):

| Token | Approx size | Use for |
|---|---|---|
| `largeTitle` | 34 / bold | Screen hero title |
| `title2` | 22 / bold | Section heading |
| `title3` | 20 / semibold | Card title, empty state title |
| `headline` | 17 / semibold | Navigation bar title, row heading |
| `body` | 17 / regular | Body copy |
| `bodyEmphasized` | 17 / semibold | Emphasized body |
| `subheadline` | 15 / regular | Secondary text, captions, helper text |
| `subheadlineEmphasized` | 15 / semibold | Action labels, toggle text |
| `footnote` | 13 / regular | Fine print, section headers |
| `footnoteEmphasized` | 13 / semibold | Input labels |
| `button` | 17 / semibold | Button labels (used by AppButton) |

---

## 3. Spacing and radius — use tokens from `foundation.ts`

**Rule:** Use `appSpacing` and `appRadius` for layout gaps and corner radii. Import from `@/shared/theme/foundation`.

```ts
import { appSpacing, appRadius } from "@/shared/theme/foundation"

gap: appSpacing.sm      // 12
gap: appSpacing.md      // 16
borderRadius: appRadius.md  // 16
borderRadius: appRadius.lg  // 20
```

**Spacing scale:** `xxs=4, xs=8, sm=12, md=16, lg=20, xl=24, xxl=28, xxxl=32`

**Radius scale:** `sm=12, md=16, lg=20, xl=24, xxl=28, pill=999`

For component-level sizing (button height, field height, touch targets) prefer `theme.components.*` over raw numbers.

---

## 4. Touch targets — minimum 44 × 44 pt

**Rule:** Every tappable element must meet the 44 pt minimum in both dimensions.

```tsx
// Use hitSlop when the visual element is smaller
<Pressable hitSlop={8} onPress={...}>
  <SFSymbolIcon size={20} ... />
</Pressable>

// Or set minHeight / minWidth directly
<Pressable style={{ minHeight: 44, minWidth: 44 }} onPress={...} />
```

`appControls.minTouchTarget = 44` is the authoritative constant.

---

## 5. Press interactions — Reanimated spring, not instant opacity

**Rule:** Interactive elements must use `react-native-reanimated` spring physics for press feedback. Do not use `StyleSheet` pressed states with instant opacity or scale.

```tsx
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated"

const SPRING_PRESS   = { damping: 16, stiffness: 300, mass: 1 } as const
const SPRING_RELEASE = { damping: 13, stiffness: 200, mass: 1 } as const

const scale = useSharedValue(1)
const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

const handlePressIn  = () => { scale.value = withSpring(0.96, SPRING_PRESS) }
const handlePressOut = () => { scale.value = withSpring(1, SPRING_RELEASE) }

return (
  <Animated.View style={animatedStyle}>
    <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={...}>
      ...
    </Pressable>
  </Animated.View>
)
```

**Scale targets by element type:**

| Element | Press scale | Notes |
|---|---|---|
| Primary button | 0.97 | `AppButton` — already implemented |
| Card / action button | 0.96 | Large tap surfaces |
| Icon button / small action | 0.88 | Small targets need more feedback |
| List row | background only | No scale — match iOS table cell behavior |

**Opacity targets:**

| Element | Press opacity | Notes |
|---|---|---|
| Icon button | 0.72 | Combined with scale |
| Tab bar item | 0.6 | Brief feedback |
| List row | No opacity change | Background highlight is sufficient |

---

## 6. Icons — use `SFSymbolIcon`, not text glyphs

**Rule:** Never use text characters (`›`, `✓`, `×`, etc.) as icons. Use `SFSymbolIcon` with an SF Symbols name and a `fallbackName` for Android.

```tsx
// BAD
<Text style={{ fontSize: 20 }}>›</Text>

// GOOD
<SFSymbolIcon
  name="chevron.right"
  fallbackName="chevron-right"
  size={13}
  weight="semibold"
  color={theme.colors.mutedText}
/>
```

Common mappings:

| Visual | SF Symbol | fallbackName |
|---|---|---|
| Chevron right (list row) | `chevron.right` | `chevron-right` |
| Checkmark (selected) | `checkmark` | `check` |
| Back arrow | `chevron.backward` | `chevron-left` |
| Close / dismiss | `xmark` | `x` |
| Share | `square.and.arrow.up` | `share` |
| Copy | `doc.on.doc` | `copy` |

---

## 7. Borders and dividers — use `StyleSheet.hairlineWidth`

**Rule:** All borders and dividers must use `StyleSheet.hairlineWidth` (resolves to the physical pixel size on the device, typically 0.333 pt on 3× Retina).

```tsx
// BAD
borderWidth: 1
borderBottomWidth: 0.5

// GOOD
borderWidth: StyleSheet.hairlineWidth
borderBottomWidth: StyleSheet.hairlineWidth
```

---

## 8. Dark mode — no static `StyleSheet.create` with color values

**Rule:** `StyleSheet.create({})` is evaluated once at module load, before the theme is known. Never include color values in static stylesheets.

```tsx
// BAD — colors are frozen at module load, break dark mode
const styles = StyleSheet.create({
  label: { color: "#6E6E73" },
  input: { backgroundColor: "#FFFFFF" },
})

// GOOD — hook reads the current theme on every render
export function useStyles() {
  const theme = useAppTheme()
  return {
    label: { color: theme.colors.mutedText },
    input: { backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface },
  }
}
```

Static `StyleSheet.create` is acceptable for **structural** styles (flexDirection, padding, gap) that contain no color tokens.

---

## 9. Scroll behavior — iOS rubber-band defaults

**Rule:** `ScrollView` components must opt in to the correct iOS scroll physics.

```tsx
<ScrollView
  alwaysBounceVertical={false}   // disable bounce on short content unless needed
  bounces={false}                // match: no bounce for form screens
  overScrollMode="never"         // Android: no glow effect
  keyboardDismissMode="on-drag"
  keyboardShouldPersistTaps="handled"
>
```

For screens where bounce is desirable (feed, long list), pass `bounces={true}` explicitly via the scaffold prop.

---

## 10. Switch components

**Rule:** Use theme tokens for `thumbColor` and `trackColor`, not hardcoded hex values.

```tsx
// BAD
<Switch thumbColor="#FFFFFF" trackColor={{ false: "#CBD5E1", true: "#007AFF" }} />

// GOOD
<Switch
  thumbColor={theme.colors.brandInverse}
  trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
  value={value}
  onValueChange={onChange}
/>
```

---

## Summary checklist

Before submitting a UI change, verify:

- [ ] No hex color literals — all colors from `theme.colors.*`
- [ ] No raw `fontSize` / `fontWeight` — all text from `theme.typography.*`
- [ ] No raw spacing numbers where a token exists — use `appSpacing.*` or `theme.components.*`
- [ ] All borders use `StyleSheet.hairlineWidth`
- [ ] Touch targets >= 44 pt (use `hitSlop` if visual size is smaller)
- [ ] Press feedback uses Reanimated spring (`withSpring`), not instant style changes
- [ ] Icons use `SFSymbolIcon` with both `name` and `fallbackName`
- [ ] No color values in `StyleSheet.create` — use `useStyles()` hook pattern for theme-dependent styles
- [ ] `Switch` uses theme tokens for `thumbColor` and `trackColor`
