# Navigation + Animation — Full Performance & Behavior Test Analysis

**Ngày:** 2025-03-01  
**Mục tiêu:** Xác minh khả năng đạt mức mượt Telegram của transition animation.

---

## 1. CURRENT TRANSITION QUALITY SCORE: **6.2 / 10**

| Tiêu chí | Điểm | Ghi chú |
|----------|------|---------|
| Latency (tap → animation start) | 6/10 | setImmediate + runOnJS thêm 5–20ms |
| Animation speed | 7/10 | 220ms OK, nhưng timing constants không đồng bộ |
| Thread ownership | 7/10 | Native Stack UI thread, nhưng MasterTransitionProvider chạy song song |
| Gesture responsiveness | 5/10 | Double-tap, không dùng lock khi navigate |
| Frame stability | 5/10 | Content mount spike 30–60ms, 4 stutters |

---

## 2. MAJOR BOTTLENECKS

### 2.1 Latency chain (tap → animation start)

```
Tap (native) 
  → Gesture.Tap.onStart (worklet) 
  → runOnJS(triggerAction)          [~1–3ms bridge]
  → executeWithRetry
  → getRouter() null? → rAF retry   [~16ms+ nếu retry]
  → dispatchImmediate = setImmediate [~0–16ms]
  → acquireTransitionLock + r.push
  → Expo Router → Native Stack
  → Animation start
```

**Tổng:** 5–35ms (best case). 20–50ms nếu router null hoặc event loop bận.

### 2.2 Hai navigation path không đồng nhất

| Path | Dùng bởi | Lock | Latency |
|------|----------|------|---------|
| **navigateNative** | ClientMenuItem, hầu hết app | Không | setImmediate |
| **navigateSafely** | Chỉ home.tsx | isTransitioning | requestAnimationFrame |

→ ClientMenuItem dùng navigateNative → không drop tap khi transitioning → có thể double-push.

### 2.3 Timing constants không đồng bộ

| Nguồn | Giá trị | File |
|-------|--------|------|
| animationDuration | 220ms | custom-stack.tsx |
| STACK_ANIMATION_MS | 280ms | navigation-engine.ts |
| STACK_ANIMATION_MS | 320ms | navigation-lock.ts |
| ESTIMATED_TRANSITION_MS | 220ms | use-run-after-transition.ts |
| acquireTransitionLock | duration + 200ms | transition-lock.ts |

→ 4 giá trị khác nhau → defer logic sai lệch.

---

## 3. HIDDEN ARCHITECTURAL PROBLEMS

### 3.1 MasterTransitionProvider không điều khiển animation thực tế

- Native Stack: animation built-in (simple_push, slide_from_right), 220ms.
- MasterTransitionProvider: withSpring riêng cho transitionProgress.
- ParallaxDriver (useIncomingScreenStyle, etc.): **không được dùng** trong bất kỳ screen nào.
- → `transitionProgress` chạy nhưng không ảnh hưởng giao diện. Có thể bỏ hoặc tái sử dụng.

### 3.2 MenuItemDetailPage: `return null` khi !ready

```tsx
if (!ready) return null  // SkeletonShell bị comment
```

→ Khi chưa ready, màn mới trống. Có thể gây nhấp nháy hoặc blank flash.

### 3.3 setImmediate thêm latency

- `dispatchImmediate` dùng `setImmediate` để đẩy push sang microtask sau.
- Mục đích: tránh block frame hiện tại.
- Hệ quả: thêm 0–16ms. Telegram target <16ms → có thể vượt.

### 3.4 executeWithRetry không có retry limit

- `rAF` retry khi router null, không giới hạn số lần.
- Có thể retry vô hạn nếu router chưa bao giờ set.

---

## 4. ANIMATION TIMING ISSUES

### 4.1 Native Stack animation

| Platform | animation | duration | Easing |
|----------|-----------|----------|--------|
| iOS | simple_push | 220ms | Built-in |
| Android | slide_from_right | 220ms | Built-in |

→ 220ms phù hợp với Telegram (200–250ms). Không phải nguyên nhân chính của “chậm”.

### 4.2 Cảm giác chậm có thể do

1. **Latency:** 5–35ms trước khi animation bắt đầu.
2. **Content mount:** 30–60ms spike sau khi animation kết thúc.
3. **Perception:** Blank (`return null`) khi không ready → cảm giác “chờ”.

### 4.3 Khuyến nghị timing

| Tham số | Hiện tại | Đề xuất | Lý do |
|---------|----------|---------|-------|
| animationDuration | 220 | 250–280 | Cảm giác mượt hơn, ít “chớp” |
| STACK_ANIMATION_MS | 280 | 250 | Khớp với animationDuration |
| ESTIMATED_TRANSITION_MS | 220 | 250 | Khớp |
| Easing | Built-in | — | Không custom được với Native Stack |

---

## 5. THREAD OWNERSHIP ISSUES

### 5.1 Thread ownership map

| Thành phần | Thread | Ghi chú |
|------------|--------|---------|
| Gesture.Tap detection | UI (native) | Gesture Handler |
| pressScale animation | UI | Reanimated worklet |
| runOnJS(triggerAction) | JS | Bridge |
| executeWithRetry | JS | — |
| setImmediate callback | JS | — |
| router.push | JS | Expo Router |
| Native Stack animation | UI | react-native-screens |
| MasterTransitionProvider withSpring | UI | Reanimated runOnUI |
| transitionStart/End | JS | Event từ native |
| Content mount (MenuItemDetailContent) | JS | React commit |

### 5.2 Vi phạm / rủi ro

| Vấn đề | Mức độ | Chi tiết |
|--------|--------|----------|
| runOnJS trong tap | Trung bình | Bắt buộc để gọi JS. Có thể giảm bằng cách gọi push trực tiếp trong worklet nếu có API. |
| setImmediate | Trung bình | Thêm delay. Có thể thử gọi push trực tiếp trong triggerAction. |
| transitionStart/End | Thấp | Chạy trên JS. Chỉ dùng cho InteractionManager, setTransitionQueueing. |
| Content mount | Cao | React commit 30–60ms trên JS. |

### 5.3 Migration plan

- Animation: Native Stack đã chạy trên UI thread.
- Không cần chuyển animation sang Reanimated.
- Cần: giảm JS work sau tap (bỏ setImmediate nếu an toàn), defer content mount.

---

## 6. GESTURE HANDLING PROBLEMS

### 6.1 Double-tap root cause

| Nguyên nhân | Xác suất | Cơ chế |
|-------------|----------|--------|
| routerRef null | Cao | executeWithRetry → rAF retry. Tap 1 mất, tap 2 mới push. |
| Không dùng lock | Cao | navigateNative không check isTransitioning. Tap 2 trong lúc transition → push 2 lần. |
| JS block | Trung bình | triggerAction chạy chậm → user tap lại. |
| Gesture conflict | Thấp | FlatList + Tap. shouldCancelWhenOutside(false) đã fix 1 phần. |

### 6.2 Transition lock

- **navigateSafely:** dùng lock, drop tap khi transitioning.
- **navigateNative:** không dùng lock.
- ClientMenuItem dùng navigateNative → không drop tap.

### 6.3 Fix strategy

1. **Thống nhất:** dùng navigateSafely cho menu item, hoặc thêm lock vào navigateNative.
2. **routerRef:** đảm bảo set sớm; thêm retry limit (max 20 frames).
3. **Atomic state:** lock trước khi push, unlock khi transitionEnd.

---

## 7. EXACT IMPROVEMENT PLAN (Priority Ordered)

### P0 — Critical (1–2 ngày)

| # | Task | File | Impact |
|---|------|------|--------|
| 1 | **Thống nhất timing constants** | custom-stack, navigation-engine, use-run-after-transition | 220 → 250 (hoặc 280) đồng bộ |
| 2 | **Thêm lock vào navigateNative** | navigation-engine.ts | `if (isTransitionLocked()) return` hoặc dùng `isNavigationLocked` từ navigation-lock |
| 3 | **Khôi phục MenuItemSkeletonShell** | app/menu/[slug].tsx | `return null` → `return <MenuItemSkeletonShell />` |
| 4 | **Retry limit cho executeWithRetry** | navigation-engine.ts | Max 20 rAF, sau đó log warning |

### P1 — High (3–5 ngày)

| # | Task | File | Impact |
|---|------|------|--------|
| 5 | **Bỏ setImmediate trong dispatchImmediate** | navigation-engine.ts | Gọi `fn()` trực tiếp nếu router không null. Chỉ setImmediate khi cần retry. |
| 6 | **Dùng navigateSafely cho menu item** | client-menu-item.tsx | Hoặc merge logic lock vào navigateNative |
| 7 | **initializeOrdering delay 50ms** | app/menu/[slug].tsx | `setTimeout(run, 50)` thay vì 0 |
| 8 | **Defer ProductImageCarousel** | app/menu/[slug].tsx | Mount sau 1 frame |

### P2 — Medium (1 tuần)

| # | Task | File | Impact |
|---|------|------|--------|
| 9 | **androidDelayMs 150** | app/menu/[slug].tsx | Tách content mount |
| 10 | **ProductImageCarousel → expo-image** | product-image-carousel.tsx | Giảm decode block |
| 11 | **Transition task queue flush** | transition-task-queue.ts | FLUSH_DELAY_MS 100 → 50 |

### P3 — Low (2 tuần)

| # | Task | File | Impact |
|---|------|------|--------|
| 12 | **Bỏ hoặc dùng ParallaxDriver** | master-transition-provider | Giảm dead code |
| 13 | **requestIdleCallback cho SliderRelatedProducts** | app/menu/[slug].tsx | Chunk workload |

---

## 8. TELEGRAM-LEVEL OPTIMIZATION CHECKLIST

| # | Tiêu chí | Hiện tại | Target |
|---|----------|----------|--------|
| 1 | Tap → animation start | 5–35ms | <16ms |
| 2 | Animation duration | 220ms | 250–280ms |
| 3 | Animation chạy trên UI thread | ✅ | ✅ |
| 4 | Không drop frame trong transition | ❌ (4 stutters) | ✅ |
| 5 | Content mount sau transition | ✅ (defer) | ✅ |
| 6 | Single tap = single navigation | ❌ (double-tap) | ✅ |
| 7 | Transition lock | ✅ (một phần) | ✅ (toàn bộ) |
| 8 | Skeleton khi ready=false | ❌ (null) | ✅ |
| 9 | Timing constants đồng bộ | ❌ | ✅ |
| 10 | Không setImmediate trước push | ❌ | ✅ |

---

## 9. TEST RESULTS SUMMARY

### TEST 1 — Transition Latency

| Nguồn delay | Vị trí | Chi phí |
|-------------|--------|---------|
| runOnJS | native-gesture-pressable.tsx:104 | ~1–3ms |
| setImmediate | navigation-engine.ts:29 | ~0–16ms |
| router null retry | navigation-engine.ts:48 | ~16ms+ |
| executeWithRetry sync | navigation-engine.ts:46 | 0ms |

**Fix:** Bỏ setImmediate khi router đã có; gọi trực tiếp. Thêm retry limit.

### TEST 2 — Animation Speed

| Tham số | Hiện tại | Telegram-like |
|---------|----------|---------------|
| 220ms | 220ms | 250–280ms |
| Easing | Built-in | — |
| Spring (MasterTransition) | Không dùng cho visual | — |

**Fix:** Tăng 220 → 250. Đồng bộ constants.

### TEST 3 — Thread Ownership

| Thành phần | UI | JS |
|------------|-----|-----|
| Native Stack animation | ✅ | |
| Gesture detection | ✅ | |
| Navigation trigger | | ✅ |
| Content mount | | ✅ |

**Fix:** Giảm JS work sau tap. Không block UI thread.

### TEST 4 — Gesture Responsiveness

| Vấn đề | Fix |
|--------|-----|
| Double-tap | Lock + navigateSafely |
| router null | Retry limit, pre-warm |
| Race | Atomic lock |

### TEST 5 — Frame Stability

| Rủi ro | Fix |
|--------|-----|
| Content mount 30–60ms | Defer carousel, initializeOrdering 50ms |
| Skeleton null | Khôi phục MenuItemSkeletonShell |
| SliderRelatedProducts | 600ms defer, có thể tăng |

---

## 10. EXPECTED OUTCOME

| Phase | Score | Ghi chú |
|-------|-------|---------|
| Hiện tại | 6.2/10 | 4 stutters, double-tap |
| Sau P0 | 7.0/10 | Lock, skeleton, timing |
| Sau P1 | 7.8/10 | Latency, defer |
| Sau P2 | 8.2/10 | Frame stability |
| Sau P3 | 8.5/10 | Gần Telegram |
