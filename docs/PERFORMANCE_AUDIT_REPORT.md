# React Native Performance Audit Report

> Audit date: 2025-03-16  
> Focus: JS thread, UI thread, CPU, memory, re-renders, bridge, lists

---

## 1. JS THREAD USAGE ANALYSIS

### 🔴 Issue: Scroll position save on every scroll event (Bridge overload)

**Location:** `hooks/use-tab-scroll-restore.ts` (lines 29-35)  
**Severity:** High

#### ❌ Problem

```ts
const onScroll = useCallback(
  (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    save(tabKey, e.nativeEvent.contentOffset.y)
  },
  [tabKey, save],
)
```

`onScroll` is a **JS callback** that runs on every scroll event. With `scrollEventThrottle={16}` (~60/sec), it causes:
- Native → JS bridge event every scroll frame
- `save(tabKey, y)` → Zustand `set()` → store update
- Bridge traffic blocks JS thread during scroll

**Used in:** `app/(tabs)/menu.tsx` line 627 — FlashList passes `onScroll` directly.

#### 💥 Impact

- JS thread blocked during scroll → frame drops
- Bridge traffic ~60 events/sec during scroll
- Prevents 60 FPS stable scroll

#### ✅ Fix

**Option A:** Save only on scroll end (onMomentumScrollEnd, onScrollEndDrag) — reduces to 1–2 events per scroll gesture

```ts
// Before: onScroll every frame
// After: onScrollEnd only
const onScrollEnd = useCallback(
  (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    save(tabKey, e.nativeEvent.contentOffset.y)
  },
  [tabKey, save],
)

return {
  scrollRef,
  onScroll: undefined, // Remove from scroll
  onScrollEnd: onScrollEnd, // Use onMomentumScrollEnd + onScrollEndDrag
}
```

**Option B:** Use `useAnimatedScrollHandler` with `runOnJS` and throttle save to every 100ms

```ts
const save = useScrollPositionStore((s) => s.save)
const saveThrottled = useMemo(
  () => throttle((y: number) => save(tabKey, y), 100),
  [tabKey, save],
)

const scrollHandler = useAnimatedScrollHandler({
  onScroll: (e) => {
    'worklet'
    runOnJS(saveThrottled)(e.contentOffset.y)
  },
})
```

---

### 🔴 Issue: Menu Tab Scroll — same JS callback

**Location:** `app/(tabs)/menu.tsx` line 627  
**Severity:** High

#### ❌ Problem

```tsx
<FlashList
  ...
  onScroll={onScroll}
  scrollEventThrottle={16}
/>
```

`onScroll` from `useTabScrollRestore` fires ~60/sec during scroll. Same as above.

#### ✅ Fix

Apply same fix as use-tab-scroll-restore — use `onScrollEnd` only when FlashList supports it, or use `AnimatedScrollView` + `useAnimatedScrollHandler` with throttled `runOnJS(save)`.

---

### 🔴 Issue: DateOfBirthWheelPicker — setState on scroll

**Location:** `components/profile/date-of-birth-wheel-picker.tsx` lines 123–149  
**Severity:** Medium

#### ❌ Problem

```ts
const onScrollDay = useCallback(
  (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y
    const index = Math.round(y / ITEM_HEIGHT)
    const clamped = Math.max(0, Math.min(DAYS.length - 1, index))
    setDay(DAYS[clamped])
  },
  [],
)
```

Uses `onMomentumScrollEnd` and `onScrollEndDrag` — so it's not every frame. But each scroll end triggers JS callback + `setState` → re-render. Three wheels = three scroll handlers.

#### 💥 Impact

- JS thread work on scroll end
- Re-render on each wheel stop
- Minor UX jank when user scrolls quickly

#### ✅ Fix

Use `useAnimatedScrollHandler` with SharedValue for display, and only call `runOnJS(setDay)` when debounced or on scroll end.

---

## 2. UI THREAD (REANIMATED) MISUSE

### 🟡 Issue: Profile index — insets in worklet

**Location:** `app/(tabs)/profile/index.tsx` lines 201–206, 213–217  
**Severity:** Low

#### ❌ Problem

```ts
const headerHeightStyle = useAnimatedStyle(() => {
  'worklet'
  const y = scrollY.value
  const height = interpolate(
    y,
    [0, SCROLL_RANGE],
    [HEADER_HEIGHT + insets.top, insets.top + TOOLBAR_HEIGHT],
    Extrapolation.CLAMP,
  )
  return { height }
})
```

`insets.top` is captured from JS. If `insets` changes (e.g. after keyboard), the worklet won't see the new value — it's a closure capture. For typical use this is fine, but worth noting.

#### ✅ Fix

If insets can change: pass `insets.top` as a SharedValue: `insetsTop.value = insets.top` in useEffect, then use `insetsTop.value` in worklet.

---

## 3. CPU HOTSPOTS

### 🔴 Issue: Cart voucher text — inline IIFE in render

**Location:** `app/(tabs)/cart.tsx` lines 558–589  
**Severity:** High

#### ❌ Problem

```tsx
<Text className="text-sm font-medium text-gray-900">
  {voucher
    ? (() => {
        const { type, value, applicabilityRule: rule } = voucher
        const discountText = ...
        const ruleText = ...
        return `${discountText} ${ruleText}`
      })()
    : t('cart.applyVoucher', 'Áp dụng voucher')}
</Text>
```

A 30+ line IIFE runs on **every render** of the cart screen. It includes:
- Object destructuring
- Multiple conditional branches
- 6+ `tVoucher()` calls
- String concatenation

#### 💥 Impact

- CPU wasted on every cart re-render
- Cart re-renders when order, voucher, or delivery fee changes
- Noticeable during scroll or interaction

#### ✅ Fix

**Before:** Inline IIFE  
**After:** Memoized helper

```ts
const voucherDisplayText = useMemo(() => {
  if (!voucher) return t('cart.applyVoucher', 'Áp dụng voucher')
  const { type, value, applicabilityRule: rule } = voucher
  const discountText = ...
  const ruleText = ...
  return `${discountText} ${ruleText}`
}, [voucher, tVoucher, t])

// In render:
<Text>{voucherDisplayText}</Text>
```

---

### 🟡 Issue: handleBack not memoized

**Location:** `app/(tabs)/cart.tsx` lines 181–183  
**Severity:** Low

#### ❌ Problem

```ts
const handleBack = () => {
  if (router.canGoBack()) {
    router.back()
  } else {
    router.replace(TAB_ROUTES.MENU)
  }
}
```

Passed to `renderHeader()` which may pass to children. New function every render.

#### ✅ Fix

```ts
const handleBack = useCallback(() => {
  if (router.canGoBack()) router.back()
  else router.replace(TAB_ROUTES.MENU)
}, [router])
```

---

## 4. MEMORY ISSUES

### 🟡 Issue: Swipper banner interval — activeIndexState in deps

**Location:** `components/home/swipper-banner.tsx` lines 99–108  
**Severity:** Medium

#### ❌ Problem

```ts
useEffect(() => {
  if (bannerData.length <= 1) return
  const interval = setInterval(() => {
    const next = activeIndexState + 1 >= bannerData.length ? 0 : activeIndexState + 1
    flatListRef.current?.scrollToIndex({ index: next, animated: true })
    setActiveIndexState(next) // BUG: setState in interval — but also interval depends on activeIndexState!
  }, 3000)
  return () => clearInterval(interval)
}, [bannerData.length, activeIndexState])
```

`activeIndexState` in deps causes the effect to re-run every time the index changes. The interval is cleared and recreated every 3 seconds. Not a leak, but unnecessary churn.

#### ✅ Fix

Use a ref for the current index inside the interval, or use a functional update:

```ts
useEffect(() => {
  if (bannerData.length <= 1) return
  const interval = setInterval(() => {
    setActiveIndexState((prev) => {
      const next = prev + 1 >= bannerData.length ? 0 : prev + 1
      flatListRef.current?.scrollToIndex({ index: next, animated: true })
      return next
    })
  }, 3000)
  return () => clearInterval(interval)
}, [bannerData.length])
```

---

## 5. RE-RENDER ANALYSIS

### 🟡 Issue: Cart — useOrderFlowCreateOrder returns full object

**Location:** `app/(tabs)/cart.tsx` line 92  
**Severity:** Medium

#### ❌ Problem

```ts
const { orderingData } = useOrderFlowCreateOrder()
```

`useOrderFlowCreateOrder` uses `useShallow` and returns `{ orderingData, transitionToPayment }`. Any change to `orderingData` (e.g. quantity, note) causes re-render. Cart has many derived values from `order` — this is expected.

The cart is already using `useMemo` for `displayItems`, `cartTotals`, `displayItemsMap`, `orderItems` — good.

#### ✅ Fix

Consider splitting: a parent that subscribes to `orderingData` and passes `orderItems` and `displayItemsMap` to a memoized `CartList` that only re-renders when those change.

---

## 6. BRIDGE OVERLOAD

### 🔴 Issue: Scroll position save (see 1.1)

Already covered — 60 events/sec during scroll.

---

### 🟡 Issue: scrollEventThrottle={16}

**Location:** `app/(tabs)/menu.tsx` line 627  
**Severity:** Medium

With `scrollEventThrottle={16}`, scroll events are sent at ~60fps. For scroll position restore, this is usually unnecessary. If you only need to save on scroll end, remove `onScroll` and use `onMomentumScrollEnd` + `onScrollEndDrag` instead.

---

## 7. LIST PERFORMANCE

### 🔴 Issue: FlashList missing estimatedItemSize

**Location:**  
- `app/(tabs)/menu.tsx` line 619  
- `components/menu/client-menus.tsx` line 221  
- `app/profile/index.tsx` line 147  

**Severity:** High

#### ❌ Problem

FlashList requires `estimatedItemSize` for correct recycling. Without it:

- FlashList may fall back to layout measurement
- Initial scroll can jump
- Recycling can be suboptimal

#### 💥 Impact

- Scroll jank during fast scroll
- Higher memory usage
- Less predictable layout

#### ✅ Fix

```tsx
// app/(tabs)/menu.tsx — mixed header + row
<FlashList
  estimatedItemSize={120} // or measure: header ~60, row ~180
  ...
/>

// client-menus — menu item grid
<FlashList
  estimatedItemSize={200}
  ...
/>

// app/profile — settings items
<FlashList
  estimatedItemSize={56}
  ...
/>
```

---

### 🔴 Issue: Cart FlatList — no getItemLayout

**Location:** `app/(tabs)/cart.tsx` lines 498–511  
**Severity:** Medium

#### ❌ Problem

```tsx
<FlatList
  data={orderItems}
  keyExtractor={(item) => item.id}
  renderItem={renderCartItem}
  ...
/>
```

No `getItemLayout`. Cart items have variable height (note input, different content). FlatList must measure each item → layout jumps.

#### 💥 Impact

- Scroll jank when scrolling
- Initial mount measures all visible items

#### ✅ Fix

If cart items have predictable height (e.g. base ~140 + note height ~40), provide `getItemLayout`:

```ts
const CART_ITEM_BASE_HEIGHT = 140
const CART_NOTE_HEIGHT = 44

const getItemLayout = useCallback(
  (_: unknown, index: number) => {
    // Approximate — or compute from orderItems if needed
    const item = orderItems[index]
    const hasNote = !!(item?.note ?? '')
    const height = CART_ITEM_BASE_HEIGHT + (hasNote ? CART_NOTE_HEIGHT : 0)
    return {
      length: height,
      offset: index * height, // Approximate
      index,
    }
  },
  [orderItems],
)
```

For variable heights, consider FlashList with `estimatedItemSize` as a compromise.

---

### 🟡 Issue: Cart — renderItem not extracted

**Location:** `app/(tabs)/cart.tsx` lines 294–407  

`renderCartItem` is a large `useCallback` (110+ lines). It's already memoized. Dependencies include `displayItemsMap`, `handleDeleteCartItemById`, `addItemNote`, `handleOpenProductVariantSheet`, `primaryColorStyle`, `t`. When any of these change, the callback is recreated. `CartItemQuantityControl` is inside — ensure it's memoized.

---

## Summary

| Priority | Issue | Location | Severity |
|----------|-------|----------|----------|
| 1 | Scroll save on every frame | use-tab-scroll-restore + menu | High |
| 2 | Cart voucher text IIFE | cart.tsx | High |
| 3 | FlashList missing estimatedItemSize | menu, client-menus, profile | High |
| 4 | Cart FlatList no getItemLayout | cart.tsx | Medium |
| 5 | Swipper banner interval deps | swipper-banner.tsx | Medium |
| 6 | DOB picker setState on scroll | date-of-birth-wheel-picker | Medium |
| 7 | handleBack not memoized | cart.tsx | Low |

---

## Recommended Action Order

1. **Fix scroll position save** — switch to `onScrollEnd` only (or animated handler with throttled runOnJS).
2. **Memoize cart voucher text** — move IIFE to `useMemo`.
3. **Add estimatedItemSize** to all FlashLists.
4. **Add getItemLayout** to cart FlatList (or approximate).
5. **Fix swipper banner interval** — remove `activeIndexState` from deps.
