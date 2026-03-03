# QA Run — 5 Lần Transition (Menu → Detail)

**Mục tiêu:** Xác nhận UI FPS 55–60 trong slide, không stutter khi content xuất hiện.

---

## Chuẩn bị

1. `npm run android` — chạy app
2. Shake device → **Show Perf Monitor**
3. Vào tab **Menu** → đợi list load
4. Quan sát overlay **UI FPS** (góc màn hình)

---

## 5 lần thử

| # | Hành động | Quan sát |
|---|-----------|----------|
| 1 | Tap món → chờ detail → Back | UI FPS trong slide? Stutter khi content xuất hiện? |
| 2 | Lặp lại | |
| 3 | Lặp lại | |
| 4 | Lặp lại | |
| 5 | Lặp lại | |

---

## Tiêu chí

| Kiểm tra | Pass |
|----------|------|
| UI FPS trong slide | ≥ 55 |
| Không stutter khi content xuất hiện | Không giật, không drop FPS đột ngột |

---

## Nếu có stutter khi content xuất hiện

Tăng `androidDelayMs` trong `app/menu/[slug].tsx`:

```ts
// Từ 10 → 30 hoặc 50
androidDelayMs: Platform.OS === 'android' ? 30 : 0,  // hoặc 50
```

Sau đó chạy lại 5 lần để kiểm tra.
