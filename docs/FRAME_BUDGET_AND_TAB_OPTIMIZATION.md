# Frame budget & tab optimization — Senior-level architecture

Mục tiêu: **Tap tab → chuyển ngay trong 1 frame, skeleton nếu chưa có data, 60fps, không jank.**

---

## 1. Frame budget deep dive (16.67ms)

### 1.1 Một frame React Native gồm những gì?

```
┌─────────────────────────────────────────────────────────────────┐
│ 60fps = 1 frame / 16.67ms                                        │
├─────────────────────────────────────────────────────────────────┤
│ JS thread          │ Fabric/Bridge    │ UI thread + GPU          │
│ - Event (tap)      │ - Serialize      │ - Layout (Yoga)          │
│ - React render     │   shadow tree    │ - Draw list               │
│ - React commit     │ - Send to native │ - Composite + display     │
│ - Gửi tree sang    │                  │ - 16.67ms deadline       │
└─────────────────────────────────────────────────────────────────┘
```

- **JS thread**: Xử lý event (tap), chạy React (render phase → commit phase), tạo shadow tree mới, gửi diff sang native. Nếu tổng thời gian **> 16.67ms** thì frame đó không kịp → **dropped frame**.
- **React render phase**: Component function chạy (hooks, virtual DOM). **Không chạm native**, chỉ tính toán.
- **React commit phase**: Flush tree lên renderer (Fabric), gửi operations sang native. **Đồng bộ** trong cùng frame với render (trừ khi dùng concurrent features).
- **Fabric (New Architecture)**: JS gửi **serialized shadow tree** qua JSI (không qua JSON bridge). Native nhận → **UI thread** layout (Yoga) → GPU vẽ. Nếu JS gửi trễ thì native không có gì mới để vẽ → vẫn vẽ frame cũ hoặc bỏ frame.
- **UI thread & GPU**: Chờ JS gửi xong; layout; draw; composite. Deadline **16.67ms** từ vsync. JS chậm → native chờ → dễ miss vsync.

### 1.2 Tại sao mount nặng >16ms gây dropped frame?

- Khi user tap tab: navigator set state → React schedule re-render **tab mới**.
- **Frame N+1**: React mount component tab (chạy toàn bộ hooks + render). Nếu component nặng (nhiều store, query, useMemo, cây lớn) → **render phase** có thể mất 10–30ms.
- Commit phase chạy **sau** render, rồi mới gửi tree sang native. Nếu render đã >16ms thì cả render + commit vượt 1 frame → native nhận update **trễ 1 frame** → user thấy màn chưa đổi hoặc animation bị giật.
- **Kết luận**: Frame đầu tiên của tab mới **phải** nhẹ (< ~10ms render + commit) thì mới kịp trong 1 frame.

### 1.3 Timeline cụ thể khi user tap tab

```
t=0ms         User tap tab
              → onPress (sync)
              → router.replace('/(tabs)/menu') [sync]
              → Navigator dispatch
              → State update (route index)

t=0–1ms       React nhận update
              → Schedule re-render (tab mới)
              → [CÙNG FRAME HOẶC FRAME TIẾP] component tab mount

t=1–16ms      Frame N+1 (budget 16.67ms):
              - Nếu tab = Shell (2 hook + vài View): ~2–5ms → commit → gửi native → OK
              - Nếu tab = Full content (20+ hook, store, query): 15–40ms → vượt budget → jank

t=16ms        Vsync: native cần pixel mới
              - Đã có tree mới → vẽ skeleton → mượt
              - Chưa có tree → vẽ frame cũ / trắng → khựng

t=250ms       Fade animation (native) kết thúc
              → InteractionManager.runAfterInteractions
              → setReady(true) / setAllowFetch(true)
              → Mount content hoặc bật query (chạy ngoài frame critical)
```

### 1.4 So sánh với Telegram / Instagram

| Khía cạnh | App thường | Telegram / Instagram |
|-----------|------------|----------------------|
| **Tap handler** | Có thể setState/async trước nav | Chỉ dispatch navigation (sync) |
| **Frame đầu tab mới** | Mount full screen (store + query + list) | Mount **shell** (layout + skeleton), ít hook |
| **Fetch** | useEffect/query ngay khi mount | Sau transition (runAfterInteractions / idle) |
| **List** | initialNumToRender lớn | 8–12 item, virtualization tối ưu |
| **Store** | Layout subscribe nhiều | Chỉ component nhỏ subscribe (vd badge) |

→ **Chiến lược**: Frame đầu chỉ **shell**; content + fetch chạy **sau** khi transition (và rAF/idle) để không cướp frame budget.

---

## 2. Hermes + scheduling tuning

### 2.1 Hermes giúp gì cho tab transition?

- **Parse + compile nhanh**: Bytecode precompiled → app mở nhanh, ít block main thread khi load bundle.
- **Execution nhanh**: JIT-free, predictable latency → ít “spike” khi mount component phức tạp.
- **Memory**: Heap nhỏ hơn V8 → ít áp lực GC trên thiết bị yếu.
- **Kết quả**: Cùng 1 mount (vd shell), Hermes thường xong trong vài ms, giảm xác suất vượt 16ms.

### 2.2 GC pause ảnh hưởng frame ra sao?

- GC chạy trên **JS thread**. Khi GC chạy (vài ms – vài chục ms), JS dừng xử lý → render/commit trễ → dễ dropped frame.
- **Giảm ảnh hưởng**: (1) Giữ frame đầu nhẹ (ít allocation: ít object mới khi mount shell). (2) Trì hoãn logic nặng (fetch, tính toán lớn) ra sau transition để không “đụng” đúng frame commit. (3) Hermes GC thường ngắn hơn V8.

### 2.3 inlineRequires ảnh hưởng initial mount thế nào?

- **inlineRequires: true** (Metro): Các module được require **lazy** theo từng chunk thay vì load hết lúc start. **Initial load** giảm → Time to Interactive sớm hơn.
- **Tab mount**: Tab mới có thể trigger load chunk (nếu code-split). Chunk load là async; **lần render đầu** vẫn chạy với code đã có sẵn (vd shell). Content chunk load sau → mount content sau transition → không cướp frame đầu.

### 2.4 Cấu hình production (Hermes + Metro)

- **Hermes**: Bật mặc định với Expo/RN mới. Trong `app.json` / `gradle` không tắt Hermes.
- **Metro** (ví dụ đã có trong project):

```js
// metro.config.js
config.transformer = {
  ...config.transformer,
  inlineRequires: true,  // lazy require → startup nhẹ
  minifierConfig: { ... },
};
config.resolver.blockList = [ ... ];  // tránh watch thừa
```

- **Production build**: Luôn đo trên release (Hermes + minify). Dev build chậm hơn, không đại diện 60fps.

### 2.5 InteractionManager đúng cách

- **runAfterInteractions**: Callback chạy khi **tất cả animation + interaction** hiện tại xong (vd transition tab ~250ms).
- **Dùng cho**: Bật fetch, setState mount content, tính toán nặng. **Không** dùng cho việc phải có trong frame đầu (vd vẽ skeleton).
- **Pattern**: Tab = shell (sync, nhẹ) → sau transition `runAfterInteractions` → setReady(true) / setAllowFetch(true) → mount content hoặc enable query.

```ts
useEffect(() => {
  const task = InteractionManager.runAfterInteractions(() => {
    setReady(true)
  })
  return () => task.cancel()
}, [])
```

### 2.6 requestAnimationFrame chaining

- **rAF** được gọi trước khi native vẽ frame. Dùng khi muốn **chia nhỏ** work qua nhiều frame (vd: xử lý 10 item/frame).
- **Tab transition**: Thường không cần rAF; shell đã đủ nhẹ. Nếu có list rất dài mount sau transition, có thể dùng rAF để spread layout qua vài frame (ít dùng).

### 2.7 unstable_batchedUpdates

- **Batch**: Nhiều setState trong 1 event handler được gộp → 1 re-render. Tránh setState từ nhiều chỗ không batch → nhiều re-render.
- **Tab**: Handler chỉ gọi `router.replace` (không setState). Trong tab, nếu có nhiều setState từ effect/concurrency, React 18 đã auto batch. Chỉ cần tránh setState trong listener/async không được batch (vd setTimeout) nếu có thể gộp.

---

## 3. Concurrent rendering strategy (RN 0.73+)

### 3.1 startTransition

- **Ý nghĩa**: Wrap update “không gấp” (vd kết quả search, filter) vào `startTransition` → React ưu tiên update “gấp” (vd input) trước, update trong transition có thể bị gián đoạn hoặc trì hoãn.
- **Tab**: **Không** dùng cho navigation. Navigation phải sync (dispatch ngay). Dùng cho: filter list, search, toggle UI “phụ” trong màn.

### 3.2 useDeferredValue

- **Ý nghĩa**: Giá trị “trễ 1–2 frame” so với giá trị thật. Dùng cho input tìm kiếm: value nhập hiển thị ngay, list kết quả dùng deferred value → tránh block frame khi gõ.
- **Tab**: Không áp trực tiếp cho “tab index”. Áp cho: search query trong màn (value nhập = urgent, list = deferred).

### 3.3 Suspense + React Query

- **Suspense**: Component treo khi thiếu data; boundary hiện fallback. React Query có thể suspend khi `useSuspenseQuery`.
- **Tab**: Có thể dùng **Suspense boundary** quanh content (sau shell): shell luôn hiện ngay; bên trong `<Suspense fallback={<Skeleton />}>` + query suspend → data về thì content hiện. Cần cấu hình React Query `suspense: true` và boundary đúng chỗ. **Lưu ý**: Suspense vẫn không thay thế “shell mount nhẹ” — frame đầu vẫn phải là shell, không treo.

### 3.4 High vs low priority update

- **High**: User input, navigation. Cần phản hồi trong 1 frame.
- **Low**: Fetch result, filter, analytics. Có thể trì hoãn (startTransition, runAfterInteractions).
- **Tab**: Navigation = high (sync). Mount content + fetch = low (sau transition).

### 3.5 Shell-first architecture (ví dụ production)

```
Tab screen (default export)
├── useState(ready) + useRunAfterTransition(() => setReady(true))
├── if (!ready) return <Shell />   ← Frame đầu: chỉ Shell (0 store, 0 query)
└── return <Content />            ← Sau transition: mount Content (store, query, list)
```

- **Shell**: Chỉ View + Skeleton, không store, không query, không i18n phức tạp (hoặc 1–2 hook tối thiểu).
- **Content**: Mount sau `runAfterInteractions`; bên trong vẫn dùng `allowFetch` + `useRunAfterTransition` để bật query sau interaction.
- **Kết quả**: Frame đầu chỉ Shell → commit <16ms → tab chuyển ngay; nội dung và fetch không cướp frame.

---

## 4. Memory vs smoothness tradeoff

### 4.1 freezeOnBlur

- **Cơ chế**: Màn không focus (blur) bị **freeze** (không re-render, không chạy effect). react-native-screens set `activityState` inactive → native không vẽ.
- **RAM**: Tab vẫn **mount** (instance, hooks), chỉ không vẽ. RAM gần như không đổi.
- **CPU**: Giảm mạnh (không layout/render cho tab ẩn). **Smoothness**: Tốt — chuyển tab không bị re-render tab cũ.
- **Nên bật** cho mọi tab (trong screenOptions).

### 4.2 detachInactiveScreens

- **true**: Tab không active bị **tháo khỏi cây view native** (unmount view, có thể unmount component tùy implementation). Khi quay lại tab → attach lại → có thể nháy/trễ.
- **false**: Tab không active vẫn **ở trong cây**, chỉ freeze. Chuyển lại tab chỉ cần unfreeze → mượt.
- **RAM**: `true` tiết kiệm RAM hơn (ít view hơn). `false` tốn hơn (giữ toàn bộ view).
- **Smoothness**: `false` mượt hơn (fade giữa 2 màn đã có sẵn). **Khuyến nghị**: `false` cho tab (ưu tiên UX), trừ khi RAM rất hạn chế.

### 4.3 lazy

- **true**: Tab chưa mở **không mount** lần đầu. Lần đầu tap tab mới mount → có thể chậm 1 lần; các lần sau đã mount thì chỉ switch.
- **false**: Tất cả tab mount sẵn (ẩn). Chuyển tab không tốn mount → mượt; tốn RAM và CPU ban đầu hơn.
- **Khuyến nghị**: **lazy: true** + **shell** cho tab nặng. Lần đầu vào tab vẫn chỉ mount shell → nhẹ; sau đó mới mount content.

### 4.4 Khi nào giữ tab mounted? Khi nào detach?

- **Giữ mounted (detachInactiveScreens: false)**: Tab bar 4–5 tab, RAM đủ. Ưu tiên chuyển tab mượt.
- **Detach (true)**: Tab rất nhiều (vd 10+), hoặc mỗi tab cực nặng, thiết bị yếu. Chấp nhận nháy/trễ khi quay lại.
- **Hybrid kiểu Telegram**: 4–5 tab chính, **lazy: true** (chưa mở không mount), **detachInactiveScreens: false** (đã mở thì giữ, freeze). Cân bằng RAM và smoothness.

### 4.5 Ảnh hưởng RAM và CPU (tóm tắt)

| Cấu hình | RAM | CPU (khi chuyển tab) | Smoothness |
|----------|-----|------------------------|------------|
| freezeOnBlur: true | ~ | Giảm (không render tab ẩn) | Tốt |
| detachInactiveScreens: false | Cao hơn | Thấp (chỉ đổi visibility) | Tốt nhất |
| detachInactiveScreens: true | Thấp hơn | Có peak khi attach lại | Có thể nháy |
| lazy: true | Thấp (tab chưa mở) | Lần đầu vào tab có mount | OK nếu shell nhẹ |

---

## 5. Production checklist (debug thực tế)

### 5.1 Handler navigation

- [ ] Tab handler **chỉ** gọi `router.replace(...)` (hoặc navigate tương đương), sync.
- [ ] Không `await`, không `setState`, không `InteractionManager` / `setTimeout` **trước** replace.
- [ ] Không prefetch / không gọi API trong handler.

### 5.2 Store subscription

- [ ] Layout (tabs layout) **không** subscribe Zustand (cart, user, …). Chỉ component con nhỏ (vd FloatingCartButton) subscribe.
- [ ] Selector trả về **primitive** (number, string) hoặc ít field; tránh `state => state.wholeObject`.
- [ ] Tách màn thành component nhỏ theo từng phần store cần dùng.

### 5.3 Query timing

- [ ] Query **không** enabled ngay khi mount. Dùng `enabled: allowFetch && ...`, `allowFetch` set trong `useRunAfterTransition`.
- [ ] Hoặc content (có query) chỉ mount **sau** transition (shell trước, content sau).

### 5.4 FlatList

- [ ] `initialNumToRender` ≤ 12 (vd 10).
- [ ] `windowSize` 5–11 (vd 5).
- [ ] `maxToRenderPerBatch` 8–12.
- [ ] `keyExtractor` ổn định; `renderItem` dùng component tách hoặc useCallback.
- [ ] Dùng `FLATLIST_PROPS` từ `constants/list.config.ts` nếu có.

### 5.5 First paint shell

- [ ] Tab màn “nặng” export **wrapper**: frame đầu render **shell** (View + Skeleton), ít hook (vd 2).
- [ ] Shell **không** store, **không** query, **không** i18n nặng.
- [ ] Sau `runAfterInteractions` mới set state mount **content** (có store, query, list).

### 5.6 Concurrent features

- [ ] **Không** dùng startTransition cho navigation.
- [ ] Có thể dùng startTransition/useDeferredValue cho search/filter **trong** màn.
- [ ] Nếu dùng Suspense + React Query: boundary nằm **bên trong** content (sau shell), không treo frame đầu.

### 5.7 Tabs config

- [ ] `freezeOnBlur: true`.
- [ ] `lazy: true`.
- [ ] `detachInactiveScreens: false` (nếu ưu tiên mượt).
- [ ] `animation: 'fade'`, `transitionSpec` ~250ms.

### 5.8 Đo lường

- [ ] Test trên **release** build (Hermes + minify).
- [ ] Bật “Show Perf Monitor” / FPS meter; chuyển tab nhiều lần, không drop dưới 60fps.
- [ ] Timeline: tap → màn mới hiện trong 1 frame (skeleton); sau ~250ms content/data.

---

## 6. Tóm tắt chiến lược (Instagram/Telegram-style)

1. **Tap = sync dispatch** → không block, không setState/async trước.
2. **Frame đầu = shell only** → mount <16ms, commit kịp 1 frame.
3. **Sau transition** → `runAfterInteractions` → mount content + bật fetch.
4. **Skeleton-first** → không return null; luôn có layout + skeleton.
5. **Store** → subscribe tối thiểu, primitive, tách component.
6. **List** → initialNumToRender nhỏ, windowSize vừa phải.
7. **Tabs** → freezeOnBlur, lazy, detachInactiveScreens: false.
8. **Hermes + inlineRequires** → bật; đo trên release.

File tham chiếu implementation: `docs/PERFORMANCE_TAB_TRANSITION.md`, `app/(tabs)/menu.tsx` (MenuScreen + MenuSkeletonShell + ClientMenuContent), `hooks/use-run-after-transition.ts`, `constants/navigation.config.ts`, `constants/list.config.ts`.
