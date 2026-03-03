# Transition Speed — Root Cause Analysis

**Vấn đề:** Giảm `animationDuration` xuống 120ms không có tác dụng.

---

## 1. NGUYÊN NHÂN CỐT LÕI

### iOS: Spring animation BỎ QUA duration

**File:** `react-native-screens/ios/RNSScreenStackAnimator.mm`

```objc
// animateSimplePush và animateSlideFromLeft dùng:
[[UIViewPropertyAnimator alloc] initWithDuration:[self transitionDuration:...]
                                timingParameters:[RNSScreenStackAnimator defaultSpringTimingParametersApprox]];
```

**Comment trong code (line 571-573):**
> "spring timing defined this way **ignores the requested duration of the animation**, effectively impairing our `animationDuration` prop."

→ **Spring physics** (damping ratio 4.56) quyết định thời gian thực tế (~350–400ms), **không phải** `animationDuration`.

### Android: animationDuration KHÔNG HỖ TRỢ

**React Navigation docs:** `animationDuration` — **Only supported on iOS.**

→ Android dùng Fragment transition mặc định của hệ thống (~300–350ms). `animationDuration` bị bỏ qua hoàn toàn.

---

## 2. SO SÁNH ANIMATION TYPES

| Animation | iOS duration | Android duration |
|-----------|--------------|------------------|
| simple_push | ❌ Spring bỏ qua | ❌ Không hỗ trợ |
| slide_from_right | ❌ Không dùng trên iOS | ❌ Không hỗ trợ |
| slide_from_bottom | ✅ EaseInOut tôn trọng | ❌ Không hỗ trợ |
| fade | ✅ EaseInOut tôn trọng | ❌ Không hỗ trợ |

---

## 3. GIẢI PHÁP ĐÃ TRIỂN KHAI

### Patch react-native-screens — `patches/react-native-screens+4.16.0.patch`

**iOS:** Đổi `animateSimplePush` và `animateSlideFromLeft` từ **spring** sang **curve** (UIViewAnimationCurveEaseInOut) → `animationDuration` có hiệu lực.

**Android:** Đổi `config_mediumAnimTime` (~300ms) → `120` trong 4 file anim slide:
- `rns_slide_in_from_right.xml`, `rns_slide_out_to_left.xml`
- `rns_slide_in_from_left.xml`, `rns_slide_out_to_right.xml`

---

## 4. KẾT LUẬN

| Platform | Trước patch | Sau patch |
|----------|-------------|-----------|
| **iOS** | ~350–400ms (spring cố định) | 120ms (theo `TRANSITION_DURATION_MS`) |
| **Android** | ~300ms (config_mediumAnimTime) | 120ms (hardcoded trong patch) |

→ Chạy `expo run:ios` hoặc `expo run:android` để kiểm tra transition nhanh hơn.
