# Kiến trúc Navigation — Review & Chuẩn production (Telegram/Discord)

---

## 0. Stack thực tế: React Navigation + Native Stack + React Native Screens

Để animation routing đạt **60fps (hoặc 120fps trên thiết bị hỗ trợ)** và tốc độ nhanh nhất:

- **React Navigation**: Expo Router dùng React Navigation làm nền.
- **Native Stack**: Root Stack của Expo Router là **Native Stack** (`createNativeStackNavigator` từ `@react-navigation/native-stack`). Push/pop chạy trên **native thread** (iOS UINavigationController, Android Fragment), không drive từng frame trên JS.
- **React Native Screens**: `enableScreens(true)` + `enableFreeze(true)` gọi trong `lib/navigation-setup.ts`, import một lần ở `app/_layout.tsx`. Màn blur được freeze → giảm re-render, animation mượt.

**Luồng khởi tạo:** `_layout.tsx` import `@/lib/navigation-setup` → gọi `enableScreens(true)` và `enableFreeze(true)` trước khi render → render `<Stack screenOptions={stackScreenOptions} />` (Native Stack). Cấu hình tập trung tại `constants/navigation.config.ts` (stack + tabs + `TAB_ROUTES`).

---

## 1. Review kiến trúc hiện tại (sau refactor)

### Đã đạt

| Mục tiêu | Trạng thái | Ghi chú |
|----------|------------|---------|
| Native Stack + Screens | ✅ | Expo Router Stack = Native Stack; bootstrap trong `lib/navigation-setup.ts` |
| Tab switch không push stack | ✅ | `router.replace(TAB_ROUTES.*)` trong (tabs)/_layout |
| Không mount/unmount lại Tabs khi đổi tab | ✅ | Replace chỉ đổi tab index, cây Tabs giữ nguyên |
| Fade ~250ms khi đổi tab | ✅ | `tabsScreenOptions.animation: 'fade'`, transitionSpec 250ms |
| Push màn con slide_from_right ~280ms | ✅ | `stackScreenOptions` trong navigation.config |
| Gesture back native | ✅ | fullScreenGestureEnabled + animationMatchesGesture |
| freezeOnBlur | ✅ | Stack + Tabs đều bật trong config |
| Bottom bar không re-render khi cart đổi | ✅ | Chỉ `FloatingCartButton` subscribe Zustand |
| Tách TabBarPill / FloatingCartButton | ✅ | components/navigation/ |
| Config + tab routes tập trung | ✅ | constants/navigation.config.ts (stack, tabs, TAB_ROUTES) |
| (tabs)/_layout gọn | ✅ | Logic + UI tách component, dùng TAB_ROUTES |

### Trách nhiệm rõ ràng

- **Root _layout.tsx**: Import `@/lib/navigation-setup` (enableScreens + enableFreeze), một Stack (Native Stack), providers, `stackScreenOptions` áp cho mọi màn push.
- **(tabs)/_layout.tsx**: Chỉ render Tabs + custom bar; tab switch = `router.replace(TAB_ROUTES.*)`; không subscribe store.
- **Stack con (profile/, menu/, payment/)**: Là route của Root Stack, push từ tab → native slide.

---

## 2. Cấu trúc folder Expo Router (chuẩn scale lớn)

```
app/
├── _layout.tsx                 # ROOT: import lib/navigation-setup, Stack (Native Stack), providers
├── index.tsx                   # Redirect → (tabs)/home
├── (tabs)/
│   ├── _layout.tsx             # TABS: Tabs + TabBarPill + FloatingCartButton (replace only)
│   ├── home.tsx
│   ├── menu.tsx
│   ├── cart.tsx
│   ├── gift-card.tsx
│   └── profile.tsx
├── auth/                       # Stack: login, register, forgot-password
├── profile/
│   ├── _layout.tsx             # Stack (stackScreenOptions) → trượt phải 280ms cho màn con
│   ├── info.tsx, edit.tsx, history.tsx, change-password.tsx, verify-*.tsx
├── menu/                       # Stack: [slug], product-*, slider-*
├── payment/                    # Stack: [order]
├── home/                       # (optional) Stack từ tab home: news/[slug]
└── global.css
```

- **Root Stack**: Mỗi route = 1 màn (group (tabs) = 1 màn chứa Tabs).
- **Tab switch**: Chỉ đổi segment trong (tabs), không thêm route vào stack.
- **Detail/Settings**: Luôn `router.push(...)` từ tab → stack push, native animation.

---

## 3. Navigation pattern (logic rõ ràng)

| Hành động | API | Ví dụ |
|-----------|-----|--------|
| Đổi tab (trong bottom bar) | `router.replace(TAB_ROUTES.*)` | replace(TAB_ROUTES.MENU), replace(TAB_ROUTES.CART) |
| Vào màn con (detail, settings) | `router.push(href)` | push('/profile/info'), push('/menu/[slug]') |
| Quay lại màn trước | `router.back()` | Sau khi xem detail |
| Sau login/register | `router.replace(TAB_ROUTES.HOME)` | Không stack login |
| Mở cart từ ngoài tab | `router.replace(TAB_ROUTES.CART)` | FloatingCartButton |

Quy ước: **replace = thay route hiện tại (tab/flow), push = thêm màn lên stack.**

---

## 4. Animation system — Phân tích chi tiết

### 4.1 Khi nào dùng native-stack animation

- **Push/pop màn** (detail, settings, payment…): dùng **native stack** (react-native-screens).
- **Lý do**: Animation chạy trên **native thread** (iOS: UINavigationController, Android: Fragment transition). JS thread không phải vẽ từng frame → 60fps ổn định, gesture back đồng bộ với animation.
- **Config**: `animation: 'slide_from_right'`, `animationDuration: 280`, `gestureEnabled`, `fullScreenGestureEnabled`, `animationMatchesGesture`.

### 4.2 Khi nào dùng bottom-tabs fade

- **Đổi tab** (home ↔ menu ↔ profile…): dùng **built-in fade** của bottom-tabs.
- **Lý do**: Tab navigator tự vẽ fade (Animated API hoặc native tùy implementation). Đủ mượt, không cần Reanimated. Fade 200ms + bezier giống Telegram.
- **Config**: `tabsScreenOptions.animation: 'fade'`, `transitionSpec: { duration: 200, easing }`.

### 4.3 Khi nào dùng Reanimated

- **Không** dùng Reanimated cho transition **cả màn** (push/pop hoặc tab content).
- **Nên** dùng Reanimated cho: indicator nhỏ, floating button (scale/opacity), bottom sheet (@gorhom/bottom-sheet), animation nội bộ trong 1 màn (pull-to-refresh, list item).
- **Lý do tránh full-screen Reanimated**: Nếu cả màn push/pop chạy bằng Reanimated trên JS thread (hoặc UI thread nhưng đồng bộ với layout React), dễ conflict với native stack (2 hệ thống cùng điều khiển màn), và gesture back của native stack không map với Reanimated. Telegram/Discord đều dùng native transition cho push, chỉ dùng custom animation cho UI nhỏ.

### 4.4 Phối hợp không conflict

- **Native stack** = owner của push/pop. Màn con mount/unmount do stack, animation do native.
- **Bottom-tabs** = owner của tab content. Fade do tab navigator.
- **Reanimated** = chỉ trong nội dung màn (component con), không wrap cả screen trong Animated.View cho transition. Bottom sheet mở/đóng có thể dùng Reanimated vì không trùng thời điểm với push.

### 4.5 Vì sao native-stack mượt hơn JS stack

- **JS stack** (react-navigation stack cũ): Animation chạy bằng Animated trên JS → mỗi frame bridge qua native → dễ drop frame khi JS bận (fetch, re-render).
- **Native stack** (react-native-screens): Transition do native (UIKit/Android) → 60fps độc lập JS. JS chỉ mount/unmount component, không drive từng frame.

### 4.6 Vì sao Telegram/Discord dùng pattern tương tự

- Tab: chuyển nhanh, fade, không stack.
- Chi tiết: slide từ cạnh, gesture back native.
- Performance: freeze màn không nhìn, ít subscribe store ở layout.

---

## 5. Performance thực tế (không lý thuyết chung)

- **Re-render isolation**: Layout (tabs) không subscribe Zustand → cart đổi chỉ `FloatingCartButton` re-render. Pathname/theme đổi → Layout re-render (cần cho active tab + gradient), TabBarPill nhận props mới.
- **freezeOnBlur**: Màn không focus (tab khác hoặc màn con đang mở) bị freeze → không chạy render/lifecycle → tiết kiệm CPU khi chuyển tab hoặc stack sâu.
- **Tab replace**: Không push → không tạo instance màn mới trong stack → không tăng memory stack, back behavior đúng.
- **Lazy tab**: Tab chưa mở không mount → giảm work lúc cold start và lần đầu vào tab.

---

## 6. Đánh giá theo tiêu chí production

| Tiêu chí | Đánh giá | Ghi chú |
|----------|----------|---------|
| **Scalable 50+ screens** | ✅ | Root 1 Stack, route = file; thêm screen = thêm file. Pattern push/replace rõ. |
| **Memory footprint** | ✅ | Replace tab không tăng stack; freezeOnBlur giảm work màn ẩn; lazy tab. |
| **Cold start impact** | ✅ | enableScreens + enableFreeze từ đầu; QueryClient staleTime/gcTime; không block main thread bởi layout. |
| **Re-render isolation** | ✅ | Cart count chỉ trong FloatingCartButton; TabBarPill thuần props. |
| **Animation consistency** | ✅ | Stack = native 280ms; Tab = fade 200ms; không trộn Reanimated full-screen. |
| **Developer maintainability** | ✅ | Config 1 file; navigation components tách; pattern replace/push rõ trong doc. |

---

## 7. Anti-pattern cần tránh & cải tiến gợi ý

### Đã tránh

- ~~Tab bằng push~~ → dùng replace.
- ~~Layout subscribe cart~~ → chỉ FloatingCartButton subscribe.
- ~~Một file layout 300+ dòng~~ → tách TabBarPill, FloatingCartButton.

### Cải tiến có thể làm thêm

1. **Modal thật sự** (ví dụ filter full-screen): Dùng `presentation: 'modal'` hoặc `slide_from_bottom` cho route đó trong stackScreenOptions (per-screen), không mix với card.
2. **Per-screen stack options**: Màn nào cần modal/formSheet thì export `options` từ file màn đó hoặc dùng Stack.Screen options trong _layout nếu Expo Router hỗ trợ.
3. **Deep link**: Đảm bảo link vào tab dùng replace (vào đúng tab không push), link vào detail dùng push — kiểm tra `initialRouteName` / redirect.
4. **Zustand selector**: Giữ selector cart chỉ return number (hoặc primitive), tránh return object/array mới mỗi lần → tránh re-render dù đã tách component.

---

## 8. Code tham chiếu (đã có trong repo)

| File | Nội dung chính |
|------|----------------|
| `lib/navigation-setup.ts` | Bootstrap: enableScreens(true), enableFreeze(true). Import một lần ở root _layout. |
| `app/_layout.tsx` | Import `@/lib/navigation-setup`, Stack (Native Stack), GestureHandlerRootView, SafeAreaProvider, BottomSheetModalProvider, QueryClientProvider, I18nProvider, AppToastProvider, stackScreenOptions. |
| `app/(tabs)/_layout.tsx` | TabsLayout (memo), usePathname/router/useTranslation/useColorScheme/insets; tabState từ pathname; handlers dùng router.replace(TAB_ROUTES.*); Tabs + TabBarPill + FloatingCartButton; gradient overlay. |
| `constants/navigation.config.ts` | TAB_ROUTES, stackScreenOptions (slide_from_right, 280ms, gesture, freezeOnBlur), tabsScreenOptions (fade, 250ms, lazy, freezeOnBlur). |
| `app/profile/_layout.tsx` | Stack với stackScreenOptions → màn profile/info, profile/edit, … trượt từ phải 280ms, gesture back. |
| Profile screens (info, edit, history, verify-*, change-password) | React.memo + displayName; history dùng useRunAfterTransition + skeleton; verify-email/verify-phone dùng useScreenTransition + skeleton shell. |
| `components/navigation/floating-cart-button.tsx` | useOrderFlowStore(selector count), router.replace(TAB_ROUTES.CART), React.memo. |
| `components/navigation/tab-bar-pill.tsx` | Props: t, colors, tabState, handlers; không store; React.memo. |

---

## 9. Tóm tắt

- **Root**: 1 Stack, native animation, freezeOnBlur, config từ navigation.config.
- **Tabs**: Replace khi đổi tab, fade 200ms, bar tách component; cart count chỉ FloatingCartButton.
- **Push màn con**: push từ tab → stack, slide 280ms, gesture back native.
- **Animation**: Native cho push/tab; Reanimated chỉ cho UI nhỏ trong màn, không full-screen transition.
- Kiến trúc hiện tại đạt chuẩn production, scale được, dễ bảo trì; có thể bổ sung modal option và kiểm tra deep link khi mở rộng.
