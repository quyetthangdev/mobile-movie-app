# Phase 6: Phân Tích Sâu & Hướng Cải Thiện

**Ngày:** 2025-03  
**Bối cảnh:** Sau Phase 1–5, test release trên Android thiết bị thật:
- Home → Profile, Menu: **còn giật**
- Transition chuyển trang (stack): **khá chậm** dù không lag

---

## 1. TỔNG QUAN VẤN ĐỀ

| Vấn đề | Mô tả | Ước lượng impact |
|--------|-------|------------------|
| **Tab giật** | Home → Profile, Home → Menu bị jitter | Cao |
| **Stack transition chậm** | Menu → Detail, Cart → Detail cảm giác chậm | Trung bình |
| **Phase 1–5 chưa đủ** | FPS monitor vẫn 5–13 fps trong transition | Đã biết |

---

## 2. PHÂN TÍCH CHI TIẾT

### 2.1 Tab giật (Home → Profile, Menu)

**Luồng hiện tại:**
```
1. User tap tab → router.replace (hoặc tab switch)
2. Tab screen mount (lazy: true → chỉ mount lần đầu)
3. Skeleton render (ProfileSkeletonShell, MenuSkeletonShell)
4. Fade animation 230ms (tabsScreenOptions)
5. runAfterInteractions fire → setReady(true)
6. Heavy content mount → JITTER
```

**Nguyên nhân giật:**

| Thành phần | Chi phí ước lượng | Ghi chú |
|------------|-------------------|---------|
| **Profile** | Animated.Value + scrollY.interpolate | 9 SettingsItem, avatar, dropdowns |
| **Menu** | ClientMenus (FlashList), useCatalog, useSpecificMenu | 4–20 items, filters |
| **useAuthStore, useUserStore** | 2–4 selector mỗi màn | Đã tối ưu |
| **Layout shift** | Skeleton → Content | Thay đổi layout đột ngột |
| **Fade + mount overlap** | 230ms fade | Content mount khi fade chưa xong |

**runAfterInteractions với tab:**
- Tab fade có thể kết thúc ~230ms
- `runAfterInteractions` fire khi animation "idle"
- Nhưng content mount (ClientMenus, Profile sections) tốn 30–80ms → block JS → giật

### 2.2 Stack transition chậm

**Cấu hình hiện tại:**
- `custom-stack.tsx`: `animation: 'slide_from_right'`, **không có** `animationDuration`
- `navigation.config.ts`: `animationDuration: 230` — **không được dùng** bởi custom-stack
- `TRANSITION_SPEED_ROOT_CAUSE.md`: Android **không hỗ trợ** animationDuration (RN docs)
- Patch react-native-screens: **không có** trong `patches/` (đã đề xuất trong doc nhưng chưa apply)

**Kết quả:**
- **Android:** Dùng Fragment transition mặc định: `config_mediumAnimTime` ~300–350ms
- **iOS:** `slide_from_right` dùng spring → ~350–400ms (bỏ qua duration)
- **Cảm nhận:** "Chậm" vì 300–400ms > 220–250ms (Telegram target)

### 2.3 Tại sao Phase 1–5 chưa đủ

| Phase | Giảm | Chưa giảm |
|-------|------|-----------|
| P1 Selectors | Re-render không cần thiết | Mount cost lần đầu |
| P2 scheduleStoreUpdate | Stutter khi add to cart | — |
| P3 FlashList | Scroll list | Tab/stack mount |
| P4 Motion | Token chuẩn hóa | — |
| P5 Event-driven | API/hooks tách biệt | — |

**Gốc rễ:** Chi phí **mount** khi chuyển tab/stack vẫn cao. Selectors giảm re-render nhưng **lần mount đầu** vẫn cần render toàn bộ cây component.

---

## 3. HƯỚNG CẢI THIỆN (ƯU TIÊN)

### 3.1 Tab giật — Defer content mount thêm

**Ý tưởng:** Chỉ mount content khi fade **hoàn toàn** xong + thêm buffer.

```ts
// Hiện tại: runAfterInteractions → setReady(true)
// Đề xuất: runAfterInteractions + setTimeout(50–80ms) cho tab
// Hoặc: Dùng transitionEnd của tab (nếu có) thay vì runAfterInteractions
```

**Thử nghiệm:**
- `useRunAfterTransition` với `androidDelayMs: 80` cho tab screens
- Hoặc tạo `useRunAfterTabTransition` riêng với delay dài hơn

### 3.2 Tab giật — Giảm skeleton → content shift

- Skeleton layout **khớp** với content (cùng height, padding)
- Hoặc: dùng `opacity` fade từ skeleton → content thay vì replace đột ngột

### 3.3 Tab giật — Preload tab khi idle

- Khi user ở Home 2–3s, prefetch Profile/Menu data (useQuery với enabled: false, prefetch)
- Khi tab mount: data đã có → render nhanh hơn

### 3.4 Stack transition chậm — Patch react-native-screens

**Tham khảo:** `docs/TRANSITION_SPEED_ROOT_CAUSE.md`

- Tạo patch cho `react-native-screens`:
  - Android: sửa `rns_slide_in_from_right.xml` (và các file slide) dùng `config_shortAnimTime` (~150ms) thay vì `config_mediumAnimTime` (~300ms)
  - iOS: patch spring → curve (UIViewAnimationCurveEaseInOut) để `animationDuration` có hiệu lực

**Cảnh báo:** Patch native cần test kỹ, có thể ảnh hưởng upgrade.

### 3.5 Stack transition chậm — Thử animation khác

- `slide_from_bottom` hoặc `fade` trên Android có thể tôn trọng duration (cần verify)
- `simple_push` trên iOS: patch đã đề xuất dùng curve

### 3.6 Menu/Profile — Giảm mount cost

| Thành phần | Đề xuất |
|------------|---------|
| **ClientMenus** | `initialNumToRender={2}` cho FlashList (đã 3?) |
| **Profile Animated** | `useNativeDriver: true` cho scroll interpolate (nếu chưa) |
| **Profile 9 SettingsItem** | `React.memo` cho từng item nếu chưa |
| **Menu filters** | Defer render PriceRangeFilter, ProductNameSearch 50–100ms sau mount |

### 3.7 Tab transition — Rút fade duration

- `tabsScreenOptions.transitionSpec.config.duration`: 230 → 150–180ms
- Fade ngắn hơn → cảm giác nhanh hơn (có thể hơi "chớp")

---

## 4. ROADMAP CẢI THIỆN (ƯU TIÊN)

| # | Task | Effort | Impact | Risk |
|---|------|--------|--------|------|
| 1 | Tab: delay content mount sau fade (androidDelayMs 50–80) | ~15m | Cao | Thấp |
| 2 | Tab: rút fade duration 230 → 180ms | ~5m | Trung bình | Thấp |
| 3 | Skeleton layout khớp content (Profile, Menu) | ~30m | Trung bình | Thấp |
| 4 | Patch react-native-screens (Android 300→180ms) | ~1h | Cao | Trung bình |
| 5 | Menu: defer filter render 50ms | ~20m | Trung bình | Thấp |
| 6 | Preload tab khi idle (Home 2s) | ~45m | Trung bình | Thấp |

---

## 5. KẾT LUẬN

- **Tab giật:** Chủ yếu do content mount nặng khi fade chưa xong. Defer mount + rút fade có thể cải thiện rõ.
- **Stack chậm:** Android dùng duration mặc định ~300ms. Cần patch react-native-screens hoặc chấp nhận.
- **Phase 1–5:** Đã tối ưu re-render, store, list. Cần thêm tối ưu **mount timing** và **animation duration**.

---

## 6. TÀI LIỆU THAM KHẢO

- `docs/TRANSITION_SPEED_ROOT_CAUSE.md`
- `docs/TRANSITION_STUTTER_ROOT_CAUSE_AUDIT.md`
- `docs/NAVIGATION_TRANSITION_LATENCY_DIAGNOSIS.md`
