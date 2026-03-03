# QA Test Plan — Transition Performance (Menu List → Menu Item Detail)

**Mục tiêu:** Đảm bảo FPS ổn định 55–60 trong suốt slide animation, không jank ở đầu/cuối transition.

---

## 1. Chuẩn bị

### 1.1 Thiết bị

- **Ưu tiên:** Android thiết bị vật lý (đo chính xác hơn emulator)
- **Thay thế:** Android Emulator với **Profile GPU Rendering** hoặc **Perf Monitor** bật

### 1.2 Cài đặt

```bash
# Cài dependencies (nếu chưa)
npm install

# Build và chạy trên Android
npm run android
# hoặc
npx expo run:android
```

### 1.3 Bật Perf Monitor

1. Chạy app trên thiết bị/emulator
2. Lắc thiết bị (shake) hoặc `adb shell input keyevent 82` để mở **Dev Menu**
3. Chọn **"Show Perf Monitor"** (hoặc "Performance Monitor")
4. Màn hình hiển thị overlay: **JS FPS**, **UI FPS** (hoặc **Views**), **RAM**

---

## 2. Quy trình kiểm thử thủ công

### 2.1 Chuẩn bị màn hình

1. Mở app → đăng nhập (nếu cần)
2. Chọn **chi nhánh** (branch) nếu chưa có
3. Chuyển sang tab **Menu** (Thực đơn)
4. Đợi danh sách món load xong
5. **Perf Monitor** đã bật, hiển thị góc màn hình

### 2.2 Thực hiện 10 lần navigation

| Lần | Hành động | Quan sát FPS |
|-----|-----------|--------------|
| 1 | Tap vào món đầu tiên → chờ detail load → Back | Ghi nhận FPS trong lúc slide |
| 2 | Lặp lại | |
| 3 | ... | |
| ... | | |
| 10 | | |

### 2.3 Tiêu chí đánh giá

| Chỉ số | Mục tiêu | Fail nếu |
|--------|----------|----------|
| **UI FPS** | 55–60 FPS | < 50 FPS bất kỳ lúc nào |
| **JS FPS** | 55–60 FPS | < 50 FPS kéo dài > 100ms |
| **Jank** | Không có | FPS giảm đột ngột ở đầu hoặc cuối transition |
| **Độ ổn định** | 8/10 lần đạt | < 8 lần đạt mục tiêu |

### 2.4 Ghi chép

Ghi lại cho mỗi lần:

- **UI FPS min** trong lúc slide
- **UI FPS trung bình** (ước lượng)
- **Có jank không** (Y/N)
- **Thời điểm jank** (đầu / giữa / cuối transition)

---

## 3. Kiểm thử tự động (ADB)

### 3.1 Script automation

Chạy script:

```bash
./scripts/qa-transition-perf.sh
```

Script sẽ:

1. Kiểm tra `adb devices`
2. Mở app (nếu chưa mở)
3. Thực hiện 10 lần: tap menu item → đợi 2s → back
4. In log để theo dõi

**Lưu ý:** Cần chỉnh tọa độ tap trong script theo kích thước màn hình thiết bị.

### 3.2 Lấy tọa độ tap

```bash
# Bật pointer location trên Android
adb shell settings put system pointer_location 1

# Hoặc dùng adb để lấy kích thước màn hình
adb shell wm size
# Ví dụ: Physical size: 1080x2400
# Menu item đầu tiên thường ở ~(540, 600) (giữa màn, dưới header)
```

### 3.3 Tắt pointer location sau khi test

```bash
adb shell settings put system pointer_location 0
```

---

## 4. FPS Monitor (__DEV__)

Trong chế độ development, app đã tích hợp **Transition FPS Monitor**:

- Tự động đo FPS khi transition bắt đầu và kết thúc
- Log ra console: `[TransitionFPS] attempt N: avg=X fps, min=Y fps, frames=Z`
- Chỉ chạy khi `__DEV__ === true`

### 4.1 Xem log

```bash
# Android — Expo dùng Metro, log hiện ở terminal Metro
# Hoặc dùng adb:
adb logcat -s ReactNativeJS:V | grep "TransitionFPS"
```

---

## 5. Báo cáo mẫu

| Attempt | UI FPS Min | UI FPS Avg | Jank | Notes |
|---------|------------|------------|------|-------|
| 1 | 58 | 59 | No | |
| 2 | 56 | 58 | No | |
| 3 | 55 | 57 | No | |
| 4 | 52 | 56 | Yes (end) | Slight drop at transition end |
| ... | | | | |
| 10 | 58 | 59 | No | |

**Kết luận:** PASS / FAIL — [ghi chú]

---

## 6. Troubleshooting

| Vấn đề | Giải pháp |
|--------|-----------|
| Perf Monitor không hiện | Dev Menu → Show Perf Monitor. Kiểm tra build debug. |
| FPS thấp ngay từ đầu | Đóng app khác, giảm tải thiết bị. |
| Jank ở đầu transition | Kiểm tra data fetching có defer đúng (useRunAfterTransition). |
| Jank ở cuối transition | Kiểm tra androidDelayMs, content mount timing. |
| Emulator FPS không ổn định | Dùng thiết bị thật hoặc emulator với GPU acceleration. |
