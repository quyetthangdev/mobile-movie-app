# Navigation Transition Latency — Root Cause Diagnosis

**Ngày:** 2025-03-02  
**Mục tiêu:** Xác định TẠI SAO transition chậm/nặng — không phải tối ưu duration mù quáng.

---

## 1. LIFECYCLE KHI `navigation.navigate()` ĐƯỢC GỌI

### 1.1 Flow thực tế (navigateNative.push)

```
T0:     User tap (native gesture)
        → Gesture.Tap.onStart (worklet, UI thread)
        → runOnJS(triggerAction)()                    [JS bridge ~1–3ms]

T1:     triggerAction() chạy trên JS thread
        → isNavigationLocked()? return
        → executeNav('push', href)
        → getRouter() null? → requestAnimationFrame(retry) [0–320ms nếu null]
        → lockNavigation() + acquireTransitionLock()
        → router.push(href)                            [sync ~1–2ms]

T2:     React Navigation nhận state update
        → React reconciliation (diff + schedule commit)
        → Commit phase: MenuItemDetailPage mount
        → react-native-screens tạo native Fragment/UIView
        → Native Stack nhận view mới → BẮT ĐẦU animation
        → transitionStart event fire

T3:     Native slide animation (UI thread, ~250ms)
        → MasterTransitionProvider.onTransitionStart
        → setTransitionQueueing(true)
        → ParallaxDriver spring (không dùng trong screen)

T4:     transitionEnd
        → clearInteractionHandle → runAfterInteractions fire
        → setReady(true) + safeDelay (60–90ms)
        → MenuItemDetailContent mount (HEAVY)
```

### 1.2 Điểm quan trọng

| Giai đoạn | Chạy trên | Block animation start? |
|-----------|-----------|------------------------|
| runOnJS | JS thread | **CÓ** — nếu JS bận, callback chờ |
| router.push | JS → Native bridge | Không (sync) |
| React reconciliation | JS thread | **CÓ** — phải commit xong mới có view |
| Screen mount (Skeleton) | JS thread | **CÓ** — native stack cần view để animate |
| transitionStart | Native → JS | Không |
| Native animation | UI thread | Không phụ thuộc JS |

**Kết luận:** Animation **không thể bắt đầu** cho đến khi:
1. `runOnJS` callback chạy được (JS thread rảnh)
2. React commit xong cây mới (screen đã mount)
3. react-native-screens tạo xong native view

---

## 2. GIAI ĐOẠN BLOCK ANIMATION START

### 2.1 Phase A: Tap → runOnJS (1–3ms)

**Chặn bởi:** JS thread đang bận.

- List đang scroll → layout/scroll events
- Zustand `set()` vừa chạy → nhiều subscriber re-render
- useEffect đang chạy (initializeOrdering, v.v.)
- React reconciliation từ update trước chưa xong

**Triệu chứng:** Tap không phản hồi ngay, "đơ" 50–200ms rồi mới thấy slide.

### 2.2 Phase B: runOnJS → router.push (0–320ms)

**Chặn bởi:** `getRouter()` null.

- `NavigationEngineProvider` chưa set router ref (Expo Router chưa ready)
- Retry tối đa 20 frame × 16ms = 320ms
- Nếu vượt → navigation bị drop (console.warn)

**Triệu chứng:** Tap lần đầu sau cold start có thể chậm; tap tiếp theo OK.

### 2.3 Phase C: router.push → transitionStart (5–50ms)

**Chặn bởi:** React phải mount screen trước khi native stack có view để animate.

- React Navigation update state → re-render
- `MenuItemDetailPage` mount (wrapper nhẹ)
- `MenuItemSkeletonShell` render (View + Skeleton components)
- react-native-screens mount native view
- Native stack bắt đầu transition

**Chi phí ước lượng:**
- Skeleton: 5–10ms
- Nếu Skeleton nặng hoặc parent layout phức tạp: 15–30ms

### 2.4 Tổng latency trước animation start

| Trường hợp | Latency ước lượng |
|------------|-------------------|
| Best case (router ready, JS rảnh) | 5–15ms |
| JS đang bận (list scroll, store update) | 30–100ms |
| Router null (cold start) | 50–320ms |
| Reconciliation nặng | 20–50ms |

---

## 3. HEAVY OPERATIONS TRONG LÚC MOUNT / TRANSITION

### 3.1 MenuItemDetailPage (wrapper) — mount ngay khi push

| Thành phần | Chi phí | Ghi chú |
|------------|---------|---------|
| useRunAfterTransition | <1ms | Chỉ schedule task |
| MenuItemSkeletonShell | 5–10ms | View + Skeleton × N |
| useState, useEffect | <1ms | Nhẹ |

→ Tương đối nhẹ, nhưng vẫn block Phase C.

### 3.2 MenuItemDetailContent — mount SAU transitionEnd + delay

| Thành phần | Chi phí | Block? |
|------------|---------|--------|
| useSpecificMenuItem | 2–5ms | useQuery chạy ngay (không enabled) |
| 6× useOrderFlowStore | 1–2ms | 6 selector subscriptions |
| useUserStore | <1ms | 1 selector |
| useMemo (initialVariant) | 1–3ms | reduce trên variants |
| cartItemCount selector | 1–2ms | reduce mỗi render |
| ProductImageCarousel | 5–15ms | FlatList + PaginationDot × N (Reanimated) |
| GestureScrollView | 2–5ms | Layout |
| Nested components | 5–10ms | NonPropQuantitySelector, Badge, v.v. |

**Tổng:** 20–50ms → 2–4 frame drop.

### 3.3 useEffect cascade (chạy sau mount)

| Effect | Delay | Chi phí | Ghi chú |
|--------|-------|---------|---------|
| setCarouselReady (rAF) | 0 | <1ms | Defer carousel |
| setShowRelatedProducts | 220ms | <1ms | Timer |
| initialVariant sync | 0 | 1–3ms | setState |
| initializeOrdering | 220ms | **5–15ms** | Zustand set → cascade re-render |

### 3.4 Zustand subscription cascade

Khi `initializeOrdering()` chạy (setTimeout 220ms):

- `set()` đồng bộ → notify tất cả subscribers
- **FloatingCartButton** re-render (getCartItemCount)
- **ClientMenus** (list phía sau) — 4–20 items subscribe `orderingData`, `currentStep`
- `freezeOnBlur: true` giảm nhưng không loại bỏ hoàn toàn (một số component có thể vẫn re-render)

### 3.5 ClientMenuItem — mỗi item có useEffect(initializeOrdering)

```ts
useEffect(() => {
  const id = setTimeout(run, 0)  // next tick
  return () => clearTimeout(id)
}, [isHydrated, currentStep, orderingData, userInfo?.slug, ...])
```

- Khi list mount: N items × setTimeout(0) → N lần `initializeOrdering` có thể chạy
- Zustand `set()` idempotent nhưng vẫn trigger re-render subscribers

---

## 4. TẠI SAO CHỈ TĂNG animationDuration KHÔNG SỬA ĐƯỢC

### 4.1 Hai loại "chậm" khác nhau

| Loại | Mô tả | animationDuration giúp? |
|------|-------|-------------------------|
| **Start latency** | Delay từ tap đến frame đầu animation | **KHÔNG** |
| **Duration** | Thời gian slide từ đầu đến cuối | **CÓ** |

### 4.2 Phân tích

1. **Start latency** (50–200ms): Do JS block, reconciliation, router null. Giảm duration từ 250ms → 200ms không ảnh hưởng gì đến khoảng chờ trước khi animation bắt đầu.

2. **Perceived slowness**: Nếu animation "bắt đầu muộn", user cảm giác toàn bộ flow chậm. Rút duration chỉ làm animation kết thúc nhanh hơn, không làm nó "bắt đầu sớm hơn".

3. **iOS slide_from_right**: Theo React Navigation docs, `animationDuration` **không áp dụng** cho `slide_from_right` trên iOS. App đã chuyển sang `simple_push` để dùng được duration.

4. **Transition tail stutter**: Content mount ngay sau transitionEnd (dù có delay 60–90ms) vẫn có thể trùng với 1–2 frame cuối animation. JS spike 20–50ms → frame drop → cảm giác "kết thúc không mượt".

---

## 5. TOP 3 ROOT CAUSES (RANKED)

### #1 — JS thread blocking trước animation start

**Cơ chế:** `runOnJS(triggerAction)` cần JS thread rảnh. Nếu list đang render, Zustand vừa update, hoặc layout đang tính → callback chờ → tap "đơ".

**Bằng chứng:**
- ClientMenus có 4–20 items, mỗi item 6× useOrderFlowStore
- ClientMenuItem có useEffect(initializeOrdering) chạy setTimeout(0)
- FloatingCartButton subscribe orderingData

**Verification:**
- Thêm `console.time('tap-to-push')` trong triggerAction, `console.timeEnd` trước router.push
- Nếu >16ms khi list đang hiển thị → JS block

### #2 — React reconciliation + screen mount block transition start

**Cơ chế:** Native stack cần view đã mount mới bắt đầu animate. MenuItemDetailPage + Skeleton mount trong cùng tick với state update. Nếu cây React nặng (nhiều provider, layout phức tạp) → commit chậm.

**Bằng chứng:**
- Root: GestureHandlerRootView → SafeAreaProvider → BottomSheetModalProvider → QueryClientProvider → I18nProvider → GhostMountProvider → NavigationEngineProvider → MasterTransitionProvider → Stack
- Mỗi provider có thể trigger context read trong reconciliation

**Verification:**
- React DevTools Profiler: measure "Commit" phase khi navigate
- Nếu >16ms → block animation start

### #3 — Heavy first render của destination (sau transition)

**Cơ chế:** Dù content được defer (useRunAfterTransition), khi `setReady(true)` fire → MenuItemDetailContent mount 20–50ms. Spike này:
- Có thể trùng frame cuối animation (transition tail)
- Chắc chắn gây 2–4 frame drop ngay sau transition
- Cảm giác "màn mới load chậm" hoặc "khựng khi slide xong"

**Bằng chứng:**
- TRANSITION_STUTTER_ROOT_CAUSE_AUDIT đã đo: T320–400ms spike
- ProductImageCarousel: FlatList + Reanimated PaginationDot
- 6× Zustand + useSpecificMenuItem + useMemo reduce

**Verification:**
- React Profiler: MenuItemDetailContent mount duration
- Nếu >30ms → đóng góp lớn vào perceived slowness

---

## 6. TRANSITION TIMELINE BREAKDOWN

```
0ms      Tap
1–3ms    runOnJS → triggerAction (nếu JS rảnh)
?ms      [BLOCK: JS busy có thể +30–100ms]
2–5ms    executeNav, router.push
5–15ms   React reconciliation, Skeleton mount
?ms      [BLOCK: reconciliation nặng có thể +20–50ms]
15–20ms  transitionStart — animation BẮT ĐẦU
         Native slide 250ms (UI thread)
265ms    transitionEnd
265ms    runAfterInteractions
325ms    setReady(true) — Android +60ms, iOS +60ms
325ms    MenuItemDetailContent mount — SPIKE 20–50ms
375ms    useEffect(initializeOrdering) — 220ms từ content mount
         → Zustand set → cascade
```

### Blocking phase tóm tắt

| Phase | Thời điểm | Nguyên nhân block |
|-------|-----------|-------------------|
| **Pre-start** | 0–?ms | runOnJS chờ JS thread |
| **Pre-start** | ?–?ms | getRouter() null → rAF retry |
| **Pre-start** | push → start | React commit + Skeleton mount |
| **Post-end** | transitionEnd + delay | MenuItemDetailContent mount (20–50ms) |
| **Post-end** | +220ms | initializeOrdering → Zustand cascade |

---

## 7. VERIFICATION EXPERIMENT

### Experiment 1: Đo JS thread block

```ts
// Trong native-gesture-pressable.tsx, triggerAction:
const t0 = performance.now()
if (navigation) {
  navigateNativeImmediate.push(navigation.href)
}
if (__DEV__) {
  const t1 = performance.now()
  if (t1 - t0 > 16) console.warn('[NAV] tap-to-push', t1 - t0, 'ms')
}
```

Chạy: tap từ Menu list → xem log. Nếu >16ms thường xuyên → JS block.

### Experiment 2: Đo reconciliation

- Bật React DevTools Profiler
- Navigate Menu → Detail
- Xem "Commit" duration của root
- Nếu >20ms → reconciliation nặng

### Experiment 3: Isolate router push

- Tạo màn test cực nhẹ: chỉ `<View><Text>Test</Text></View>`
- Navigate tới màn này
- Nếu vẫn chậm → vấn đề ở runOnJS / router / layout
- Nếu nhanh → vấn đề ở MenuItemDetailPage/Skeleton

---

## 8. MINIMAL SAFE FIX STRATEGY

### Ưu tiên 1: Giảm JS block trước animation (Root Cause #1)

| Fix | Risk | Effort |
|-----|------|--------|
| Defer ClientMenuItem useEffect sang requestIdleCallback hoặc 100ms | Low | Low |
| FloatingCartButton: selector tối ưu, tránh re-render khi orderingData thay đổi không liên quan | Low | Low |
| Đảm bảo router ref set sớm (NavigationEngineProvider) | Low | Check |

### Ưu tiên 2: Giảm reconciliation (Root Cause #2)

| Fix | Risk | Effort |
|-----|------|--------|
| Memo StackWithMasterTransition, screenListeners | Low | Low |
| Đơn giản hóa MenuItemSkeletonShell (ít View/Skeleton hơn) | Low | Low |

### Ưu tiên 3: Tách content mount khỏi transition tail (Root Cause #3)

| Fix | Risk | Effort |
|-----|------|--------|
| Tăng TRANSITION_SAFE_DELAY 60→100ms (iOS), 90→120ms (Android) | Low | Trivial |
| Defer ProductImageCarousel thêm 1 frame (đã có carouselReady) | Low | Done |
| initializeOrdering delay 220→300ms | Low | Trivial |

### KHÔNG làm (trừ khi đã fix latency)

- Giảm animationDuration xuống <200ms — có thể gây cảm giác "gấp", chưa giải quyết start latency
- Thêm animation phức tạp — tăng work
- Thay đổi gesture handler — rủi ro cao

---

## 9. CHECKLIST CHẨN ĐOÁN

| Triệu chứng | Nguyên nhân khả dĩ |
|-------------|---------------------|
| Tap không phản hồi 50–200ms | #1 JS block |
| Tap lần đầu chậm, lần sau OK | Router null retry |
| Animation bắt đầu nhưng "khựng" giữa chừng | Native thread OK, có thể do JS spike ảnh hưởng frame |
| Slide xong rồi màn "load" thêm 100ms | #3 Content mount |
| Cảm giác "nặng" toàn bộ | #1 + #2 + #3 kết hợp |

---

## 10. TÀI LIỆU THAM KHẢO

- `docs/TRANSITION_STUTTER_ROOT_CAUSE_AUDIT.md` — Phân tích spike T320–400ms
- `docs/TRANSITION_PERFORMANCE_AUDIT.md` — androidDelayMs, InteractionManager
- `docs/NAVIGATION_INSTANT_TRANSITION_REFACTOR.md` — Flow tap → push
- `docs/TRANSITION_SPEED_CALIBRATION_AUDIT.md` — animationDuration, simple_push
