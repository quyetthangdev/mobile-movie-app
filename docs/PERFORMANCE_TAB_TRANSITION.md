# Tab transition performance — Phân tích & chuẩn production (Instagram/Telegram)

> **Deep dive**: Xem thêm [FRAME_BUDGET_AND_TAB_OPTIMIZATION.md](./FRAME_BUDGET_AND_TAB_OPTIMIZATION.md) — frame budget 16.67ms, Hermes, concurrent rendering, memory vs smoothness, checklist đầy đủ.

## 1. Vì sao tab transition vẫn khựng dù dùng native animation?

### Navigation commit xảy ra khi nào

- **Commit** = thời điểm thư viện navigation (React Navigation/Expo Router) cập nhật state (route/index) và React **bắt đầu** render màn mới.
- Trình tự thực tế:
  1. User tap tab → `router.replace()` gọi sync.
  2. Navigator cập nhật state (sync).
  3. React schedule re-render: **component của tab mới mount** (chạy toàn bộ hooks + render lần đầu).
  4. Native nhận frame từ JS (layout + view tree) và vẽ fade.

→ **Frame đầu tiên của màn mới** phụ thuộc vào **độ nặng của lần mount** (hooks + render). Nếu bước 3 mất > ~16ms thì frame trễ → **cảm giác khựng** (animation đã chạy nhưng nội dung chưa kịp vẽ hoặc vẽ trễ).

### Tại sao JS bận >16ms gây khựng

- 60fps = 1 frame / ~16.67ms. Mỗi frame: JS chạy → gửi layout/view update sang native → native vẽ.
- Nếu JS xử lý mount (hooks + render) **quá 16ms**, frame đó bị trễ; native có thể vẽ frame cũ hoặc bỏ frame → **jank**.
- Tab “native” (fade) vẫn chạy trên native, nhưng **nội dung tab** do React vẽ. Nội dung chưa kịp commit trong 1 frame thì màn mới trông “chậm” hoặc “khựng”.

### Các nguyên nhân thường gặp

| Nguyên nhân | Cơ chế |
|-------------|--------|
| **JS block trước khi commit** | Handler tab gọi async/setState trước `router.replace` → delay commit. |
| **Mount quá nặng** | Tab mới mount chạy nhiều hooks (store, query, useMemo) + cây component lớn trong **cùng frame** với commit. |
| **Fetch chạy quá sớm** | useEffect/useQuery chạy ngay khi mount → request + state update cạnh tranh với frame vẽ. |
| **Zustand selector nặng** | Subscribe object/array → re-render lớn; nhiều selector → nhiều lần re-render. |
| **FlatList render quá nhiều** | `initialNumToRender` lớn → mount nhiều item ngay → vượt 16ms. |
| **Layout subscribe store** | Bottom bar subscribe cart/global state → mỗi lần tab đổi có thể cascade re-render. |

### Vì sao Instagram/Telegram không bị

- **Tap = chỉ đổi index/route** (sync), không gọi API/async trong handler.
- **Màn tab mới paint cực nhẹ lần đầu**: shell + skeleton (ít hook, ít component).
- **Fetch / logic nặng chạy sau** khi transition xong (sau interaction hoặc vài frame).
- **List**: render ít item lúc đầu, tối ưu virtualization.
- **Store**: chỉ subscribe đúng thứ cần (số, primitive), tách component để không re-render cả layout.

---

## 2. Kiến trúc chuẩn production

### 2.1 Tab switch = instant (1 frame)

- Handler **chỉ** gọi `router.replace(...)` (sync, không await, không setState trước).
- Không async, không `InteractionManager`/`setTimeout` **trước** replace.

```tsx
// ✅ Đúng
const onMenu = useCallback(() => router.replace('/(tabs)/menu'), [router])

// ❌ Sai
const onMenu = useCallback(() => {
  setSomething(x)        // re-render trước khi nav
  router.replace(...)
}, [])
// ❌ Sai
const onMenu = useCallback(async () => {
  await prefetch()       // block
  router.replace(...)
}, [])
```

### 2.2 Shell-first: frame đầu tiên cực nhẹ

- **Vấn đề**: Nếu tab export luôn component “nặng” (nhiều store, query, useMemo), mount chạy hết trong frame commit → dễ >16ms.
- **Cách làm**: Tab export **wrapper**:
  - Lần đầu: render **shell** (layout + skeleton), **chỉ ít hook** (vd: `useState` + `useRunAfterTransition`).
  - Sau khi transition xong: `runAfterInteractions` → set state → mount **content thật** (fetch, store, list).

→ Frame commit chỉ vẽ shell + skeleton; content (và fetch) chạy sau, không cướp frame.

### 2.3 Delay mọi logic nặng

- Fetch: bật query khi `allowFetch === true`, set `allowFetch` trong `useRunAfterTransition` (sau interaction/transition).
- Tính toán nặng: chạy trong `runAfterInteractions` hoặc sau khi content mount (sau shell).

### 2.4 Skeleton-first, không return null

- Màn luôn render **layout + skeleton** khi chưa có data (không `return null`).
- Data load sau → thay skeleton bằng nội dung thật.

### 2.5 FlatList

- `initialNumToRender`: 8–12.
- `maxToRenderPerBatch`: 8–12.
- `windowSize`: 5–11.
- Có `keyExtractor` ổn định; tránh inline function trong `renderItem` (tách component hoặc useCallback).

### 2.6 Zustand

- Subscribe **primitive** (number, string) hoặc ít field cần thiết.
- Tránh `state => state.wholeBigObject` (dễ re-render không cần thiết).
- Component cần gì subscribe đúng đó (vd: nút cart chỉ subscribe count).

### 2.7 freezeOnBlur + lazy

- Tabs: `freezeOnBlur: true`, `lazy: true`, `detachInactiveScreens: false` (để fade giữa 2 màn đã mount).
- Màn không focus bị freeze → không chạy render/effect khi đang chuyển tab.

---

## 3. Timeline render (theo frame)

```
Frame N      User tap tab
             → router.replace() (sync)
             → Navigator state update
             → React schedule re-render (tab mới)

Frame N+1    Tab component mount (wrapper)
             - Nếu wrapper nhẹ (shell): vài hook + shell tree → <16ms → commit OK
             - Nếu wrapper nặng (full content): nhiều hook + cây lớn → có thể >16ms → jank

Frame N+2…  Fade animation (native) đang chạy
             - Nếu đã commit shell: thấy skeleton ngay, mượt
             - Nếu chưa commit: thấy trắng/trễ → khựng

Sau transition  runAfterInteractions
             → setReady(true) / setAllowFetch(true)
             → Mount content thật hoặc bật query
             → Fetch chạy, data về → thay skeleton
```

→ Mục tiêu: **Frame N+1 chỉ mount shell** để luôn commit trong 1 frame.

---

## 4. Checklist debug performance

- [ ] Tab handler chỉ gọi `router.replace(...)`, không async/setState trước.
- [ ] Tab màn mới: frame đầu có phải shell + skeleton (rất ít hook)?
- [ ] Fetch/query chỉ bật sau `useRunAfterTransition` (hoặc tương đương).
- [ ] Không `return null` khi chưa có data; luôn có layout + skeleton.
- [ ] FlatList: `initialNumToRender` ≤ 12, `windowSize` ~5–11.
- [ ] Zustand: selector trả về primitive/ít field; tách component theo từng phần store.
- [ ] Bottom bar: không subscribe store toàn cục; chỉ component nhỏ (vd cart) subscribe.
- [ ] Tabs config: `freezeOnBlur: true`, `lazy: true`, `detachInactiveScreens: false`.
- [ ] Đo trên release build (dev thường chậm hơn).

---

## 5. Code: trước vs sau

### Trước (dễ khựng)

- Tab export luôn full content (nhiều store, 2 query, useMemo, useEffect).
- Mount = chạy hết trong 1 frame → dễ >16ms.
- Query enabled ngay khi có branch → fetch cùng lúc với frame commit.

### Sau (production-ready)

- Tab export **wrapper**: `useState(ready)` + `useRunAfterTransition(() => setReady(true))`.
- `if (!ready) return <MenuSkeletonShell />` (shell: chỉ View + Skeleton, không store/query).
- `return <ClientMenuContent />` mount **sau** transition; trong content vẫn dùng `allowFetch` + `useRunAfterTransition` để bật query sau interaction.

→ Frame commit chỉ mount wrapper + shell; content và fetch chạy sau.

---

## 6. FlatList recommended

```ts
// constants/list.config.ts
export const FLATLIST_PROPS = {
  initialNumToRender: 10,
  maxToRenderPerBatch: 10,
  windowSize: 5,
  updateCellsBatchingPeriod: 50,
  removeClippedSubviews: true,
}
```

- `initialNumToRender`: 10 — chỉ render 10 item lúc mount → frame nhẹ.
- `windowSize`: 5 — giữ 5 “màn hình” item trong bộ nhớ.
- Dùng `keyExtractor` ổn định; `renderItem` dùng component tách hoặc useCallback.

## 7. File tham chiếu

| File | Vai trò |
|------|--------|
| `app/(tabs)/_layout.tsx` | Handler chỉ `router.replace`; không subscribe store ở layout. |
| `app/(tabs)/menu.tsx` | MenuScreen wrapper → shell (frame đầu) → ClientMenuContent (sau transition). |
| `hooks/use-run-after-transition.ts` | `InteractionManager.runAfterInteractions` để delay work. |
| `constants/navigation.config.ts` | tabsScreenOptions: fade, lazy, freezeOnBlur, detachInactiveScreens: false. |
| `constants/list.config.ts` | FLATLIST_PROPS cho list dài. |
| `components/navigation/floating-cart-button.tsx` | Chỉ component này subscribe cart count. |
