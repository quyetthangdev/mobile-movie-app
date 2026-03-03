# React Native — Transition Stutter Root Cause Audit

**Ngày:** 2025-03-01  
**Luồng:** Menu List → Menu Item Detail  
**Mục tiêu:** Xác định frame spike gây cảm giác khựng (FPS 70–120 nhưng vẫn stutter).

---

## A. EXACT STUTTER TIMING WINDOW

| Window         | Thời điểm        | Sự kiện                                                                                             |
| -------------- | ---------------- | --------------------------------------------------------------------------------------------------- |
| **T0**         | 0ms              | Tap → `router.push` → `transitionStart`                                                             |
| **T0–50ms**    | Tap + mount      | `MenuItemDetailPage` mount, `MenuItemSkeletonShell`, `useRunAfterTransition` schedule               |
| **T0–220ms**   | Trong transition | Native slide animation (UI thread). JS: list vẫn mount (freezeOnBlur), transition task queue active |
| **T220ms**     | transitionEnd    | `clearInteractionHandle` → `runAfterInteractions` fire                                              |
| **T220+100ms** | Android          | `androidDelayMs: 100` → `setReady(true)`                                                            |
| **T320ms**     | Content mount    | `MenuItemDetailContent` mount — **SPIKE WINDOW**                                                    |
| **T320–400ms** | Post-mount       | useEffects, useQuery hydration, ProductImageCarousel, Zustand updates                               |
| **T920ms**     | Stutter 4        | `SliderRelatedProducts` mount (defer 600ms từ content mount)                                        |

**Stutter xảy ra chủ yếu:** T320–400ms (ngay sau content mount).

---

## B. TOP BLOCKING OPERATIONS (RANKED)

### 1. MenuItemDetailContent mount — **~15–40ms** (ước lượng)

| Thành phần                   | Chi phí | Đồng bộ                                                                   |
| ---------------------------- | ------- | ------------------------------------------------------------------------- |
| **useSpecificMenuItem**      | 2–5ms   | useQuery chạy ngay (không `enabled`), cache lookup + có thể fetch         |
| **6× useOrderFlowStore**     | 1–2ms   | 6 selector subscriptions                                                  |
| **useUserStore**             | <1ms    | 1 selector                                                                |
| **useMemo (initialVariant)** | 1–3ms   | reduce trên variants                                                      |
| **ProductImageCarousel**     | 5–15ms  | FlatList mount, PaginationDot (Reanimated), RN `Image` (không expo-image) |
| **expo-image (hero)**        | 2–5ms   | Decode có thể block nếu chưa cache                                        |
| **GestureScrollView**        | 2–5ms   | Layout                                                                    |
| **Nested components**        | 5–10ms  | NonPropQuantitySelector, Badge, Button, v.v.                              |

**Tổng ước lượng:** 20–50ms → **1–3 frame drop** (16.67ms/frame @ 60fps).

### 2. Zustand `initializeOrdering()` — **~5–15ms**

- `set()` đồng bộ → notify tất cả subscribers
- **FloatingCartButton** re-render (selector `getCartItemCount`)
- **ClientMenuItems** (list phía sau) — 4–20 items subscribe `orderingData`, `currentStep`
- `freezeOnBlur: true` có thể giảm nhưng không loại bỏ hoàn toàn

Chạy trong `setTimeout(0)` → tick sau mount, nhưng vẫn trong ~50ms đầu.

### 3. TanStack Query hydration / cache write

- `useSpecificMenuItem`: nếu prefetch xong, `setQueryData` có thể chạy qua `scheduleTransitionTask` (queue)
- Khi content mount: `useQuery` đọc cache → có thể trigger reconciliation
- **Query cache read** đồng bộ khi component render

### 4. ProductImageCarousel — FlatList + Reanimated

- **FlatList** mount: `initialNumToRender={1}` nhưng vẫn measure layout
- **PaginationDot** × N: mỗi dot có `useSharedValue`, `useAnimatedStyle`, `withTiming` trong useEffect
- **RN Image** (không phải expo-image): decode trên JS thread nếu chưa cached

### 5. Layout recalculation

- `screenWidth - 32` cho image container
- `GestureScrollView` measure children
- Nhiều View lồng nhau → layout pass

---

## C. INTERACTIONMANAGER RELIABILITY CHECK

### Cơ chế hiện tại

```
transitionStart → createInteractionHandle()
transitionEnd   → clearInteractionHandle() → runAfterInteractions callbacks
```

### Vấn đề đã biết (Android)

- **Native driver animations:** Một số báo cáo cho thấy `runAfterInteractions` có thể fire sớm khi dùng native driver.
- **Trong app này:** Handle được clear thủ công trong `transitionEnd` → timing phụ thuộc **khi native stack fire `transitionEnd`**.
- **Ước lượng lệch:** 0–50ms. Nếu `transitionEnd` fire trước khi animation thực sự kết thúc (compositor) → content mount trong lúc 1–2 frame cuối vẫn đang vẽ → **stutter cuối transition**.

### Tại sao vẫn drop frame dù defer đúng

1. **Content mount cost:** Dù mount sau transition, bản thân mount tốn 20–50ms → block JS → frame tiếp theo bị trễ.
2. **Animation tail:** Nếu `transitionEnd` fire đúng lúc, vài frame cuối animation vẫn chạy. JS spike (mount) xảy ra ngay sau → bridge/JS có thể block frame cuối.
3. **Perf Monitor vs rAF:** Perf Monitor đo UI thread (cao). rAF/Transition FPS Monitor đo JS thread (thấp khi block). Một frame drop trên JS vẫn gây stutter nhận biết được.

---

## D. JS THREAD COMPETITION AUDIT

### Đồng bộ trong 0–400ms sau navigation start

| Task                                                                    | Sync? | Ước lượng                                         |
| ----------------------------------------------------------------------- | ----- | ------------------------------------------------- |
| `MenuItemDetailPage` + Skeleton mount                                   | ✅    | 5–10ms                                            |
| `useRunAfterTransition` useEffect                                       | ✅    | <1ms                                              |
| **transitionEnd** → clearHandle, setTransitionQueueing(false)           | ✅    | 1–2ms                                             |
| **Transition task queue flush**                                         | ✅    | FLUSH_DELAY_MS 100 → chạy 100ms sau transitionEnd |
| **runAfterInteractions** callback                                       | ✅    | Trong setImmediate batch                          |
| **setReady(true)** (sau androidDelayMs)                                 | ✅    | 1ms                                               |
| **MenuItemDetailContent** mount                                         | ✅    | **20–50ms**                                       |
| useEffects (SliderRelatedProducts timer, initializeOrdering setTimeout) | ✅    | <1ms schedule                                     |
| **setTimeout(0) callback** — initializeOrdering                         | ✅    | 5–15ms (Zustand set + re-renders)                 |
| **ProductImageCarousel** FlatList measurement                           | ✅    | 5–10ms                                            |
| **PaginationDot** useEffects (withTiming)                               | ✅    | 2–5ms                                             |
| **Query cache read** (useSpecificMenuItem)                              | ✅    | 1–5ms                                             |

### Blocking >8ms

1. **MenuItemDetailContent mount** — 20–50ms
2. **initializeOrdering** (setTimeout 0) — 5–15ms
3. **ProductImageCarousel** — 5–15ms

---

## E. MOUNT COST ANALYSIS — MenuItemDetailContent

### Cây component (ước lượng)

```
MenuItemDetailContent
├── 6× useOrderFlowStore, 1× useUserStore, useSpecificMenuItem
├── useMemo (initialVariant) — reduce
├── ScreenContainer
├── Header (View, TouchableOpacity, Image)
├── GestureScrollView
│   ├── View (image container)
│   │   ├── expo-image (hero)
│   │   └── ProductImageCarousel ← FlatList, PaginationDot×N, RN Image
│   ├── View (product info)
│   │   ├── variants.map (size buttons)
│   │   ├── NonPropQuantitySelector
│   │   └── ...
│   └── SliderRelatedProducts (defer 600ms)
└── Fixed bottom (Button×2)
```

### Heavy hooks

- `useSpecificMenuItem`: useQuery không `enabled` → chạy ngay
- `ProductImageCarousel`: FlatList, Reanimated (PaginationDot)
- `cartItemCount` selector: `reduce` trên orderItems mỗi render

### Ước lượng mount duration

**30–60ms** trên thiết bị trung bình → **2–4 frame drop**.

---

## F. TRANSITION TAIL PROBLEM

### Chuỗi sự kiện

```
Animation ends (native)
    → transitionEnd fires
    → clearInteractionHandle
    → runAfterInteractions callbacks (same tick or next)
    → +100ms (Android)
    → setReady(true)
    → MenuItemDetailContent mount
    → JS spike 30–60ms
    → 2–4 frames dropped
```

### Tại sao vẫn thấy stutter dù FPS monitor cao

1. **UI thread vs JS thread:** Perf Monitor chủ yếu phản ánh UI thread. Animation chạy native → UI ổn. JS block không làm animation dừng nhưng làm **frame tiếp theo** (hoặc frame cuối) bị trễ.
2. **Micro-stutter:** Một vài frame drop (2–4) trong 400ms vẫn đủ để người dùng nhận ra “khựng”.
3. **Transition tail:** Nếu content mount đúng lúc 1–2 frame cuối của animation, hoặc ngay sau, cảm giác “kết thúc không mượt” rõ rệt.

---

## G. RECOMMENDED FIXES

### SAFE FIXES (delay, scheduling, chunking)

| #   | Fix                                   | Mô tả                                                                    | Ước lượng impact                            |
| --- | ------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------- |
| 1   | **Tăng androidDelayMs**               | 100 → 150–200ms                                                          | Tách content mount xa transition tail       |
| 2   | **Defer ProductImageCarousel**        | `useState(false)` + `useEffect(() => setShowCarousel(true), 0)` hoặc rAF | Giảm 5–15ms trong frame đầu                 |
| 3   | **initializeOrdering delay**          | `setTimeout(run, 50)` thay vì 0                                          | Tách Zustand spike khỏi mount frame         |
| 4   | **useSpecificMenuItem enabled**       | `enabled: !!slug && ready` — chỉ chạy khi content đã mount               | Tránh query chạy sớm (đã defer qua content) |
| 5   | **ProductImageCarousel → expo-image** | Thay RN Image bằng expo-image                                            | Decode tốt hơn, ít block JS                 |
| 6   | **PaginationDot defer**               | Mount dots sau 1 frame (rAF)                                             | Giảm Reanimated work trong frame đầu        |

### ADVANCED FIXES (frame splitting, idle hydration)

| #   | Fix                                                   | Mô tả                                                                                                                 |
| --- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 7   | **requestIdleCallback**                               | Defer SliderRelatedProducts, ProductImageCarousel qua idle callback (polyfill cho RN)                                 |
| 8   | **InteractionManager.runAfterInteractions** lồng nhau | Content mount → rAI → sau đó mount ProductImageCarousel                                                               |
| 9   | **React.startTransition**                             | Bọc setReady trong startTransition (nếu RN hỗ trợ) để ưu tiên animation                                               |
| 10  | **FloatingCartButton selector**                       | Dùng `(s) => s.orderingData?.orderItems?.length ?? 0` thay vì `getCartItemCount()` để tránh re-render không cần thiết |

---

## H. PRIORITY ORDER

1. **Defer ProductImageCarousel** (Safe #2) — dễ, impact trung bình
2. **initializeOrdering delay 50ms** (Safe #3) — dễ, tách spike
3. **Tăng androidDelayMs 150** (Safe #1) — dễ, có thể tăng độ trễ nhận biết
4. **ProductImageCarousel expo-image** (Safe #5) — trung bình
5. **PaginationDot defer** (Safe #6) — dễ

---

## I. CHECKLIST TÓM TẮT

| Vấn đề             | Đã xác định                                               |
| ------------------ | --------------------------------------------------------- |
| Stutter timing     | T320–400ms (content mount + effects)                      |
| Top blocker        | MenuItemDetailContent mount (20–50ms)                     |
| InteractionManager | Phụ thuộc transitionEnd; Android có thể lệch 0–50ms       |
| Transition tail    | Content mount ngay sau animation → spike → 2–4 frame drop |
| Nguyên tắc         | Frame consistency > peak FPS                              |
