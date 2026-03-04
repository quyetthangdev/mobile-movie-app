# Deep Architecture Audit — React Native Performance

**Ngày audit:** 2025-03-03  
**Phạm vi:** Navigation, Rendering, State, Animation, Data Flow, Performance Risks  
**Giả định scale:** 100k+ DAU

---

## 1. Architecture Level Score

### **Overall: L3 (Production)**

**Lý do:**

| Tiêu chí | Đánh giá | Chi tiết |
|----------|----------|----------|
| **Navigation** | L3–L4 | JS Stack toàn bộ, spring physics, transition lock, MasterTransitionProvider (Home/Menu). Root/Auth/Profile dùng `scheduleUnlock` timeout thay vì `transitionEnd` |
| **Rendering** | L2–L3 | FlashList có dùng nhưng thiếu `estimatedItemSize`, nhiều subscription rời rạc, `I18nProvider` subscribe full store |
| **State** | L3 | Zustand + persist, selectors có `useShallow`, order-flow.store lớn (1200+ dòng), cross-store `getState` |
| **Animation** | L3–L4 | Reanimated, spring config thống nhất, ParallaxDriver, `TransitionProgressSyncer` |
| **Data Flow** | L2–L3 | TanStack Query, không optimistic update, `failedQueue` cho token refresh |

**Chưa đạt L4/L5 vì:**
- Transition chạy trên JS thread (JS Stack) → dễ jank khi JS bận
- Nhiều subscription không gộp → re-render dư
- Root stack không dùng `transitionEnd` để unlock → phụ thuộc timeout
- FlashList thiếu `estimatedItemSize` → ảnh hưởng virtualization

---

## 2. Critical Problems (Top 5)

### P1: I18nProvider — Full Store Subscription

**Root cause:** `useUserStore.subscribe(syncLanguage)` lắng nghe mọi thay đổi store.

**Cơ chế:** Zustand `subscribe` không có selector → bất kỳ `set()` nào trên `useUserStore` đều gọi `syncLanguage`. `syncLanguage` chỉ cần `userInfo?.language` nhưng vẫn chạy khi `userInfo` thay đổi bất kỳ field nào.

**Runtime impact:** Mỗi lần user info thay đổi (profile, cart count, v.v.) → `syncLanguage` chạy → `i18n.changeLanguage` (nếu cần) → re-render cây I18n.

**Triệu chứng:** Re-render không cần thiết khi cập nhật profile, cart, v.v.

**Severity:** Trung bình — không block nhưng tăng tải JS.

---

### P2: ClientMenus + MenuItemQuantityControl — 6–7 Subscriptions Rời Rạc

**Root cause:** Mỗi `useOrderFlowStore((s) => ...)` tạo một subscription riêng.

**File:** `components/menu/client-menus.tsx`, `components/menu/menu-item-quantity-control.tsx`

```tsx
// ClientMenus: 6 subscriptions
const hasOrderingData = useOrderFlowStore((s) => !!s.orderingData)
const orderingOwner = useOrderFlowStore((s) => s.orderingData?.owner ?? '')
const isHydrated = useOrderFlowStore((s) => s.isHydrated)
const currentStep = useOrderFlowStore((s) => s.currentStep)
const setCurrentStep = useOrderFlowStore((s) => s.setCurrentStep)
const initializeOrdering = useOrderFlowStore((s) => s.initializeOrdering)
```

**Cơ chế:** Zustand so sánh kết quả selector bằng `Object.is`. `orderingData` thay đổi → 2 subscription (`hasOrderingData`, `orderingOwner`) re-run. `currentStep` thay đổi → 1 subscription. Mỗi lần `set()` → nhiều component re-render vì mỗi selector là một listener riêng.

**Runtime impact:** `initializeOrdering()` gọi `set()` → ClientMenus + mọi MenuItemQuantityControl re-render. Với 50 item menu → 50+ component re-render.

**Triệu chứng:** Jank khi mở menu lần đầu hoặc khi thêm item vào cart.

**Severity:** Cao — ảnh hưởng trực tiếp màn Menu.

---

### P3: FlashList Thiếu `estimatedItemSize`

**Root cause:** FlashList yêu cầu `estimatedItemSize` để tính layout và virtualization.

**File:** `components/menu/client-menus.tsx`, `app/update-order/components/update-order-menus.tsx`

```tsx
<FlashList
  data={group.items}
  renderItem={renderItem}
  keyExtractor={keyExtractor}
  numColumns={numColumns}
  scrollEnabled={false}
  // THIẾU: estimatedItemSize
/>
```

**Cơ chế:** Không có `estimatedItemSize`, FlashList phải measure từng item → layout pass chậm, virtualization kém hiệu quả.

**Runtime impact:** Mount chậm hơn, scroll có thể giật khi list dài.

**Triệu chứng:** Menu nhiều catalog, update-order nhiều item → scroll không mượt.

**Severity:** Trung bình — rõ khi list > 20 item.

---

### P4: Root/Auth/Profile Stack — Không Dùng `transitionEnd` Để Unlock

**Root cause:** Chỉ Home và Menu dùng `StackWithMasterTransition` (có `screenListeners`). Root, Auth, Profile, Payment, UpdateOrder dùng `JsStack` trực tiếp, không có `screenListeners`.

**Cơ chế:** `executeNav` gọi `scheduleUnlock()` → unlock qua `EARLY_UNLOCK_MS` (350ms) và `FAILSAFE_UNLOCK_MS` (600ms). `transitionEnd` của `@react-navigation/stack` vẫn fire nhưng không có listener → không gọi `unlockNavigation()`. Unlock hoàn toàn dựa vào timeout.

**Runtime impact:** Nếu transition thực tế > 350ms (máy chậm, nhiều màn) → unlock sớm, user có thể double-tap. Nếu < 350ms → user phải chờ thêm.

**Triệu chứng:** Đôi khi double-tap vẫn push 2 màn (Auth, Profile).

**Severity:** Trung bình — phụ thuộc thiết bị và tải.

---

### P5: order-flow.store — Cross-Store `getState` Trong Actions

**Root cause:** `initializeOrdering` và nhiều action khác gọi `useUserStore.getState().getUserInfo()` trực tiếp.

**File:** `stores/order-flow.store.ts` (khoảng dòng 260–280)

```tsx
owner: useUserStore.getState().getUserInfo()?.slug || '',
ownerFullName: `${useUserStore.getState().getUserInfo()?.firstName || ''} ...`
```

**Cơ chế:** Mỗi lần `initializeOrdering` chạy → 5+ lần `useUserStore.getState()`. Không gây re-render nhưng tạo coupling chặt, khó test, dễ lỗi khi refactor.

**Runtime impact:** Nhẹ — `getState()` rẻ. Chủ yếu là vấn đề kiến trúc.

**Triệu chứng:** Không rõ, nhưng tăng rủi ro khi tách/sửa store.

**Severity:** Trung bình — technical debt.

---

## 3. Hidden Problems

### H1: Dual Cart Store (cart.store + order-flow.store)

**Mô tả:** `cart.store` và `order-flow.store` đều chứa logic giỏ hàng. Cart screen dùng `useOrderFlowStore`. `cart.store` vẫn được dùng ở một số chỗ (ví dụ `addCustomerInfo` gọi `requestClearStoresExcept('cart')`).

**Rủi ro:** Hai nguồn sự thật → sync lệch, bug khó tái hiện khi flow phức tạp.

---

### H2: 20+ Persisted Stores — JSON Serialization

**Mô tả:** Nhiều store dùng `persist` với `createJSONStorage(AsyncStorage)`. Mỗi `set()` → serialize toàn bộ state đã `partialize` → ghi AsyncStorage.

**Rủi ro:** Khi scale (order-flow với nhiều item, nhiều store persist) → serialize/deserialize nặng, có thể block JS thread 10–50ms. AsyncStorage I/O cũng tăng khi state lớn.

---

### H3: FadeInDown.delay(index * 50) — Staggered Mount

**File:** `components/menu/client-menus.tsx`, `app/profile/history.tsx`, v.v.

**Mô tả:** Mỗi item có `entering={FadeInDown.delay(index * 50).springify()}`. 50 item → delay tới 2.5s. Reanimated layout animation chạy trên UI thread nhưng vẫn cần mount toàn bộ item.

**Rủi ro:** Khi list dài, mount 50+ item cùng lúc (dù có delay) → spike JS. FlashList với `scrollEnabled={false}` vẫn render tất cả item trong viewport.

---

### H4: scheduleUnlock vs transitionEnd — Race

**Mô tả:** `scheduleUnlock` đặt 2 timeout. `MasterTransitionProvider` gọi `unlockNavigation` trong `transitionEnd`. Nếu `transitionEnd` fire trước timeout → unlock đúng. Nếu `transitionEnd` chậm (Android, máy yếu) → timeout unlock trước → user có thể tap lại. Nếu `transitionEnd` không fire (edge case) → `cancelScheduledUnlockTimers` không được gọi → timeout vẫn unlock.

**Rủi ro:** Trên một số thiết bị/Android, timing lệch → double-tap hoặc lock kéo dài.

---

### H5: MenuItemDetailContent — Mount Cost Sau Transition

**Mô tả:** `app/menu/[slug].tsx` dùng `InteractionManager.runAfterInteractions` + `setTimeout(50)` để trì hoãn mount `ProductImageCarousel`, `SliderRelatedProducts`, `variants.map`. Dù vậy, mount vẫn xảy ra trong vòng ~100ms sau `transitionEnd`.

**Rủi ro:** Trên máy chậm, mount 30–60ms có thể trùng với 1–2 frame cuối transition → cảm giác khựng ở cuối animation.

---

## 4. Optimization Roadmap

### Phase 1 — Immediate Fixes (1–2 ngày)

| # | Task | Expected Gain |
|---|------|----------------|
| 1 | **I18nProvider:** Chỉ subscribe `userInfo?.language` — dùng `useUserStore.subscribeWithSelector` hoặc `subscribe((state, prev) => { if (state.userInfo?.language !== prev.userInfo?.language) syncLanguage() })` | Giảm re-render mỗi khi user store thay đổi |
| 2 | **ClientMenus + MenuItemQuantityControl:** Gộp selector thành 1 với `useShallow`, ví dụ `useOrderFlowStore(useShallow((s) => ({ hasOrderingData: !!s.orderingData, orderingOwner: s.orderingData?.owner ?? '', ... })))` | Giảm re-render mạnh khi `initializeOrdering` |
| 3 | **FlashList:** Thêm `estimatedItemSize` (ví dụ 200 cho menu item, 120 cho cart item) | Cải thiện mount và scroll |
| 4 | **Root JsStack:** Thêm `screenListeners` từ `MasterTransitionProvider` (hoặc tạo wrapper tương tự `StackWithMasterTransition` cho Root) | Unlock chính xác theo `transitionEnd` |

---

### Phase 2 — Structural Improvements (3–5 ngày)

| # | Task | Expected Gain |
|---|------|----------------|
| 1 | **order-flow selectors:** Tạo `useOrderFlowMenuSelector`, `useOrderFlowCartSelector` — dùng chung cho ClientMenus, MenuItemQuantityControl, CartItemRow | Giảm duplicate subscriptions, dễ bảo trì |
| 2 | **Cart dual store:** Thống nhất dùng order-flow hoặc cart.store; deprecate hoặc migrate logic còn lại | Tránh sync lệch, đơn giản hóa flow |
| 3 | **order-flow.store:** Tách `useUserStore.getState()` ra khỏi actions — dùng tham số hoặc inject từ caller | Giảm coupling, dễ test |
| 4 | **Persist:** Đánh giá lại store nào cần persist; có thể tách `orderingData`/`paymentData` ra store riêng, persist nhẹ hơn | Giảm serialize/deserialize khi state lớn |

---

### Phase 3 — Advanced Optimization (1–2 tuần)

| # | Task | Expected Gain |
|---|------|----------------|
| 1 | **Native Stack cho Root/Auth/Profile:** Cân nhắc dùng Native Stack cho các stack không cần parallax — transition chạy trên UI thread | Giảm jank khi JS bận |
| 2 | **Optimistic updates:** Thêm `onMutate` cho `useCreateOrder`, `useUpdateOrder` — cập nhật UI ngay, rollback nếu lỗi | UX nhanh hơn, ít chờ loading |
| 3 | **FadeInDown stagger:** Giảm delay (ví dụ 20ms thay vì 50ms) hoặc chỉ áp dụng cho 10 item đầu | Giảm thời gian animation tổng |
| 4 | **MenuItemDetailContent:** Thử `useDeferredValue` hoặc lazy load `SliderRelatedProducts` (chỉ mount khi scroll tới) | Giảm mount cost ban đầu |

---

## 5. Target Architecture

### Navigation

- **Home, Menu:** Giữ `StackWithMasterTransition` (parallax, `transitionEnd` unlock).
- **Root, Auth, Profile, Payment, UpdateOrder:** Thêm `screenListeners` (transitionEnd) hoặc dùng Native Stack nếu không cần custom interpolator.
- **Transition lock:** Mọi stack đều unlock qua `transitionEnd` là chính, timeout là fallback.

### Rendering

- **Store subscriptions:** Mỗi màn/component dùng 1 selector gộp với `useShallow`, tránh 5–7 subscription rời.
- **FlashList:** Luôn có `estimatedItemSize`, `keyExtractor` ổn định.
- **I18nProvider:** Chỉ phản ứng với thay đổi `language`.

### State

- **Cart/Order:** Một nguồn sự thật (order-flow hoặc cart.store, không trùng).
- **order-flow.store:** Tách nhỏ theo phase (ordering, payment, updating) hoặc dùng slice pattern.
- **Persist:** Chỉ persist store cần thiết; state lớn (order items) cân nhắc lazy load hoặc giới hạn kích thước.

### Animation

- **Transition:** Spring physics thống nhất (đã có).
- **Layout animation:** Stagger nhẹ, tránh delay quá lớn khi list dài.
- **Mount defer:** Giữ `runAfterInteractions` + delay ngắn cho màn nặng.

### Data Flow

- **TanStack Query:** Thêm optimistic update cho create/update order.
- **HTTP:** Giữ `failedQueue` cho token refresh.
- **Store updates:** `scheduleStoreUpdate` khi transition lock — giữ nguyên.

---

## Appendix: File Reference

| File | Vai trò |
|------|---------|
| `layouts/js-stack.tsx` | JsStack, jsStackScreenOptions, jsStackSimpleScreenOptions |
| `layouts/stack-with-master-transition.tsx` | Wrapper có screenListeners (Home, Menu) |
| `lib/navigation/master-transition-provider.tsx` | transitionProgress, transitionEnd → unlockNavigation |
| `lib/navigation/navigation-lock.ts` | scheduleUnlock (timeout), unlockNavigation |
| `lib/navigation/transition-lock.ts` | isTransitionLocked, acquireTransitionLock |
| `providers/i18n-provider.tsx` | useUserStore.subscribe(syncLanguage) — P1 |
| `components/menu/client-menus.tsx` | 6 subscriptions, FlashList thiếu estimatedItemSize |
| `components/menu/menu-item-quantity-control.tsx` | 7 subscriptions |
| `stores/order-flow.store.ts` | Cross-store getState, 1200+ dòng |
| `constants/motion.ts` | MOTION.jsStack, SPRING_CONFIGS |
