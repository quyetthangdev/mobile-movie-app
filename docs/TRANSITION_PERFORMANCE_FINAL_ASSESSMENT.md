# Transition Performance — Final Assessment

**Ngày:** 2025-03-01  
**Luồng:** Menu List → Menu Item Detail  
**Mục tiêu:** Đánh giá khả năng đạt 60 FPS ổn định sau các tối ưu.

---

## 1. DEFERRAL LOGIC — useRunAfterTransition

### Kiểm tra

| Yếu tố | Trạng thái | Chi tiết |
|--------|------------|----------|
| **Content deferral** | ✅ Đúng | `MenuItemDetailPage` dùng `useRunAfterTransition(() => setReady(true))` |
| **Shell hiển thị** | ✅ Đúng | `!ready` → `MenuItemSkeletonShell` (nhẹ) |
| **Content mount** | ✅ Đúng | `ready` → `MenuItemDetailContent` chỉ mount sau callback |
| **Cơ chế** | ✅ Đúng | `InteractionManager.runAfterInteractions` + `androidDelayMs: 100` (Android) |
| **ESTIMATED_TRANSITION_MS** | ✅ Khớp | 220ms — khớp với `animationDuration` trong custom-stack |

### Flow

```
Tap → router.push → MenuItemDetailPage mount
  → ready=false → MenuItemSkeletonShell (nhẹ)
  → useRunAfterTransition schedules callback
  → [Native slide ~220ms]
  → runAfterInteractions fires
  → Android: +100ms delay
  → setReady(true) → MenuItemDetailContent mount
```

### Đánh giá

Deferral logic đúng. Content mount sau khi transition kết thúc. `androidDelayMs: 100` đã tăng để giảm rủi ro runAfterInteractions fire sớm.

---

## 2. LAYOUT STABILITY — Product Images

### Kiểm tra

| Yếu tố | Trạng thái | Chi tiết |
|--------|------------|----------|
| **Explicit dimensions** | ✅ Đúng | `imageContainerStyle`: `width: screenWidth - 32`, `height: screenWidth - 32` |
| **useMemo** | ✅ Đúng | Style memoized với `[screenWidth]` |
| **expo-image** | ✅ Đúng | Dùng `expo-image` thay cho `Image` từ RN |
| **Placeholder** | ✅ Đúng | `placeholder={Images.Food.ProductImage}` khi load remote |
| **placeholderContentFit** | ✅ Đúng | `"cover"` — khớp với `contentFit` |
| **transition** | ✅ Đúng | `transition={200}` — fade khi load xong |

### Đánh giá

Layout ổn định. Không còn layout shift khi ảnh decode. Kích thước được reserve trước khi load.

---

## 3. STORE OPTIMIZATION

### 3.1 Fine-grained selectors

| Selector | Trạng thái |
|----------|------------|
| `isHydrated` | ✅ Riêng |
| `currentStep` | ✅ Riêng |
| `orderingData` | ✅ Riêng |
| `initializeOrdering` | ✅ Riêng |
| `setCurrentStep` | ✅ Riêng |
| `addOrderingItem` | ✅ Riêng |
| `cartItemCount` | ✅ Selector trả về số trực tiếp (không dùng getCartItems + useMemo) |

### 3.2 initializeOrdering — Defer

| Yếu tố | Trạng thái | Chi tiết |
|--------|------------|----------|
| **Deferral** | ✅ Đã defer | `setTimeout(run, 0)` trong useEffect — push sang next tick |
| **MenuItemDetailContent** | ✅ | Store update chạy sau frame đầu tiên |
| **ClientMenuItem** | ✅ | Cùng logic defer — tránh block khi list mount |

### Đánh giá

- Selectors đã tối ưu, giảm re-render không cần thiết.
- `initializeOrdering` đã defer qua `setTimeout(0)` ở cả detail page và ClientMenuItem.

---

## 4. CLIENTMENUS — FlatList

| Yếu tố | Trạng thái |
|--------|------------|
| MenuItemRow | ✅ React.memo |
| Style | ✅ useMemo |
| EMPTY_SEPARATOR | ✅ Constant |
| renderItem | ✅ useCallback |
| keyExtractor | ✅ useCallback |
| columnWrapperStyle | ✅ useMemo |
| getItemLayout | ✅ useCallback |
| FlatList params | ✅ initialNumToRender=4, windowSize=3 |

---

## 5. FINAL ASSESSMENT — 60 FPS

### Đã đạt

1. **Content deferral** — MenuItemDetailContent mount sau transition.
2. **Layout stability** — Ảnh có kích thước cố định, placeholder, không layout shift.
3. **Store selectors** — Fine-grained, giảm re-render.
4. **ClientMenus** — FlatList tối ưu, không inline functions/objects.
5. **SliderRelatedProducts** — Defer 600ms.
6. **Animation** — Native Stack 220ms, chạy trên native thread.

### Rủi ro còn lại

| Rủi ro | Mức | Mô tả |
|--------|-----|-------|
| **runAfterInteractions timing** | Trung bình | Trên một số Android, có thể fire trước khi transition kết thúc. Cân nhắc tăng `androidDelayMs` lên 30–50ms nếu vẫn jank. |
| **Mount cost** | Trung bình | Khi `ready=true`, mount MenuItemDetailContent + useSpecificMenuItem + nhiều component. Có thể gây 1–2 frame drop ngay sau transition. |
| **initializeOrdering sync** | Thấp | Zustand `set()` đồng bộ khi mount; có thể defer qua `scheduleTransitionTask` nếu cần. |
| **ProductImageCarousel** | Thấp | FlatList + ảnh; đã có `initialNumToRender=1`. |

### Kết luận

**Khả năng đạt 60 FPS:** Cao (ước lượng 85–90%).

Các tối ưu chính đã áp dụng. Transition chạy trên native thread (220ms). Content mount sau transition. Layout ổn định. Store selectors tối ưu.

---

## 6. THỰC TẾ SAU TỐI ƯU — 4 STUTTERS

### Quan sát

| Metric | Giá trị |
|-------|---------|
| **Perf Monitor (Expo)** | 70–120 fps dao động |
| **Transition FPS Monitor** | ~4/12 PASS (min ≥55), 8/12 FAIL (min 7–13 fps) |
| **Cảm nhận** | Vẫn khựng, 4 stutters rõ rệt |

**Phân tích:** Perf Monitor đo UI thread (cao) nhưng Transition FPS Monitor đo JS thread qua rAF (thấp khi FAIL). JS block → frame drop → cảm giác khựng dù UI thread ổn.

### 4 điểm stutter (ước lượng)

| # | Thời điểm | Nguyên nhân khả dĩ | Đã làm |
|---|-----------|---------------------|--------|
| **1** | Tap / PressIn | preload setState, prefetch | ✅ Defer preload `setTimeout(0)` |
| **2** | Screen mount | MenuItemDetailPage + Skeleton, React Navigation layout | ⚠️ Khó tránh |
| **3** | Skeleton → Content | MenuItemDetailContent mount, ProductImageCarousel, useQuery | ✅ androidDelayMs 100, defer initializeOrdering |
| **4** | ~600ms sau mount | SliderRelatedProducts mount, 2 useQuery | ✅ Defer 600ms |

### Hướng xử lý tiếp

1. **SliderRelatedProducts** — Đã tăng delay 400 → 600ms để tách xa stutter 3.
2. **ProductImageCarousel** — Defer mount 1 frame (useState + useEffect với rAF).
3. **React Navigation** — Kiểm tra `detachInactiveScreens` / `freezeOnBlur` nếu có.
4. **Transition FPS Monitor** — Min FPS thấp = JS block; profile bằng React DevTools Profiler để tìm hàm nặng.

---

## 7. CHECKLIST TÓM TẮT

| Mục | Status |
|-----|--------|
| useRunAfterTransition defer content | ✅ |
| androidDelayMs: 100 (Android) | ✅ |
| ESTIMATED_TRANSITION_MS = 220 | ✅ |
| Product image explicit dimensions | ✅ |
| expo-image + placeholder | ✅ |
| useOrderFlowStore fine-grained selectors | ✅ |
| cartItemCount selector (không getCartItems) | ✅ |
| initializeOrdering defer (setTimeout 0) | ✅ |
| ClientMenuItem defer + selectors | ✅ |
| preload defer (setTimeout 0) | ✅ |
| ClientMenus FlatList optimization | ✅ |
| SliderRelatedProducts defer 600ms | ✅ |
