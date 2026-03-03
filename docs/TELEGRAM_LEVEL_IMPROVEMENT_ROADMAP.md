# Roadmap: Nâng Cấp Lên Mức Telegram

> Phương án cải thiện triệt để dựa trên Deep Architecture Audit. Mục tiêu: mượt như Telegram trên heavy navigation, realtime, overlays, low-end Android.

---

## Tổng Quan

| Phase | Mục tiêu | Effort | Impact |
|-------|----------|--------|--------|
| **Phase 1** | Rendering Isolation | 2-3 ngày | Cao |
| **Phase 2** | State + Store Architecture | 3-4 ngày | Cao |
| **Phase 3** | List + Overlay Performance | 2-3 ngày | Trung bình |
| **Phase 4** | Animation + Motion Tokens | 1-2 ngày | Trung bình |
| **Phase 5** | Event-Driven + Realtime Ready | 4-5 ngày | Dài hạn |

---

## Phase 1: Rendering Isolation (Ưu tiên cao nhất)

### 1.1 Chuẩn hóa Zustand Selectors

**Vấn đề:** ~20 component dùng full destructuring → re-render toàn cục khi bất kỳ field nào thay đổi.

**Quy tắc áp dụng:**
```
✅ useStore((s) => s.field)           — single primitive/stable ref
✅ useStore(useShallow((s) => ({ a: s.a, b: s.b }))) — multiple, shallow compare
❌ const { a, b, c } = useStore()     — full subscription
```

**Danh sách file cần sửa (theo thứ tự impact):**

| # | File | Thay đổi |
|---|------|----------|
| 1 | `components/sheet/voucher-list-drawer.tsx` | 4 selector riêng hoặc useShallow |
| 2 | `components/dialog/create-order-dialog.tsx` | orderingData + transitionToPayment selector |
| 3 | `app/profile/verify-email.tsx` | token, userInfo selectors |
| 4 | `components/dropdown/table-dropdown.tsx` | getCartItems, addTable, branch selectors |
| 5 | `components/select/table-select-sheet.tsx` | getCartItems, addTable |
| 6 | `app/update-order/components/table-select-sheet-in-update-order.tsx` | branch, updatingData, setDraftTable |
| 7 | `app/update-order/components/confirm-update-order-dialog.tsx` | updatingData, clearUpdatingData |
| 8 | `app/update-order/components/table-select-in-update-order.tsx` | branch, updatingData |
| 9 | `app/profile/history.tsx` | userInfo, getUserInfo |
| 10 | `components/branch/select-branch-dropdown.tsx` | branch, setBranch |
| 11 | `components/cart/select-order-type-dropdown.tsx` | branch, setBranch |
| 12 | `components/dialog/settings-dropdown.tsx` | userInfo, setUserInfo |
| 13 | `components/dialog/delete-cart-item-dialog.tsx` | removeOrderingItem, getCartItems, removeVoucher |
| 14 | `components/dialog/delete-all-cart-dialog.tsx` | clearAllData |
| 15 | `hooks/use-order-type-options.ts` | setOrderingType, getCartItems |
| 16 | `hooks/use-pickup-time.ts` | getCartItems, addPickupTime |
| 17 | Các file còn lại (payment, loyalty-point, radio, price-range-filter) | Tương tự |

**Template refactor:**
```tsx
// Trước
const { getCartItems, addVoucher, removeVoucher, isHydrated } = useOrderFlowStore()

// Sau — Option A: Split selectors (actions stable)
const getCartItems = useOrderFlowStore((s) => s.getCartItems)
const addVoucher = useOrderFlowStore((s) => s.addVoucher)
const removeVoucher = useOrderFlowStore((s) => s.removeVoucher)
const isHydrated = useOrderFlowStore((s) => s.isHydrated)

// Sau — Option B: useShallow khi cần nhiều field data
const { orderingData, transitionToPayment } = useOrderFlowStore(
  useShallow((s) => ({ orderingData: s.orderingData, transitionToPayment: s.transitionToPayment }))
)
```

### 1.2 Store Selector Layer

Tạo `stores/selectors/` — export selector hooks chuẩn hóa:

```ts
// stores/selectors/order-flow.selectors.ts
import { useShallow } from 'zustand/react/shallow'
import { useOrderFlowStore } from '../order-flow.store'

export const useOrderingData = () => useOrderFlowStore((s) => s.orderingData)
export const useUpdatingData = () => useOrderFlowStore((s) => s.updatingData)
export const useOrderFlowActions = () => useOrderFlowStore(useShallow((s) => ({
  addOrderingItem: s.addOrderingItem,
  setCurrentStep: s.setCurrentStep,
  initializeOrdering: s.initializeOrdering,
  // ...
})))
```

→ Component import từ selectors thay vì store trực tiếp.

---

## Phase 2: State + Store Architecture

### 2.1 Kích hoạt scheduleStoreUpdate

**Vấn đề:** Store update chạy trong transition → cascade re-render → drop frame.

**Giải pháp:** Wrap các store update nặng (addOrderingItem, addDraftItem, updateOrderingItemQuantity, ...) trong `scheduleStoreUpdate` khi gọi từ UI trong transition.

```ts
// lib/navigation/store-safe-scheduler.ts — đã có
// Cần wire vào các action gọi từ:
// - NativeGesturePressable onPress
// - BottomSheet content
// - Modal/Dialog submit

// Ví dụ: trong addOrderingItem của store, hoặc tại call site
import { scheduleStoreUpdate } from '@/lib/navigation'

// Tại call site (ClientMenuItem handleAddToCart):
const addOrderingItem = useOrderFlowStore((s) => s.addOrderingItem)
const handleAddToCart = () => {
  scheduleStoreUpdate(() => addOrderingItem(orderItem))
}
```

**Lưu ý:** `scheduleStoreUpdate` queue khi `isTransitionQueueing`, flush sau transition + 100ms. Cần đảm bảo UX vẫn OK (toast, feedback có thể delay nhẹ).

### 2.2 Thống nhất Cart / OrderFlow

**Hiện trạng:** `useCartItemStore` + `useOrderFlowStore.orderingData` — hai nguồn sự thật.

**Phương án A (Khuyến nghị):** Deprecate cart.store
- Migrate toàn bộ sang order-flow
- `store-sync-setup` thêm `order-flow` vào clear chain
- Xóa cart.store sau khi migrate xong

**Phương án B:** Rõ vai trò
- cart.store: "draft cart" tạm (chưa vào flow)
- order-flow: "active flow" (ordering/payment/updating)
- Contract: khi vào cart screen → sync cart → order-flow, clear cart

### 2.3 Realtime Sync Readiness

Để sẵn sàng websocket / multi-device:
- **Atomic updates:** Mỗi action chỉ set 1 slice, tránh set({ a, b, c }) lớn
- **Optimistic UI:** Update local trước, rollback nếu API fail
- **Delta sync:** Store lưu `lastSyncedAt`, API trả delta thay vì full state

---

## Phase 3: List + Overlay Performance

### 3.1 FlashList cho List Lớn

**Hiện trạng:** FlatList cho menu, cart, history, voucher.

**Đề xuất:** Dùng `@shopify/flash-list` cho:
- `ClientMenus` (menu items)
- `UpdateOrderMenus`
- `VoucherListDrawer` (BottomSheetFlatList → FlashList nếu hỗ trợ)
- `app/profile/history.tsx` (order history)

**FlashList yêu cầu:**
- `estimatedItemSize` chính xác
- Không dùng `key` prop trên item (phá recycling)
- `getItemType` khi có nhiều loại cell

### 3.2 Memo renderItem

Các list chưa memo:
- `table-select-sheet.tsx` — renderItem inline
- `table-select-sheet-in-update-order.tsx` — tương tự
- `voucher-list-drawer.tsx` — renderItem inline
- `carousel.tsx` — renderItem inline

**Chuẩn:**
```tsx
const renderItem = useCallback(
  ({ item }: { item: T }) => <MemoizedRow item={item} />,
  []
)
```

### 3.3 Overlay Ownership

**Vấn đề:** BottomSheet trong stack + `freezeOnBlur` → có thể freeze content.

**Giải pháp:**
- Render BottomSheet qua Portal (ngoài stack) nếu @gorhom/bottom-sheet hỗ trợ
- Hoặc tắt `freezeOnBlur` khi BottomSheet mở (screen listener)
- Tránh module-level ref (`sheetRef`, `openCallback`) — dùng Context hoặc ref từ component cha

---

## Phase 4: Animation + Motion Tokens

### 4.1 Tập trung Motion Tokens

Tạo `constants/motion.ts`:

```ts
export const MOTION = {
  // Transition
  transitionDurationMs: 220,
  transitionDurationIos: 250,

  // Press scale (NativeGesturePressable, etc.)
  pressScale: 0.97,
  pressScaleSpring: { damping: 15, stiffness: 400 },

  // Modal/Sheet
  modalScale: 0.95,
  modalSpring: { damping: 20, stiffness: 300 },

  // Parallax
  parallaxFactor: 0.3,
  shadowOpacityEnd: 0.15,
} as const
```

Import từ đây thay vì hardcode.

### 4.2 Reanimated Feature Flags (Android)

Trong `app.json` hoặc Reanimated config:
```json
{
  "reactNativeReanimated": {
    "android": {
      "enableSynchronousUIUpdates": true
    }
  }
}
```

Giúp giảm jank trên low-end Android (Reanimated docs).

### 4.3 sharedValue trong Map

Các carousel (swipper-banner, store-carousel, product-image-carousel) dùng `useSharedValue` trong component được render trong map. Mỗi item có instance riêng → OK. Đảm bảo không recreate khi parent re-render (component tách riêng, memo).

---

## Phase 5: Event-Driven + CQRS (Dài hạn)

### 5.1 Command / Query Tách Biệt

**Ý tưởng:** UI không subscribe store trực tiếp. Emit command → handler cập nhật store → UI subscribe query (selector hẹp).

```
UI → emit('cart.addItem', item) → CommandHandler → store.addOrderingItem(item)
UI ← useQuery('cart.items') ← selector
```

**Lợi ích:** Trace được mọi thay đổi, dễ test, dễ replay.

**Công cụ:** Có thể dùng Effector, Eventrix, hoặc custom event bus nhẹ.

### 5.2 Cross-Layer Cleanup

| Vi phạm | Giải pháp |
|---------|-----------|
| api/chef-area.ts → stores | Tách logic download ra `hooks/use-download.ts`, api chỉ gọi callback |
| utils/google-map.ts → hooks | Đưa logic vào `hooks/use-branch-delivery.ts` |
| app/profile/* → app/profile/* | Chuyển shared components sang `components/profile/` |

---

## Thứ Tự Thực Hiện Đề Xuất

```
Tuần 1: Phase 1.1 (selector refactor) — 15-17 file
Tuần 2: Phase 1.2 (selector layer) + Phase 2.1 (scheduleStoreUpdate)
Tuần 3: Phase 2.2 (cart/order-flow) + Phase 3.1 (FlashList)
Tuần 4: Phase 3.2-3.3 (memo, overlay) + Phase 4 (motion)
Tuần 5+: Phase 5 (event-driven) — optional, dài hạn
```

---

## Metrics Đo Lường

| Metric | Hiện tại | Mục tiêu |
|--------|----------|----------|
| Transition FPS (min) | 9-45 (không ổn định) | ≥45 consistent |
| VirtualizedList dt | 3273ms (1 case) | <100ms |
| Full-store subscriptions | ~20 | 0 |
| scheduleStoreUpdate usage | 0 | Có cho cart/order actions |

---

## Tài Liệu Tham Khảo

- [Zustand useShallow](https://github.com/pmndrs/zustand/blob/main/docs/guides/prevent-rerenders-with-use-shallow.md)
- [Reanimated Performance](https://docs.swmansion.com/react-native-reanimated/docs/guides/performance/)
- [FlashList Best Practices](https://shopify.github.io/flash-list/docs/fundamentals/performant-components/)
- [Telegram Android Architecture](https://typevar.dev/articles/DrKLO/Telegram)

---

## Checklist Nhanh (Phase 1)

```
[ ] voucher-list-drawer.tsx
[ ] create-order-dialog.tsx
[ ] verify-email.tsx
[ ] table-dropdown.tsx
[ ] table-select-sheet.tsx
[ ] table-select-sheet-in-update-order.tsx
[ ] confirm-update-order-dialog.tsx
[ ] table-select-in-update-order.tsx
[ ] profile/history.tsx
[ ] select-branch-dropdown.tsx
[ ] select-order-type-dropdown.tsx
[ ] settings-dropdown.tsx
[ ] delete-cart-item-dialog.tsx
[ ] delete-all-cart-dialog.tsx
[ ] use-order-type-options.ts
[ ] use-pickup-time.ts
[ ] payment/[order].tsx
[ ] loyalty-point.tsx
[ ] price-range-filter.tsx
[ ] payment-method-radio-group.tsx
[ ] verify-phone-number.tsx
[ ] update-order-quantity-native.tsx
[ ] order-note-in-update-order-input.tsx
[ ] order-item-note-in-update-order-input.tsx
[ ] remove-order-item-in-update-order-dialog.tsx
[ ] menu/[slug].tsx (userInfo)
```
