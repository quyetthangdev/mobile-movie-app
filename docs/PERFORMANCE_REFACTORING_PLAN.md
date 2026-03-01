# Performance Refactoring Plan — Telegram-Level Responsiveness

**Mục tiêu:** <16ms tap response, 60 FPS animations trên Android.

**Vấn đề hiện tại:**
1. Tap conflict — tap đầu tiên bị ignore (log: Gesture handler is already enabled for a parent view)
2. Animation jank — transition giật, dropped frames
3. Require cycle warnings — stores ↔ utils ↔ api

---

## 1. Require Cycle Audit

### 1.1 Chuỗi phụ thuộc phát hiện

```
utils/http.ts     → stores (useAuthStore, useUserStore)
utils/auth-helpers → stores (useUserStore, useAuthStore)
utils/cart.ts     → stores (useCartItemStore)
utils/download-pdf → stores (useDownloadStore)

api/order.ts      → stores (useDownloadStore), utils (http)
api/chef-area.ts  → stores (useDownloadStore), utils (http)
api/*             → utils (http)

stores/cart.store → utils (showToast, setupAutoClearCart, createSafeStorage)
stores/gift-card.store → utils (showToast)
stores/update-order.store → utils (showToast)

hooks/*           → api, stores, utils
```

### 1.2 Cycle chính

**Cycle 1: utils ↔ stores**
- `utils/http.ts` import `useAuthStore, useUserStore` từ stores
- `stores/cart.store` import `showToast, setupAutoClearCart` từ utils
- Khi screen mount → import stores → cart.store load → import utils → http load → import stores (chưa init xong)

**Cycle 2: api → stores → utils → (api dùng utils)**
- `api/order.ts` import `useDownloadStore` (stores) và `http` (utils)
- `utils/http` import stores
- stores import utils

### 1.3 Cách cycle block JS thread

1. **Lúc app start / navigation:** Screen mới mount → React cần resolve imports
2. **Module loader** chạy đồng bộ: A load → B load → C load → A (chưa xong)
3. **Kết quả:** JS thread block trong lúc resolve cycle — có thể 10–50ms+
4. **Trong lúc transition:** Frame budget 16ms. Nếu module load mất 20ms → drop 1–2 frames
5. **Thêm:** Các module trong cycle thường có side effects (store init, axios interceptors) → càng nặng

### 1.4 Fix đề xuất

| Ưu tiên | Hành động | File |
|---------|-----------|------|
| 1 | Tách `http` khỏi phụ thuộc stores — inject token qua interceptor từ bên ngoài | utils/http.ts |
| 2 | Tách `showToast` ra module độc lập (vd. `utils/toast.ts`) — stores chỉ import toast | utils/toast.ts |
| 3 | `api/order.ts`, `api/chef-area.ts` — dùng dynamic import cho useDownloadStore khi cần | api/*.ts |
| 4 | `utils/auth-helpers` — tránh import stores trực tiếp; nhận auth state qua param | utils/auth-helpers.ts |

**Chi tiết fix http.ts:**
- Tạo `createHttpClient(getToken: () => string | null)` — factory nhận token getter
- App bootstrap: gọi `createHttpClient(() => useAuthStore.getState().token)` sau khi stores ready
- http.ts không import stores

---

## 2. Gesture Handler Conflicts

### 2.1 Tại sao `simultaneousWithExternalGesture(Gesture.Native())` không hiệu quả

**Cách `simultaneousWithExternalGesture` hoạt động:**
- Cần **ref** của gesture bên ngoài — phải trỏ tới gesture đã gắn vào GestureDetector
- Quan hệ chỉ có hiệu lực khi `other` gesture **được nhận diện** bởi RNGH

**Vấn đề với `Gesture.Native()`:**
- `Gesture.Native()` tạo gesture object, **không gắn với view cụ thể** nếu không dùng đúng
- Theo RNGH docs: Native gesture phải wrap **native component** (ScrollView, View) — phải là **direct child** của GestureDetector
- Gọi `simultaneousWithExternalGesture(Gesture.Native())` mà không wrap view → gesture không có handler tương ứng
- Stack's PanGestureHandler **không phải** RNGH Gesture object — là handler nội bộ của React Navigation, không expose ref

**Kết luận:** `Gesture.Native()` không trỏ tới Stack's Pan → không thiết lập được quan hệ → conflict vẫn xảy ra.

### 2.2 Cách ưu tiên Tap đúng

**Option A: `gestureResponseDistance` (đã áp dụng)**
- Giảm vùng kích hoạt swipe-back (vd. 50px từ cạnh trái)
- Tap ngoài vùng → Stack Pan không nhận → Tap có cơ hội
- **Hạn chế:** Nút gần cạnh trái vẫn dễ conflict

**Option B: `blocksExternalGesture` (lý tưởng nhưng không khả thi)**
- Cần ref của Stack's Pan — không có API
- Có thể thử fork/custom Stack để expose ref (effort cao)

**Option C: Defer mount content có gesture**
- `useRunAfterTransition` + `androidDelayMs` — mount content sau khi transition xong
- Tránh attach gesture handlers trong lúc Stack's Pan đang active
- **Đã áp dụng** cho menu/[slug]

**Option D: Dùng Pressable thay Gesture.Tap cho một số nút**
- Pressable (RNGH) có thể tương tác khác với Stack
- Thử cho nút back / nút gần edge — so sánh với NativeGesturePressable

### 2.3 Refactor đề xuất

1. **Giữ `gestureResponseDistance = 50`** — đã giảm conflict
2. **Áp dụng `androidDelayMs`** cho màn có nhiều NativeGesturePressable
3. **Không dùng** `simultaneousWithExternalGesture(Gesture.Native())` — bỏ hẳn
4. **Thử Native Stack** nếu vẫn conflict — animation native, gesture hierarchy khác

---

## 3. UI/JS Thread Analysis

### 3.1 Hai hệ thống animation

**Hệ thống 1: Card transition (Stack) — JS thread**
- `forVelocityDrivenHorizontal` trong `velocity-driven-transition.tsx`
- Dùng **React Native Animated** (`current.progress.interpolate`)
- `progress` là Animated.Value từ Stack — drive bởi PanGestureHandler
- Mỗi frame: gesture (native) → progress update → **JS** chạy interpolator → trả style → apply lên view
- **Interpolation chạy trên JS** → dễ jank khi JS bận

**Hệ thống 2: MasterTransitionProvider — UI thread**
- `transitionStart` listener → `runOnUI(() => { withSpring(...) })`
- `transitionProgress`, `isTransitioning` là SharedValue
- `withSpring` chạy trên **UI thread** (Reanimated worklet)
- `[MasterTransition] transitionStart` log từ **JS** (runOnJS), nhưng spring chạy trên **UI**
- **ParallaxDriverProvider** dùng `transitionProgress` → UI thread

### 3.2 Phân tích log `[MasterTransition] transitionStart`

- Log in ra từ **JS thread** (callback của screen listener)
- Ngay sau đó: `runOnUI(...)()` → schedule worklet lên **UI thread**
- Spring animation chạy trên **UI thread** — không block JS
- **MasterTransitionProvider không phải nguồn jank** — đã offload đúng

### 3.3 Nguồn jank thực sự

| Thành phần | Thread | Ghi chú |
|------------|--------|---------|
| **cardStyleInterpolator** | JS | Interpolation mỗi frame trên JS |
| **MasterTransitionProvider** | UI | withSpring trên UI |
| **NativeGesturePressable** | UI (worklet) + JS (runOnJS) | onBegin/onStart worklet; triggerAction runOnJS |
| **Gesture handler attach** | Native + Bridge | "already enabled" log — có thể gây work trên native |

**Bottleneck chính:** `forVelocityDrivenHorizontal` — interpolation trên JS mỗi frame.

### 3.4 Hướng cải thiện

**Ngắn hạn:**
- Giảm JS work trong lúc transition: defer content mount, fix require cycles
- Đảm bảo không có heavy useEffect/query chạy trong lúc animation

**Dài hạn:**
- **Chuyển sang Native Stack** — card animation chạy native, không qua JS
- Hoặc **custom transition dùng Reanimated** — thay cardStyleInterpolator bằng Reanimated SharedValue + useAnimatedStyle (nếu Stack hỗ trợ)

---

## 4. Refactoring Plan — Thứ tự thực hiện

### Phase 1: Require cycle (1–2 ngày)
1. Tách token logic khỏi `utils/http.ts` — inject qua factory
2. Tách `showToast` — stores chỉ import từ `utils/toast`
3. Kiểm tra `madge` hoặc `dpdm` để verify không còn cycle

### Phase 2: Gesture (đã phần lớn xong)
1. Giữ `gestureResponseDistance = 50`
2. Áp dụng `androidDelayMs` cho các màn nặng
3. Bỏ mọi `simultaneousWithExternalGesture(Gesture.Native())`

### Phase 3: Animation (2–3 ngày)
1. Thử `TransitionPresets.SlideFromRightIOS` hoặc `forHorizontalSlide` — so sánh FPS
2. Nếu vẫn jank: đánh giá chuyển Native Stack
3. Profile với React DevTools / Flipper — xác nhận frame drops

### Phase 4: Verify
1. Build release, test trên thiết bị Android thật
2. Perf Monitor: FPS trong lúc transition
3. Log timing: `[MasterTransition] transitionStart` → `[Physics] spring settled` — nên <400ms

---

## 5. Tóm tắt bottlenecks

| Bottleneck | Thread | Impact | Fix |
|------------|--------|--------|-----|
| Require cycles | JS (sync load) | Block 10–50ms+ khi mount | Tách deps, dynamic import |
| cardStyleInterpolator | JS (mỗi frame) | Jank nếu JS bận | Native Stack hoặc Reanimated transition |
| Gesture conflict | Native | Tap bị drop | gestureResponseDistance, androidDelayMs |
| Content mount timing | JS | Gesture attach trong transition | useRunAfterTransition + androidDelayMs |
