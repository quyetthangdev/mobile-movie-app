# Phân tích cấu hình Navigation Transition

## 1. Transition Spec — Đoạn code điều khiển "độ gắt"

### 1.1 Native Stack (không hỗ trợ transitionSpec)

**File:** `layouts/custom-stack.tsx`

```tsx
animation: 'slide_from_right',
animationDuration: MOTION.stackTransition.durationMs,  // 350ms
```

**Native Stack** dùng native APIs (UINavigationController iOS, Fragment Android) — **không có** `transitionSpec`, `cardStyleInterpolator`, hay custom easing từ JS. Animation thực tế do **react-native-screens** (native code) điều khiển.

### 1.2 Nguồn gốc thực sự — Patch react-native-screens

**File:** `patches/react-native-screens+4.24.0.patch`

| Platform | File | Điều khiển "độ gắt" |
|----------|------|---------------------|
| **iOS** | `RNSScreenStackAnimator.mm` | `RNSSlideTimingParameters()` — Cubic Bezier (0.25, 0.1, 0.25, 1) thay cho Spring mặc định |
| **Android** | `rns_slide_*.xml` | `android:interpolator="@android:interpolator/accelerate_decelerate"` + `duration="250"` |

**Đoạn code gây cảm giác gắt:**
- **iOS:** `UICubicTimingParameters` với (0.25, 0.1, 0.25, 1) — curve đã "dịu" hơn linear nhưng **không có độ nảy** (overshoot) như Spring
- **Android:** `accelerate_decelerate` — ease-in-out hệ thống, có thể vẫn hơi "cứng" so với bezier tùy chỉnh

### 1.3 Easing Curve — withTiming hay Spring?

**Không dùng withTiming** — toàn bộ transition chạy trên **native thread** (ObjC/Swift, Kotlin/XML). JS/Reanimated không tham gia vào curve của slide.

**Lý do cảm giác "gắt":**
1. **Thiếu overshoot** — Bezier và accelerate_decelerate dừng "cứng" tại điểm cuối, không có độ nảy nhẹ
2. **Shadow bị tắt** — `fullScreenGestureShadowEnabled: false` → mất lớp shadow/overlay, transition trông phẳng

---

## 2. Gesture Integration

**File:** `layouts/custom-stack.tsx`

```tsx
gestureEnabled: true,
fullScreenGestureEnabled: true,
animationMatchesGesture: true,
fullScreenGestureShadowEnabled: false,  // ← Shadow BỊ TẮT
```

- **fullScreenGestureEnabled: true** — Vuốt back toàn màn hình ✅
- **animationMatchesGesture: true** — Gesture dùng cùng animation với tap back ✅
- **fullScreenGestureShadowEnabled: false** — Shadow khi vuốt BỊ TẮT → mất chiều sâu, cảm giác "dính" kém tự nhiên ❌

---

## 3. Shadow & Opacity Overlay

**Native Stack** không có `cardStyleInterpolator`. Shadow/overlay do **react-native-screens** vẽ trong `animateSimplePushWithShadowEnabled`:

```objc
if (shadowEnabled) {
  shadowView = [[UIView alloc] initWithFrame:...];
  shadowView.backgroundColor = [UIColor blackColor];
  // alpha 0 → RNSShadowViewMaxAlpha (0.1) trong animation
}
```

Khi `fullScreenGestureShadowEnabled: false` → `shadowEnabled = false` → **không có shadow**, transition trông phẳng và "gắt".

---

## 4. Cấu hình hiện tại (tóm tắt)

| Thuộc tính | Giá trị | Ghi chú |
|------------|---------|---------|
| animation | slide_from_right | Native Stack built-in |
| animationDuration | 350ms | Chỉ iOS; Android dùng XML duration |
| iOS timing | Cubic Bezier (0.25, 0.1, 0.25, 1) | Patch — không có bounce |
| Android interpolator | accelerate_decelerate | Patch — 250ms |
| fullScreenGestureShadowEnabled | **false** | Shadow bị tắt |

---

## 5. Refactor đề xuất

### 5.1 Spring Physics (stiffness: 300, damping: 30)

- **Damping ratio** ≈ 30 / (2√300) ≈ **0.87** — hơi underdamped, overshoot nhẹ
- **iOS:** Dùng `UISpringTimingParameters initWithDampingRatio:0.87 response:0.35` (cần iOS 15+)
- **Android:** Giữ `accelerate_decelerate` hoặc thử `overshoot_interpolator` nếu cần bounce
- **Lưu ý:** Patch hiện dùng bezier vì tương thích rộng; Spring cần sửa patch thủ công nếu target iOS 15+

### 5.2 Bezier fallback (0.25, 0.1, 0.25, 1)

Nếu bắt buộc dùng Timing (không Spring): bezier này đã "dịu" hơn linear — chậm đầu, nhanh giữa, chậm cuối. Patch hiện tại đã dùng curve này.

### 5.3 Bật Shadow

`fullScreenGestureShadowEnabled: true` — tạo lớp shadow đổ lên màn cũ, tăng chiều sâu và cảm giác tự nhiên.
