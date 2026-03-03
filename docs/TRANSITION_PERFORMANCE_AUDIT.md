# Transition Performance Audit — Menu List → Menu Item Detail

**Ngày:** 2025-03-01  
**Luồng:** Screen A (Menu list / ClientMenus) → Screen B (Menu item detail / [slug])  
**Mục tiêu:** Xác định nguyên nhân transition chậm/janky, đạt 60 FPS ổn định.

---

## 1. PHÂN TÍCH DATA FETCHING & INTERACTION MANAGER

### 1.1 Screen B (MenuItemDetailPage) — Flow hiện tại

```
User tap → router.push → MenuItemDetailPage mount
  → ready=false → MenuItemSkeletonShell (nhẹ)
  → useRunAfterTransition(() => setReady(true), [], { androidDelayMs: -20 })
  → [Transition animates ~220ms]
  → InteractionManager.runAfterInteractions fires
  → setReady(true) → MenuItemDetailContent mount
  → useSpecificMenuItem(slug) — useQuery CHẠY NGAY (không có enabled)
  → useOrderFlowStore + useEffect(initializeOrdering)
```

### 1.2 Phát hiện — Data Fetching

| Vấn đề | Mức độ | Chi tiết |
|-------|--------|----------|
| **useSpecificMenuItem không có `enabled`** | MEDIUM | Query chạy ngay khi MenuItemDetailContent mount. Tuy mount đã defer sau transition, nhưng nếu runAfterInteractions fire sớm (Android), query + render có thể chạy trong lúc slide chưa xong. |
| **androidDelayMs: -20 — pre-emptive fire** | HIGH | Callback chạy ~20ms TRƯỚC khi transition kết thúc (ESTIMATED_TRANSITION_MS=300, fire at 280ms). Transition thực tế 220ms → fire at 200ms = **trong lúc animation**. Content mount + layout trong lúc slide → **layout thrashing**. |
| **initializeOrdering() sync trên mount** | MEDIUM | useEffect gọi initializeOrdering() ngay khi isHydrated. Zustand set() đồng bộ → re-render nhiều subscriber (FloatingCartButton, etc.) trong cùng frame với content render. |
| **getCartItems() gọi mỗi render** | LOW | `const currentCartItems = getCartItems()` — chạy mỗi render. getCartItems() nhẹ (chỉ đọc store) nhưng vẫn là work thừa. |
| **SliderRelatedProducts — 2 useQuery khi mount** | LOW | Mount sau 400ms (deferred) — useSpecificMenu + usePublicSpecificMenu chạy. Đã defer đúng. |

### 1.3 Phát hiện — Screen A (ClientMenuItem)

| Vấn đề | Mức độ | Chi tiết |
|-------|--------|----------|
| **useEffect(initializeOrdering) trên mỗi ClientMenuItem** | LOW | Chạy khi mount list item. Không ảnh hưởng transition vì list đã mount trước khi navigate. |
| **prefetchMenuItem + preload onPressIn** | OK | Prefetch dùng scheduleTransitionTask khi fetch resolve trong transition → cache update deferred. |
| **useCatalog trong ClientMenus** | OK | Chạy khi menu list load, không trong lúc transition. |

### 1.4 InteractionManager — Đánh giá

- `useRunAfterTransition` dùng `InteractionManager.runAfterInteractions` — đúng pattern.
- **Vấn đề:** Trên một số thiết bị Android, runAfterInteractions có thể fire trước khi native transition kết thúc. `androidDelayMs: -20` cố ý fire sớm → tăng rủi ro jank.
- **ESTIMATED_TRANSITION_MS = 300** trong use-run-after-transition.ts — không khớp với animationDuration 220ms đã set.

---

## 2. PHÂN TÍCH UI RENDERING & LAYOUT THRASHING

### 2.1 Cấu trúc layout Screen B

```
ScreenContainer
├── View (header) — flex-row, 3 children
├── GestureScrollView
│   ├── View (images) — aspectRatio: 1, full width
│   │   ├── Image (main) — remote URI, no explicit dimensions
│   │   └── ProductImageCarousel — FlatList horizontal
│   ├── View (product info) — nested 6+ levels
│   │   ├── Text, Badge, TouchableOpacity (variants)
│   │   ├── NonPropQuantitySelector
│   │   └── ...
│   └── SliderRelatedProducts (deferred 400ms) — FlatList
└── View (fixed bottom buttons)
```

### 2.2 Phát hiện — Layout & Components

| Vấn đề | Mức độ | Chi tiết |
|-------|--------|----------|
| **Image không có width/height** | MEDIUM | Main product image dùng `{ uri }` + parent `aspectRatio: 1`. Trên một số RN version, remote image không có dimensions có thể gây layout reflow khi load. Nên set `width`, `height` hoặc `minWidth/minHeight` rõ ràng. |
| **ProductImageCarousel — FlatList + auto-scroll** | LOW | initialNumToRender=1, maxToRenderPerBatch=1 — tốt. Nhưng useEffect setInterval 3s + setState mỗi 3s → re-render. Mount cùng lúc với content chính. |
| **Nested View sâu** | LOW | Product info có nhiều View lồng nhau. Có thể flatten nhưng ảnh hưởng nhỏ. |
| **SliderRelatedProducts — FlatList horizontal** | LOW | initialNumToRender=1, đã defer 400ms. OK. |
| **PaginationDot — Reanimated scale mỗi item** | LOW | Mỗi dot có useSharedValue + useAnimatedStyle. Ảnh hưởng nhỏ. |
| **MenuItemSkeletonShell** | OK | Nhẹ, chỉ View + Skeleton. |

### 2.3 Layout thrashing — Nguyên nhân chính

1. **Content mount trong lúc transition** (do androidDelayMs: -20) → React commit + layout pass chạy khi native đang animate → 2 thread cạnh tranh.
2. **Image load** — Remote image decode có thể block UI thread nếu lớn. Chưa thấy `resizeMode` hoặc `blurhash`/placeholder.
3. **Zustand re-render cascade** — initializeOrdering() → set() → nhiều component subscribe (cart badge, etc.) re-render cùng lúc.

---

## 3. KHUYẾN NGHỊ THAY ĐỔI

### 3.1 Data Fetching — Ưu tiên cao

#### A. Bỏ androidDelayMs: -20, thêm delay dương trên Android

**File:** `app/menu/[slug].tsx`

```tsx
// Trước (gây jank)
useRunAfterTransition(() => setReady(true), [], { androidDelayMs: -20 })

// Sau — đảm bảo content mount SAU transition
useRunAfterTransition(() => setReady(true), [], {
  androidDelayMs: Platform.OS === 'android' ? 50 : 0, // +50ms buffer sau runAfterInteractions
})
```

**Lý do:** Tránh mount + layout trong lúc slide. Thêm 50ms buffer đảm bảo animation đã xong.

---

#### B. Đồng bộ ESTIMATED_TRANSITION_MS với animationDuration

**File:** `hooks/use-run-after-transition.ts`

```ts
const ESTIMATED_TRANSITION_MS = 250 // Khớp với animationDuration 220ms + buffer
```

---

#### C. Defer initializeOrdering qua scheduleTransitionTask

**File:** `app/menu/[slug].tsx` — useEffect

```tsx
useEffect(() => {
  if (!isHydrated) return
  if (currentStep !== OrderFlowStep.ORDERING) {
    scheduleTransitionTask(() => setCurrentStep(OrderFlowStep.ORDERING))
  }
  if (!orderingData) {
    scheduleTransitionTask(() => initializeOrdering())
    return
  }
  if (userInfo?.slug && !orderingData.owner?.trim()) {
    scheduleTransitionTask(() => initializeOrdering())
  }
}, [isHydrated, currentStep, orderingData, userInfo?.slug, setCurrentStep, initializeOrdering])
```

**Lưu ý:** Cần import `scheduleTransitionTask` từ `@/lib/navigation`. Nhưng `scheduleTransitionTask` chỉ chạy khi `isTransitionQueueing()` — tức là trong lúc transition. Khi MenuItemDetailContent mount, transition có thể đã xong (setTransitionQueueing(false)). Nên logic này phức tạp hơn.

**Giải pháp đơn giản hơn:** Giữ nguyên nhưng đảm bảo mount sau transition (fix A). Nếu vẫn jank, mới cân nhắc defer store update.

---

### 3.2 UI Rendering — Ưu tiên trung bình

#### D. Image — Thêm dimensions rõ ràng

**File:** `app/menu/[slug].tsx`

```tsx
<View className="w-full mb-2" style={{ aspectRatio: 1 }}>
  <Image
    source={...}
    style={{ width: '100%', aspectRatio: 1 }}
    resizeMode="cover"
  />
</View>
```

Hoặc dùng `useWindowDimensions` để set width/height cụ thể, tránh layout shift.

---

#### E. Memoize getCartItems kết quả

**File:** `app/menu/[slug].tsx`

```tsx
const currentCartItems = useOrderFlowStore((state) => state.getCartItems())
const cartItemCount = useMemo(
  () => currentCartItems?.orderItems?.reduce((t, i) => t + (i.quantity || 0), 0) ?? 0,
  [currentCartItems]
)
```

Tránh gọi getCartItems() mỗi render — dùng selector trực tiếp.

---

### 3.3 Kiểm tra bổ sung

- **React DevTools Profiler:** Measure render time của MenuItemDetailContent mount.
- **Flipper / React Native Debugger:** Xem frame drops trong lúc transition.
- **Hermes:** Đảm bảo không có long task (>50ms) trên JS thread khi transition.

---

## 4. TÓM TẮT

| Nguyên nhân chính | Mức độ | Fix |
|-------------------|--------|-----|
| androidDelayMs: -20 mount content trong transition | HIGH | Đổi thành +50 hoặc 0 |
| ESTIMATED_TRANSITION_MS lệch | MEDIUM | Cập nhật 250 |
| initializeOrdering sync trên mount | MEDIUM | Cân nhắc scheduleTransitionTask nếu vẫn jank |
| Image không dimensions | MEDIUM | Thêm style rõ ràng |
| getCartItems mỗi render | LOW | Dùng selector + useMemo |

**Thứ tự thực hiện:** A → B → test → nếu vẫn jank thì D, E, C.
