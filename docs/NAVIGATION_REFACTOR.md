# React Native — Telegram-Level Navigation Transition Refactor

**Mục tiêu:** Transition mức Telegram/Instagram — instant, responsive, physically natural  
**Tech stack:** React Native ≥0.73, Expo Router, Hermes, react-native-screens, Zustand, TanStack Query

---

## Tổng quan trạng thái

| Hạng mục | Trạng thái | Ghi chú |
|----------|------------|---------|
| enableScreens + enableFreeze | ✅ | `lib/navigation-setup.ts` |
| Native Stack config | ✅ | slide_from_right, 230ms, gesture, freezeOnBlur |
| Tab switch navigateNative | ✅ | `app/(tabs)/_layout.tsx` |
| Shell-first (useRunAfterTransition) | ✅ | Cart, Profile, menu/[slug], payment/[order], Home, Menu |
| Navigation Engine (RAF dispatch) | ✅ | `lib/navigation/navigation-engine.ts` |
| Transition Lock | ✅ | ~250ms, runWhenUnlocked |
| GPU Warmup | ✅ | useGpuWarmup trên tab screens |
| Predictive Prefetch | ✅ | Home/Menu → banners, menu; Menu → Product (PressIn); Cart → Payment |
| gestureResponseDistance | ✅ | Phase 7: CustomStack (JS Stack) |
| Phase 7 Velocity-Driven | ✅ | CustomStack, gesture + spring, parallax |

---

## CORE PRINCIPLE

**Navigation = Native Animation System**  
**React = Content Hydration Layer**

Animation must NEVER wait for React. JS rendering, data fetching, store updates, and heavy logic must NEVER compete with transition animation.

**Pipeline:** Tap → Motion starts <16ms → Screen slides immediately → Content hydrates after transition → Fully interactive <300ms

---

## PHASE A — Transition Timing Optimization ✅

**Thay đổi:** `constants/navigation.config.ts`, `lib/navigation/navigation-engine.ts`, `lib/navigation/transition-lock.ts`

- animation: `slide_from_right`
- animationDuration: **230ms** (220–240ms)
- gestureEnabled, fullScreenGestureEnabled, animationMatchesGesture
- freezeOnBlur: true,
- gestureResponseDistance: 1000 — **Native Stack không hỗ trợ**

---

## PHASE B — Instant Motion Start ✅

**Rule:** NEVER call router.push directly. ALWAYS dispatch in requestAnimationFrame.

- `lib/navigation/navigation-engine.ts`: `dispatch()` chạy trong RAF
- `acquireTransitionLock()` trước khi gọi `router.push()`

---

## PHASE C — Transition Lock System ✅

**Trong ~250ms:** BLOCK API requests, analytics, Zustand large updates, expensive calculations.

**Allow:** Skeleton UI, static layout render.

- `acquireTransitionLock(durationMs)`
- `runWhenUnlocked(callback)` — Promise
- `isTransitionLocked()`
- `scheduleStoreUpdate()` — delay store update khi transition

---

## PHASE D — Shell First Rendering ✅

**Pattern:** `if (!ready) return <ScreenShell />` → hydrate content via `InteractionManager.runAfterInteractions`.

**Shell rules:** NO store subscription, NO useQuery, NO async logic, NO heavy components.

**Đã áp dụng:** cart, profile, menu, menu/[slug], payment/[order], home.

---

## PHASE E — GPU Warmup ✅

**`useGpuWarmup()`** — `requestAnimationFrame(() => {})` trên tab/root screens.

**Đã thêm:** Home, Menu, Cart, Profile, GiftCard.

---

## PHASE F — Predictive Navigation ✅

**Prefetch routes:**
- Home → Menu → banners, public-specific-menu
- Menu → Product → `usePressInPrefetchMenuItem` trên ClientMenuItem
- Cart → Payment → prefetch order trong create-order-dialog onSuccess

**Trigger:** Screen focus (usePredictivePrefetch trong Tabs layout), PressIn (menu item), Idle (create order success).

---

## PHASE G — Perceived Speed Optimization

**Pipeline:**
Tap → Native animation start (<16ms) → Skeleton visible (<80ms) → Content hydration (idle) → Interaction ready (<300ms)

**Rules:** Motion must start instantly. Content may load later. User must never wait before animation.

---

## PHASE 7 — Velocity-Driven Interactive Transition (Telegram Level) ✅

**Mục tiêu:** Chuyển từ animation theo thời gian → gesture-driven, giống Telegram.

**Kiến trúc:**
- `@react-navigation/stack` thay Native Stack cho các layout dùng CustomStack
- Gesture progress = animation progress (ngón tay điều khiển trực tiếp)
- Spring cho close (velocity continuation), timing 230ms cho open
- Parallax: màn trước `translateX(-30 + progress*30)` tạo chiều sâu

**Files:**
- `lib/navigation/interactive-transition.ts` — TELEGRAM_SPRING, OPEN_SPEC, CLOSE_SPEC, GESTURE_RESPONSE_DISTANCE
- `lib/transitions/velocity-driven-transition.tsx` — `forVelocityDrivenHorizontal` (cardStyleInterpolator)
- `layouts/custom-stack.tsx` — CustomStack + velocityDrivenScreenOptions

**Đã áp dụng:** `app/_layout.tsx`, `app/profile/_layout.tsx`

**Success checklist:**
- Swipe theo ngón tay
- Velocity ảnh hưởng completion
- Cancel cảm giác elastic
- Back gesture giống Android/iOS

---

## PHASE 7.5 — Stabilization (Telegram-Level Fix) ✅

**Vấn đề:** Tap đôi khi không navigate, transition quá nhanh, navigation bị ignore.

**Đã sửa:**

1. **Transition Lock Timeout**
   - LOCK_DURATION: 320ms
   - Auto-release sau ~400ms (timeout protection)
   - `lib/navigation/transition-lock.ts`

2. **Double RAF**
   - Navigation chạy trong 2 frame RAF → tránh React batching
   - `lib/navigation/navigation-engine.ts`

3. **Spring mượt hơn (TELEGRAM_SPRING_STABLE)**
   - damping: 26, stiffness: 180, mass: 1.1
   - overshootClamping: true
   - restDisplacementThreshold/restSpeedThreshold: 0.2

4. **gestureVelocityImpact: 0.55**
   - Velocity projection → threshold 0.45
   - `layouts/custom-stack.tsx`

5. **NavigatePressable**
   - `unstable_pressDelay={0}` — tránh lost press
   - Dùng thay TouchableOpacity cho nút navigation
   - `components/navigation/navigate-pressable.tsx`

**Debug:** Đặt `DEBUG = true` trong `navigation-engine.ts` để xem logs:
`[Nav] Tap received` → `[Nav] Lock acquired` → `[Nav] Commit navigation`

---

## Cấu trúc lib/navigation

```
lib/navigation/
├── index.ts
├── navigation-engine.ts
├── navigation-engine-provider.tsx
├── transition-lock.ts
├── store-safe-scheduler.ts
├── gpu-warmup.ts
└── interactive-transition.ts   # Phase 7 constants

lib/transitions/
└── velocity-driven-transition.tsx   # Phase 7 cardStyleInterpolator

layouts/
└── custom-stack.tsx   # Phase 7 CustomStack
```

**Hooks mới:**
- `hooks/use-press-in-prefetch.ts` — `usePressInPrefetchMenuItem()` cho Menu → Product

---

## Migration ✅ Hoàn thành

Đã thay toàn bộ `router.push/replace/back` bằng `navigateNative.push/replace/back` tại:

- **Auth:** login, register, forgot-password, forgot-password/email, forgot-password/phone
- **Components auth/form:** login-form, forgot-password-by-email-form, forgot-password-by-phone-form
- **Profile:** info, edit, history, verify-email, verify-phone-number, change-password, loyalty-point
- **Menu:** menu tab, menu/[slug], app/menu/slider-related-products, components/menu/slider-related-products, client-menu-item
- **Cart:** cart tab, create-order-dialog
- **Payment:** payment/[order]
- **Home:** swipper-banner, news-carousel, home/news/[slug]

---

## Verification

```bash
eas build --profile production --platform android
# Test: tap tab → animation; chuyển màn → shell → content
# Metric: Tap → animation <16ms, interactive <300ms
```
