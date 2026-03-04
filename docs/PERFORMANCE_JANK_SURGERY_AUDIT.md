# Performance Jank Surgery — React Native Performance Audit

**Ngày:** 2025-03-03  
**Mục tiêu:** Tìm nguyên nhân gây giật lag (jank) khi đã áp dụng Spring Physics chuẩn nhưng chưa đạt độ mượt "Telegram-level".

---

## 1. THE "SMOKING GUN" — Thủ phạm chính

### 1.1 Zustand "Big Object" Selector Leak (Mức độ: CAO)

**Vị trí:** `ClientMenuItem` + `useOrderFlowMenuItemDetail`

```tsx
// components/menu/client-menu-item.tsx:53-63
const {
  isHydrated,
  currentStep,
  hasOrderingData,
  orderingOwner,
  initializeOrdering,
  addOrderingItem,
  setCurrentStep,
} = useOrderFlowStore(
  useShallow((s) => ({
    isHydrated: s.isHydrated,
    currentStep: s.currentStep,
    hasOrderingData: s.orderingData !== null,
    orderingOwner: s.orderingData?.owner ?? '',
    // ...
  })),
)
```

**Vấn đề:** `useOrderFlowMenuItemDetail` trả về `orderingData` (object lớn). Khi `addOrderingItem` hoặc `updateOrderingItemQuantity` chạy → `orderingData` thay reference → **toàn bộ ClientMenuItem (4–20 items) re-render**. Mỗi item có `useEffect(initializeOrdering)` + `PressableWithFeedback` + animation. Re-render cascade trong lúc transition hoặc scroll → drop frame.

**Chứng cứ:** `docs/NAVIGATION_TRANSITION_LATENCY_DIAGNOSIS.md` ghi nhận: *"ClientMenus có 4–20 items, mỗi item 6× useOrderFlowStore"* và *"initializeOrdering() chạy → cascade re-render"*.

---

### 1.2 Animation Driven by useEffect (Mức độ: CAO)

**Vị trí:** `ProductImageCarousel` → `PaginationDot`

```tsx
// components/menu/product-image-carousel.tsx:59-61
useEffect(() => {
  scale.value = withSpring(isActive ? DOT_SCALE_ACTIVE : 1, SPRING_CONFIGS.dot)
}, [isActive, scale])
```

**Vấn đề:** Animation được kích hoạt bởi `useEffect` + `isActive` (prop từ React). Luồng: Parent render → Child nhận `isActive` mới → useEffect chạy → `scale.value = withSpring(...)`. Phải đợi **React reconcile + commit** trước khi animation chạy → độ trễ 1–2 frame (16–32ms).

---

### 1.3 MenuItemDetailContent — Cascade useEffect + runOnUI

**Vị trí:** `app/menu/[slug].tsx:113-119`

```tsx
useEffect(() => {
  if (!heavyContentReady) return
  runOnUI(() => {
    'worklet'
    skeletonOpacity.value = withTiming(0, { duration: 200 })
    contentOpacity.value = withTiming(1, { duration: 200 })
  })()
}, [heavyContentReady, skeletonOpacity, contentOpacity])
```

**Vấn đề:** Animation phụ thuộc `heavyContentReady` (useState). Luồng: `setHeavyContentReady(true)` → reconcile → useEffect → `runOnUI`. Độ trễ ít nhất 1 frame. Ngoài ra vẫn dùng `withTiming` thay vì `withSpring`.

---

### 1.4 initializeOrdering Cascade (Mức độ: TRUNG BÌNH–CAO)

**Vị trí:** `app/menu/[slug].tsx:166-191` + `ClientMenuItem:76-88`

```tsx
// [slug].tsx — 350ms sau mount
useEffect(() => {
  const run = () => {
    if (!orderingData) initializeOrdering()
    // ...
  }
  const id = setTimeout(run, 350)
  return () => clearTimeout(id)
}, [isHydrated, currentStep, orderingData, ...])
```

**Vấn đề:** `initializeOrdering()` gọi `set({ orderingData: newOrderingData, ... })` → notify tất cả subscribers. **FloatingCartButton**, **ClientMenus** (4–20 items), **MenuItemDetailContent** re-render đồng thời. Xảy ra ~350ms sau khi màn hình mở — có thể trùng với transition hoặc scroll → jank.

---

## 2. JS/UI Thread Synchronization

| Vấn đề | Vị trí | Tác động |
|--------|--------|----------|
| runOnJS trong onBegin (haptic) | native-gesture-pressable, pressable-with-feedback | Mỗi tap → 1 runOnJS. Chấp nhận được. |
| runOnJS trong callback animation | dialog, dropdown, toast | Chỉ khi animation xong. OK. |
| runOnJS(triggerAction) | native-gesture-pressable | Bắt buộc để navigate. Đã có lock gate. |
| Heavy logic khi animation | initialVariant useMemo (reduce) | Chạy trong render của MenuItemDetailContent. Có thể trùng với transition. |

---

## 3. Style & Layout Calculation

| Vấn đề | Vị trí | Ghi chú |
|--------|--------|---------|
| Inline object trong renderItem | slider-related-products:66,71 | `style={{ width: itemWidth, marginRight: itemSpacing }}` — mỗi render tạo object mới |
| Inline object trong renderItem | client-menu-item:163 | `style={{ aspectRatio: 1 }}` |
| MenuItemSkeletonShell | 54–156 | Nhiều `style={{ ... }}` — nên extract ra useMemo/constants |
| Animation properties | Đa số dùng transform + opacity | GPU-accelerated. OK. |

---

## 4. Zustand Selector Leaks (Chi tiết)

| Component | Selector | Vấn đề |
|-----------|----------|--------|
| ClientMenuItem | useShallow({ orderingData, hasOrderingData, orderingOwner, ... }) | orderingData thay đổi → tất cả items re-render |
| useOrderFlowMenuItemDetail | useShallow({ orderingData, cartItemCount, ... }) | orderingData + cartItemCount derived → MenuItemDetailContent re-render khi add/update item |
| cart.tsx | (s) => s.currentStep === ORDERING ? s.orderingData : null | Subscribe orderingData — OK cho cart page |
| TableSelect | (s) => s.getCartItems; cartItems = getCartItems() | Subscribe getter, gọi trong render — có thể không re-render khi cart thay đổi (tùy Zustand) |
| FloatingCartButton | useOrderFlowCartItemCount() | Chỉ primitive (number). OK. |

---

## 5. Shadow Node & Fabric

- `useAnimatedStyle` được dùng đúng cho scale, opacity, translate.
- `useAnimatedProps` chưa thấy dùng — có thể áp dụng cho các component cần animate props (ví dụ Skeleton).
- SharedValue đã dùng cho parallax, press scale, overlay animations.

---

## 6. Micro-Optimization — Đề xuất thay thế

### 6.1 PaginationDot: SharedValue + useAnimatedReaction

**Hiện tại:** useEffect + isActive prop → withSpring.

**Đề xuất:** Scroll-driven hoặc index-driven. Đưa `selectedIndex` lên SharedValue, dùng `useAnimatedReaction` trong worklet để cập nhật scale mà không qua useEffect.

```tsx
// Native-Driven: index từ scroll position hoặc shared selectedIndex
const selectedIndex = useSharedValue(0)
// Trong worklet: scale = selectedIndex.value === index ? DOT_SCALE_ACTIVE : 1
```

### 6.2 ClientMenuItem: Tách selector — chỉ subscribe primitive

**Hiện tại:** useShallow({ hasOrderingData, orderingOwner, ... }) — orderingData thay đổi → re-render.

**Đề xuất:**

```tsx
// Chỉ subscribe các giá trị cần thiết, không subscribe orderingData
const hasOrderingData = useOrderFlowStore((s) => s.orderingData !== null)
const orderingOwner = useOrderFlowStore((s) => s.orderingData?.owner ?? '')
const initializeOrdering = useOrderFlowStore((s) => s.initializeOrdering)
// ...
```

Vấn đề: `orderingOwner` thay đổi khi `initializeOrdering` chạy. Cần so sánh reference — nếu dùng `s.orderingData?.owner` thì mỗi khi orderingData thay đổi (add item) ta vẫn re-render vì owner có thể giữ nguyên nhưng selector vẫn chạy. Giải pháp tốt hơn: **tách component** — phần cần orderingData (Add to cart, quantity) dùng selector riêng; phần còn lại không subscribe orderingData.

### 6.3 MenuItemDetailContent: SharedValue cho heavyContentReady

**Hiện tại:** useState(heavyContentReady) → useEffect → runOnUI.

**Đề xuất:** Dùng SharedValue làm "gate". Timer/InteractionManager set `heavyContentReadyShared.value = 1` qua runOnUI. useAnimatedStyle đọc giá trị này và chạy animation trong worklet — không cần useEffect.

```tsx
const heavyContentReady = useSharedValue(0)
// Trong InteractionManager callback:
runOnUI(() => {
  'worklet'
  heavyContentReady.value = 1
  skeletonOpacity.value = withSpring(0, SPRING_CONFIGS.modal)
  contentOpacity.value = withSpring(1, SPRING_CONFIGS.modal)
})()
```

---

## 7. Refactor Plan — Native-Driven Model

### Phase 1: PaginationDot (Quick Win)

| Bước | Hành động |
|------|-----------|
| 1 | Tạo `selectedIndexShared = useSharedValue(0)` trong ProductImageCarousel |
| 2 | Khi scroll/click dot: `selectedIndexShared.value = index` (trong worklet hoặc runOnUI) |
| 3 | PaginationDot nhận `index` prop, dùng `useAnimatedStyle` đọc `selectedIndexShared.value` và so sánh → scale. Không useEffect. |
| 4 | Xóa useEffect trong PaginationDot |

### Phase 2: ClientMenuItem Selector Split

| Bước | Hành động |
|------|-----------|
| 1 | Tách `ClientMenuItemShell` (image, name, price) — không subscribe order flow |
| 2 | Tách `ClientMenuItemAddButton` — subscribe `hasOrderingData`, `orderingOwner`, `initializeOrdering`, `addOrderingItem` |
| 3 | Chỉ AddButton re-render khi cart thay đổi; Shell giữ nguyên |
| 4 | Hoặc: dùng `useOrderFlowStore((s) => s.orderingData?.owner ?? '')` riêng — nhưng cần selector so sánh reference để tránh re-render khi orderItems thay đổi nhưng owner không đổi. Zustand có `useShallow` — vấn đề là orderingData thay reference mỗi khi add item. |

**Giải pháp thực tế:** Dùng `useOrderFlowStore((s) => s.orderingData?.owner ?? '')` — khi add item, owner không đổi → selector trả về cùng string → không re-render. Nhưng `hasOrderingData` và `initializeOrdering` vẫn cần. Vấn đề: `hasOrderingData = s.orderingData !== null` — khi từ null → object, ta cần re-render. Khi từ object → object mới (add item), ta không cần re-render. Selector `(s) => s.orderingData !== null` trả về boolean. Khi add item, orderingData thay reference nhưng vẫn !== null → true === true → không re-render. Tốt! Vậy vấn đề là `useShallow` với object `{ hasOrderingData, orderingOwner, ... }`. Khi orderingData thay đổi, orderingOwner có thể giữ nguyên (cùng string). hasOrderingData giữ nguyên (true). Vậy useShallow so sánh từng key. Nếu tất cả giữ nguyên → không re-render. Nhưng `addOrderingItem` và `initializeOrdering` là functions — ref stable. Vậy tại sao vẫn re-render? Có thể vì `orderingData` được trả về trong object ở useOrderFlowMenuItemDetail. Trong useOrderFlowMenuItemDetail có `orderingData: s.orderingData` — đây là "Big Object". Khi orderingData thay đổi, object trả về có key orderingData mới → useShallow fail → re-render. Vậy fix: **không trả về orderingData** trong selector của ClientMenuItem. Chỉ trả về hasOrderingData, orderingOwner, và actions.

ClientMenuItem hiện dùng useOrderFlowStore trực tiếp, không useOrderFlowMenuItemDetail. useOrderFlowMenuItemDetail dùng ở MenuItemDetailContent. ClientMenuItem dùng useShallow với hasOrderingData, orderingOwner — không có orderingData. Vậy tại sao re-render? Vì hasOrderingData = s.orderingData !== null. orderingOwner = s.orderingData?.owner ?? ''. Khi add item, orderingData thay reference. orderingData !== null vẫn true. orderingData?.owner có thể cùng string. Shallow compare: hasOrderingData (true), orderingOwner (string). Nếu owner không đổi, string so sánh by value → cùng. Vậy có thể không re-render? Cần kiểm tra — có thể orderingData.owner được gán lại khi initializeOrdering. Hoặc có thể vấn đề là ở MenuItemDetailContent với useOrderFlowMenuItemDetail — nó subscribe orderingData. Khi MenuItemDetailContent re-render, nó có thể gây cascade. Tóm lại: useOrderFlowMenuItemDetail trả về orderingData — đây là nguồn re-render lớn cho MenuItemDetailContent. ClientMenuItem không dùng orderingData trực tiếp — có thể ổn hơn. Cần xác nhận ClientMenuItem có re-render khi add item từ màn khác không. Nếu ClientMenus và MenuItemDetailContent nằm trên cùng cây (cùng screen), khi add item từ detail, orderingData thay đổi → MenuItemDetailContent re-render. ClientMenus có thể ở màn menu (tab khác). Khi đó không cùng mount. Khi user ở menu tab, ClientMenus hiển thị. Khi add item từ detail, user đã navigate. ClientMenus có thể unmount. Khi quay lại menu, ClientMenus mount lại. Vậy cascade chính là: MenuItemDetailContent re-render (vì orderingData) + FloatingCartButton re-render (vì cartItemCount). Cả hai đều có thể gây jank nếu đang có animation.

---

## 8. Tóm tắt ưu tiên

| Ưu tiên | Vấn đề | Fix | Effort |
|---------|--------|-----|--------|
| P0 | useOrderFlowMenuItemDetail trả về orderingData | Tách selector: cartItemCount riêng, orderingData chỉ khi cần render cart UI | Trung bình |
| P0 | PaginationDot useEffect → withSpring | useAnimatedReaction hoặc scroll-driven SharedValue | Thấp |
| P1 | MenuItemDetailContent skeleton/content animation qua useEffect | SharedValue gate + runOnUI trực tiếp, bỏ useEffect | Thấp |
| P1 | initializeOrdering cascade 350ms | Tăng delay hoặc chạy trong requestIdleCallback | Thấp |
| P2 | Inline style trong renderItem (slider-related-products) | useMemo cho style object | Thấp |
| P2 | withTiming trong [slug].tsx | Đổi sang withSpring + SPRING_CONFIGS.modal | Rất thấp |

---

## 9. Code mẫu — PaginationDot Native-Driven

```tsx
// BEFORE: useEffect-driven
const PaginationDot = ({ isActive, onPress }) => {
  const scale = useSharedValue(isActive ? DOT_SCALE_ACTIVE : 1)
  useEffect(() => {
    scale.value = withSpring(isActive ? DOT_SCALE_ACTIVE : 1, SPRING_CONFIGS.dot)
  }, [isActive, scale])
  // ...
}

// AFTER: useAnimatedReaction — không useEffect
const PaginationDot = ({ index, selectedIndexShared, onPress }) => {
  const scale = useSharedValue(1)
  useAnimatedReaction(
    () => selectedIndexShared.value === index,
    (isActive) => {
      scale.value = withSpring(isActive ? DOT_SCALE_ACTIVE : 1, SPRING_CONFIGS.dot)
    },
  )
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))
  // ...
}
```

Parent truyền `selectedIndexShared` (SharedValue) thay vì `isActive` (boolean). Khi user scroll/click, parent set `selectedIndexShared.value = index` trong worklet hoặc `runOnUI`. Không qua React lifecycle.
