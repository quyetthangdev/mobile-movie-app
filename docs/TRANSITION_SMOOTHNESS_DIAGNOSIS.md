# Transition Smoothness Diagnosis — Systemic Root Causes

**Mục tiêu:** Xác định vì sao app không đạt mức mượt như Telegram dù đã dùng Reanimated, spring, memo, FlashList.

**Phạm vi:** Transition ownership conflicts, JS/UI thread contention, mount timing, persistence impact.

---

## 1. Smoothness Blocker Level

### App dừng ở L3/L4 vì:

1. **Không có single transition authority** — unlock và completion được chia cho 2 cơ chế (event vs time), chỉ một phần stack dùng event-based.
2. **Progress sync kéo JS vào mỗi frame** — `TransitionProgressSyncer` dùng `progress.addListener` → bridge/JS mỗi frame, phá lợi ích useNativeDriver.
3. **JS Stack = Card re-render mỗi frame** — `@react-navigation/stack` Card là React component, `cardStyleInterpolator` chạy mỗi khi progress thay đổi → JS work mỗi frame.
4. **Persist chạy sync** — mỗi `set()` → `JSON.stringify` ngay lập tức, không defer; chỉ một số action dùng `scheduleStoreUpdate`.
5. **Mount trong transition** — màn mới mount ngay khi push; dù heavy content defer, vỏ (shell) vẫn mount trong transition → JS spike.

---

## 2. Transition Ownership Diagram

### Ai điều khiển gì

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ TRANSITION START                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ Owner: navigation-engine.executeNav()                                        │
│ - lockNavigation()                                                           │
│ - acquireTransitionLock(250ms) → transition-lock                             │
│ - router.push()                                                              │
│ - scheduleUnlock() → 350ms timeout, 600ms timeout, runAfterInteractions      │
│                                                                              │
│ CONFLICT: executeNav luôn gọi scheduleUnlock. Không có cơ chế "chỉ dùng     │
│ transitionEnd". Root/Auth/Profile không có transitionEnd listener.           │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ TRANSITION PROGRESS                                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│ Owner: @react-navigation/stack (Animated spring)                             │
│ - Animated.Value (progress) driven by spring physics                        │
│ - cardStyleInterpolator(current.progress.interpolate(...)) → transform       │
│ - Card component re-renders when progress changes                            │
│                                                                              │
│ SECONDARY: TransitionProgressSyncer (chỉ Home/Menu có ParallaxDriver)        │
│ - progress.addListener(({ value }) => runOnUI(...)(value))                    │
│ - Mỗi frame: native → bridge → JS listener → runOnUI → SharedValue           │
│ - ParallaxDriver dùng SharedValue cho parallax effect                       │
│                                                                              │
│ CONFLICT: Có 2 nơi dùng progress: (1) Card interpolator, (2) Syncer.         │
│ Syncer kéo value về JS mỗi frame → bridge traffic không cần thiết.           │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ TRANSITION COMPLETION / UNLOCK                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│ Home, Menu (StackWithMasterTransition):                                      │
│   Owner: MasterTransitionProvider.onTransitionEnd                            │
│   - cancelScheduledUnlockTimers()                                             │
│   - unlockNavigation()                                                        │
│   - clearInteractionHandle → runAfterInteractions fire                        │
│   - setTransitionQueueing(false) → scheduleFlush(100ms)                       │
│   → Event-based, chính xác                                                    │
│                                                                              │
│ Root, Auth, Profile, Payment, UpdateOrder (JsStack trực tiếp):               │
│   Owner: scheduleUnlock timeouts                                             │
│   - EARLY: 350ms                                                             │
│   - FAILSAFE: 600ms                                                          │
│   - runAfterInteractions (không gắn với transitionEnd)                        │
│   → Time-based. Không biết transition thực sự kết thúc khi nào.               │
│                                                                              │
│ CONFLICT: Hai authority. Time-based có thể unlock sớm (máy chậm) hoặc       │
│ muộn (máy nhanh). runAfterInteractions không đảm bảo trùng với transitionEnd.│
└─────────────────────────────────────────────────────────────────────────────┘
```

### Tóm tắt ownership

| Giai đoạn | Home/Menu | Root/Auth/Profile |
|-----------|-----------|-------------------|
| Start | executeNav + transitionStart (create handle, setTransitionQueueing) | executeNav only |
| Progress | Stack + Syncer (bridge mỗi frame) | Stack only |
| Completion | transitionEnd (event) | Timeout (350ms, 600ms) |
| Unlock | transitionEnd | Timeout / runAfterInteractions |

---

## 3. Hidden Frame Killers

### 3.1 Progress Listener — Bridge Per Frame

**Cơ chế:** `TransitionProgressSyncer` gọi `progress.addListener()`. Animated.Value với useNativeDriver vẫn gửi value về JS khi có listener.

**Hệ quả:** Mỗi frame (60fps) → 1 lần native→JS. Bridge có throughput giới hạn. Trên máy yếu hoặc nhiều tác vụ, có thể gây frame drop.

**Vị trí:** `lib/navigation/transition-progress-sync.tsx`

---

### 3.2 Card Re-render Per Frame

**Cơ chế:** `@react-navigation/stack` Card là React component. Khi `progress` thay đổi, Card re-render. `cardStyleInterpolator` chạy mỗi lần render → tạo Animated nodes mới.

**Hệ quả:** JS work mỗi frame: reconcile, interpolator, allocation. Dù animation chạy native, JS vẫn bận.

---

### 3.3 Persist JSON.stringify — Sync Block

**Cơ chế:** Zustand persist middleware: mỗi `set()` → `JSON.stringify(state)` đồng bộ → `storage.setItem()` async. `JSON.stringify` block JS thread.

**Vị trí:** `order-flow.store`, `cart.store` — `orderingData` có thể rất lớn (nhiều item, variant, voucher).

**Hệ quả:** 5–20ms block khi state lớn. Chỉ các action qua `scheduleStoreUpdate` mới bị defer. `initializeOrdering`, các effect khác gọi `set()` trực tiếp → persist chạy ngay.

---

### 3.4 Flush Spike — 100ms Sau transitionEnd

**Cơ chế:** `setTransitionQueueing(false)` → `scheduleFlush(100ms)`. Khi flush chạy, tất cả task trong queue chạy tuần tự: `addOrderingItem`, `setQueryData`, v.v.

**Hệ quả:** Nhiều `set()` liên tiếp → nhiều lần `JSON.stringify` → spike 20–50ms. User có thể thấy micro-stutter ngay sau khi transition xong.

---

### 3.5 runAfterInteractions Collision

**Cơ chế:** `transitionEnd` → `clearInteractionHandle` → `runAfterInteractions` fire. `MenuItemDetailContent` dùng `runAfterInteractions` + `setTimeout(50)`.

**Hệ quả:** Callback chạy trong cùng tick (hoặc tick kế) với `transitionEnd`. `transitionEnd` đã làm nhiều việc (clear handle, unlock, scheduleFlush). Thêm callback của `runAfterInteractions` → JS spike trong 1–2 frame cuối hoặc ngay sau transition.

---

### 3.6 Shell Mount Trong Transition

**Cơ chế:** `router.push()` → React Navigation mount màn mới ngay. `MenuItemDetailContent` mount với `contentReady=false`. Dù heavy content defer, vẫn phải mount: hooks, `useOrderFlowMenuItemDetail`, `useSpecificMenuItem`, skeleton, layout.

**Hệ quả:** Mount cost 10–30ms trong lúc transition đang chạy. Có thể gây 1–2 frame drop ở 20–40% progress.

---

## 4. Transition Safety Window — Có Thể Xảy Ra Trong Transition

| Sự kiện | Home/Menu | Root/Auth/Profile | Cơ chế gây frame drop |
|---------|-----------|-------------------|------------------------|
| Zustand `set()` | Chỉ qua `scheduleStoreUpdate` mới defer | Chỉ qua `scheduleStoreUpdate` | `set()` trực tiếp → persist sync → block |
| Persist serialization | Defer nếu qua scheduleStoreUpdate | Defer nếu qua scheduleStoreUpdate | `JSON.stringify` block 5–20ms |
| AsyncStorage write | Async, không block | Async, không block | I/O có thể ảnh hưởng nền |
| React state updates | Có (re-render) | Có | Re-render cascade |
| Component mounting | Có (shell) | Có | Mount cost 10–30ms |
| Layout measurement | Có | Có | Layout pass |
| TanStack Query `setQueryData` | Defer qua `scheduleTransitionTask` | Không có queueing | Prefetch resolve → setQueryData có thể chạy trong transition (Root stack) |

**Root stack:** Không có `transitionStart` → `setTransitionQueueing(true)` không bao giờ chạy → `isTransitionQueueing()` luôn false → `scheduleTransitionTask` không queue, chạy ngay. Prefetch resolve trong transition (Root) → `setQueryData` chạy ngay → re-render.

---

## 5. JS Thread vs UI Thread Contention

### Phân bố thực thi

| Thành phần | Thread | Ghi chú |
|------------|--------|---------|
| Spring animation (progress) | Native/UI | Animated với useNativeDriver |
| Card transform apply | Native/UI | Animated nodes |
| `progress.addListener` callback | **JS** | Mỗi frame |
| `runOnUI(transitionProgress.value = v)` | Bridge → UI | Mỗi frame |
| `cardStyleInterpolator` | **JS** | Mỗi lần Card re-render |
| Card re-render | **JS** | Mỗi frame (progress thay đổi) |
| ParallaxDriver `useAnimatedStyle` | UI (worklet) | Đọc SharedValue |
| Zustand `set()` | **JS** | Khi có update |
| Persist `JSON.stringify` | **JS** | Sync, block |
| `router.push()` | **JS** | Sync |
| New screen mount | **JS** | Sync với push |

### Bridge sync

- `progress.addListener`: native → JS mỗi frame.
- `runOnUI`: JS → UI mỗi frame (để cập nhật SharedValue).

### Rủi ro block JS

- Card re-render mỗi frame.
- Persist `JSON.stringify` khi `set()`.
- Mount màn mới (hooks, layout).
- `transitionEnd` callback (nhiều logic trong một tick).

### Overlap commit phase với animation

- React commit phase (layout, effect) có thể trùng với frame animation.
- `transitionEnd` chạy trong commit phase → có thể trùng với frame cuối.

---

## 6. Mount Timing Analysis

### Thứ tự thực tế

```
T0:    router.push()
T0:    React Navigation bắt đầu transition
T0:    Màn mới mount (shell)
T0:    transitionStart (Home/Menu) → createInteractionHandle, setTransitionQueueing(true)
T0+?:  Card re-render mỗi frame (progress)
T0+?:  TransitionProgressSyncer listener mỗi frame
T250:  Spring kết thúc (ước lượng)
T250:  transitionEnd (Home/Menu)
T250:  clearInteractionHandle → runAfterInteractions fire
T250:  MenuItemDetailContent callback chạy → setTimeout(50)
T300:  setContentReady(true) → mount ProductImageCarousel, SliderRelatedProducts
T350:  scheduleFlush → flush queue (addOrderingItem, setQueryData, ...)
```

### Vì sao có stutter cuối transition

1. **transitionEnd chạy nhiều việc:** clear handle, unlock, `runOnUI`, `setTransitionQueueing(false)`, `scheduleFlush`, `clearPreload` — có thể 2–5ms.
2. **runAfterInteractions fire ngay:** callback của `MenuItemDetailContent` chạy trong cùng tick hoặc tick kế.
3. **50ms vẫn gần transition:** 50ms ≈ 3 frame. Nếu `transitionEnd` fire sớm hơn animation thực tế 1–2 frame → mount có thể trùng với frame cuối.
4. **Flush 100ms sau:** Nhiều `set()` + persist → spike 20–50ms, có thể gây micro-stutter ngay sau khi màn ổn định.

---

## 7. Navigation Stack Architecture

### Phân loại: **C — Hybrid (vùng nguy hiểm)**

| Thành phần | Owner | Thread |
|------------|-------|--------|
| Animation driver | @react-navigation/stack | Native |
| Card transform | Animated (native driver) | Native |
| Card component | React | **JS** |
| Progress sync | TransitionProgressSyncer | **JS** (listener) + Bridge |
| Parallax | Reanimated worklet | UI |
| Unlock | Mixed (event + time) | JS |

### Failure modes

1. **JS block trong transition:** Card re-render + listener + mount → JS bận → frame drop.
2. **Unlock sai thời điểm:** Time-based unlock có thể sớm (double-tap) hoặc muộn (cảm giác lag).
3. **Progress sync thừa:** Parallax cần progress trên UI thread, nhưng đang sync qua JS mỗi frame.
4. **Persist không kiểm soát:** Mọi `set()` không qua `scheduleStoreUpdate` đều gây `JSON.stringify` ngay.

---

## 8. Persistence & Serialization Impact

### Tần suất

- Mỗi `set()` trên store có persist → 1 lần serialize.
- `order-flow.store`: `addOrderingItem`, `updateOrderingItemQuantity`, v.v. → rất nhiều lần khi user thao tác.

### Kích thước payload

- `orderingData`: orderItems (slug, image, variants, promotion, …) → có thể 10–50KB với 10–20 item.
- `JSON.stringify` 10–50KB: 5–20ms trên máy trung bình.

### Trùng với animation

- Các action dùng `scheduleStoreUpdate`: defer → an toàn.
- Các action không dùng: `set()` ngay → persist ngay → có thể trùng frame animation.
- Flush queue: nhiều `set()` liên tiếp 100ms sau transitionEnd → spike rõ.

### Micro-stutter khi FPS ổn

- Serialization 5–10ms có thể không đủ làm FPS monitor báo drop, nhưng vẫn gây jank nhẹ.
- Nhiều store persist → nhiều serialize song song hoặc nối tiếp → tổng thời gian tăng.

---

## 9. Telegram Gap Analysis

### Telegram (kiến trúc mức cao)

| Khía cạnh | Telegram | App hiện tại |
|-----------|----------|--------------|
| **Transition ownership** | Native (UIKit/Android) là chủ | JS Stack, React component, nhiều owner |
| **Animation thread** | 100% UI thread | Native driver + JS listener + Card re-render |
| **Progress** | Native interpolate, không qua JS | Syncer kéo value về JS mỗi frame |
| **Completion** | Native animation completion callback | `transitionEnd` (một phần) + timeout |
| **Mount** | AsyncDisplayKit/Texture — node chuẩn bị off main thread | Mount sync, defer qua runAfterInteractions |
| **Persistence** | Có thể batch, background | Mỗi `set()` → sync serialize |
| **Stack** | Native UINavigationController / Fragment | @react-navigation/stack (JS) |

### Khác biệt cốt lõi

1. **Single authority:** Telegram dùng native stack → một hệ thống điều khiển toàn bộ transition.
2. **Không có JS mỗi frame:** Animation và interpolate chạy hoàn toàn trên UI thread.
3. **Event-based completion:** Native báo khi animation xong, không dùng timeout.
4. **Deferred mount:** Texture/AsyncDisplayKit chuẩn bị node off main thread.
5. **Persistence tách biệt:** Serialization có thể batch hoặc chạy nền, không gắn trực tiếp với `set()`.

---

## 10. Required Architectural Shift

### Không phải micro-optimization

Cần thay đổi kiến trúc, không chỉ thêm memo hay tune spring.

### 10.1 Single Transition Authority

- **Mục tiêu:** Một nơi duy nhất biết transition đã kết thúc.
- **Hướng:** Mọi stack đều dùng `screenListeners` (transitionEnd). Bỏ unlock bằng timeout; timeout chỉ dùng làm failsafe khi không có event.
- **Cách làm:** Root, Auth, Profile, Payment, UpdateOrder dùng wrapper tương tự `StackWithMasterTransition` để nhận `transitionEnd` và unlock.

### 10.2 Bỏ Progress Sync Qua JS

- **Mục tiêu:** Parallax không cần kéo progress về JS mỗi frame.
- **Hướng:** Dùng cơ chế native-only để lái parallax. Ví dụ: Reanimated `useAnimatedProps` với prop từ native, hoặc custom native module truyền progress trực tiếp lên UI thread.
- **Cách làm:** Loại bỏ `progress.addListener`; tìm cách đồng bộ progress native → SharedValue mà không qua JS.

### 10.3 Giảm Card Re-render Mỗi Frame

- **Mục tiêu:** Card không re-render mỗi khi progress thay đổi.
- **Hướng:** Dùng Native Stack cho các stack không cần parallax (Root, Auth, Profile, Payment, UpdateOrder) → transition chạy native, không có Card React.
- **Hoặc:** Dùng `react-native-screens` native stack với custom transition; hoặc thư viện stack mới chạy animation hoàn toàn trên native.

### 10.4 Persist Không Block

- **Mục tiêu:** `JSON.stringify` và `setItem` không chạy sync trong tick của `set()`.
- **Hướng:** Persist middleware: queue thay vì serialize ngay; flush khi idle hoặc sau transition.
- **Cách làm:** Custom persist middleware: `set()` → đẩy state vào queue → `requestIdleCallback` hoặc `setTimeout` → serialize + `setItem`.

### 10.5 Mount Tách Khỏi Transition

- **Mục tiêu:** Màn mới không mount nặng trong lúc transition.
- **Hướng:** Chỉ mount skeleton tối thiểu khi push; mount content đầy đủ sau transitionEnd + delay.
- **Cách làm:** Layout wrapper: khi push chỉ render placeholder; sau transitionEnd + 50–100ms mới render `MenuItemDetailContent` đầy đủ.

---

## Tóm tắt

| Blocker | Nguyên nhân | Hướng xử lý |
|---------|-------------|-------------|
| **Ownership split** | Event vs time-based unlock, chỉ một phần stack dùng event | Mọi stack dùng transitionEnd, timeout chỉ failsafe |
| **Progress qua JS** | `addListener` mỗi frame | Đồng bộ progress native → UI, bỏ listener |
| **Card re-render** | Card là React component, interpolator chạy mỗi frame | Native Stack hoặc stack animation native-only |
| **Persist sync** | Mỗi `set()` → `JSON.stringify` ngay | Persist queue + flush idle/after transition |
| **Mount trong transition** | Màn mới mount ngay khi push | Chỉ mount shell, content mount sau transitionEnd |

Những thay đổi trên là thay đổi kiến trúc, không phải tối ưu nhỏ. Chúng đòi hỏi refactor navigation, persist và mount strategy.
