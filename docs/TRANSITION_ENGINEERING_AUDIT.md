# Transition Engineering Audit — Senior Performance Analysis

**Ngày:** 2025-03-01  
**Phạm vi:** Kiểm chứng root cause, phát hiện vấn đề ẩn, so sánh Telegram, double-tap, tốc độ transition, execution plan.

---

## 1. ROOT CAUSE CONFIRMATION MATRIX

| Giả định | Xác nhận | Lý do |
|----------|----------|-------|
| **Transition tail collision** | ✅ CONFIRM | Content mount tại T320ms, ngay sau transitionEnd (~T220ms) + androidDelayMs 100. Dù đã defer, mount cost 30–60ms vẫn nằm trong ~100ms sau animation end. 2–4 frame drop trong window này đủ gây cảm giác khựng. |
| **JS thread spike after mount** | ✅ CONFIRM | MenuItemDetailContent mount đồng bộ: 6× Zustand, useQuery, ProductImageCarousel (FlatList + Reanimated), GestureScrollView. Ước lượng 30–60ms. rAF-based FPS monitor ghi nhận min 7–13 fps → JS block rõ ràng. |
| **InteractionManager early firing** | ⚠️ PARTIAL | Handle clear thủ công trong transitionEnd → không phụ thuộc rAI mặc định. Nhưng transitionEnd từ native stack có thể fire 0–30ms trước/sau khi compositor thực sự xong. Trên Android, native stack event timing có thể lệch. |
| **FlatList measurement blocking** | ✅ CONFIRM | ProductImageCarousel dùng FlatList với getItemLayout. Mount + measure + layout pass đồng bộ. initialNumToRender=1 giảm nhưng không loại bỏ cost. |
| **Image decode timing** | ⚠️ PARTIAL | Hero dùng expo-image (tốt). Carousel dùng RN Image → decode có thể block JS nếu chưa cache. Prefetch + scheduleTransitionTask giúp cache sẵn, nhưng carousel thumbnails vẫn decode lần đầu. |
| **Zustand notification cascade** | ✅ CONFIRM | initializeOrdering() gọi set() → notify FloatingCartButton + ClientMenuItems (list phía sau). freezeOnBlur giảm nhưng list vẫn mount; freeze chỉ ngừng updates khi blur. Khi content mount, list chưa blur hoàn toàn → re-render cascade vẫn xảy ra. |

**Tóm tắt:** 4/6 confirmed, 2/6 partial. Root cause chính: **mount cost + timing gần transition tail**.

---

## 2. HIDDEN BOTTLENECK REPORT

### 2.1 Chưa được đề cập trong audit gốc

| # | Vấn đề | Xác suất | Mô tả |
|---|--------|----------|-------|
| 1 | **React commit phase blocking** | CAO | React 18 commit phase chạy đồng bộ. Khi setReady(true), toàn bộ MenuItemDetailContent tree commit trong 1 batch. Không có concurrent rendering → 1 spike lớn thay vì chia nhỏ. |
| 2 | **Navigation event timing mismatch** | CAO | animationDuration: 220ms (custom-stack) vs STACK_ANIMATION_MS: 280 (navigation-engine). Transition lock dùng 280. useRunAfterTransition dùng ESTIMATED_TRANSITION_MS: 220. Không đồng bộ → logic defer có thể sai lệch. |
| 3 | **executeWithRetry + setImmediate chain** | TRUNG BÌNH | Tap → runOnJS(triggerAction) → navigateNative.push → executeWithRetry. Nếu routerRef null → requestAnimationFrame retry. Mỗi retry = 1 frame delay. Có thể gây cảm giác "tap không phản hồi" → user tap lần 2. |
| 4 | **freezeOnBlur side effects** | TRUNG BÌNH | Khi push, list mất focus. freezeOnBlur trigger → react-native-screens freeze view. Freeze = 1 layout pass + native call. Có thể xảy ra đúng lúc transition tail. |
| 5 | **Reanimated worklet scheduling** | TRUNG BÌNH | PaginationDot dùng withTiming trong useEffect. Reanimated schedule worklet trên UI thread. Nếu JS đang block, worklet scheduling có thể bị delay → cảm giác "animation lag". |
| 6 | **Expo Router route lifecycle** | TRUNG BÌNH | Expo Router mount file-based route. Có thể có thêm overhead: params parsing, layout resolution, provider re-evaluation. |
| 7 | **GestureHandler vs Tap** | THẤP | NativeGesturePressable dùng Gesture.Tap. Khi tap trong list (FlatList), có thể có gesture conflict. shouldCancelWhenOutside(false) đã fix 1 phần. |
| 8 | **Bridge saturation** | THẤP | Nhiều native calls: layout, image decode, Reanimated. Trên thiết bị yếu, bridge queue có thể đầy. |
| 9 | **Transition task queue flush** | THẤP | setTransitionQueueing(false) → scheduleFlush → setTimeout(flush, 100). Flush chạy 100ms sau transitionEnd. Nếu prefetch có setQueryData trong queue, flush = 1 spike. |
| 10 | **Layout pass chaining** | THẤP | GestureScrollView measure children → ProductImageCarousel measure → FlatList measure. Nested layout có thể trigger chained passes. |

### 2.2 Xếp hạng theo xác suất gây stutter

1. **React commit phase** — 1 batch lớn, không thể tránh
2. **Navigation timing mismatch** — 220 vs 280, defer logic sai
3. **executeWithRetry + router null** — double-tap trigger
4. **freezeOnBlur** — layout pass khi transition
5. **Reanimated PaginationDot** — worklet scheduling

---

## 3. TELEGRAM ARCHITECTURE GAP ANALYSIS

### 3.1 So sánh kiến trúc

| Khía cạnh | Telegram (iOS) | App hiện tại |
|-----------|---------------|--------------|
| **Screen prewarming** | AsyncDisplayKit: node layout + image decode off main thread. Preload nodes trước khi hiển thị. | Ghost mount: render skeleton trong hidden view. Không pre-layout content. Prefetch API nhưng không pre-render content tree. |
| **Incremental mounting** | Texture nodes mount async. Layout tính trên background. | React mount đồng bộ. Cả tree commit 1 lần. |
| **Animation ownership** | Native UIKit/CATransition. Animation hoàn toàn native. | Native Stack (react-native-screens). Animation native. ✅ Tương đương. |
| **Navigation lifecycle** | Push → native controller → view lifecycle. Không JS. | Push → Expo Router → React mount → useRunAfterTransition. JS tham gia nhiều. |
| **JS workload distribution** | Gần như không có JS trong transition. | JS: mount, effects, Zustand, Query. Tập trung trong 50–100ms. |
| **Transition tail isolation** | Content sẵn sàng trước khi animation end. Không có "mount spike" sau animation. | Content mount SAU animation. Spike xảy ra ngay khi animation vừa xong. |
| **View persistence** | Native view recycling. | freezeOnBlur. List vẫn mount, chỉ freeze. |

### 3.2 Khoảng trống kiến trúc

1. **Không pre-render content:** Telegram pre-layout content tree. App chỉ pre-fetch API + ghost skeleton. Content mount = spike.
2. **Mount đồng bộ:** React commit không chia nhỏ. Telegram dùng async node.
3. **Transition tail không tách:** Content mount ngay sau animation. Telegram có content sẵn trước.
4. **Zustand/Query sync:** Store updates trong mount window. Telegram không có global state cascade trong transition.

### 3.3 Đánh giá khả năng đạt mức Telegram

**Trong giới hạn React Native:** Có thể đạt ~85–90% smoothness của Telegram nếu:
- Defer mount xa hơn (androidDelayMs 150–200)
- Chia nhỏ mount (defer ProductImageCarousel, SliderRelatedProducts)
- Tách Zustand spike khỏi mount frame
- Đồng bộ timing (220 vs 280)

**Không thể đạt 100%:** Telegram dùng native + AsyncDisplayKit. RN luôn có JS bridge, React commit phase.

---

## 4. DOUBLE-TAP NAVIGATION DIAGNOSIS

### 4.1 Luồng hiện tại

```
User tap → Gesture.Tap.onStart → runOnJS(triggerAction)
  → navigateNativeImmediate.push(href)
  → executeWithRetry('push', href)
  → getRouter() → if null: requestAnimationFrame(retry)
  → dispatchImmediate → setImmediate → acquireTransitionLock → r.push(href)
```

### 4.2 Nguyên nhân có thể gây double-tap

| # | Nguyên nhân | Xác suất | Logic chẩn đoán |
|---|-------------|----------|-----------------|
| 1 | **routerRef null** | CAO | NavigationEngineProvider dùng useLayoutEffect. Router có thể null khi tab chưa mount xong. executeWithRetry retry bằng rAF. Nếu retry chậm, user tap lần 2. **Chẩn đoán:** Log `routerRef` khi executeWithRetry. Nếu null > 0 lần → retry là nguyên nhân. |
| 2 | **JS thread blocked** | CAO | Nếu JS đang block (GC, heavy work), runOnJS(triggerAction) chậm. User tap lần 2 trước khi tap 1 xử lý xong. **Chẩn đoán:** Thêm timestamp log khi triggerAction chạy. So sánh với tap time. |
| 3 | **Gesture.Tap không fire** | TRUNG BÌNH | FlatList scroll + gesture conflict. Tap có thể bị cancel. shouldCancelWhenOutside(false) đã có. **Chẩn đoán:** Log onBegin/onStart. Nếu onStart không fire → gesture cancel. |
| 4 | **navigateNative không dùng lock** | TRUNG BÌNH | navigateNative (navigation-engine) KHÔNG dùng isTransitioning từ navigation-lock. Chỉ navigateSafely dùng. ClientMenuItem dùng navigateNative → không drop tap khi transitioning. Nhưng double-tap = tap 2 lần → push 2 lần? **Chẩn đoán:** Expo Router có thể dedupe. Cần kiểm tra. |
| 5 | **transition lock** | THẤP | isTransitionLocked() chỉ block prefetch, không block navigation. Không liên quan double-tap. |

### 4.3 Chẩn đoán chính xác

```javascript
// Thêm vào executeWithRetry (navigation-engine.ts)
if (__DEV__) {
  const start = Date.now()
  if (!r) console.log('[Nav] routerRef null, retry', { elapsed: Date.now() - start })
  else console.log('[Nav] push ok', { elapsed: Date.now() - start })
}
```

```javascript
// Thêm vào triggerAction (native-gesture-pressable)
if (__DEV__) console.log('[Nav] triggerAction', Date.now())
```

Nếu log thấy `routerRef null` thường xuyên → fix: đảm bảo NavigationEngineProvider mount trước Stack, hoặc tăng retry.

---

## 5. TRANSITION SPEED CALIBRATION

### 5.1 Hiện trạng

| Tham số | Giá trị | Nguồn |
|---------|--------|-------|
| animationDuration | 220ms | custom-stack.tsx |
| STACK_ANIMATION_MS | 280ms | navigation-engine.ts |
| ESTIMATED_TRANSITION_MS | 220ms | use-run-after-transition.ts |
| Spring config | REANIMATED_PARALLAX_SPRING | MasterTransitionProvider (Reanimated, không phải native stack) |

**Lưu ý:** Native Stack dùng `animationDuration: 220` — không phải spring. MasterTransitionProvider dùng withSpring cho parallax driver — có thể không sync với native stack animation.

### 5.2 Telegram-like timing

- **iOS native:** ~300–350ms cho push. Telegram thường ~ 250–300ms.
- **Cảm giác:** 220ms hơi nhanh. 280–300ms có thể "mượt" hơn vì user có thời gian nhận cảm giác.
- **Easing:** Native Stack dùng built-in. simple_push/slide_from_right có easing mặc định.

### 5.3 Khuyến nghị

| Tham số | Hiện tại | Đề xuất | Lý do |
|---------|----------|---------|-------|
| animationDuration | 220 | 280 | Cân bằng tốc độ với cảm giác mượt. |
| STACK_ANIMATION_MS | 280 | 280 | Giữ. Đồng bộ với animationDuration mới. |
| ESTIMATED_TRANSITION_MS | 220 | 280 | Khớp với animationDuration. |
| androidDelayMs | 100 | 80–100 | Giữ. Đã đủ buffer. |

### 5.4 Frame pacing

- Native animation chạy trên UI thread → 60fps ổn định.
- Vấn đề: JS spike sau transition → frame tiếp theo bị trễ.
- Không phải animation chậm → là content mount gây hitch.

---

## 6. EXECUTION PLAN

### PHASE A — Zero-risk fixes (1–2 ngày)

| # | Task | Expected gain | Validation |
|---|------|---------------|------------|
| A1 | Đồng bộ timing: 220 → 280 (animationDuration, ESTIMATED_TRANSITION_MS) | Giảm timing drift | Transition FPS Monitor, cảm nhận |
| A2 | initializeOrdering: setTimeout(0) → setTimeout(50) | Tách Zustand spike khỏi mount frame | Min FPS improvement |
| A3 | Thêm diagnostic log cho double-tap (routerRef, triggerAction) | Xác định root cause | Reproduce double-tap, xem log |

**Stutter probability:** -5%  
**FPS stability:** +2–3 min FPS  
**Complexity:** Thấp

---

### PHASE B — Frame spike elimination (3–5 ngày)

| # | Task | Expected gain | Validation |
|---|------|---------------|------------|
| B1 | Defer ProductImageCarousel: useState(false) + mount sau 1 frame (rAF) | -10–15ms trong frame đầu | Min FPS, cảm nhận |
| B2 | ProductImageCarousel: RN Image → expo-image | -2–5ms decode | Min FPS |
| B3 | androidDelayMs: 100 → 150 | Tách content mount xa transition tail | Min FPS, Transition FPS Monitor |
| B4 | PaginationDot: defer mount (chỉ render dots sau 100ms) | -2–5ms Reanimated work | Min FPS |

**Stutter probability:** -25%  
**FPS stability:** +5–10 min FPS  
**Complexity:** Trung bình

---

### PHASE C — Architecture improvements (1–2 tuần)

| # | Task | Expected gain | Validation |
|---|------|---------------|------------|
| C1 | Fix double-tap: đảm bảo routerRef sẵn sàng trước Stack, hoặc pre-warm | Giảm double-tap | QA |
| C2 | Transition task queue: flush delay 100 → 50, hoặc flush khi idle | Giảm spike khi prefetch complete | Profile |
| C3 | FloatingCartButton: selector (s) => s.getCartItemCount() — kiểm tra re-render | Giảm cascade | React DevTools Profiler |
| C4 | freezeOnBlur: thử false trên màn list để đo impact | Xác định có gây stutter không | A/B test |

**Stutter probability:** -15%  
**FPS stability:** +2–5 min FPS  
**Complexity:** Trung bình–cao

---

### PHASE D — Telegram-grade evolution (2–4 tuần)

| # | Task | Expected gain | Validation |
|---|------|---------------|------------|
| D1 | Content pre-render: dùng ghost mount để pre-render MenuItemDetailContent (ẩn) thay vì chỉ skeleton | Giảm mount cost khi ready | Min FPS |
| D2 | React.startTransition cho setReady (nếu RN hỗ trợ) | Ưu tiên animation, defer commit | Min FPS |
| D3 | requestIdleCallback polyfill cho SliderRelatedProducts, ProductImageCarousel | Chunk workload | Min FPS |
| D4 | Đánh giá React Native's New Architecture (Fabric) nếu chưa dùng | Giảm bridge, concurrent | Long-term |

**Stutter probability:** -20%  
**FPS stability:** +5–15 min FPS  
**Complexity:** Cao

---

## 7. EXPECTED FINAL SMOOTHNESS SCORE

| Trạng thái | Score (0–100) | Ghi chú |
|------------|---------------|---------|
| **Hiện tại** | 65–70 | FPS cao nhưng 4 stutters, double-tap |
| **Sau Phase A** | 70–72 | Timing fix, minor gains |
| **Sau Phase B** | 78–82 | Spike elimination, cảm nhận rõ |
| **Sau Phase C** | 82–85 | Architecture polish |
| **Sau Phase D** | 88–92 | Gần Telegram trong giới hạn RN |

**Telegram reference:** ~95 (native, AsyncDisplayKit).  
**Mục tiêu thực tế:** 85+ với Phase B+C.

---

## 8. HARD RULES COMPLIANCE

- ❌ Không memoization ngẫu nhiên
- ❌ Không lặp lại tip tối ưu chung chung
- ❌ Không đề xuất rewrite sớm
- ✅ Chỉ thay đổi ảnh hưởng frame consistency
- ✅ Ưu tiên loại bỏ spike, không tăng peak FPS
