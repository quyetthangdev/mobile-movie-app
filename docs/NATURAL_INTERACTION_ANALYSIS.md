# Natural Interaction Analysis — Senior Motion Engineer Audit

**Ngày:** 2025-03-03  
**Mục tiêu:** Đạt độ mượt và phản hồi tự nhiên như Telegram/Apple — "trọng lượng", "gia tốc", "phản ứng vật lý".

---

## 1. Naturalness Score: **6.2 / 10**

| Tiêu chí | Điểm | Ghi chú |
|----------|------|---------|
| Spring Physics & Momentum | 5/10 | Nhiều withTiming cứng, PaginationDot scale quá mạnh (2–3x) |
| Transition Timing & Easing | 7/10 | Native Stack tốt, Dialog/Dropdown dùng Easing.cubic |
| Visual Continuity | 5/10 | Không có staggered, content "pop" thay vì flow |
| Input Latency & Micro-interactions | 7/10 | NativeGesturePressable tốt, thiếu Haptic |
| Interruptibility | 6/10 | Sheet/Drawer không interruptible, PaginationDot lock |

---

## 2. Spring Physics & Momentum — Phân tích chi tiết

### 2.1 Đang dùng withTiming (cứng) thay vì withSpring

| Component | Hiện tại | Vấn đề |
|-----------|----------|--------|
| **Dialog** | withTiming 220ms, Easing.cubic | Kết thúc đột ngột, không có "settle" |
| **Dropdown** | withTiming 150ms, Easing.ease | Quá nhanh, cảm giác "snap" |
| **PaginationDot** (carousel, banner, store) | withTiming 200ms | Không có momentum, dừng gắt |
| **menu/[slug] skeleton→content** | withTiming 200ms | Fade OK, nhưng có thể mượt hơn |
| **Toast** (animate out) | withTiming 250ms | Không spring |

### 2.2 Đang dùng withSpring (tốt)

| Component | Config | Đánh giá |
|-----------|--------|----------|
| **NativeGesturePressable** | damping: 15, stiffness: 400 | ✅ Tốt — phản hồi nhanh, ít nảy |
| **Sheet/Drawer** | damping: 20, stiffness: 300, mass: 0.5 | ⚠️ Có thể tinh chỉnh |
| **Toast** (animate in) | damping: 20, stiffness: 300 | ⚠️ OK |
| **Select** (popover) | damping: 20, stiffness: 300 | ⚠️ OK |

### 2.3 PaginationDot — scaleX vs scale, giá trị quá lớn

```tsx
// product-image-carousel, swipper-banner, store-carousel
transform: [{ scaleX: scale.value }]  // ❌ Chỉ scaleX → dot thành ellipse
scale: isActive ? 2 : 1  // hoặc 3  // ❌ Telegram dùng ~1.2–1.4
```

**Vấn đề:** Dot active phình to 2–3x, chỉ scaleX → méo hình. Telegram dùng scale nhẹ (~1.2) và scale đều (scaleX + scaleY).

### 2.4 Không có velocity kế thừa

- Sheet/Drawer: `withSpring(0)` — không inject velocity từ gesture.
- Dialog: Mở/đóng bằng state, không gesture-driven.
- PaginationDot: Chuyển dot bằng tap, không có velocity.

---

## 3. Transition Timing & Easing

### 3.1 Easing curves hiện tại

| Component | Easing | Cảm giác |
|-----------|---------|----------|
| Dialog | Easing.out(Easing.cubic) | OK — chậm cuối |
| Dropdown | Easing.out(Easing.ease) | Hơi linear |
| Toast | Easing.out/in(Easing.ease) | OK |
| Tabs | Easing.bezier(0.4, 0, 0.2, 1) | Material Design — tốt |

### 3.2 Start-Stop gắt

- **Dialog đóng:** Easing.in(Easing.cubic) — kết thúc nhanh, có thể gắt.
- **Dropdown:** 150ms — quá nhanh, khó theo dõi.
- **PaginationDot:** 200ms linear — không có ease-out.

### 3.3 Interruptible

| Component | Interruptible? |
|------------|----------------|
| Native Stack (slide back) | ✅ Có — gesture-driven |
| Sheet/Drawer | ❌ Không — useEffect trigger, không cancel được |
| Dialog | ❌ Không |
| PaginationDot animation | ❌ withTiming chạy hết mới xong |

---

## 4. Visual Continuity

### 4.1 Layout Transition — "nhảy" thay vì di chuyển

- **Skeleton → Content:** Fade 200ms — OK, nhưng không có shared element.
- **Heavy content mount:** carouselReady, sliderReady defer — tránh pop, nhưng vẫn xuất hiện đột ngột.
- **Modal/Dropdown:** Scale 0.95→1 + slide — không có layout animation từ trigger.

### 4.2 Staggered animations

- **Không có** staggered cho list (menu items, related products).
- Mọi item hiện cùng lúc → sốc thị giác khi list dài.

---

## 5. Input Latency & Micro-interactions

### 5.1 NativeGesturePressable — ✅ Tốt

- `onBegin` (worklet): pressScale ngay lập tức — <16ms.
- Gesture.Tap chạy native, không qua JS khi finger down.
- pressScaleSpring: damping 15, stiffness 400 — phản hồi nhanh.

### 5.2 Pressable thường — ⚠️ Không có animation

- `Button`, `client-menu-item`, v.v.: Dùng `Pressable` với `active:opacity-80` (NativeWind).
- Không có scale, không có SharedValue — phụ thuộc RN default (opacity).
- Latency: Có thể >16ms vì qua bridge.

### 5.3 Haptic Feedback — ❌ Thiếu

- `expo-haptics` đã cài nhưng **không dùng** trong animation/press.
- Telegram/Apple: Haptic nhẹ khi tap button, khi chuyển tab, khi toggle.

---

## 6. Physics Adjustments — Đề xuất SpringConfig

### 6.1 Mở Modal / Sheet / Drawer

```ts
// Telegram: nảy rất nhỏ, tốc độ trả về nhanh
export const MODAL_SPRING = {
  damping: 24,
  stiffness: 380,
  mass: 0.6,
  overshootClamping: false,
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 0.01,
} as const
```

**Thay thế:** Sheet, Drawer, Dialog (nếu chuyển sang spring).

### 6.2 Bấm nút (Press scale)

```ts
// Hiện tại: damping 15, stiffness 400 — đã tốt
// Telegram: có thể giảm stiffness xuống 350 để mềm hơn 1 chút
export const PRESS_SPRING = {
  damping: 18,
  stiffness: 350,
  mass: 0.5,
  overshootClamping: true,
} as const
```

### 6.3 PaginationDot / Indicator

```ts
// Thay withTiming bằng withSpring — mượt hơn
export const DOT_SPRING = {
  damping: 22,
  stiffness: 400,
  mass: 0.3,
  overshootClamping: true,
} as const
```

**Scale:** 1 → 1.25 (không phải 2 hoặc 3). Dùng `scale` (đều) thay vì `scaleX`.

### 6.4 Dropdown / Popover

```ts
// Nhanh nhưng không gắt
export const POPOVER_SPRING = {
  damping: 26,
  stiffness: 420,
  mass: 0.4,
  overshootClamping: true,
} as const
```

### 6.5 Cuộn trang (Scroll-driven)

- Native Stack đã dùng native gesture — OK.
- Parallax: REANIMATED_PARALLAX_SPRING (damping 18, stiffness 220) — ổn.

---

## 7. Refactor Code — Các đoạn cần sửa

### 7.1 PaginationDot — withSpring + scale đều

**File:** `components/menu/product-image-carousel.tsx`, `swipper-banner.tsx`, `store-carousel.tsx`

```tsx
// BEFORE
const scale = useSharedValue(isActive ? 2 : 1)
useEffect(() => {
  scale.value = withTiming(isActive ? 2 : 1, { duration: 200 })
}, [isActive, scale])
// transform: [{ scaleX: scale.value }]

// AFTER
const scale = useSharedValue(isActive ? 1.25 : 1)
useEffect(() => {
  scale.value = withSpring(isActive ? 1.25 : 1, {
    damping: 22,
    stiffness: 400,
    mass: 0.3,
    overshootClamping: true,
  })
}, [isActive, scale])
// transform: [{ scale: scale.value }]
```

### 7.2 Dialog — withSpring thay withTiming

**File:** `components/ui/dialog.tsx`

```tsx
// BEFORE
scale.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) })

// AFTER
scale.value = withSpring(1, {
  damping: 24,
  stiffness: 380,
  mass: 0.6,
  overshootClamping: false,
})
```

### 7.3 Dropdown — withSpring + duration ngắn hơn

**File:** `components/ui/dropdown.tsx`

```tsx
// BEFORE
scale.value = withTiming(1, { duration: 150, easing: Easing.out(Easing.ease) })

// AFTER
scale.value = withSpring(1, {
  damping: 26,
  stiffness: 420,
  mass: 0.4,
  overshootClamping: true,
})
```

### 7.4 Haptic — Thêm vào NativeGesturePressable

**File:** `components/navigation/native-gesture-pressable.tsx`

```tsx
import * as Haptics from 'expo-haptics'

// Trong onBegin hoặc onStart (sau runOnJS):
.onStart(() => {
  'worklet'
  pressScale.value = withSpring(1, MOTION.pressScaleSpring)
  if (isLockedShared.value === 1) return
  runOnJS(triggerAction)()
  runOnJS(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light))()
})
```

### 7.5 Staggered list — Fade in từng item

**File:** `components/menu/slider-related-products.tsx` (hoặc FlashList với entering)

```tsx
// Reanimated Layout: FadeInDown.delay(index * 50).duration(300)
import Animated, { FadeInDown } from 'react-native-reanimated'

// Trong renderItem:
<Animated.View entering={FadeInDown.delay(index * 50).duration(300)}>
  <RelatedProductItem ... />
</Animated.View>
```

---

## 8. Checklist ưu tiên

| # | Task | Impact | Effort |
|---|------|--------|--------|
| 1 | PaginationDot: withSpring + scale 1.25, scale đều | Cao | Thấp |
| 2 | Dialog: withSpring thay withTiming | Trung bình | Thấp |
| 3 | Dropdown: withSpring | Trung bình | Thấp |
| 4 | Haptic trong NativeGesturePressable | Cao (cảm nhận) | Thấp |
| 5 | PRESS_SPRING tinh chỉnh (damping 18) | Thấp | Thấp |
| 6 | Staggered cho RelatedProducts | Trung bình | Trung bình |
| 7 | Sheet/Drawer interruptible (gesture-driven) | Cao | Cao |

---

## 9. Tài liệu tham khảo

- [Reanimated Spring](https://docs.swmansion.com/react-native-reanimated/docs/animations/withSpring/)
- [Apple HIG — Animation](https://developer.apple.com/design/human-interface-guidelines/animation)
- [Telegram iOS — Transition](https://github.com/TelegramMessenger/Telegram-iOS)
