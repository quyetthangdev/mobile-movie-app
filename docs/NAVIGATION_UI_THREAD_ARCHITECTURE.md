# Navigation UI-Thread Architecture — Loại bỏ phụ thuộc JS trước transition

**Ngày:** 2025-03-02  
**Mục tiêu:** Animation bắt đầu KHÔNG chờ JS thread.

---

## 1. PHÂN TÍCH FLOW HIỆN TẠI

```
Gesture.Tap.onStart (worklet, UI thread)
    → runOnJS(triggerAction)()     ← GATE: chờ JS thread rảnh
    → triggerAction() chạy
    → isNavigationLocked()? return
    → router.push(href)
    → React reconciliation
    → Native Stack animation start
```

**Vấn đề:** `runOnJS` đưa callback vào JS queue. Nếu JS đang bận (list render, Zustand, layout) → callback chờ → tap "đơ".

---

## 2. RÀNG BUỘC KIẾN TRÚC

| Ràng buộc | Lý do |
|-----------|-------|
| **Navigation state ở JS** | React Navigation / Expo Router quản lý state trong React |
| **router.push() là JS** | Cập nhật state → reconciliation → native view |
| **Không thể push từ UI thread thuần** | Native stack nhận children từ React tree |

**Kết luận:** Không thể bắt đầu transition 100% từ UI thread mà không chạm JS. **Nhưng** có thể:
1. Giảm số lần runOnJS (gate trước khi gọi)
2. Chạy JS **đồng bộ** khi native gọi (JSI) thay vì chờ queue

---

## 3. TARGET FLOW

### Option A: SharedValue lock gate (đã implement)

```
Gesture.onStart (worklet)
    → if (isLockedShared.value === 1) return   ← KHÔNG runOnJS
    → runOnJS(triggerAction)()
    → ...
```

**Lợi ích:** Tránh runOnJS khi locked → giảm queue clogging, không tốn JS slice cho tap sẽ bị drop.

### Option B: Native module + JSI sync (full solution)

```
Gesture (native RNGH) 
    → Native handler gọi NavigationTrigger.triggerPush(href)
    → Native module dùng JSI gọi JS callback ĐỒNG BỘ
    → JS chạy ngay (không qua queue)
    → router.push(href)
    → animation start
```

**Lợi ích:** JS chạy **ngay khi native gọi** — không chờ JS thread xử lý queue. Native "interrupt" JS.

### Option C: Pressable (fallback)

```
Touch (native) → Bridge → JS responder → onPress
```

**Nhược điểm:** Vẫn qua JS queue. Có thể chậm hơn Gesture Handler. Chỉ dùng khi không cần gesture conflict resolution (ScrollView).

---

## 4. TẠI SAO GIẢI PHÁP LOẠI BỎ START LATENCY

### SharedValue lock gate

| Trước | Sau |
|-------|-----|
| Mọi tap → runOnJS | Chỉ tap khi unlocked → runOnJS |
| Tap khi locked: runOnJS → lock check → return | Tap khi locked: worklet check → return (0 runOnJS) |

**Giảm:** Số lần runOnJS khi user tap nhanh / double-tap. Queue ít bị block bởi callback vô ích.

### JSI sync call

| Trước | Sau |
|-------|-----|
| runOnJS → queue → chờ JS rảnh | Native → JSI sync → JS chạy ngay |
| JS đang render list → callback chờ | Native gọi → JS chạy ngay (interrupt) |

**Loại bỏ:** Sự phụ thuộc vào "JS thread rảnh". Navigation luôn chạy ngay khi tap.

---

## 5. KIẾN TRÚC NATIVE MODULE (Option B)

### 5.1 Native module spec

```
NavigationTrigger (Turbo Module / Native Module)
├── setPushCallback(callback: (href: string, type: 'push'|'replace'|'back') => void)
│   └── JS đăng ký callback khi app mount
└── trigger(type: string, href?: string)
    └── Native gọi → JSI invoke callback sync
```

### 5.2 Native component (optional)

```
NativeNavigationTouchable
├── Props: href, type, children
├── Native touch handler
└── On tap → NavigationTrigger.trigger('push', href)
```

### 5.3 Integration với RNGH

RNGH gesture chạy worklet. Worklet không gọi native module tùy ý. Cần 1 trong 2:

1. **Custom native touchable** thay GestureDetector — nhận touch native, gọi module.
2. **RNGH native callback** — nếu RNGH hỗ trợ đăng ký native callback khi gesture activate (cần kiểm tra API).

### 5.4 Expo module structure

```
modules/navigation-trigger/
├── android/
│   └── NavigationTriggerModule.kt
├── ios/
│   └── NavigationTriggerModule.m
├── src/
│   └── index.ts
└── expo-module.config.json
```

---

## 6. MIGRATION STEPS

### Phase 1: SharedValue lock gate ✅ (đã implement)

1. `lib/navigation/navigation-lock-shared.ts` — `isLockedShared` (makeMutable)
2. `navigation-lock.ts` — sync `isLockedShared.value` khi lock/unlock
3. `native-gesture-pressable.tsx` — worklet check `isLockedShared.value === 1` trước runOnJS

### Phase 2: Minimal callback ✅ (đã implement)

- `executeNavFromGesture(type, href)` — single call, không lock check (đã check ở worklet), không console
- `triggerAction` gọi trực tiếp `executeNavFromGesture` — 1 call thay vì 3 nhánh navigateNative
- Bỏ `console.count` trong navigation-engine (chỉ giữ `console.log` khi blocked)

### Phase 3: Native module ✅ (đã implement)

1. `modules/navigation-trigger` — Expo module với native touchable view
2. `NavigationTriggerView` — Android: setOnClickListener, iOS: UITapGestureRecognizer
3. `NativeNavigationTouchable` — component dùng thay NativeGesturePressable
4. Touch native → EventDispatcher → onPress → executeNavFromGesture

**Migration:** Thay `NativeGesturePressable` bằng `NativeNavigationTouchable` khi cần.

---

## 7. SO SÁNH

| Approach | Start latency | Effort | Phụ thuộc |
|----------|---------------|--------|------------|
| Hiện tại (runOnJS) | 0–100ms+ (JS queue) | — | JS rảnh |
| SharedValue gate | Giảm runOnJS khi locked | Low | Vẫn runOnJS khi unlock |
| JSI sync | ~0ms (sync invoke) | High | Native module |
| Pressable | Tương tự hoặc chậm hơn | Low | JS queue |

---

## 8. KHUYẾN NGHỊ

1. **Ngay:** Áp dụng Phase 1 (SharedValue gate) — giảm queue pressure.
2. **Khi cần:** Phase 3 nếu đo được start latency >30ms thường xuyên.
3. **Không:** Dùng Pressable thay Gesture.Tap cho navigation — không cải thiện, có thể tệ hơn (gesture conflict).
