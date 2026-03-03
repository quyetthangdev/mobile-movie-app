# React Native Transition Speed Calibration Audit

**Ngày:** 2025-03-01  
**Mục tiêu:** Tăng perceived responsiveness ~10–20%, giữ smoothness và stability.

---

## A. CURRENT SPEED DIAGNOSIS

### 1. Real Transition Duration

| Thành phần | Giá trị hiện tại | Ghi chú |
|------------|------------------|---------|
| **Stack (Native Stack)** | **~350ms** (iOS default) | `nativeStackScreenOptions` **không có** `animationDuration` |
| **stackScreenOptions** (navigation.config) | 230ms | **KHÔNG ĐƯỢC SỬ DỤNG** — toàn bộ layout dùng `nativeStackScreenOptions` |
| **Tabs** | 230ms | `tabsScreenOptions` dùng `transitionSpec` với Easing.bezier(0.4, 0, 0.2, 1) |
| **Transition Lock** | 320ms + 200ms buffer | `STACK_ANIMATION_MS` trong navigation-engine.ts |

**Kết luận:** Transition **khách quan chậm** — iOS default 350ms vs target Telegram-level 200–240ms.

---

### 2. Phát hiện quan trọng: animationDuration không áp dụng cho slide_from_right

Theo [React Navigation Native Stack docs](https://reactnavigation.org/docs/native-stack-navigator/#animationduration):

- `animationDuration` **chỉ áp dụng** cho: `slide_from_bottom`, `fade_from_bottom`, `fade`, `simple_push`
- `slide_from_right`: **Android only** — trên iOS nó **fallback về default animation**
- Default và flip transitions: **duration không custom được**
- **Chỉ hỗ trợ iOS** — Android dùng system default

→ Với `animation: 'slide_from_right'` hiện tại, **animationDuration không có tác dụng trên iOS**.

---

### 3. Motion Curve Analysis

| Layer | Config | Ảnh hưởng |
|-------|--------|-----------|
| **Native Stack** | iOS UIView default (ease-in-out ~350ms) | Đây là animation chính người dùng thấy |
| **MasterTransitionProvider** | REANIMATED_PARALLAX_SPRING (damping 18, stiffness 220, mass 0.9) | Chỉ dùng cho `transitionProgress` → ParallaxDriver |
| **ParallaxDriver** | useIncomingScreenStyle, useBackgroundScaleStyle, useShadowOpacityStyle | **KHÔNG được dùng** trong bất kỳ screen nào |

**Phát hiện:** ParallaxDriverProvider wrap app nhưng **không có component nào gọi** `useIncomingScreenStyle` / `useBackgroundScaleStyle` / `useShadowOpacityStyle`. Parallax depth effect **không hiển thị** — chỉ còn native slide thuần.

**Motion curve hiện tại:**
- Native iOS: ease-in-out chuẩn — acceleration/deceleration cân bằng
- Không có phase chậm cuối do parallax (vì parallax không active)

---

### 4. Motion Start Latency

| Bước | Ước lượng | Ghi chú |
|------|-----------|---------|
| Tap → Gesture.Tap onStart | ~0–8ms | Native gesture handler |
| runOnJS(triggerAction) | ~1–3ms | Bridge overhead |
| setImmediate | ~0–1ms | Microtask queue |
| executeWithRetry | 0ms nếu router sẵn sàng | requestAnimationFrame retry nếu chưa ready |
| router.push | ~2–5ms | Expo Router dispatch |
| Native Stack bắt đầu animation | ~5–15ms | UINavigationController |

**Tổng ước lượng: Tap → first visible movement: ~15–35ms**

Thiết kế đã tối ưu: NativeGesturePressable dùng `onStart` + `setImmediate` thay vì `onPress` React. Không có interaction lock chặn navigation.

---

### 5. Velocity Adaptation

- **Swipe-back (gesture):** Native Stack dùng interactive transition — velocity **được tính** khi release
- **Programmatic push:** Duration **cố định** (350ms default) — không adapt theo intent

→ Cảm giác "artificial" chủ yếu do duration cố định 350ms, không phải do thiếu velocity.

---

### 6. Perception Factors

| Yếu tố | Trạng thái |
|--------|------------|
| Parallax factor | Không active (hooks không được dùng) |
| Overlay opacity | Không active |
| Previous screen scale | Không active |
| Shadow timing | Không active |

→ Hiện tại **chỉ có native slide** — không có depth effect làm chậm perception. Vấn đề chính là **duration 350ms** quá dài.

---

## B. SAFE SPEED IMPROVEMENTS

### LOW RISK

#### 1. Thêm animationDuration + đổi animation sang simple_push (iOS)

**Vị trí:** `layouts/custom-stack.tsx` — `nativeStackScreenOptions`

**Thay đổi:**
```ts
// Platform-specific: simple_push cho phép animationDuration trên iOS
animation: Platform.OS === 'ios' ? 'simple_push' : 'slide_from_right',
animationDuration: 220, // Telegram-level: 220–240ms
```

**Lý do simple_push:**
- `animationDuration` **áp dụng** cho simple_push (slide_from_right không)
- simple_push = "default animation, without shadow and native header transition"
- App đã `headerShown: false` → không ảnh hưởng
- `fullScreenGestureEnabled: true` → gesture dismiss đã dùng simple_push-like

**Tốc độ dự kiến:** 350ms → 220ms ≈ **37% nhanh hơn**  
**Smoothness:** Giữ nguyên — native animation, chỉ rút ngắn duration

---

#### 2. Merge stackScreenOptions vào nativeStackScreenOptions

**Vị trí:** `layouts/custom-stack.tsx` + `constants/navigation.config.ts`

**Vấn đề:** `stackScreenOptions` có `animationDuration: 230`, `animationMatchesGesture`, `presentation: 'card'` nhưng **không được dùng**.

**Giải pháp:** Import `stackScreenOptions` từ navigation.config và dùng làm base, hoặc merge các option thiếu vào `nativeStackScreenOptions`.

---

#### 3. Giảm STACK_ANIMATION_MS (transition lock)

**Vị trí:** `lib/navigation/navigation-engine.ts`

**Hiện tại:** `STACK_ANIMATION_MS = 320`  
**Đề xuất:** `280` (align với animation 220ms + buffer)

**Tác dụng:** Lock ngắn hơn → có thể tap sớm hơn sau transition. Không ảnh hưởng smoothness.

---

### MEDIUM RISK

#### 4. Giảm animationDuration xuống 200ms

**Vị trí:** `nativeStackScreenOptions.animationDuration`

**Thay đổi:** `220` → `200`

**Tốc độ:** Thêm ~9% nhanh  
**Rủi ro:** Một số user có thể thấy hơi "gấp". Nên A/B test.

---

#### 5. Tabs: Giảm duration 230 → 200ms

**Vị trí:** `constants/navigation.config.ts` — `tabsScreenOptions.transitionSpec.config.duration`

**Rủi ro:** Tab switch có thể cảm giác nhanh hơn — cần test trên thiết bị thật.

---

### HIGH RISK (Không khuyến nghị)

#### 6. Bật Parallax effects (useIncomingScreenStyle, useBackgroundScaleStyle)

**Rủi ro:** Thêm layer animation có thể gây jank nếu không tối ưu. Cần measure trước khi enable.

---

## C. TELEGRAM-LEVEL CALIBRATION TARGET

| Tham số | Giá trị đề xuất | Ghi chú |
|---------|-----------------|---------|
| **Duration (stack)** | 200–220ms | Telegram/Instagram thường 200–250ms |
| **Duration (tabs)** | 200–230ms | Đồng bộ với stack |
| **Spring (nếu dùng)** | stiffness 220–280, damping 18–24 | REANIMATED_PARALLAX_SPRING hiện tại đã ổn |
| **Acceleration** | Native ease-in-out | Không cần thay đổi |
| **Deceleration** | Native ease-in-out | Phase cuối ~20% — native đã tối ưu |

**Nguyên tắc:** Perceived speed = motion start + early acceleration + short settling. Ưu tiên **rút ngắn duration** trước khi chỉnh curve.

---

## D. IMPLEMENTATION CHECKLIST

1. [x] **custom-stack.tsx:** Thêm `animationDuration: 220`, `animation: Platform.OS === 'ios' ? 'simple_push' : 'slide_from_right'`
2. [x] **navigation-engine.ts:** Giảm `STACK_ANIMATION_MS` 320 → 280
3. [x] **navigation.config.ts:** Đã merge `animationMatchesGesture`, `presentation: 'card'` vào nativeStackScreenOptions
4. [ ] Test trên iOS + Android device thật
5. [ ] (Optional) A/B test 200ms vs 220ms

---

## E. TÓM TẮT

| Câu hỏi | Trả lời |
|--------|---------|
| Transition có chậm khách quan không? | **Có** — 350ms vs target 200–240ms |
| Chậm chủ quan hay khách quan? | **Chủ yếu khách quan** — duration dài |
| Nguồn chậm chính? | `animationDuration` không set + `slide_from_right` không hỗ trợ custom duration trên iOS |
| Latency tap → motion? | ~15–35ms — đã tối ưu |
| Velocity adaptation? | Có cho gesture, không cho programmatic push |
| Parallax ảnh hưởng perception? | Không — parallax không active |

**Thay đổi ưu tiên:** Đổi `animation` sang `simple_push` trên iOS + thêm `animationDuration: 220`.
