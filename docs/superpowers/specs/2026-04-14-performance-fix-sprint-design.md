# Performance Fix Sprint Design Spec
**Date:** 2026-04-14
**Status:** Approved
**Source:** Audit report at `docs/superpowers/reports/2026-04-14-performance-audit-report.md`
**Executor:** Solo developer (QuyetThangDev)
**Test strategy:** Full TDD — tests written before implementation for every fix
**Low severity scope:** High-ROI only (dead code deletion + contentContainerStyle inline objects)

---

## Goal

Fix all 22 actionable performance issues (Critical: 1, High: 2, Medium: 19) plus high-ROI Low items identified in the audit report. Deliver via 5 sequential PRs, each focused and independently mergeable.

## Sprint Structure

### PR 1 — Critical `fix/perf-critical-debounced-input`

**Scope:** 1 file

**Fix:** `hooks/use-debounced-input.ts:20`

The `setTimeout(() => setIsLoading(false), delay)` is called inside a plain event handler with no cleanup. If the component unmounts before the delay expires, the callback fires and calls `setState` on an unmounted component, corrupting `isLoading` state on re-mount during rapid search navigation.

**Fix pattern:** Refactor to use `useEffect` with `inputValue` as dependency so cleanup is automatic:

```ts
// Before
const handleInputChange = (value: string) => {
  setInputValue(value)
  setIsLoading(true)
  setTimeout(() => setIsLoading(false), delay)  // ❌ no cleanup
}

// After
const handleInputChange = (value: string) => {
  setInputValue(value)
  setIsLoading(true)
}

useEffect(() => {
  if (!isLoading) return
  const id = setTimeout(() => setIsLoading(false), delay)
  return () => clearTimeout(id)  // ✅ cleanup on unmount or re-trigger
}, [isLoading, delay])
```

**Test file:** `__tests__/hooks/use-debounced-input.test.ts`

```ts
// Test 1: cleanup prevents state update on unmounted component
it('clears timeout when unmounted before delay expires', () => {
  jest.useFakeTimers()
  const { result, unmount } = renderHook(() => useDebouncedInput({ delay: 500 }))
  act(() => result.current.setInputValue('abc'))
  unmount()
  expect(() => act(() => jest.advanceTimersByTime(600))).not.toThrow()
})

// Test 2: normal flow still works after fix
it('sets isLoading false after delay when still mounted', () => {
  jest.useFakeTimers()
  const { result } = renderHook(() => useDebouncedInput({ delay: 300 }))
  act(() => result.current.setInputValue('x'))
  expect(result.current.isLoading).toBe(true)
  act(() => jest.advanceTimersByTime(300))
  expect(result.current.isLoading).toBe(false)
})
```

---

### PR 2 — High `fix/perf-high-memo-flashlist`

**Scope:** 2 files

**Fix A:** `components/menu/slider-related-products.tsx:164`

Wrap `SliderRelatedProducts` default export in `memo()`. The component holds live `useBranchStore`, `useUserStore`, `useSpecificMenu`, `usePublicSpecificMenu` subscriptions plus 3 `useMemo` + 3 `useCallback` calls. The product detail screen re-renders on scroll, tab focus, and cart changes — all unnecessary for this component when `currentProduct` and `catalog` props are unchanged.

```ts
// After
export default memo(SliderRelatedProducts)
```

**Fix B:** `app/update-order/components/update-order-menus.tsx:138`

Add `estimatedItemSize` to the FlashList nested inside `.map()`. The FlashList has `scrollEnabled={false}` so it cannot auto-scroll, but measurement fallback still allocates layout passes for every item. Every catalog group renders its own FlashList in measurement-fallback mode simultaneously.

```tsx
<FlashList
  data={group.items}
  renderItem={renderItem}
  keyExtractor={keyExtractor}
  scrollEnabled={false}
  estimatedItemSize={UPDATE_ORDER_MENU_ITEM_HEIGHT}  // from constants/list-item-sizes
/>
```

**Test file:** `__tests__/components/slider-related-products.test.tsx`

```ts
it('does not re-render when parent state changes with same props', () => {
  const renderCount = { count: 0 }
  const Spy = memo(() => { renderCount.count++; return null })
  // render with same props, trigger parent state change
  // assert renderCount.count === 1
})
```

```ts
// __tests__/update-order/update-order-menus.test.tsx
it('renders FlashList with estimatedItemSize on each catalog group', () => {
  const { UNSAFE_getAllByType } = render(<UpdateOrderMenus ... />)
  UNSAFE_getAllByType(FlashList).forEach(list =>
    expect(list.props.estimatedItemSize).toBeGreaterThan(0)
  )
})
```

---

### PR 3 — Medium Batch A: FlashList sizes `fix/perf-medium-flashlist-sizes`

**Scope:** 1 new file + 10 modified files

**New file:** `constants/list-item-sizes.ts`

```ts
// Measured from rendered item components. Update if item layout changes.
export const NOTIFICATION_ITEM_HEIGHT = 72
export const ORDER_HISTORY_ITEM_HEIGHT = 96
export const LOYALTY_POINT_ITEM_HEIGHT = 64
export const GIFT_CARD_ITEM_HEIGHT = 80
export const GIFT_CARD_ORDER_ITEM_HEIGHT = 96
export const COIN_TRANSACTION_ITEM_HEIGHT = 64
export const LOYALTY_HUB_ITEM_HEIGHT = 64
export const PROFILE_SETTINGS_ITEM_HEIGHT = 52
export const TABLE_SELECT_ITEM_HEIGHT = 48
export const UPDATE_ORDER_MENU_ITEM_HEIGHT = 88
```

**Codemod script:** `scripts/inject-flashlist-size.ts`

- Parse all `.tsx` files with regex
- Detect `<FlashList` without `estimatedItemSize` prop
- Output `file:line` list (dry-run mode, no auto-write)
- Flags: `--dry-run` (default), `--apply` (inserts `estimatedItemSize={FIXME_ITEM_HEIGHT}` placeholder)
- Developer replaces `FIXME_ITEM_HEIGHT` with correct constant from `list-item-sizes.ts`

**Files to patch:**
| File | Line | Constant to use |
|------|------|----------------|
| `app/notification/index.tsx` | 337 | `NOTIFICATION_ITEM_HEIGHT` |
| `app/profile/history.tsx` | 278 | `ORDER_HISTORY_ITEM_HEIGHT` |
| `app/profile/loyalty-point.tsx` | 441 | `LOYALTY_POINT_ITEM_HEIGHT` |
| `app/profile/gift-cards.tsx` | 460 | `GIFT_CARD_ITEM_HEIGHT` |
| `app/profile/loyalty-point-hub.tsx` | 354 | `LOYALTY_HUB_ITEM_HEIGHT` |
| `app/profile/gift-card-orders.tsx` | 571 | `GIFT_CARD_ORDER_ITEM_HEIGHT` |
| `app/profile/coin-hub.tsx` | 359 | `COIN_TRANSACTION_ITEM_HEIGHT` |
| `app/profile/index.tsx` | 147 | `PROFILE_SETTINGS_ITEM_HEIGHT` |
| `app/update-order/components/table-select-sheet-in-update-order.tsx` | 102 | `TABLE_SELECT_ITEM_HEIGHT` |

**Verification step:** After patching, run app on simulator and use React DevTools to verify rendered item height matches each constant. Adjust constants if off by more than 20%.

**Test file:** `__tests__/constants/list-item-sizes.test.ts`

```ts
import * as sizes from '@/constants/list-item-sizes'

it('all list item size constants are positive integers', () => {
  Object.values(sizes).forEach(v => {
    expect(typeof v).toBe('number')
    expect(v).toBeGreaterThan(0)
    expect(Number.isInteger(v)).toBe(true)
  })
})
```

---

### PR 4 — Medium Batch B: Image + memo + Audio + dates `fix/perf-medium-image-memo-audio`

**Scope:** ~9 files

**Fix A — 4× react-native Image → expo-image:**

Pattern for all 4 files:
```tsx
// Before
import { Image } from 'react-native'
<Image source={{ uri: url }} style={...} />

// After
import { Image } from 'expo-image'
<Image source={url} style={...} contentFit="cover" cachePolicy="memory-disk" />
```

Files:
- `components/dialog/user-avatar-dropdown.tsx:3`
- `components/select/client-payment-method-select.tsx:3`
- `app/menu/product-image-carousel.tsx:3`
- `app/payment/[order].tsx:9` — already imports `expo-image` as `ExpoImage`; replace the stray `react-native` `Image` usage with the existing `ExpoImage`

**Fix B — ProductHeroImage memo:**

```ts
// components/product/product-hero-image.tsx
export default memo(ProductHeroImage)
```

**Fix C — Audio.Sound unloadAsync:**

```ts
// hooks/use-notification-listener.ts catch block
} catch {
  if (cachedSound) {
    await cachedSound.unloadAsync().catch(() => {})
  }
  cachedSound = null
}
```

**Fix D — gift-card-orders.tsx date useMemo:**

```tsx
// Before: 4 inline new Date() in DatePicker props
// After:
const defaultFromDate = useMemo(() => new Date(), [])
const defaultToDate = useMemo(() => new Date(), [])
// use defaultFromDate / defaultToDate in DatePicker props
```

**Fix E — deprecated selectors:**

Add `@deprecated` JSDoc to `useUpdatingData` (line 23) to match the other two deprecated selectors. Consider removing all 3 deprecated exports in PR 5 or a follow-up.

**Test coverage:**
- expo-image: snapshot test confirms `<Image>` renders with `cachePolicy` prop
- ProductHeroImage memo: render count test (same as PR 2 memo test pattern)
- Audio.Sound: mock `Audio.Sound`, trigger error path, assert `unloadAsync` called before `cachedSound = null`
- gift-card-orders dates: assert `new Date()` not called on re-render when no prop changed (use `jest.spyOn(global, 'Date')`)

---

### PR 5 — High-ROI Low `fix/perf-low-cleanup`

**Scope:** ~8 files

**Fix A — Dead code deletion (3 files):**

Safe to delete — confirmed zero consumers via full codebase grep:
1. Delete `components/dropdown/table-dropdown.tsx`
2. Remove `export { default as TableDropdown }` from `components/dropdown/index.tsx`
3. Delete `components/cart/select-order-type-dropdown.tsx`
4. Remove `export { default as SelectOrderTypeDropdown }` from `components/cart/index.tsx`
5. Delete `app/menu/slider-related-products.tsx` (dead Expo Router file; active version in `components/menu/`)

**Safety gate:** Run `npm run typecheck` after each deletion. If tsc errors appear, a consumer was missed — restore file and investigate.

**Fix B — contentContainerStyle inline objects (5 screens):**

Extract to `StyleSheet.create` or NativeWind constant. Pattern:
```tsx
// Before
<FlashList contentContainerStyle={{ paddingBottom: insets.bottom + 16 }} />

// After
const styles = StyleSheet.create({
  listContent: { paddingBottom: insets.bottom + 16 }
})
<FlashList contentContainerStyle={styles.listContent} />
```

Files: `loyalty-point.tsx:446`, `gift-cards.tsx:465`, `loyalty-point-hub.tsx:361`, `gift-card-orders.tsx:576`, `coin-hub.tsx:367`

Note: If bottom inset is dynamic, extract the static parts only and keep dynamic values in a `useMemo`.

**Fix C — router.push + persist writes (4 locations):**

Apply `scheduleTransitionTask` pattern:
```ts
// Before
setGiftCardItem(item)
router.push('/gift-card/checkout')

// After
router.push('/gift-card/checkout')
scheduleTransitionTask(() => setGiftCardItem(item))
```

Files: `gift-card.tsx:176-189`, `gift-card.tsx:211-227`, `profile/index.tsx:507-513`, `profile/general-info.tsx:294-300`

**Test:** `tsc --noEmit` for dead code deletion. Snapshot tests for style extraction to confirm no visual regression.

---

## Lint Rules for Prevention

Add to ESLint config after PR 5 merges:

```js
// eslint.config.js / .eslintrc.js
'no-restricted-imports': ['error', {
  paths: [
    {
      name: 'react-native',
      importNames: ['Image'],
      message: 'Use expo-image instead: import { Image } from "expo-image"'
    },
    {
      name: 'react-native',
      importNames: ['FlatList'],
      message: 'Use @shopify/flash-list FlashList instead of react-native FlatList'
    }
  ]
}]
```

`new Date()` in render bodies: enforce via **code review checklist** item rather than custom lint rule (implementation cost outweighs benefit for this project size).

**Prevention checklist (add to PR template):**
- [ ] No `react-native Image` imports (lint enforces)
- [ ] No `react-native FlatList` imports (lint enforces)
- [ ] New `useEffect` with timers/listeners has cleanup return
- [ ] New components used as `renderItem` are wrapped in `memo()`
- [ ] New `FlashList` has `estimatedItemSize` from `constants/list-item-sizes.ts`

---

## Out of Scope
- Low severity acceptable patterns (carousels, BottomSheetFlatList with small counts) — no action needed
- Runtime profiling — separate activity after fixes ship
- `new Date()` custom ESLint rule — over-engineering for current project size
- `useUpdatingData` / deprecated selector removal — deferred to PR 5 or follow-up sprint

---

## Deliverable
5 PRs merged to `main`, each with passing tests and typecheck, followed by addition of lint rules to ESLint config.
