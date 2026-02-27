# Navigation & Animation Refactor — Phase 1–6

**Mục tiêu:** Transition mượt mức Telegram/Instagram  
**Tech stack:** React Native ≥0.73, Expo Router, Hermes, react-native-screens, Zustand, TanStack Query

---

## Tổng quan trạng thái

| Hạng mục | Trạng thái | Ghi chú |
|----------|------------|---------|
| enableScreens + enableFreeze | ✅ | `lib/navigation-setup.ts` |
| Native Stack config | ✅ | slide_from_right, gesture, freezeOnBlur |
| Tab switch navigateNative | ✅ | `app/(tabs)/_layout.tsx` |
| Layout không subscribe Zustand | ✅ | I18nProvider dùng store.subscribe |
| Shell-first (useRunAfterTransition) | ✅ | Cart, Profile, menu/[slug], payment/[order] |
| lazy: false | ❌ Revert (crash release) | Diagnostic mode để tìm nguyên nhân |
| getCartItemCount O(1) | ✅ | `stores/order-flow.store.ts` |
| Hermes | ✅ | `app.json` jsEngine |
| Navigation Engine | ✅ | `lib/navigation` |
| Predictive Prefetch | ✅ | Home → banners, menu |

---

## PHASE 1 — Native Navigation Foundation

**Logic:** Navigation chạy native thread, tap → animation <16ms, không block frame đầu.

**Thay đổi:** `app.json` jsEngine hermes; `app/_layout.tsx` useEffect + InteractionManager; `lib/navigation-setup.ts` enableScreens, enableFreeze; `constants/navigation.config.ts` stackScreenOptions.

**Stack config:** animation: slide_from_right, 280ms, gestureEnabled, fullScreenGestureEnabled, animationMatchesGesture, freezeOnBlur.

---

## PHASE 2 — Layout Isolation

**Logic:** Layout không re-render khi navigate. Chỉ leaf subscribe Zustand.

**Thay đổi:** `providers/i18n-provider.tsx` — dùng `store.subscribe` thay `useUserStore` hook.

---

## PHASE 3 — Shell-First Rendering

**Logic:** First render chỉ skeleton, sau transition mount content + fetch.

**Pattern:** `useRunAfterTransition(() => setReady(true), [])` → if (!ready) return SkeletonShell; return Content.

**Thay đổi:** cart, profile, menu/[slug], payment/[order] — thêm SkeletonShell + wrapper.

**Shell yêu cầu:** Không useQuery, store, async. Chỉ Skeleton, placeholder.

---

## PHASE 4 — Frame Budget

**Logic:** Selector O(1), không reduce trong mỗi subscribe.

**Thay đổi:** `getCartItemCount()` trong order-flow.store; FloatingCartButton dùng `state.getCartItemCount()`.

**Revert:** lazy: false — gây crash release. Giữ lazy: true.

**Diagnostic mode:** `EXPO_PUBLIC_PHASE4_LAZY_DEBUG=true` → lazy: false + log `[Phase4Diag] Tab mounted: X`. Capture logcat để tìm tab crash.

---

## PHASE 5 — JS-Independent Navigation Engine

**Logic:** Dispatch trong requestAnimationFrame, transition lock ~280ms.

**Files:** `lib/navigation/navigation-engine.ts`, `transition-lock.ts`, `store-safe-scheduler.ts`, `gpu-warmup.ts`, `navigation-engine-provider.tsx`.

**Rule:** Component gọi `navigateNative.push/replace/back`, không gọi router trực tiếp.

**Đã migrate:** Tabs layout, FloatingCartButton, Profile, Home.

**Transition Lock:** `acquireTransitionLock`, `isTransitionLocked`, `runWhenUnlocked`. Trong lock: không fetch, analytics, store update lớn.

**GPU Warmup:** `useGpuWarmup()` — requestAnimationFrame noop. Đã thêm vào 5 tab screens.

---

## PHASE 6 — Predictive Navigation

**Predictive Prefetch:** `hooks/use-predictive-prefetch.ts` — khi ở Home prefetch banners, menu. Đã thêm vào HomeScreen.

**Chưa implement:** Route Prediction hook, lazy: false (crash), PressIn warmup.

**Perception Pipeline:** Tap → animation (<16ms) → skeleton (<80ms) → content hydrate khi idle → interactive (<300ms).

---

## Phase 4 Crash — Diagnostic & Phân tích

**Triệu chứng:** lazy: false gây crash Android release.

**Diagnostic:** Thêm `EXPO_PUBLIC_PHASE4_LAZY_DEBUG=true` vào .env → rebuild → chạy app → capture `adb logcat | tee phase4_crash.log`. Tìm `[Phase4Diag] Tab mounted: X` và `FATAL EXCEPTION` / `OOM`.

**Nguyên nhân khả dĩ:** lazy: false (cao) — 5 tab mount cùng lúc, memory spike, hydration race. getCartItemCount (thấp). **Kết luận:** Giữ lazy: true. getCartItemCount đã implement lại, ổn.

---

## Cấu trúc lib/navigation

```
lib/navigation/
├── index.ts
├── navigation-engine.ts
├── navigation-engine-provider.tsx
├── transition-lock.ts
├── store-safe-scheduler.ts
└── gpu-warmup.ts
```

---

## Danh sách files đã thay đổi

| Phase | File | Thay đổi |
|-------|------|----------|
| 1 | app.json, app/_layout.tsx, lib/navigation-setup.ts, constants/navigation.config.ts | jsEngine, useEffect, enableScreens, stack/tabs options |
| 2 | providers/i18n-provider.tsx | store.subscribe |
| 3 | cart, profile, menu/[slug], payment/[order] | SkeletonShell + wrapper |
| 4 | order-flow.store, floating-cart-button, phase4-diagnostic | getCartItemCount, lazy: !LAZY_DEBUG |
| 5 | lib/navigation/*, app/_layout (provider) | Navigation Engine, GPU warmup |
| 6 | hooks/use-predictive-prefetch, home.tsx | Predictive prefetch |

---

## Migration còn lại

Thay `router.push/replace/back` bằng `navigateNative.push/replace/back` tại: auth, cart, menu, payment, profile sub-screens, components.

---

## Verification

```bash
eas build --profile production --platform android
# Test: tap tab → animation; chuyển màn → shell → content
```
