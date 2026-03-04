# Animation & Physics Audit — Telegram-hóa UI

**Ngày audit:** 2025-03-03  
**Mục tiêu:** Rà soát toàn bộ UI để đồng bộ trải nghiệm animation/physics theo chuẩn Telegram.

---

## 1. Spring Consistency (withTiming → SPRING_CONFIGS)

### 1.1 Đã dùng SPRING_CONFIGS ✅

| File | Config dùng | Ghi chú |
|------|-------------|---------|
| `components/ui/dialog.tsx` | `SPRING_CONFIGS.modal` | OK |
| `components/ui/dropdown.tsx` | `SPRING_CONFIGS.popover` | OK |
| `components/home/store-carousel.tsx` | `SPRING_CONFIGS.dot` | OK |
| `components/home/swipper-banner.tsx` | `SPRING_CONFIGS.dot` | OK |
| `components/menu/product-image-carousel.tsx` | `SPRING_CONFIGS.dot` | OK |
| `components/navigation/native-gesture-pressable.tsx` | `SPRING_CONFIGS.press` | OK |
| `components/navigation/pressable-with-feedback.tsx` | `SPRING_CONFIGS.press` | OK |
| `app/menu/[slug].tsx` | `SPRING_CONFIGS.modal` | OK |

### 1.2 Cần đổi withTiming → withSpring + SPRING_CONFIGS ❌

| File | Vị trí | Hiện tại | Nên dùng |
|------|---------|----------|----------|
| `components/ui/sheet.tsx` | fadeValue (open/close) | `withTiming(1, { duration: 250 })` / `withTiming(0, { duration: 200 })` | `withSpring(1, SPRING_CONFIGS.modal)` / `withSpring(0, SPRING_CONFIGS.modal)` |
| `components/ui/drawer.tsx` | fadeValue (open/close) | Tương tự sheet | `SPRING_CONFIGS.modal` |
| `components/ui/toast.tsx` | opacity, translateY (in/out) | `withTiming` 250ms | `withSpring` + `SPRING_CONFIGS.modal` cho opacity; translateY có thể giữ timing hoặc dùng modal |
| `components/ui/select.tsx` | opacity (SelectContent) | `withTiming(1, { duration: 200 })` | `withSpring(1, SPRING_CONFIGS.popover)` |

**Ưu tiên:** Sheet, Drawer (modal UX) > Toast > Select

---

## 2. Interaction Feedback (Haptic + Scale Spring)

### 2.1 Đã có Haptic + Scale Spring ✅

| Component | File | Ghi chú |
|-----------|------|---------|
| PressableWithFeedback | `components/navigation/pressable-with-feedback.tsx` | Haptic + Scale — dùng cho Add to cart |
| Navigation (global) | `lib/navigation/navigation-engine.ts` | Haptic Light khi navigate |

### 2.2 Có Scale Spring, thiếu Haptic ⚠️

| Component | File | Dùng ở đâu |
|-----------|------|------------|
| NativeGesturePressable | `components/navigation/native-gesture-pressable.tsx` | FloatingCartButton, TabBarPill, ClientMenuItem, NewsCarousel |

**Đề xuất:** Thêm Haptic vào `onBegin` của NativeGesturePressable (runOnJS) — ảnh hưởng tất cả nút navigation.

### 2.3 Tĩnh lặng — chưa có Haptic, chưa có Scale Spring ❌

| Component/File | Loại | Mức độ quan trọng |
|----------------|------|-------------------|
| `components/ui/button.tsx` | Pressable, `active:opacity-80` | **Cao** — Nút chính (Checkout, Submit, v.v.) |
| `components/ui/checkbox.tsx` | Pressable | Trung bình |
| `components/ui/radio.tsx` | Pressable | Trung bình |
| `components/button/non-prop-quantity-selector.tsx` | Pressable (+/-) | **Cao** — Tương tác thường xuyên |
| `components/profile/settings-item.tsx` | TouchableOpacity | Trung bình |
| `components/dialog/user-avatar-dropdown.tsx` | TouchableOpacity | Trung bình |
| `components/ui/data-table/data-table-row.tsx` | Pressable | Thấp |
| `components/ui/data-table/data-table-header.tsx` | Pressable | Thấp |
| `components/ui/dropdown.tsx` | TouchableOpacity (trigger, items) | Trung bình |
| `components/ui/dialog.tsx` | Pressable, TouchableOpacity | Trung bình |
| `components/ui/sheet.tsx` | Pressable (backdrop) | Thấp |
| `components/ui/drawer.tsx` | TouchableOpacity | Thấp |
| `app/auth/register.tsx` | TouchableOpacity | Cao (form submit) |
| `app/auth/forgot-password.tsx` | TouchableOpacity | Trung bình |
| `app/payment/[order].tsx` | TouchableOpacity (back) | Trung bình |
| `app/update-order/[slug].tsx` | TouchableOpacity | Trung bình |
| `app/profile/loyalty-point.tsx` | Pressable, TouchableOpacity | Trung bình |
| `app/profile/history.tsx` | TouchableOpacity | Trung bình |
| `components/cart/select-order-type-dropdown.tsx` | TouchableOpacity | Trung bình |
| `components/branch/select-branch-dropdown.tsx` | TouchableOpacity | Trung bình |
| `components/dropdown/product-variant-dropdown.tsx` | TouchableOpacity | Trung bình |
| `components/select/order-type-select.tsx` | TouchableOpacity | Trung bình |
| `app/menu/slider-related-products.tsx` | TouchableOpacity ("Xem tất cả") | Thấp |
| `components/home/youtube-section.tsx` | Pressable | Thấp |
| `components/ui/carousel.tsx` | TouchableOpacity (arrows) | Thấp |

---

## 3. Layout Continuity (Staggered Entrance — FadeInDown)

### 3.1 Đã áp dụng ✅

| File | Vị trí | Pattern |
|------|--------|---------|
| `app/(tabs)/home.tsx` | Các section | `FadeInDown.delay(N).springify().damping(30)` |
| `app/(tabs)/menu.tsx` | Header, filter | Tương tự |
| `app/(tabs)/profile.tsx` | Settings sections | Tương tự |
| `app/(tabs)/cart.tsx` | Cart items, sections | `FadeInDown.delay(index * 50).springify().damping(30)` |
| `components/menu/client-menus.tsx` | Menu items | `FadeInDown.delay(index * 50).springify().damping(30)` |

### 3.2 Chưa áp dụng ❌

| File | Danh sách | Đề xuất |
|------|-----------|---------|
| `app/menu/slider-related-products.tsx` | FlatList ClientMenuItem | `entering={FadeInDown.delay(index * 50).springify().damping(30)}` trên wrapper View |
| `components/home/highlight-menu.tsx` | HighlightMenuCarousel items | Staggered FadeInDown cho từng item |
| `components/home/store-carousel.tsx` | Store images (carousel) | Không cần — carousel horizontal |
| `app/profile/history.tsx` | History list items | Staggered cho từng item |
| `app/update-order/components/update-order-menus.tsx` | Menu items | Staggered nếu có list |
| `app/(tabs)/gift-card.tsx` | Gift card list | Staggered nếu có list |

---

## 4. Shared Element Coverage

### 4.1 Đã có sharedTransitionTag ✅

| Source | Target | Tag |
|--------|--------|-----|
| `components/menu/client-menu-item.tsx` (Image) | `app/menu/[slug].tsx` (Image) | `menu-item-${slug}` |

### 4.2 Có thể áp dụng thêm 🔄

| Thành phần | File | Ghi chú |
|------------|------|---------|
| User Avatar | `components/dialog/user-avatar-dropdown.tsx` | Avatar có thể transition khi mở Profile/Info — cần route tương ứng |
| Store/Branch logo | `components/branch/select-branch-dropdown.tsx`, StoreCarousel | Khi chọn branch → màn chi tiết branch (nếu có) |
| Badge giỏ hàng | `components/navigation/floating-cart-button.tsx` | Badge số lượng — khó shared vì số thay đổi; có thể chỉ animate scale khi count thay đổi |
| Highlight menu images | `components/home/highlight-menu.tsx` | Có thể link tới danh sách món theo category |

**Ưu tiên thấp** — Ảnh món ăn đã cover luồng chính (Menu → Chi tiết món).

---

## 5. Bảng tổng hợp — File cần Telegram-hóa

| # | File | Hạng mục | Hành động | Ưu tiên |
|---|------|----------|-----------|---------|
| 1 | `components/ui/sheet.tsx` | Spring | withTiming → withSpring + SPRING_CONFIGS.modal | P1 |
| 2 | `components/ui/drawer.tsx` | Spring | withTiming → withSpring + SPRING_CONFIGS.modal | P1 |
| 3 | `components/ui/toast.tsx` | Spring | withTiming → withSpring | P2 |
| 4 | `components/ui/select.tsx` | Spring | withTiming → withSpring + SPRING_CONFIGS.popover | P2 |
| 5 | `components/navigation/native-gesture-pressable.tsx` | Haptic | Thêm Haptic.impactAsync(Light) trong onBegin | P1 |
| 6 | `components/ui/button.tsx` | Feedback | Bọc bằng PressableWithFeedback hoặc thêm Scale + Haptic | P1 |
| 7 | `components/button/non-prop-quantity-selector.tsx` | Feedback | Đổi Pressable → PressableWithFeedback | P1 |
| 8 | `components/ui/checkbox.tsx` | Feedback | Thêm Scale Spring + Haptic (hoặc dùng PressableWithFeedback) | P2 |
| 9 | `components/ui/radio.tsx` | Feedback | Tương tự Checkbox | P2 |
| 10 | `app/menu/slider-related-products.tsx` | Staggered | FadeInDown.delay(index * 50) cho ClientMenuItem | P2 |
| 11 | `components/home/highlight-menu.tsx` | Staggered | FadeInDown cho carousel items (nếu cần) | P3 |
| 12 | `app/profile/history.tsx` | Staggered | FadeInDown cho list items | P3 |
| 13 | `components/dialog/user-avatar-dropdown.tsx` | Shared | sharedTransitionTag cho avatar (nếu có màn Profile/Info tương ứng) | P3 |

---

## 6. Roadmap đề xuất

**Phase 1 — Quick wins (1–2 ngày):**
- Sheet, Drawer: đổi fade với SPRING_CONFIGS.modal
- NativeGesturePressable: thêm Haptic
- Button: wrap/refactor dùng Scale + Haptic
- NonPropQuantitySelector: dùng PressableWithFeedback

**Phase 2 — Consistency:**
- Toast, Select: Spring
- Checkbox, Radio: Scale + Haptic
- SliderRelatedProducts: Staggered

**Phase 3 — Polish:**
- Highlight menu, History: Staggered
- Avatar shared transition (nếu có use case rõ ràng)
