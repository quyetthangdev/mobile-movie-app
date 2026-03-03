# Tối ưu độ mượt Transition

## Đã áp dụng

### 1. Phản hồi tap nhanh hơn

- **NativeNavigationTouchable** cho menu item — native View `setOnClickListener` (Android) / `UITapGestureRecognizer` (iOS), ít hop hơn gesture handler
- **onPressIn deferred** — prefetch/preload chạy sau nav (setImmediate), không block frame khi finger down
- **NativeGesturePressable** — onPressIn chuyển sang chạy deferred trong triggerAction, tránh runOnJS block

### 2. Interpolator (Android)

Thêm `android:interpolator="@android:interpolator/accelerate_decelerate"` vào 4 file slide animation.

- **Trước:** Linear (tốc độ đều → cảm giác cứng)
- **Sau:** Accelerate-decelerate (chậm → nhanh → chậm → cảm giác tự nhiên như iOS)

### 3. Duration thống nhất

- **280ms** cho cả 4 animation (slide in/out, left/right)
- Đồng bộ với `TRANSITION_DURATION_MS` trong `constants.ts`

### 4. Content mount delay

- `useRunAfterTransition` với `androidDelayMs: 150` — tránh mount nặng trong lúc transition
- `initializeOrdering` delay 350ms — tránh Zustand cascade
- Related products delay 220ms — stagger render

---

## Các tối ưu khác (đã có)

| Tối ưu | Vị trí |
|--------|--------|
| freezeOnBlur | custom-stack.tsx — freeze màn background |
| LAYER_TYPE_HARDWARE | react-native-screens — GPU layer khi transition |
| requestAnimationFrame | ProductImageCarousel — carousel mount next frame |

---

## Nếu vẫn chưa mượt

1. **Tăng duration** lên 300–320ms trong patch XML
2. **Thử decelerate_interpolator** thay accelerate_decelerate (nhanh đầu, chậm cuối)
3. **Giảm androidDelayMs** xuống 100 nếu content xuất hiện trễ
4. **Profile** với `adb logcat` hoặc React DevTools để tìm frame drop
