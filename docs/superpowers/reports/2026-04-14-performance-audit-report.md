# Performance Audit Report
**Date:** 2026-04-14
**Auditor:** QuyetThangDev
**Method:** Static analysis (grep patterns, no runtime profiling)
**Scope:** Full app — stores, hooks, screens, components

---

## Part 1 — Executive Summary

**Total issues found:** 51
**Breakdown:** Critical: 1 | High: 2 | Medium: 19 | Low: 29

### Top 3 Critical Risks

1. **Uncleaned setTimeout in debounced input hook** — `hooks/use-debounced-input.ts:20` fires after component unmount on every rapid search navigation. The stale callback corrupts `isLoading` state on re-mount, causing broken search interactions. Search screens are entered and exited multiple times per session, making this a near-guaranteed crash trigger after extended use.

2. **FlashList measurement cascade in update-order flow** — `app/update-order/components/update-order-menus.tsx:138` nests a FlashList (no `estimatedItemSize`) inside a `.map()` loop. Every catalog group spawns its own FlashList in measurement-fallback mode simultaneously on the hot-path order editing screen, causing a frame-drop cascade that directly degrades the core ordering flow.

3. **Expensive component without memo() re-runs store + query hooks on every parent scroll** — `components/menu/slider-related-products.tsx:164` holds live `useBranchStore`, `useUserStore`, and `useQuery` subscriptions with 6 hooks (3 `useMemo` + 3 `useCallback`) but is not wrapped in `memo()`. The product detail screen re-renders on tab focus, scroll, and cart changes — every re-render re-runs all these hooks even when `currentProduct` and `catalog` props are unchanged.

### Recommended Action Order

1. Fix the Critical `use-debounced-input.ts` leak — store the `setTimeout` handle and clear it in a `useEffect` cleanup; this is a crash risk in search flows
2. Add `estimatedItemSize` to `update-order-menus.tsx` FlashList and extract to a non-`.map()` pattern — directly impacts the core order flow FPS
3. Wrap `SliderRelatedProducts` in `memo()` — eliminates redundant store/query hook executions on every product detail scroll event
4. Add `estimatedItemSize` to all 8 remaining FlashList instances in profile/notification screens — easy wins, one constant per screen
5. Replace `react-native Image` with `expo-image` in the 5 Medium-severity remote-image locations — prevents repeated network fetches on navigation
6. Memoize the 4 inline `new Date()` calls in `gift-card-orders.tsx` filter sheet and wrap `ProductHeroImage` in `memo()`
7. Clean up all Low severity violations (inline style objects, dead code exports, minor best-practice gaps) in a dedicated cleanup sprint

---

## Part 2 — Severity Matrix

| File | Line | Category | Severity | Impact |
|------|------|----------|----------|--------|
| `hooks/use-debounced-input.ts` | 20 | Memory Leaks | Critical | setTimeout in event handler with no cleanup; fires on unmounted component, corrupts isLoading state on re-mount in search flows |
| `components/menu/slider-related-products.tsx` | 164 | Rendering Performance | High | Missing memo(); holds live store + query subscriptions (6 hooks); re-runs all hooks on every product detail scroll/focus re-render |
| `app/update-order/components/update-order-menus.tsx` | 138 | Rendering Performance | High | FlashList nested inside .map() with no estimatedItemSize; measurement cascade across N instances on hot-path order editing screen |
| `stores/selectors/order-flow.selectors.ts` | 16 | Re-renders | Medium | useOrderingData returns full orderingData object; any nested field change triggers re-render in all consumers (deprecated but still exported) |
| `stores/selectors/order-flow.selectors.ts` | 23 | Re-renders | Medium | useUpdatingData returns full updatingData object; no selector narrowing; active non-deprecated export risks broad re-renders when consumed |
| `stores/selectors/order-flow.selectors.ts` | 40 | Re-renders | Medium | useOrderFlowCreateOrder returns full orderingData via useShallow; nested field changes bypass shallow equality and trigger re-renders (deprecated but still exported) |
| `app/profile/gift-card-orders.tsx` | 365–374 | JS Thread Blocked | Medium | 4 inline new Date() allocations as DatePicker prop defaults; filter sheet re-renders on every picker interaction, creating 4 fresh Date instances per render |
| `hooks/use-notification-listener.ts` | 22 | Memory Leaks | Medium | Audio.Sound instance dereferenced without unloadAsync() on catch; audio session leak accumulates across repeated notification sound failures |
| `app/update-order/components/table-select-sheet-in-update-order.tsx` | 102 | Rendering Performance | Medium | BottomSheetFlatList with unbounded table data and no estimatedItemSize or getItemLayout; renders all items at once for large venues |
| `app/notification/index.tsx` | 337 | Rendering Performance | Medium | FlashList missing estimatedItemSize; recycler optimization disabled for paginated notification list |
| `app/profile/history.tsx` | 278 | Rendering Performance | Medium | FlashList missing estimatedItemSize; recycler optimization disabled on most-visited list screen after menu |
| `app/profile/loyalty-point.tsx` | 441 | Rendering Performance | Medium | FlashList missing estimatedItemSize; recycler disabled on paginated loyalty history list |
| `app/profile/gift-cards.tsx` | 460 | Rendering Performance | Medium | FlashList missing estimatedItemSize; recycler disabled on paginated gift card list |
| `app/profile/loyalty-point-hub.tsx` | 354 | Rendering Performance | Medium | FlashList missing estimatedItemSize; recycler disabled on paginated loyalty hub list |
| `app/profile/gift-card-orders.tsx` | 571 | Rendering Performance | Medium | FlashList missing estimatedItemSize; recycler disabled on paginated gift card orders list |
| `app/profile/coin-hub.tsx` | 359 | Rendering Performance | Medium | FlashList missing estimatedItemSize; recycler disabled on paginated coin transaction history |
| `components/dialog/user-avatar-dropdown.tsx` | 3 | Rendering Performance | Medium | react-native Image for remote avatar URL; no cache policy, no blurhash; re-fetches on every navigation to profile/admin area |
| `components/select/client-payment-method-select.tsx` | 3 | Rendering Performance | Medium | react-native Image for remote QR code URL; no cachePolicy; payment sheet opens multiple times per session, re-fetching on each open |
| `app/menu/product-image-carousel.tsx` | 3 | Rendering Performance | Medium | react-native Image for remote product thumbnails in hot-path detail screen carousel; no caching means re-fetch on every product open |
| `app/payment/[order].tsx` | 9 | Rendering Performance | Medium | react-native Image for QR code in a file that already imports expo-image; inconsistent within same file; QR re-fetched on every payment method change |
| `components/product/product-hero-image.tsx` | 91 | Rendering Performance | Medium | Missing memo(); receives array props (imageUrls) that change reference on parent re-render; useMemo and useCallback present but outer component unguarded |
| `components/home/highlight-menu.tsx` | 316 | Rendering Performance | Medium | AnimatedFlatList for API-driven highlight menu on home screen; horizontal FlatList does not virtualize; no estimatedItemSize equivalent |
| `hooks/use-countdown.ts` | 56 | JS Thread Blocked | Low | calcTimeLeft recomputes new Date().getTime() on every render; intentional by design; single lightweight calc; documented for completeness |
| `app/gift-card/order-success/[slug].tsx` | 108 | JS Thread Blocked | Low | new Date().toLocaleDateString inline in renderItem; static post-purchase success screen renders once per session; not a hot path |
| `app/gift-card/redeem.tsx` | 85 | JS Thread Blocked | Low | new Date().toLocaleString inline; static result screen rendered once per session; minimal practical impact |
| `app/(tabs)/gift-card.tsx` | 176–189 | JS Thread Blocked | Low | setGiftCardItem called before router.push; Zustand persist writes are async so no hard frame block; best practice violation |
| `app/(tabs)/gift-card.tsx` | 211–227 | JS Thread Blocked | Low | Three synchronous side-effects (two persist writes) before router.push; same pattern; best practice violation |
| `app/(tabs)/profile/index.tsx` | 507–513 | JS Thread Blocked | Low | setLogout + removeUserInfo persist writes before router.replace; logout is not a hot path; executes once per session |
| `app/(tabs)/profile/general-info.tsx` | 294–300 | JS Thread Blocked | Low | Same logout persist-before-replace pattern as profile/index.tsx; same severity |
| `app/notification/index.tsx` | 241–243 | JS Thread Blocked | Low | .filter() inside Zustand selector; notification store capped at 50 items; unmeasurable cost; best practice violation |
| `app/profile/gift-cards.tsx` | 53–55 | JS Thread Blocked | Low | Three .filter() calls outside useMemo in StatsStrip; component is memo()-wrapped so limited re-render frequency; single useMemo pass would be more efficient |
| `stores/cart-legacy.store.ts` | 20 | Memory Leaks | Low | Module-level mutable timer; properly managed for normal case; edge-case risk during auth teardown if clearCart called before timer fires |
| `hooks/use-navigation-bar-fixed.ts` | 68 | Memory Leaks | Low | Inner setTimeout inside AppState listener has no cleanup reference; Android-only; no state update so no React memory corruption |
| `app/menu/slider-related-products.tsx` | 111 | Rendering Performance | Low | FlatList in dead-code file; zero active consumers; the active component is in components/menu/; file should be removed |
| `app/profile/index.tsx` | 147 | Rendering Performance | Low | FlashList missing estimatedItemSize; settings list is small (5–8 items); low recycling impact but FlashList will warn in dev |
| `components/ui/data-table/data-table-row.tsx` | 25 | Rendering Performance | Low | renderItem target missing memo(); parent renderItem is memoized via useCallback; DataTable used in admin screens only, not hot paths |
| `components/dialog/settings-dropdown.tsx` | 4 | Rendering Performance | Low | react-native Image for local flag assets; no cache concern but inconsistent with project conventions |
| `components/profile/invoice-template.tsx` | 4 | Rendering Performance | Low | react-native Image for static bundled logo; memo'd parent; low re-render frequency; flagged for convention consistency |
| `components/dropdown/table-dropdown.tsx` | 24 | Rendering Performance | Low | Exported component with zero active consumers; dead code — cleanup rather than memoization needed |
| `components/cart/select-order-type-dropdown.tsx` | 23 | Rendering Performance | Low | Exported component with zero active consumers; dead code — cleanup rather than memoization needed |
| `app/payment/[order].tsx` | 756 | Re-renders | Low | Inline onPress arrow function on error-state Pressable; error-state only, not a hot re-render path; negligible impact |
| `app/payment/[order].tsx` | 837 | Re-renders | Low | Inline onPress arrow function for voucher sheet; payment screen state changes infrequent; functional impact minimal |
| Multiple profile list screens | various | Re-renders | Low | contentContainerStyle inline objects on FlashList in loyalty-point.tsx:446, gift-cards.tsx:465, loyalty-point-hub.tsx:361, gift-card-orders.tsx:576, coin-hub.tsx:367; new reference per render triggers internal measurement |
| `components/home/swipper-banner.tsx` | 243 | Rendering Performance | Low | FlatList for banner carousel; small item count (3–10); getItemLayout provided; intentional paginated carousel pattern — acceptable |
| `components/home/store-carousel.tsx` | 122 | Rendering Performance | Low | FlatList for static store image carousel; small fixed array; intentional auto-scroll carousel pattern — acceptable |
| `components/profile/profile-header.tsx` | 130 | Rendering Performance | Low | AnimatedFlatList in generic header wrapper; currently used only with small static settings list — acceptable |
| `components/ui/carousel.tsx` | 158 | Rendering Performance | Low | FlatList for slide children; always small fixed count; intentional paginated carousel primitive — acceptable |
| `components/cart/cart-size-sheet.tsx` | 120 | Rendering Performance | Low | BottomSheetFlatList for size options; 2–8 items per product; BottomSheetFlatList idiomatic for gorhom/bottom-sheet integration — acceptable |
| `components/select/product-variant-sheet.tsx` | 178 | Rendering Performance | Low | BottomSheetFlatList for variants; 1–10 items typically; same analysis as cart-size-sheet — acceptable |
| `components/select/order-type-sheet.tsx` | 264 | Rendering Performance | Low | BottomSheetFlatList for 3–4 static order type options; always small — acceptable |
| `components/ui/data-table/data-table-body.tsx` | 13 | Rendering Performance | Low | Missing memo(); admin-facing DataTable; generic type constraint makes memo() non-trivial; not in hot cart/menu paths |

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

**Pass 5 — Cross-cutting scan (2026-04-14)**

**Step 1 — AsyncStorage outside async context:**

No violations found. All `AsyncStorage` calls in `app/`, `components/`, `hooks/`, and `stores/` are correctly placed:

- `app/index.tsx:8` — `AsyncStorage.getItem('hasSeenOnboarding')` is inside `useEffect`, safe.
- `app/onboarding.tsx:164` — `AsyncStorage.setItem(...)` is called via `await markSeen()` inside an `async useCallback`, safe.

**Step 2 — Heavy work after router.push without scheduleTransitionTask:**

- `app/(tabs)/gift-card.tsx:176–189` — `setGiftCardItem({...})` is called synchronously on the JS thread immediately before `router.push('/gift-card/checkout')`. `setGiftCardItem` triggers a Zustand `persist` write, which synchronously calls `showToast` (i18next lookup) and schedules an `AsyncStorage.setItem` via the persist middleware in the same tick as the push. The navigation animation starts while the persist serialization is still enqueued on the JS thread.
  **Severity:** Low — Zustand persist writes are asynchronous (AsyncStorage.setItem is a promise); no synchronous frame block in practice; best practice violation — pattern should still be corrected for clarity. Fix: call `router.push` first, then wrap `setGiftCardItem` inside `scheduleTransitionTask(() => { ... })`

- `app/(tabs)/gift-card.tsx:211–227` — `handleReplace` calls `clearGiftCard(false)` (persist write with `set({giftCardItem: null})`), then `setGiftCardItem({...})` (second persist write + toast), then `setPendingCard(null)` (local state), and finally `router.push('/gift-card/checkout')` — three synchronous side-effects including two `AsyncStorage` persist writes before the navigation animation begins.
  **Severity:** Low — Zustand persist writes are asynchronous (AsyncStorage.setItem is a promise); no synchronous frame block in practice; best practice violation — pattern should still be corrected for clarity. Fix: call `router.push` first, then wrap `clearGiftCard` and `setGiftCardItem` inside `scheduleTransitionTask(() => { ... })`

- `app/(tabs)/profile/index.tsx:507–513` — `handleLogoutConfirm` calls `setLogout()` (Zustand persist write to auth store), `removeUserInfo()` (Zustand persist write to user store), `router.replace('/(tabs)/home')`, then `showToast(...)` — two persist writes on the same tick as `router.replace`. The `showToast` after the replace is lightweight (no issue) but the two synchronous persist flushes before it coincide with the navigation transition start.
  **Severity:** Low — logout is not in a hot path; two persist writes before replace is the same pattern but only executed once per session; the writes are to small auth/user stores; impact is low

- `app/(tabs)/profile/general-info.tsx:294–300` — `handleLogoutConfirm` follows the same pattern as `profile/index.tsx` above: `setLogout()` + `removeUserInfo()` before `router.replace`. Duplicate of the above issue; same severity.
  **Severity:** Low — same as above

**Step 3 — Large array operations in render bodies:**

- `app/notification/index.tsx:241–243` — `useNotificationStore((s) => s.notifications.filter((n) => !n.isRead).length)` — a `.filter()` call runs inside the Zustand selector callback on every store update. Zustand runs all selectors synchronously on the JS thread whenever the store updates. The notification store updates on every page load (paginated fetch appends items), on every mark-read action, and on FCM push arrivals.
  **Severity:** Low — notification store is capped at MAX_NOTIFICATIONS = 50 items; `.filter()` on 50 objects is unmeasurable; best practice violation. Note: `useNotificationStore.getState().getUnreadCount()` already exists at `stores/notification.store.ts:146` — the preferred fix is to subscribe to this derived value at the store level rather than filtering in the component

- `app/profile/gift-cards.tsx:53–55` — three `.filter()` calls in the render body of the `StatsStrip` component (not inside `useMemo`):
  ```ts
  const available = items.filter((i) => i.status === GiftCardUsageStatus.AVAILABLE).length
  const used      = items.filter((i) => i.status === GiftCardUsageStatus.USED).length
  const expired   = items.filter((i) => i.status === GiftCardUsageStatus.EXPIRED).length
  ```
  `items` is `IGiftCardDetail[]` passed from the parent, sourced from paginated API data (can be 10–50+ items). Three separate O(n) passes run on every render of `StatsStrip`. The component is `memo()`-wrapped, so it only re-renders when `items` or `isDark` changes — but when `items` changes (e.g., pagination load), all three filters run again. A single `useMemo` that computes all three counts in one pass would be more efficient.
  **Severity:** Low — `memo()` wrapping limits re-render frequency; three O(n) filters on page load/pagination; a single `useMemo` pass would cut work by 2/3

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

```tsx
// ❌ Wrong — store write + router.push in same tick; persist serialization
// blocks the navigation animation start
setGiftCardItem(item)
router.push('/gift-card/checkout')

// ✅ Correct — push first, then defer heavy store work after animation starts
router.push('/gift-card/checkout')
scheduleTransitionTask(() => setGiftCardItem(item))
```

```tsx
// ❌ Wrong — .filter() runs on every store update inside selector
const unreadCount = useNotificationStore(
  (s) => s.notifications.filter((n) => !n.isRead).length,
)

// ✅ Correct — memoized in component, recalculates only when notifications change
const notifications = useNotificationStore((s) => s.notifications)
const unreadCount = useMemo(
  () => notifications.filter((n) => !n.isRead).length,
  [notifications],
)
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

- `app/menu/slider-related-products.tsx:111` — `<FlatList data={menuItems} horizontal>` — file has zero consumers in the codebase; the active SliderRelatedProducts is at `components/menu/slider-related-products.tsx`; this `app/` version is dead code that should be removed.
  **Severity:** Low (dead code — zero active consumers)

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

**Pass 4 — Components scan (2026-04-14)**

**Step 1 — List item components missing memo()**

All FlashList/FlatList `renderItem` targets across `app/` and `components/` were traced to their component definitions. The following components are used as `renderItem` and their memo status was verified:

- `app/(tabs)/menu/menu-item-row.tsx:43` — `MenuItemRow` — wrapped in `memo()`. OK.
- `components/cart/cart-item-row.tsx:54` — `CartItemRow` — wrapped in `memo()`. OK.
- `app/profile/order-card.tsx:24` — `OrderCard` — wrapped in `memo()`. OK.
- `app/(tabs)/profile/profile-item.tsx:34` — `ProfileItem` — wrapped in `React.memo()`. OK.
- `components/home/swipper-banner.tsx:107` — `SlideItem` — wrapped in `React.memo()`. OK.
- `components/home/highlight-menu.tsx:97` — `HighlightCard` — wrapped in `React.memo()`. OK.
- `app/notification/index.tsx:103` — `NotificationItem` — wrapped in `memo()`. OK.
- `components/cart/cart-size-sheet.tsx:143` — `SizeOption` — wrapped in `memo()`. OK.

- `components/ui/data-table/data-table-row.tsx:25` — `export function DataTableRow<T>(...)` — rendered as `renderItem` target inside `components/ui/data-table/data-table-body.tsx:24` FlatList. The component has no store subscriptions, but it receives object props (`columns`, `onToggleSelection`, `onPress`) that can change reference when the parent `DataTableBody` re-renders. Because `DataTableBody` memoizes its `renderItem` via `useCallback`, the row itself only re-renders when the deps change — acceptable, but the row has no memo guard of its own.
  **Severity:** Low (parent `renderItem` is memoized via `useCallback`; DataTable is used only in admin-facing screens, not in the hot cart/menu paths)

**Step 2 — react-native Image instead of expo-image**

The following files import `Image` directly from `'react-native'` and use it for remote or static assets. `expo-image` provides disk+memory caching, progressive loading, and blurhash support that the RN `Image` component lacks.

- `components/dialog/user-avatar-dropdown.tsx:3` — `import { Image, ... } from 'react-native'`; renders `<Image source={{ uri: userInfo.image }}>` (remote avatar URL). No cache policy, no blurhash placeholder, no progressive load. Component appears in the web admin/header area and is not a repeated list item, but repeated navigation still benefits from the expo-image memory cache.
  **Severity:** Medium (remote avatar image with no caching; visible on every navigation to the profile/admin area)

- `components/dialog/settings-dropdown.tsx:4` — `import { Image, ... } from 'react-native'`; renders flag images (`Images.Flags.US`, `Images.Flags.VI`) via RN `Image`. These are local bundled assets, so cache is not the concern — but this is inconsistent with the project pattern and the flag assets incur multiple decode passes on theme/locale change re-renders.
  **Severity:** Low (local bundled assets; decode cost is minimal; inconsistency with project conventions)

- `components/profile/invoice-template.tsx:4` — `import { Image, ... } from 'react-native'`; renders `Images.Brand.Logo` (static bundled asset). The `Invoice` component is rendered in an order-complete flow and exported as `React.memo`. No caching concern for a static asset, but flagged for project convention consistency.
  **Severity:** Low (static bundled logo; memo'd parent; low re-render frequency)

- `components/select/client-payment-method-select.tsx:3` — `import { Image, Text, View } from 'react-native'`; renders a payment method QR code or bank icon via `<Image source={{ uri: qrCode }}>`. The QR code is a remote URL that changes per order. No `cachePolicy`, no transition animation. Rendered inside the payment method selection sheet which opens and closes multiple times during a session.
  **Severity:** Medium (remote QR image fetched without cache; payment sheet can be opened multiple times per session; image re-fetches on every open without expo-image disk cache)

- `app/menu/product-image-carousel.tsx:3` — `import { ..., Image, ... } from 'react-native'`; renders product thumbnail images via `<Image source={{ uri: publicFileURL + '/' + image }}>` inside a horizontal scroll carousel. Products can have multiple images. No `cachePolicy`, no blurhash. Product detail screen is a hot-path screen opened frequently from the menu.
  **Severity:** Medium (remote product images inside a hot-path detail screen carousel; no caching means each open re-fetches all thumbnails)

- `app/payment/[order].tsx:9` — `import { ..., Image, ... } from 'react-native'`; renders `<Image source={{ uri: qrCode }}>` (line 95) for the QR payment code and `<Image source={...}>` for a payment logo (line 199). Already imports `Image as ExpoImage` from `'expo-image'` for other uses in the same file — the RN `Image` usage for the QR is an oversight where the ExpoImage alias should have been used instead.
  **Severity:** Medium (same file already uses expo-image for other images; inconsistent within a single file; QR payment code is rendered every time the payment method changes)

**Step 3 — FlatList in components (should be FlashList)**

- `components/home/highlight-menu.tsx:316` — `<AnimatedFlatList data={items}>` — `items` is the highlight menu list from API (`HighlightMenuItem[]`). The component is wrapped in `React.memo` and is part of the home screen hot path. The list is horizontal and the data count depends on the API response. FlatList horizontal does not virtualize well.
  **Severity:** Medium (home screen component; data count variable from API; horizontal FlatList does not recycle in horizontal layout; `estimatedItemSize` equivalent missing)

- `components/home/swipper-banner.tsx:243` — `<FlatList data={infiniteData}>` — used for the home screen banner carousel. `infiniteData` is derived from `bannerData` (API-sourced `IBanner[]`). The banner count is typically small (3–10 items) and FlatList is used intentionally for a paginated infinite-loop scroll carousel (manual scroll-to-index, `pagingEnabled`, `getItemLayout` provided). The item count is small enough that this is acceptable for a carousel.
  **Severity:** Low (intentional carousel pattern with `getItemLayout`; small item count; `pagingEnabled` + `scrollToIndex` would be complex to migrate)

- `components/home/store-carousel.tsx:122` — `<FlatList data={carouselImages}>` — used for a store image carousel on the home screen. `carouselImages` is a `ImageSourcePropType[]` array (static or small count). `getItemLayout` is absent; `pagingEnabled` + `horizontal` with `scrollToIndex` for auto-scroll. Similar to swipper-banner: intentional carousel, small fixed array.
  **Severity:** Low (static or small array; intentional carousel; `scrollToIndex` auto-scroll pattern)

- `components/profile/profile-header.tsx:130` — `<AnimatedFlatList data={data} renderItem={renderItem}>` — `ProfileHeader` is a generic component that wraps a FlatList with an animated header. `data` is passed from the parent and its type is `T[]`. Used in `app/profile/index.tsx` with `settingsItems` (small static list 5–8 items). `renderItem` is passed as a prop (delegated). Data is always small in current usage.
  **Severity:** Low (currently only used with a small static settings list; not API-sourced at current call sites)

- `components/ui/carousel.tsx:158` — `<FlatList data={childrenArray}>` — `childrenArray` is `React.Children.toArray(children)`, representing UI slide children. This is an intentional horizontal paginated carousel (same pattern as swipper-banner), always a small fixed count of slides passed by the consumer.
  **Severity:** Low (intentional carousel primitive with small fixed children count; `pagingEnabled` use is correct here)

- `components/cart/cart-size-sheet.tsx:120` — `<BottomSheetFlatList data={sizeOptions}>` — `sizeOptions` comes from product size/variant data (`ISize[]`) loaded from React Query. The size count per product is typically 2–8 items. `BottomSheetFlatList` is required to integrate with `@gorhom/bottom-sheet` scroll physics; `BottomSheetFlashList` is available as an alternative but migration is lower priority for a small fixed list.
  **Severity:** Low (small fixed size list per product; `BottomSheetFlatList` is idiomatic for bottom sheet integration)

- `components/select/product-variant-sheet.tsx:178` — `<BottomSheetFlatList data={variants}>` — same analysis as cart-size-sheet above. Variant count per product is 1–10 items typically.
  **Severity:** Low (same as above)

- `components/select/order-type-sheet.tsx:264` — `<BottomSheetFlatList data={orderTypes}>` — `orderTypes` is a static constant list of 3–4 order type options. Always small.
  **Severity:** Low (static constant list; 3–4 items; no actionable change needed)

**Step 4 — Expensive components missing memo()**

- `components/menu/slider-related-products.tsx:164` — `export default function SliderRelatedProducts(...)` — subscribes to `useBranchStore`, `useUserStore`, calls `useQuery` (via `useSpecificMenu` / `usePublicSpecificMenu`), has 3 `useMemo` calls and 3 `useCallback` calls. Not wrapped in `memo()`. Used as a sub-component in the product detail screen, which re-renders on tab focus, scroll updates, and cart changes. Every parent re-render of the product detail screen re-runs all these hooks even when `currentProduct` and `catalog` props have not changed.
  **Severity:** High (contains live store + query subscriptions; 3 useMemo + 3 useCallback = significant render cost; parent detail screen re-renders on scroll/focus events; hot-path component)

- `components/dropdown/table-dropdown.tsx:24` — `export default function TableDropdown(...)` — exported but has zero active consumers; cart screen does not render this component; flag for dead code cleanup rather than memoization work.
  **Severity:** Low (dead code — zero active consumers)

- `components/cart/select-order-type-dropdown.tsx:23` — `export default function SelectOrderTypeDropdown()` — exported but has zero active consumers; flag for dead code cleanup.
  **Severity:** Low (dead code — zero active consumers)

- `components/product/product-hero-image.tsx:91` — `export function ProductHeroImage(...)` — has `useMemo` and `useCallback`; no store subscriptions. Receives primitive and array props from the product detail screen. Not wrapped in `memo()`. The array props (`imageUrls`) can change reference on parent re-render even if contents are identical.
  **Severity:** Medium (2 hooks for image processing; rendered at top of detail screen which re-renders on scroll; no store subscriptions but object prop instability)

- `components/ui/data-table/data-table-body.tsx:13` — `export function DataTableBody<T>(...)` — reads from `useDataTableContext` (context subscription), has `useMemo` and `useCallback`. Not wrapped in `memo()`. Generic constraint prevents naive `memo()` wrapping, but as a FlatList host with context subscriptions it will re-render whenever any DataTable context value changes.
  **Severity:** Low (admin-facing DataTable, not in hot-path cart/menu screens; generic type constraint makes memo() non-trivial to apply)

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

```tsx
// ❌ Wrong — expensive component with store subscriptions, no memo
export default function TableDropdown({ tableOrder, onTableSelect }) {
  const branch = useBranchStore(s => s.branch)
  const { data: tables } = useTables(branch?.slug)
  // ... 4 useMemo calls
}

// ✅ Correct — memo prevents re-render when props are stable
export default memo(function TableDropdown({ tableOrder, onTableSelect }) {
  const branch = useBranchStore(s => s.branch)
  const { data: tables } = useTables(branch?.slug)
  // ... 4 useMemo calls
})
```

```tsx
// ❌ Wrong — react-native Image with no caching for remote URL
import { Image } from 'react-native'
<Image source={{ uri: qrCode }} />

// ✅ Correct — expo-image with disk+memory cache
import { Image } from 'expo-image'
<Image source={{ uri: qrCode }} cachePolicy="memory-disk" />
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
