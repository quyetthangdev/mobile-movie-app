# Performance Audit Report
**Date:** 2026-04-14
**Auditor:** [your name]
**Method:** Static analysis (grep patterns, no runtime profiling)
**Scope:** Full app — stores, hooks, screens, components

---

## Part 1 — Executive Summary

> _(Fill in after all passes complete)_

**Total issues found:** TBD
**Breakdown:** Critical: X | High: X | Medium: X | Low: X

### Top 3 Critical Risks

1. **[Risk name]** — [business impact]
2. **[Risk name]** — [business impact]
3. **[Risk name]** — [business impact]

### Recommended Action Order

1. Fix all Critical issues first (memory leaks in active flows)
2. Fix High severity re-renders and list virtualization
3. Address Medium severity memoization gaps
4. Low severity in next cleanup sprint

---

## Part 2 — Severity Matrix

| File | Line | Category | Severity | Impact |
|------|------|----------|----------|--------|
| _(populate from passes below)_ | | | | |

---

## Part 3 — Findings by Category

### Category 1: Re-renders

> **Why this matters:** Every unnecessary re-render executes the component's render function, diffs the virtual DOM, and potentially updates native views — burning JS thread budget and causing jank at 60fps.

#### Findings

**Pass 1 — Stores scan (2026-04-14)**

No active `useXxxStore()` calls without a selector function were found in any of the 39 store files. The codebase consistently uses granular selectors.

Two deprecated selectors were found in `stores/selectors/order-flow.selectors.ts` that subscribe to broader objects than necessary. Neither is actively consumed outside the selector definition and re-export files, so there is no current re-render impact — but the risk exists if they are picked up by future consumers:

- `stores/selectors/order-flow.selectors.ts:16` — `useOrderingData` returns the full `orderingData` object via `useOrderFlowStore((s) => s.orderingData)`. Any field within `orderingData` (items, voucher, type, table, delivery fields, etc.) changing would trigger a re-render in any consumer. Marked `@deprecated` in code — not currently consumed in `app/`, `components/`, or `hooks/`.
  **Severity:** Medium (dormant risk — deprecated but still exported; a future developer could import it)

- `stores/selectors/order-flow.selectors.ts:40` — `useOrderFlowCreateOrder` returns `{ orderingData, transitionToPayment }` via `useShallow` — the `orderingData` slot holds the entire object, so any nested field change (items, voucher, type, etc.) changes the `orderingData` reference and triggers a re-render in any consumer, despite `useShallow`. The replacement `useOrderFlowCreateOrderDialog` (line 49) correctly selects only specific primitives. Marked `@deprecated` in code — not currently consumed outside selector files.
  **Severity:** Medium (dormant risk — same as above)

- `stores/selectors/order-flow.selectors.ts:23` — `useUpdatingData` returns full `updatingData` object with no selector narrowing; active non-deprecated export — any `updatingData` nested field change re-renders all consumers.
  **Severity:** Medium (escalates from Low once consumed; currently no active consumer in app/, components/, or hooks/)

**Pass 2 — Hooks scan (2026-04-14)**

All `useEffect(..., [])` patterns in hooks were reviewed. No stale closure issues found. All empty-dep effects either:
- Only register listeners / `InteractionManager` tasks with no external variable capture (e.g., `use-screen-transition.ts:40`, `use-deferred-ready.ts:19`, `use-mobile.ts:14`)
- Are cleanup-only effects (e.g., `use-viewable-menu-prefetch.ts:76`)

No findings in Category 1 from Pass 2.

#### Pattern Guide

```tsx
// ❌ Wrong — re-renders on ANY store change
const { items, loading } = useCartStore()

// ✅ Correct — re-renders only when `items` changes
const items = useCartStore(s => s.items)
const loading = useCartStore(s => s.loading)
```

---

### Category 2: JS Thread Blocked

> **Why this matters:** React Native runs JS on a single thread. Synchronous heavy work (date calculations, large loops) during render blocks the thread, delaying touch responses and dropping frames.

#### Findings

**Pass 2 — Hooks scan (2026-04-14)**

No unmemoized date calculations found in hook render paths. All `new Date()` / `Date.now()` calls in hooks are either:
- Inside `useMemo` or `useCallback` (e.g., `use-predictive-prefetch.ts` uses `dayjs().format()` inside `useMemo`)
- Inside interval/event handler callbacks that only fire on demand, not on every render
- Module-level constants evaluated once at import time (`use-loyalty-point-history.ts:30-32`)

One borderline case noted for awareness:

- `hooks/use-countdown.ts:56` — `calcTimeLeft(expiresAt)` in the hook's return value recalculates `new Date(expiresAt).getTime() - Date.now()` on every render. This is intentional by design (the comment explicitly states "Derive seconds at render time") and the hook drives only a single text display — at 60fps this adds negligible cost. Not a performance concern in practice but documented for completeness.
  **Severity:** Low (intentional design, single lightweight calculation)

**Pass 3 — Screens scan (2026-04-14)**

- `app/gift-card/order-success/[slug].tsx:108` — `{new Date(item.expiredAt).toLocaleDateString('vi-VN')}` directly in JSX inside a `renderItem` callback. The finding describes a recycling concern, but the actual context is a static post-purchase success screen that renders once per flow — not a frequently re-rendering or deeply nested list path. The date calculation happens only during initial render.
  **Severity:** Low (static post-purchase success screen renders once per session; not a hot-path re-render)

- `app/gift-card/redeem.tsx:85` — `new Date(result.usedAt).toLocaleString('vi-VN')` computed inline in an array literal inside JSX (not in `useMemo`). `toLocaleString` with a locale is one of the slower Date methods in V8; this is called every render of the redeem screen. The screen is mostly static (shown once after redeem), so practical impact is low.
  **Severity:** Low (static result screen, renders once per session)

- `app/profile/gift-card-orders.tsx:365,366,373,374` — `new Date()` called 4 times inline as prop defaults for `<DatePicker>` components: `date={localFrom ?? new Date()}`, `maximumDate={localTo ?? new Date()}`, `date={localTo ?? new Date()}`, `maximumDate={new Date()}`. Each render of the filter sheet creates up to 4 fresh `Date` instances. The filter sheet re-renders on every date picker interaction.
  **Severity:** Medium (filter sheet re-renders on every picker interaction; 4 inline Date allocations per render)

- `app/notification/index.tsx:74` — `formatTimeAgo` helper calls `Date.now() - new Date(createdAt).getTime()` on each call. The helper is called inside `useMemo` (line 130: `const timeAgo = useMemo(() => formatTimeAgo(...), [item.createdAt, t])`) so it is correctly memoized per item. No issue.
  **Severity:** Info (correctly memoized — no finding)

- `app/payment/[order].tsx:252` — `computePaymentRemaining` calls `Date.now() - new Date(startTime).getTime()` in the `PaymentCountdownBadge` component. The function is used only in `useState(() => computePaymentRemaining(startTime))` as a lazy initializer and is not called in the render body; the countdown is driven by `setInterval`. Correctly structured.
  **Severity:** Info (lazy initializer, not in render body — no finding)

#### Pattern Guide

```tsx
// ❌ Wrong — new Date() called every render
function OrderCard({ expiresAt }: Props) {
  const timeLeft = new Date(expiresAt).getTime() - Date.now()
  return <Text>{timeLeft}</Text>
}

// ✅ Correct — memoized, only recalculates when expiresAt changes
function OrderCard({ expiresAt }: Props) {
  const timeLeft = useMemo(
    () => new Date(expiresAt).getTime() - Date.now(),
    [expiresAt]
  )
  return <Text>{timeLeft}</Text>
}
```

---

### Category 3: Memory Leaks

> **Why this matters:** Uncleaned timers and subscriptions keep running after a component unmounts, accumulating memory over time. On mobile this causes crashes after extended sessions and drains battery.

#### Findings

**Pass 1 — Stores scan (2026-04-14)**

One module-level mutable variable found in stores. No unguarded subscriptions (`subscribe`, `addListener`, `onSnapshot`) found in any store file.

- `stores/cart-legacy.store.ts:20` — `let _cartExpirationTimer: ReturnType<typeof setTimeout> | null = null` at module level. This is a singleton timer that auto-clears the cart at midnight. The code does cancel the previous timer before scheduling a new one (lines 45–46) and nullifies itself after firing (line 49), so it is not an unbounded accumulation leak. However, it is a module-level mutable side-effect: the timer persists for the entire app lifetime once set, and there is no explicit teardown path if the store is cleared before the timer fires (e.g., after a forced logout). The store is still actively imported by `lib/store-sync-setup.ts` despite being named "legacy". If `clearCart()` is called externally without the timer being cancelled, the timer can fire and call `clearCart()` again on an already-cleared cart — a silent no-op but unexpected behaviour.
  **Severity:** Low (timer is properly managed for the normal case; risk is in edge-case teardown during auth transitions)

**Pass 2 — Hooks scan (2026-04-14)**

Two issues found in hooks. All `setInterval` users (`use-countdown.ts`, `use-animated-countdown.ts`, `use-qr-payment.ts`) and all `addListener`/`addEventListener` users (`use-back-handler-for-exit.ts`, `use-mobile.ts`, `use-navigation-bar-fixed.ts`, `use-qr-payment.ts`) have proper cleanup in their `useEffect` return functions. Two `setTimeout` calls lack cleanup:

- `hooks/use-debounced-input.ts:20` — `setTimeout(() => setIsLoading(false), delay)` is called inside a plain event handler (`handleInputChange`), not inside a `useEffect`. There is no cleanup path at all: if the component unmounts while the timer is pending (e.g., user leaves the search screen mid-typing), the callback fires and calls `setIsLoading(false)` on an unmounted component. React 18 silently suppresses the warning in production but the timer continues running, and if the component re-mounts quickly the stale callback can corrupt loading state during re-initialization.
  **Severity:** Critical — debounced input is used in search screens which are entered/exited multiple times per session; the stale timeout fires after unmount and on re-mount can corrupt the `isLoading` state, causing incorrect UI display or broken search interactions on rapid navigation

- `hooks/use-navigation-bar-fixed.ts:68` — anonymous `setTimeout(() => { setColor() }, 300)` inside the `AppState.addEventListener('change', ...)` callback has no handle stored and cannot be cleared. The outer `timeoutId` (line 61) is properly cleaned up on unmount, but this inner timeout created on every AppState `active` transition is fire-and-forget with no cleanup reference. On Android, if the component unmounts between the app going background→foreground and the 300ms delay expiring, the async `setColor()` call (which invokes the native module) runs against a detached component context.
  **Severity:** Low — Android-only, fire-and-forget native call; no state update triggered so no React memory corruption, but unnecessary native bridge call after unmount

- `hooks/use-notification-listener.ts:22` — `let cachedSound: Audio.Sound | null = null` at module level; on error in the catch block (line 38), the code sets `cachedSound = null` without calling `cachedSound.unloadAsync()` first, dereferencing the `Audio.Sound` instance without releasing the underlying audio session resource, leaking it until the app terminates.
  **Severity:** Medium — notification listener runs for the entire app session; audio session leak accumulates across errors (e.g., repeated notification sound failures), eventually exhausting audio session limits

#### Pattern Guide

```tsx
// ❌ Wrong — interval runs forever after unmount
useEffect(() => {
  const id = setInterval(tick, 1000)
}, [])

// ✅ Correct — interval cleared on unmount
useEffect(() => {
  const id = setInterval(tick, 1000)
  return () => clearInterval(id)
}, [])
```

---

### Category 4: Rendering Performance

> **Why this matters:** Unvirtualized lists render all items at once, bloating memory and slowing scroll. Non-memoized expensive components re-render on every parent update, wasting CPU.

#### Findings

**Pass 3 — Screens scan (2026-04-14)**

**FlatList usage — should be FlashList:**

- `app/menu/slider-related-products.tsx:111` — `<FlatList data={menuItems} horizontal>` — `menuItems` comes from `useSpecificMenu` / `usePublicSpecificMenu` React Query, which can return all items in a catalog (potentially 20–50+ items in a horizontal carousel). This is a horizontal list and FlatList does not recycle cells for horizontal layouts well. Per severity rule: FlatList on list > 20 items → High. Has `getItemLayout` (good), but FlashList would be more memory-efficient for a product carousel that auto-refetches on filter changes.
  **Severity:** High (API-sourced catalog list can exceed 20 items; spec severity rule: FlatList on >20 items = High)

- `app/update-order/components/table-select-sheet-in-update-order.tsx:102` — `<BottomSheetFlatList data={tables}>` inside a bottom sheet — `tables` comes from the branch's table list (unbounded, depends on venue size). No `getItemLayout` or `estimatedItemSize`. For a venue with many tables this renders all items at once.
  **Severity:** Medium

- `app/onboarding.tsx:214` — `<Animated.FlatList>` for onboarding slides — data is a static constant (3–4 items), not API-driven. No actionable issue; acceptable use.
  **Severity:** Info (not an issue)

**FlashList missing `estimatedItemSize` — recycler optimization disabled:**

- `app/update-order/components/update-order-menus.tsx:138` — `<FlashList data={group.items} scrollEnabled={false}>` nested inside a `.map()` loop — no `estimatedItemSize` prop. FlashList without `estimatedItemSize` and with `scrollEnabled={false}` loses its recycling benefit and effectively measures every item. Nested inside `.map()` — N catalog groups each instantiate their own FlashList in measurement-fallback mode simultaneously; active during order flow (hot path); constitutes a measurement cascade across N FlashList instances.
  **Severity:** High (nested inside `.map()` — multiple FlashList instances in measurement fallback; hot-path screen during order flow; render cascade pattern)

- `app/notification/index.tsx:337` — `<FlashList data={displayedNotifications}>` — no `estimatedItemSize`. Notifications are uniformly structured items; a single height constant (e.g., 80) would enable recycler optimization for what can be a long paginated list.
  **Severity:** Medium

- `app/profile/history.tsx:278` — `<FlashList data={orders}>` — no `estimatedItemSize`. Order history items have a fixed card layout; missing size hint disables recycling for the most frequently visited list screen after the menu.
  **Severity:** Medium

- `app/profile/index.tsx:147` — `<FlashList data={settingsItems}>` — no `estimatedItemSize`. Settings items are a small static list (5–8 items) so recycling impact is low, but the prop is still missing and FlashList will log a warning in dev.
  **Severity:** Low

- `app/profile/loyalty-point.tsx:441` — `<FlashList data={historyList}>` — no `estimatedItemSize`. Paginated loyalty history list; uniform row layout makes it straightforward to supply a constant.
  **Severity:** Medium

- `app/profile/gift-cards.tsx:460` — `<FlashList data={items}>` — no `estimatedItemSize`. Paginated gift card list; same pattern as loyalty-point.tsx.
  **Severity:** Medium

- `app/profile/loyalty-point-hub.tsx:354` — `<FlashList data={historyList}>` — no `estimatedItemSize`. Same pattern.
  **Severity:** Medium

- `app/profile/gift-card-orders.tsx:571` — `<FlashList data={items}>` — no `estimatedItemSize`. Same pattern.
  **Severity:** Medium

- `app/profile/coin-hub.tsx:359` — `<FlashList data={txList}>` — no `estimatedItemSize`. Paginated coin transaction history; same pattern.
  **Severity:** Medium

**Pass 3 — Screens scan (2026-04-14) — Category 1: Re-renders (inline props)**

- `app/payment/[order].tsx:756` — `onPress={() => void refetchOrder()}` on a `<Pressable>` that is only rendered in the error state (load-failed branch). This is a static error screen shown rarely; the inline function re-creates each render but the screen is not in a hot re-render path, so impact is negligible.
  **Severity:** Low (error-state only, not a hot path)

- `app/payment/[order].tsx:837` — `onPress={() => setShowVoucherSheet(true)}` on a touchable that is rendered on every payment screen render. The `<PaymentVoucherSection>` component it triggers is not memoized; combined with `setShowVoucherSheet` being called from an inline closure this creates a new function reference on every parent re-render of the payment screen.
  **Severity:** Low (payment screen state changes are infrequent; functional impact minimal)

- Multiple `contentContainerStyle={{ ... }}` inline objects on `<FlashList>` in profile screens (`loyalty-point.tsx:446`, `gift-cards.tsx:465`, `loyalty-point-hub.tsx:361`, `gift-card-orders.tsx:576`, `coin-hub.tsx:367`) — inline objects create new references on each render. FlashList uses this prop for scroll inset calculation; a new reference triggers an internal measurement. These screens also re-render on filter changes (frequent user interaction). Extracting to `useMemo` or a `StyleSheet.create` constant would prevent unnecessary measurement calls.
  **Severity:** Low (each individual instance is minor; cumulatively worth fixing across all profile list screens)

#### Pattern Guide

```tsx
// ❌ Wrong — FlatList renders all items
<FlatList data={products} renderItem={renderItem} />

// ✅ Correct — FlashList virtualizes with recycling
<FlashList
  data={products}
  renderItem={renderItem}
  estimatedItemSize={88}
/>
```

---

## Part 4 — Scan Methodology

### Grep Patterns Used

#### Category 1 — Re-renders
```bash
# Full store subscriptions (bad Zustand selectors)
grep -rn "use.*Store()" stores/ hooks/ app/ components/ --include="*.ts" --include="*.tsx"

# Missing useCallback on function props
grep -rn "onPress={(" app/ components/ --include="*.tsx"
grep -rn "onChange={(" app/ components/ --include="*.tsx"
grep -rn "onSubmit={(" app/ components/ --include="*.tsx"

# Empty dependency array with props/state inside
grep -rn "useEffect.*\[\]" hooks/ app/ components/ --include="*.ts" --include="*.tsx"
```

#### Category 2 — JS Thread Blocked
```bash
# Date calculations in render (not in useMemo/useCallback)
grep -rn "new Date\|Date\.now()" app/ components/ --include="*.tsx"

# AsyncStorage outside useEffect
grep -rn "AsyncStorage\." app/ components/ hooks/ --include="*.ts" --include="*.tsx"

# router.push without scheduleTransitionTask for heavy work
grep -rn "router\.push\|router\.replace" app/ components/ hooks/ --include="*.ts" --include="*.tsx"
```

#### Category 3 — Memory Leaks
```bash
# setInterval/setTimeout without visible cleanup
grep -rn "setInterval\|setTimeout" hooks/ app/ components/ --include="*.ts" --include="*.tsx"

# addListener without remove
grep -rn "addListener\|addEventListener" hooks/ app/ components/ --include="*.ts" --include="*.tsx"

# Module-level mutable state
grep -rn "^let \|^var " stores/ hooks/ --include="*.ts"
```

#### Category 4 — Rendering Performance
```bash
# FlatList usage
grep -rn "FlatList" app/ components/ --include="*.tsx"

# FlashList missing estimatedItemSize
grep -rn "FlashList" app/ components/ --include="*.tsx"

# React Native Image (not expo-image)
grep -rn "from 'react-native'.*Image\|Image.*from 'react-native'" app/ components/ --include="*.tsx"

# Missing memo() on components
grep -rn "^export function\|^export const.*=.*(" components/ --include="*.tsx"
```
