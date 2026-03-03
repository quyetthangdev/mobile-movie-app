# QA: Xác minh Transition 120ms

**Mục tiêu:** Xác nhận patch react-native-screens áp dụng duration 120ms trên cả iOS và Android.

---

## 0. Yêu cầu môi trường

| Platform | Cần thiết |
|----------|-----------|
| **iOS** | Xcode, CocoaPods (`pod --version`), Simulator hoặc thiết bị |
| **Android** | Java JDK 17+, Android SDK, `adb`, emulator hoặc thiết bị |
| **Video** | ffmpeg (`brew install ffmpeg`) cho phân tích frame |

---

## 1. Chuẩn bị

```bash
# Đảm bảo patch đã áp dụng
npm run postinstall

# Chạy app
npx expo run:ios    # hoặc
npx expo run:android
```

---

## 2. Luồng kiểm thử

| Bước | Hành động | Màn hình |
|------|-----------|----------|
| 1 | Mở app → Tab **Thực đơn** (Menu) | Menu List |
| 2 | Tap vào **món đầu tiên** trong danh sách | → Menu Item Detail |
| 3 | Quan sát transition (slide từ phải sang) | |
| 4 | Tap **Back** (mũi tên trái) | → Menu List |
| 5 | Lặp 5–10 lần để cảm nhận ổn định | |

---

## 3. Kiểm tra cảm quan

- [ ] Transition **gần như tức thì** (không còn cảm giác “kéo dài” ~300ms)
- [ ] Không có stutter, giật
- [ ] Animation mượt, không bị cắt đột ngột

**So sánh:** Trước patch ~300–350ms (cảm giác “chậm”), sau patch ~120ms (snappy).

---

## 4. Phân tích video (60fps)

### 4.1 Ghi hình

**iOS:**
- QuickTime: File → New Movie Recording → chọn iPhone
- Hoặc: Xcode → Window → Devices and Simulators → Record

**Android:**
```bash
adb shell screenrecord --bit-rate 8000000 --time-limit 30 /sdcard/transition_120ms.mp4
# Sau khi xong: adb pull /sdcard/transition_120ms.mp4 .
```

**Yêu cầu:** 60fps (hoặc ít nhất 30fps — điều chỉnh công thức frame tương ứng).

### 4.2 Phân tích frame

```bash
# Chạy script phân tích (xem scripts/qa-transition-frame-analysis.sh)
./scripts/qa-transition-frame-analysis.sh transition_120ms.mp4
```

**Kỳ vọng:** 120ms ÷ 16.67ms/frame ≈ **7–8 frames** cho transition.

| Duration | Frames @ 60fps |
|----------|----------------|
| 120ms | 7–8 |
| 300ms | 18 |
| 350ms | 21 |

---

## 5. Checklist tổng hợp

| Platform | Cảm quan nhanh | Video ~7–8 frames | Kết luận |
|----------|----------------|-------------------|----------|
| iOS | ☐ | ☐ | |
| Android | ☐ | ☐ | |

---

## 6. Lưu ý

- **Simulator/Emulator** có thể chạy chậm hơn thiết bị thật → ưu tiên test trên thiết bị thật.
- Nếu vẫn thấy chậm: kiểm tra `lib/navigation/constants.ts` → `TRANSITION_DURATION_MS = 120`.
- FPS monitor: `adb logcat -s ReactNativeJS:V | grep TransitionFPS` (Android).
