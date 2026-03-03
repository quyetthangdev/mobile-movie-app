# Navigation — Instant Transition Refactor

**Ngày:** 2025-03-01  
**Mục tiêu:** Tap → animation start < 8ms (Telegram-level).

---

## MIGRATION NOTES

- **navigateSafely** = **navigateNative** (alias). Single entry point.
- **TRANSITION_DURATION_MS** = 250 — single source in `lib/navigation/constants.ts`.
- Unlock: transitionEnd (primary) → runAfterInteractions → 600ms fallback.

---

## 1. REFACTORED NAVIGATION FLOW

### Before (20–40ms latency)

```
Tap (native)
  → Gesture.Tap.onStart (worklet)
  → runOnJS(triggerAction)           [~1–3ms]
  → executeWithRetry
  → getRouter() null? → rAF retry   [∞ retries, 16ms+ each]
  → setImmediate(acquireLock, push)  [~0–16ms]
  → router.push
  → Native Stack animation start
```

### After (< 8ms when router ready)

```
Tap (native)
  → Gesture.Tap.onStart (worklet)
  → runOnJS(triggerAction)           [~1–3ms]
  → isNavigationLocked()? return     [drop second tap]
  → getRouter() → push DIRECTLY      [sync, ~1–2ms]
  → Native Stack animation start
```

**Loại bỏ:**
- setImmediate (0–16ms)
- Retry vô hạn (thay bằng max 20 frames)

---

## 2. UPDATED NAVIGATION ENGINE

### Thay đổi chính

| Trước | Sau |
|-------|-----|
| dispatchImmediate = setImmediate | Gọi push trực tiếp |
| Retry không giới hạn | Max 20 rAF |
| Không lock | isNavigationLocked() → drop tap |
| Unlock không rõ | transitionEnd + scheduleUnlock |

### Flow mới

```ts
navigateNative.push(href)
  → if (isNavigationLocked()) return
  → executeNav
  → if (router) lockNavigation, scheduleUnlock, push sync
  → else requestAnimationFrame(retry) với limit 20
```

---

## 3. BEFORE vs AFTER LATENCY

| Bước | Before | After |
|------|--------|-------|
| runOnJS | ~1–3ms | ~1–3ms |
| setImmediate | ~0–16ms | **0ms** |
| router null retry | ∞ × 16ms | max 20 × 16ms, có limit |
| push | ~1–2ms | ~1–2ms |
| **Tổng (best case)** | **5–35ms** | **~3–8ms** |

---

## 4. MODIFIED FILES

| File | Thay đổi |
|------|----------|
| `lib/navigation/navigation-engine.ts` | Bỏ setImmediate, thêm lock, retry limit |
| `lib/navigation/master-transition-provider.tsx` | unlockNavigation trong transitionEnd |
| `app/menu/[slug].tsx` | Khôi phục MenuItemSkeletonShell |
| `layouts/custom-stack.tsx` | animationDuration 220 → 250 |
| `hooks/use-run-after-transition.ts` | ESTIMATED_TRANSITION_MS 220 → 250 |

---

## 5. RISK ANALYSIS

| Rủi ro | Mức | Giảm thiểu |
|--------|-----|------------|
| Push sync block frame | Thấp | Push nhẹ, Native Stack xử lý async |
| Lock stuck | Thấp | transitionEnd + scheduleUnlock (runAfterInteractions + 600ms fallback) |
| Router null | Thấp | Retry 20 frames, log warning |
| Double-push | Đã fix | isNavigationLocked() drop tap |

---

## 6. EXPECTED IMPROVEMENT

| Metric | Before | After |
|--------|--------|-------|
| Tap → animation start | 20–40ms | **3–8ms** |
| Double-tap required | Có | Không (lock) |
| Perceived latency | Chậm | Instant |

---

## 7. TASK 5 — ROUTE PREFETCH

Expo Router không có `router.prefetch` built-in. App đã có:
- `usePressInPrefetchMenuItem` — API prefetch khi PressIn
- `usePredictivePrefetch` — TanStack Query prefetch theo route

Không thay đổi thêm.
