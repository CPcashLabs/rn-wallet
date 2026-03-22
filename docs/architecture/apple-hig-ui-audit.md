# Apple HIG UI Audit

## Scope

This audit reviews the current React Native UI foundation and the following core screens from an Apple Human Interface Guidelines perspective:

- `src/shared/theme/tokens.ts`
- `src/shared/ui/HomeScaffold.tsx`
- `src/shared/ui/AppCard.tsx`
- `src/shared/ui/AppList.tsx`
- `src/shared/ui/AppButton.tsx`
- `src/shared/ui/AppTextField.tsx`
- `src/features/home/screens/HomeShellScreen.tsx`
- `src/features/home/screens/MeShellScreen.tsx`
- `src/features/home/screens/SettingsScreen.tsx`
- `src/features/home/screens/TotalAssetsScreen.tsx`
- `src/features/messages/components/HomeMessagePreview.tsx`

The assessment is code-based rather than screenshot-based, so it focuses on design system maturity, layout rhythm, typography semantics, touch ergonomics, and Apple-style visual restraint.

## Apple Criteria Used

- Clear hierarchy, harmony, and consistency across the app.
- Layouts that adapt to Dark Mode, Dynamic Type, and varying screen sizes.
- Touch controls that respect Apple minimum touch target guidance.
- Typography that uses system-like scale and readable weights.
- Semantic color usage over screen-local hard-coded values.
- Content-first hierarchy instead of decorative competition.

Reference sources:

- Apple Human Interface Guidelines: <https://developer.apple.com/design/human-interface-guidelines/>
- Designing for iOS: <https://developer.apple.com/design/human-interface-guidelines/designing-for-ios>
- Accessibility: <https://developer.apple.com/design/human-interface-guidelines/accessibility>
- UI Design Dos and Don’ts: <https://developer.apple.com/design/tips/>
- Fonts for Apple platforms: <https://developer.apple.com/fonts/>
- Standard colors: <https://developer.apple.com/documentation/uikit/standard-colors>
- Adding a Custom Font to Your App: <https://developer.apple.com/documentation/uikit/adding-a-custom-font-to-your-app>
- `adjustsFontSizeToFitWidth`: <https://developer.apple.com/documentation/uikit/uilabel/adjustsfontsizetofitwidth>

## Findings

### 1. The project has color tokens, but not a true design system

Current theme tokens mainly define colors and dark/light values, but the project still hard-codes typography, radii, paddings, row heights, shadows, and control sizes inside components and screens.

Examples:

- `src/shared/theme/tokens.ts` only models colors and `isDark`.
- `src/shared/ui/AppCard.tsx` defines shared radius, padding, gap, row height, and row padding locally.
- `src/shared/ui/HomeScaffold.tsx` defines navigation typography and horizontal paddings locally.
- `src/features/home/screens/HomeShellScreen.tsx` and `src/features/home/screens/TotalAssetsScreen.tsx` define screen-specific radii, glow sizes, and text scales inline.

Impact:

- The UI can look "roughly iOS-like" in isolated places, but it cannot stay consistent as the app grows.
- Designers and engineers have no shared source of truth for typography, spacing, corner radius, materials, or states.

### 2. Typography hierarchy is visually heavy and not mapped to Apple text styles

The code frequently uses `fontWeight: "700"` and `fontWeight: "800"` for titles, labels, buttons, banners, and balance values.

Examples:

- `src/features/home/screens/HomeShellScreen.tsx` uses `800` for the profile name, balance value, and banner title.
- `src/features/messages/components/HomeMessagePreview.tsx` uses `700` for both the section title and action label.
- `src/features/home/screens/TotalAssetsScreen.tsx` uses `700` and `800` in the hero card.

This creates a UI tone that feels more branded-dashboard than native iOS. Apple typography usually feels more effortless because it relies on text-style semantics, optical size behavior, and restrained weight contrast rather than repeated extra-bold emphasis.

Impact:

- Too many elements compete for primary emphasis.
- The visual rhythm is less calm than Apple apps.
- The app lacks a stable mapping like `largeTitle`, `title2`, `headline`, `body`, `footnote`, `caption`.

### 3. Dynamic Type resilience is weak because many components depend on fixed dimensions and truncation

Apple explicitly recommends adapting to Dynamic Type and keeping controls comfortably tappable. In this codebase, several components are rigid:

- `src/shared/ui/AppButton.tsx` uses `adjustsFontSizeToFit` plus `numberOfLines={1}`.
- `src/features/messages/components/HomeMessagePreview.tsx` fixes row height at `52`.
- `src/features/home/screens/HomeShellScreen.tsx` uses a `28x28` eye button and a `34` high badge pill.
- `src/features/home/screens/MeShellScreen.tsx` uses `42x42` top action buttons.
- `src/shared/ui/HomeScaffold.tsx` uses a `34` high pill action in the header.

Apple guidance referenced in HIG accessibility is very explicit that iOS touch targets should generally be at least `44x44 pt`, with sufficient spacing between controls. The current code meets that in some places, but not consistently.

Impact:

- Large text users will see clipping, shrinking text, or compressed hierarchy.
- Some controls look tappable but are below comfortable touch size.
- Tight one-line truncation will become more obvious in Chinese and longer localized strings.

### 4. Semantic color strategy is incomplete, and several screens still use ad-hoc raw colors

The theme layer uses many custom RGBA values and some raw hard-coded screen-level colors:

- `src/features/home/screens/MeShellScreen.tsx` uses `#EAF2FF` and white-alpha border values directly.
- `src/features/home/screens/TotalAssetsScreen.tsx` uses custom white overlays and fixed white text in the hero.
- `src/shared/ui/AppButton.tsx` uses direct danger background RGBA values that sit outside the token set.

This means the app has a palette, but not a complete semantic color system. Apple-like design benefits from semantic roles such as:

- `label`, `secondaryLabel`, `tertiaryLabel`
- `systemBackground`, `secondarySystemBackground`
- `separator`, `fill`, `quaternaryFill`
- `tint`, `success`, `warning`, `destructive`
- `material.surface`, `material.grouped`, `material.elevated`

Impact:

- The same intent can render differently across screens.
- Dark mode consistency depends on manual discipline, not system rules.
- Color becomes style decoration instead of a semantic contract.

### 5. Visual language is over-decorated in several places compared with Apple’s usual restraint

The app uses a lot of glow, shadow, large radii, glass overlays, and hero-card treatment at once:

- `src/features/home/screens/HomeShellScreen.tsx` combines glass card, security badge, audit row, quick-action tiles, and a strong green banner on one screen.
- `src/features/home/screens/MeShellScreen.tsx` combines large glow circles, custom pastel card background, heavy avatar card, and separate action bubbles.
- `src/features/home/screens/TotalAssetsScreen.tsx` uses a branded dark hero with multiple glow layers.

Apple HIG emphasizes hierarchy and harmony. In practice, that usually means one dominant focal area per screen, then progressively quieter secondary groups. Here, multiple surfaces often try to be the hero at the same time.

Impact:

- The screens feel busier than native iOS.
- Secondary information receives too much decorative energy.
- Important actions are less obvious because many blocks use equally strong visual treatment.

### 6. Grouped list behavior is close to iOS, but the spacing and section rhythm are not fully systemized

Settings and list rows are on the right path because they use grouped cards and chevrons. However:

- section headings use custom values without a shared typography token
- row detail width is fixed at `138`
- grouped spacing varies by screen
- list row min height is systemized locally, but not tied to font scale or component density rules

Examples:

- `src/features/home/screens/SettingsScreen.tsx`
- `src/shared/ui/AppList.tsx`
- `src/shared/ui/AppCard.tsx`

Impact:

- The app resembles iOS grouping, but it still feels handcrafted rather than system-native.
- Reuse exists, but the behavior contract is not strong enough yet.

## Overall Assessment

The product is already moving in an Apple-adjacent direction:

- uses grouped cards
- uses SF Symbols
- uses safe areas
- uses soft surfaces and muted backgrounds
- keeps many primary text sizes near iOS defaults

But it is not yet Apple-grade in system coherence.

The main gap is not a missing font or one wrong hex value. The main gap is the absence of a code-enforced semantic design system for:

- typography
- spacing
- radii
- materials
- component sizing
- motion
- states

## Recommended Improvement Plan

### Phase 0: Define the source of truth

Create a codified design specification with tokens for:

- semantic colors
- typography styles
- spacing scale
- corner radius scale
- control heights and hit targets
- separators and borders
- shadow and material levels
- motion durations and easing

This should exist in both design and code, with matching names.

### Phase 1: Build Apple-aligned foundation tokens

Expand `src/shared/theme/tokens.ts` or split it into modules such as:

- `colors.ts`
- `typography.ts`
- `spacing.ts`
- `shape.ts`
- `motion.ts`
- `controls.ts`

Recommended typography token examples:

- `largeTitle`
- `title1`
- `title2`
- `headline`
- `body`
- `callout`
- `subheadline`
- `footnote`
- `caption1`
- `caption2`

Recommended spacing token examples:

- `space4`
- `space8`
- `space12`
- `space16`
- `space20`
- `space24`
- `space32`

Recommended control token examples:

- `controlMinHeight.touch = 44`
- `controlMinHeight.compact = 36`
- `listRowMinHeight.default = 56`
- `listRowMinHeight.prominent = 64`

### Phase 2: Refactor shared components first

Apply the token layer to:

- `HomeScaffold`
- `AppCard`
- `AppList`
- `AppButton`
- `AppTextField`

This should remove duplicated hard-coded values and turn the shared components into the only valid entry point for common UI patterns.

### Phase 3: Fix accessibility and Dynamic Type behavior

Priority corrections:

- remove `adjustsFontSizeToFit` as the default button strategy
- prefer wrapping or layout expansion over silent text shrinking
- raise all tappable controls to a real `44x44` minimum
- reduce fixed-height layouts where text is likely to grow
- review all `numberOfLines={1}` usage on titles and actions
- make spacing and control dimensions react to font scale when needed

### Phase 4: Simplify screen hierarchy

Recommended screen-specific changes:

- `HomeShellScreen`: keep one dominant hero, reduce the visual strength of security and audit modules, and let quick actions/read models breathe.
- `MeShellScreen`: tone down the glow background and use calmer grouping so profile information feels more native.
- `TotalAssetsScreen`: shift from custom branded hero styling toward a more semantic grouped/elevated system card.
- `SettingsScreen`: standardize grouped list sections so they behave like one reusable page recipe.

### Phase 5: Introduce governance

Add lightweight rules so the system remains stable:

- no raw hex values in screens unless approved and documented
- no direct `fontSize`, `fontWeight`, or `borderRadius` in product screens unless a token is missing
- no control under `44x44` for tappable UI on iPhone
- all new screens must use shared typography and spacing tokens

## Answer to the Core Question

Yes. Converting colors, color values, design rules, and component dimensions into code-based design specifications is the right direction.

But the key point is this:

Do not only codify colors.

If you only store hex values in a table, the result will still be inconsistent. The real improvement comes from codifying the entire semantic design language:

- colors
- typography
- spacing
- radii
- shadows and materials
- component sizes
- states
- motion

Then all components should read from that source of truth instead of defining their own visual rules.

That is how you move from "a UI with styles" to "a product with a design system."

## Practical Recommendation

If the goal is to make this app feel more Apple-native, the next best step is:

1. define a semantic token system
2. refactor shared primitives first
3. rework the home, me, and assets screens using those primitives
4. enforce the rules for future screens

That path is lower risk and produces more lasting quality than doing one-off visual polishing screen by screen.
