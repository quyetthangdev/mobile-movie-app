# Bản đồ hệ thống Navigation — Native Stack vs JS Stack

**Ngày audit:** 2025-03-03  
**Mục tiêu:** Xác định chính xác đoạn nào dùng Native Stack, đoạn nào dùng JS Stack (@react-navigation/stack).

---

## 1. Import Source Check

### @react-navigation/native-stack

| File | Mục đích |
|------|----------|
| `layouts/custom-stack.tsx` | createNativeStackNavigator, NativeStackNavigationOptions |
| `constants/navigation.config.ts` | NativeStackNavigationOptions (type only) |

### @react-navigation/stack

| File | Mục đích |
|------|----------|
| `layouts/js-stack.tsx` | createStackNavigator, StackNavigationOptions |
| `layouts/stack-with-master-transition.tsx` | Sử dụng JsStack (gián tiếp) |
| `lib/navigation/telegram-style-interpolator.ts` | StackCardInterpolationProps (type) |
| `lib/navigation/transition-progress-sync.tsx` | useCardAnimation |
| `lib/transitions/velocity-driven-transition.tsx` | StackCardInterpolatedStyle, StackCardInterpolationProps |

---

## 2. Navigator Mapping — Bảng thống kê

| Tên Stack | Loại | File định nghĩa | Mục đích sử dụng |
|----------|------|-----------------|------------------|
| **RootStack** | **Native** | `app/_layout.tsx` → `CustomStack` | Root của app: Tab ↔ Auth, Payment, Update Order |
| **HomeStack** | **JS** | `app/home/_layout.tsx` → `StackWithMasterTransition` | Home index ↔ home/news/[slug] |
| **MenuStack** | **JS** | `app/menu/_layout.tsx` → `StackWithMasterTransition` | Menu index ↔ menu/[slug], product-rating |
| **AuthStack** | **Native** | `app/auth/_layout.tsx` → `CustomStack` | Login, Register, Forgot Password |
| **ProfileStack** | **Native** | `app/profile/_layout.tsx` → `CustomStack` | Profile, info, edit, history, loyalty-point |
| **PaymentStack** | **Native** | `app/payment/_layout.tsx` → `CustomStack` | payment/[order] |
| **UpdateOrderStack** | **Native** | `app/update-order/_layout.tsx` → `CustomStack` | update-order/[slug] |

### Layout Components

| Component | Loại | File | Ghi chú |
|-----------|------|------|---------|
| **CustomStack** | Native | `layouts/custom-stack.tsx` | createNativeStackNavigator |
| **JsStack** | JS | `layouts/js-stack.tsx` | createStackNavigator |
| **StackWithMasterTransition** | JS | `layouts/stack-with-master-transition.tsx` | JsStack + MasterTransitionProvider listeners |

---

## 3. Hybrid Detection — Nesting

### Cấu trúc phân cấp

```
RootStack (Native)
├── index (redirect)
├── (tabs) — Tabs layout
│   ├── home tab → HomeStack (JS) ← NESTED JS trong Native
│   │   ├── home/index (home.tsx)
│   │   └── home/news/[slug]
│   ├── menu tab → MenuStack (JS) ← NESTED JS trong Native
│   │   ├── menu/index (menu.tsx)
│   │   └── menu/[slug], product-rating
│   ├── cart tab (cart.tsx)
│   ├── gift-card tab
│   └── profile tab → ProfileStack (Native) ← Native trong Native
│       ├── profile/index
│       └── profile/info, edit, history, ...
├── auth → AuthStack (Native) ← Native trong Native
├── payment → PaymentStack (Native) ← Native trong Native
└── update-order → UpdateOrderStack (Native) ← Native trong Native
```

### Phát hiện nesting

| Kiểu nesting | Ví dụ | Ghi chú |
|--------------|-------|---------|
| **JS trong Native** | RootStack (Native) chứa HomeStack (JS), MenuStack (JS) | Hợp lý — Parallax cho luồng chính, Native cho switch Tab/Auth |
| **Native trong Native** | RootStack (Native) chứa AuthStack, ProfileStack, PaymentStack, UpdateOrderStack (Native) | Tối ưu FPS — toàn bộ Native Stack |

---

## 4. Configuration Audit

### Native Stack (CustomStack)

| Option | Giá trị | File |
|--------|---------|------|
| animation | `'slide_from_right'` | custom-stack.tsx |
| animationDuration | 350ms (MOTION.stackTransition.durationMs) | custom-stack.tsx |
| gestureEnabled | true | custom-stack.tsx |
| fullScreenGestureEnabled | true | custom-stack.tsx |
| animationMatchesGesture | true | custom-stack.tsx |
| freezeOnBlur | true | custom-stack.tsx |
| fullScreenGestureShadowEnabled | true | custom-stack.tsx |

**Kết luận:** Native Stack đã dùng `animation: 'slide_from_right'` đúng chuẩn.

### JS Stack (JsStack)

| Option | Giá trị | File |
|--------|---------|------|
| cardStyleInterpolator | forTelegramHorizontal (Parallax -30%, shadow, overlay) | js-stack.tsx |
| transitionSpec | Spring: stiffness 1000, damping 500, mass 3 | js-stack.tsx |
| cardShadowEnabled | true | js-stack.tsx |
| cardOverlayEnabled | true | js-stack.tsx |
| gestureEnabled | true | js-stack.tsx |
| gestureResponseDistance | 9999 | js-stack.tsx |
| freezeOnBlur | true | js-stack.tsx |
| useNativeDriver | — | telegram-style-interpolator dùng Animated API (RN), không Reanimated |

**Lưu ý:** `telegram-style-interpolator.ts` dùng `Animated` từ React Native (interpolate), không phải Reanimated. @react-navigation/stack dùng Animated API nội bộ — transform/opacity có thể chạy native driver khi hỗ trợ.

---

## 5. Performance Risk — JS Stack + Danh sách nặng

### Màn hình JS Stack có FlatList/FlashList

| Stack | Màn hình | Component dùng list | Loại list | Mức độ rủi ro |
|-------|----------|---------------------|-----------|---------------|
| **HomeStack** | home/index | StoreCarousel, NewsCarousel, HighlightMenu, SwipperBanner | FlatList (horizontal) | **Trung bình** — carousel ngắn |
| **HomeStack** | home/news/[slug] | — | — | Thấp |
| **MenuStack** | menu/index | ClientMenus | **FlashList** (vertical) | **Thấp** — FlashList tối ưu |
| **MenuStack** | menu/[slug] | SliderRelatedProducts, ProductImageCarousel | FlatList (horizontal) | **Trung bình** — list ngắn |
| **RootStack** | (tabs) | — | — | Thấp |

### Điểm Jank cao nhất

| Ưu tiên | Màn hình | Lý do |
|---------|----------|-------|
| **P1** | menu/index | FlashList dài + JS Stack transition — khi push menu/[slug], animation có thể compete với list render |
| **P2** | home/index | Nhiều FlatList carousel đồng thời — có thể drop frame khi scroll + transition |
| **P2** | menu/[slug] | SliderRelatedProducts (FlatList) + ProductImageCarousel (FlatList) — khi kéo xuống cuối, list mount trong lúc có thể còn transition |

---

## 6. Đề xuất chuyển đổi

### Chuyển JS Stack → Native Stack (tối ưu FPS)

| Stack | Lý do | Trade-off |
|-------|-------|-----------|
| **RootStack** | ✅ Đã chuyển sang Native Stack | Tab ↔ Auth/Payment dùng native transition |
| **HomeStack** | home có nhiều carousel — Native Stack ổn định hơn | Mất Parallax khi vào tin tức |
| **MenuStack** | menu có FlashList + menu/[slug] có FlatList — rủi ro Jank cao | Mất Parallax khi vào chi tiết món |

### Chuyển Native Stack → JS Stack (tăng cảm xúc)

| Stack | Lý do | Trade-off |
|-------|-------|-----------|
| **AuthStack** | Login/Register có thể dùng Parallax | Tăng Jank risk trên máy yếu |
| **ProfileStack** | profile/history có list — nên giữ Native | — |
| **PaymentStack** | Màn thanh toán ít tương tác — có thể thử JS | Rủi ro thấp |
| **UpdateOrderStack** | Có update-order-menus (list) — giữ Native | — |

### Đề xuất cụ thể

1. **Giữ nguyên** RootStack, HomeStack, MenuStack (JS) — Parallax/Telegram feel là mục tiêu đã chọn.
2. **Theo dõi** menu/index và menu/[slug] — nếu Jank, cân nhắc:
   - Chuyển MenuStack sang Native Stack, hoặc
   - Defer mount SliderRelatedProducts đến sau khi transition xong (đã có sliderReady).
3. **RootStack** đã chuyển sang Native Stack — Tab ↔ Auth/Payment dùng native transition, ổn định FPS.
4. **Giữ** Auth, Profile, Payment, UpdateOrder dùng Native Stack — ổn định, ít rủi ro.

---

## 7. Tóm tắt

| Metric | Số lượng |
|--------|----------|
| Native Stack | 5 (Root, Auth, Profile, Payment, UpdateOrder) |
| JS Stack | 2 (Home, Menu) |
| Nested JS trong Native | 2 (Home, Menu trong Root) |
| Màn có list trong JS Stack | 3 (home, menu/index, menu/[slug]) |
| Rủi ro Jank cao | 1 (menu/index với FlashList) |
