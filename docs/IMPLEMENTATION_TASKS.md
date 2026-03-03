# Implementation Tasks — Chi Tiết Theo Từng Task

> Chia nhỏ roadmap thành các task có thể implement trong 15–45 phút. Mỗi task độc lập, có scope rõ, dễ review.

---

## Tổng Quan Nhanh

| Batch | Tasks | Số lượng | Ước lượng |
|-------|-------|----------|-----------|
| P1.1 Sheet & Drawer | T-101, T-102 | 2 | ~25m |
| P1.2 Dialog | T-103 → T-106 | 4 | ~55m |
| P1.3 Select & Dropdown | T-107 → T-109 | 3 | ~40m |
| P1.4 Update Order | T-110 → T-115 | 6 | ~40m |
| P1.5 Profile & Auth | T-116 → T-119 | 4 | ~40m |
| P1.6 Branch, Cart, Settings | T-120 → T-124 | 5 | ~40m |
| P1.7 Hooks & Screens | T-125 → T-128 | 4 | ~30m |
| P1.8 Selector Layer | T-129, T-130 | 2 | ~50m |
| P2 scheduleStoreUpdate | T-201 → T-205 | 5 | ~70m |
| P3 List & Overlay | T-301 → T-307 | 7 | ~2.5h |
| P4 Motion | T-401 → T-405 | 5 | ~40m |
| P5 Event-Driven | T-501 → T-504 | 4 | ~2.5h |

**Tổng:** ~54 tasks, ước lượng ~15–20 giờ làm việc (không kể review, test).

---

## Quy ước

| Ký hiệu | Ý nghĩa |
|---------|---------|
| **T-xxx** | Task ID |
| **P1** | Phase 1 |
| **~15m** | Ước lượng thời gian |
| **Blocked by** | Task phụ thuộc |

---

# Phase 1: Rendering Isolation

## Batch 1.1 — Sheet & Drawer (Impact cao: BottomSheet mở thường xuyên)

### T-101 | voucher-list-drawer.tsx — OrderFlow selectors
- **Phase:** P1
- **Effort:** ~20m
- **File:** `components/sheet/voucher-list-drawer.tsx`
- **Thay đổi:**
  - `const { getCartItems, addVoucher, removeVoucher, isHydrated } = useOrderFlowStore()` 
  - → 4 selector riêng: `useOrderFlowStore((s) => s.getCartItems)` ...
- **Verify:** Mở voucher drawer, add voucher → không re-render toàn sheet khi cart quantity thay đổi (dùng React DevTools Profiler)

### T-102 | voucher-list-drawer.tsx — UserStore selector
- **Phase:** P1
- **Effort:** ~5m
- **File:** `components/sheet/voucher-list-drawer.tsx`
- **Thay đổi:** `const { userInfo } = useUserStore()` → `const userInfo = useUserStore((s) => s.userInfo)`
- **Blocked by:** T-101 (cùng file, làm chung)

---

## Batch 1.2 — Dialog (Impact cao: mở khi checkout)

### T-103 | create-order-dialog.tsx — OrderFlow + UserStore + BranchStore
- **Phase:** P1
- **Effort:** ~25m
- **File:** `components/dialog/create-order-dialog.tsx`
- **Thay đổi:**
  - OrderFlow: `useShallow((s) => ({ orderingData: s.orderingData, transitionToPayment: s.transitionToPayment }))`
  - UserStore: `userInfo`, `getUserInfo` — 2 selector
  - BranchStore: `branch` — 1 selector

### T-104 | delete-cart-item-dialog.tsx — OrderFlow selectors
- **Phase:** P1
- **Effort:** ~15m
- **File:** `components/dialog/delete-cart-item-dialog.tsx`
- **Thay đổi:** `removeOrderingItem`, `getCartItems`, `removeVoucher` — 3 selector

### T-105 | delete-all-cart-dialog.tsx — OrderFlow selector
- **Phase:** P1
- **Effort:** ~5m
- **File:** `components/dialog/delete-all-cart-dialog.tsx`
- **Thay đổi:** `clearAllData` — 1 selector

### T-106 | confirm-update-order-dialog.tsx — OrderFlow selectors
- **Phase:** P1
- **Effort:** ~10m
- **File:** `app/update-order/components/confirm-update-order-dialog.tsx`
- **Thay đổi:** `updatingData`, `clearUpdatingData` — 2 selector hoặc useShallow

---

## Batch 1.3 — Select & Dropdown (Cart flow)

### T-107 | table-dropdown.tsx — OrderFlow + BranchStore + UserStore
- **Phase:** P1
- **Effort:** ~15m
- **File:** `components/dropdown/table-dropdown.tsx`
- **Thay đổi:** `getCartItems`, `addTable` (OrderFlow), `branch` (BranchStore), `userInfo` (UserStore) — 4 selector

### T-108 | table-select.tsx — OrderFlow + BranchStore + UserStore
- **Phase:** P1
- **Effort:** ~15m
- **File:** `components/select/table-select.tsx`
- **Thay đổi:** `getCartItems`, `branch`, `userInfo` — 3 selector

### T-109 | table-select-sheet.tsx — OrderFlow selectors
- **Phase:** P1
- **Effort:** ~10m
- **File:** `components/select/table-select-sheet.tsx`
- **Thay đổi:** `getCartItems`, `addTable` — 2 selector

---

## Batch 1.4 — Update Order Components

### T-110 | table-select-sheet-in-update-order.tsx
- **Phase:** P1
- **Effort:** ~15m
- **File:** `app/update-order/components/table-select-sheet-in-update-order.tsx`
- **Thay đổi:** `branch`, `userInfo`, `updatingData`, `setDraftTable` — 4 selector

### T-111 | table-select-in-update-order.tsx
- **Phase:** P1
- **Effort:** ~10m
- **File:** `app/update-order/components/table-select-in-update-order.tsx`
- **Thay đổi:** `branch`, `userInfo`, `updatingData` — 3 selector

### T-112 | update-order-quantity-native.tsx
- **Phase:** P1
- **Effort:** ~5m
- **File:** `app/update-order/components/update-order-quantity-native.tsx`
- **Thay đổi:** `updateDraftItemQuantity` — 1 selector (action stable)

### T-113 | order-note-in-update-order-input.tsx
- **Phase:** P1
- **Effort:** ~5m
- **File:** `app/update-order/components/order-note-in-update-order-input.tsx`
- **Thay đổi:** `setDraftDescription` — 1 selector

### T-114 | order-item-note-in-update-order-input.tsx
- **Phase:** P1
- **Effort:** ~5m
- **File:** `app/update-order/components/order-item-note-in-update-order-input.tsx`
- **Thay đổi:** `addDraftNote` — 1 selector

### T-115 | remove-order-item-in-update-order-dialog.tsx
- **Phase:** P1
- **Effort:** ~10m
- **File:** `app/update-order/components/remove-order-item-in-update-order-dialog.tsx`
- **Thay đổi:** `removeDraftItem`, `removeDraftVoucher` — 2 selector

---

## Batch 1.5 — Profile & Auth

### T-116 | verify-email.tsx — AuthStore + UserStore
- **Phase:** P1
- **Effort:** ~15m
- **File:** `app/profile/verify-email.tsx`
- **Thay đổi:** `token` (AuthStore), `userInfo`, `emailVerificationStatus`, `setEmailVerificationStatus`, `setUserInfo` (UserStore) — 5 selector

### T-117 | verify-phone-number.tsx — UserStore
- **Phase:** P1
- **Effort:** ~10m
- **File:** `app/profile/verify-phone-number.tsx`
- **Thay đổi:** UserStore full destructure → selectors (kiểm tra file để xác định fields)

### T-118 | profile/history.tsx — UserStore
- **Phase:** P1
- **Effort:** ~10m
- **File:** `app/profile/history.tsx`
- **Thay đổi:** `userInfo`, `getUserInfo` — 2 selector

### T-119 | loyalty-point.tsx — UserStore
- **Phase:** P1
- **Effort:** ~5m
- **File:** `app/profile/loyalty-point.tsx`
- **Thay đổi:** `userInfo` — 1 selector

---

## Batch 1.6 — Branch, Cart, Settings

### T-120 | select-branch-dropdown.tsx — BranchStore
- **Phase:** P1
- **Effort:** ~10m
- **File:** `components/branch/select-branch-dropdown.tsx`
- **Thay đổi:** `branch`, `setBranch` — 2 selector

### T-121 | select-order-type-dropdown.tsx — BranchStore
- **Phase:** P1
- **Effort:** ~10m
- **File:** `components/cart/select-order-type-dropdown.tsx`
- **Thay đổi:** `branch`, `setBranch` — 2 selector

### T-122 | settings-dropdown.tsx — UserStore
- **Phase:** P1
- **Effort:** ~10m
- **File:** `components/dialog/settings-dropdown.tsx`
- **Thay đổi:** `userInfo`, `setUserInfo` — 2 selector

### T-123 | price-range-filter.tsx — BranchStore
- **Phase:** P1
- **Effort:** ~5m
- **File:** `components/menu/price-range-filter.tsx`
- **Thay đổi:** `branch` — 1 selector

### T-124 | payment-method-radio-group.tsx — UserStore
- **Phase:** P1
- **Effort:** ~5m
- **File:** `components/radio/payment-method-radio-group.tsx`
- **Thay đổi:** `userInfo` — 1 selector

---

## Batch 1.7 — Hooks & Screens

### T-125 | use-order-type-options.ts — OrderFlow
- **Phase:** P1
- **Effort:** ~10m
- **File:** `hooks/use-order-type-options.ts`
- **Thay đổi:** `setOrderingType`, `getCartItems` — 2 selector

### T-126 | use-pickup-time.ts — OrderFlow
- **Phase:** P1
- **Effort:** ~10m
- **File:** `hooks/use-pickup-time.ts`
- **Thay đổi:** `getCartItems`, `addPickupTime` — 2 selector

### T-127 | payment/[order].tsx — UserStore
- **Phase:** P1
- **Effort:** ~5m
- **File:** `app/payment/[order].tsx`
- **Thay đổi:** `userInfo` — 1 selector

### T-128 | menu/[slug].tsx — UserStore
- **Phase:** P1
- **Effort:** ~5m
- **File:** `app/menu/[slug].tsx`
- **Thay đổi:** `userInfo` → `const userInfo = useUserStore((s) => s.userInfo)` (nếu chưa sửa)

---

## Batch 1.8 — Store Selector Layer (sau khi T-101 → T-128 xong)

### T-129 | Tạo stores/selectors/order-flow.selectors.ts
- **Phase:** P1
- **Effort:** ~30m
- **File:** `stores/selectors/order-flow.selectors.ts` (mới)
- **Nội dung:**
  - `useOrderingData`, `useUpdatingData`, `useOrderFlowActions` (useShallow)
  - Export các selector dùng chung
- **Blocked by:** Hoàn thành ít nhất 5 task OrderFlow để biết pattern dùng nhiều

### T-130 | Tạo stores/selectors/index.ts + migrate 3 component sang dùng selectors
- **Phase:** P1
- **Effort:** ~20m
- **File:** `stores/selectors/index.ts`, migrate `create-order-dialog`, `voucher-list-drawer`, `delete-cart-item-dialog`
- **Mục đích:** Validate selector layer, các component còn lại có thể migrate dần

---

# Phase 2: State + Store Architecture

### T-201 | scheduleStoreUpdate — ClientMenuItem handleAddToCart
- **Phase:** P2
- **Effort:** ~15m
- **File:** `components/menu/client-menu-item.tsx`
- **Thay đổi:** Wrap `addOrderingItem(orderItem)` trong `scheduleStoreUpdate`
- **Verify:** Transition FPS không drop khi add to cart trong lúc slide

### T-202 | scheduleStoreUpdate — ClientMenuItemForUpdateOrder handleAddToDraft
- **Phase:** P2
- **Effort:** ~10m
- **File:** `app/update-order/components/client-menu-item-for-update-order.tsx`
- **Thay đổi:** Wrap `addDraftItem` trong `scheduleStoreUpdate`

### T-203 | scheduleStoreUpdate — UpdateOrderQuantityNative
- **Phase:** P2
- **Effort:** ~10m
- **File:** `app/update-order/components/update-order-quantity-native.tsx`
- **Thay đổi:** Wrap `updateDraftItemQuantity` trong `scheduleStoreUpdate`

### T-204 | scheduleStoreUpdate — Các dialog/input còn lại
- **Phase:** P2
- **Effort:** ~20m
- **Files:** order-note-in-update-order-input, order-item-note-in-update-order-input, delete-cart-item-dialog, remove-order-item-in-update-order-dialog
- **Thay đổi:** Wrap store actions trong `scheduleStoreUpdate` khi gọi từ UI

### T-205 | store-sync — Thêm order-flow vào clear chain
- **Phase:** P2
- **Effort:** ~15m
- **File:** `lib/store-sync.ts`, `lib/store-sync-setup.ts`
- **Thay đổi:** Thêm `'order-flow'` vào StoreName, đăng ký `clearOrderingData` / `clearAllData` khi clear cart
- **Lưu ý:** Cần review logic clear — order-flow có nhiều phase (ordering, payment, updating)

---

# Phase 3: List + Overlay Performance

### T-301 | table-select-sheet.tsx — Memo renderItem
- **Phase:** P3
- **Effort:** ~15m
- **File:** `components/select/table-select-sheet.tsx`
- **Thay đổi:** Tách TableRow thành component, `useCallback` cho renderItem

### T-302 | table-select-sheet-in-update-order.tsx — Memo renderItem
- **Phase:** P3
- **Effort:** ~15m
- **File:** `app/update-order/components/table-select-sheet-in-update-order.tsx`
- **Thay đổi:** Tương tự T-301

### T-303 | voucher-list-drawer.tsx — Memo renderItem + VoucherRow
- **Phase:** P3
- **Effort:** ~20m
- **File:** `components/sheet/voucher-list-drawer.tsx`
- **Thay đổi:** `useCallback` renderItem, đảm bảo VoucherRow đã có React.memo

### T-304 | carousel.tsx — Memo renderItem
- **Phase:** P3
- **Effort:** ~10m
- **File:** `components/ui/carousel.tsx`
- **Thay đổi:** `useCallback` cho renderItem

### T-305 | Cài @shopify/flash-list + POC ClientMenus
- **Phase:** P3
- **Effort:** ~45m
- **Files:** package.json, `components/menu/client-menus.tsx`
- **Thay đổi:** `npm install @shopify/flash-list`, thay FlatList bằng FlashList, set `estimatedItemSize`
- **Verify:** Scroll mượt, không lỗi layout

### T-306 | FlashList — UpdateOrderMenus
- **Phase:** P3
- **Effort:** ~30m
- **File:** `app/update-order/components/update-order-menus.tsx`
- **Blocked by:** T-305
- **Lưu ý:** UpdateOrderMenus dùng nhiều FlatList (groupedItems.map) — cần đánh giá có gộp thành SectionList/FlashList section không

### T-307 | FlashList — profile/history.tsx
- **Phase:** P3
- **Effort:** ~30m
- **File:** `app/profile/history.tsx`
- **Blocked by:** T-305

---

# Phase 4: Animation + Motion Tokens

### T-401 | Tạo constants/motion.ts
- **Phase:** P4
- **Effort:** ~15m
- **File:** `constants/motion.ts` (mới)
- **Nội dung:** MOTION object với transitionDuration, pressScale, spring config, parallax factor

### T-402 | native-gesture-pressable — Import từ motion
- **Phase:** P4
- **Effort:** ~5m
- **File:** `components/navigation/native-gesture-pressable.tsx`
- **Thay đổi:** Dùng MOTION.pressScale, MOTION.pressScaleSpring

### T-403 | reanimated-parallax-config — Import từ motion
- **Phase:** P4
- **Effort:** ~5m
- **File:** `lib/transitions/reanimated-parallax-config.ts`
- **Thay đổi:** Dùng MOTION.parallaxFactor, MOTION.shadowOpacityEnd

### T-404 | lib/navigation/constants — Import từ motion
- **Phase:** P4
- **Effort:** ~5m
- **File:** `lib/navigation/constants.ts`
- **Thay đổi:** TRANSITION_DURATION_MS lấy từ MOTION

### T-405 | Reanimated sync UI props (optional) ✅
- **Phase:** P4
- **Effort:** ~10m
- **File:** `package.json`
- **Thay đổi:** Thêm `reanimated.staticFeatureFlags`: `ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS`, `IOS_SYNCHRONOUSLY_UPDATE_UI_PROPS` (Reanimated 4.x)
- **Lưu ý:** Không hoạt động với Expo Go — cần development build. Dùng Pressable từ react-native-gesture-handler.
- **Verify:** Build Android/iOS, test trên thiết bị thật

---

# Phase 5: Event-Driven (Optional, dài hạn)

### T-501 | Research Effector / Eventrix
- **Phase:** P5
- **Effort:** ~1h
- **Output:** Doc so sánh, quyết định có dùng hay custom event bus

### T-502 | api/chef-area.ts — Tách logic download
- **Phase:** P5
- **Effort:** ~30m
- **File:** `api/chef-area.ts`, tạo `hooks/use-download-chef-area.ts`

### T-503 | utils/google-map.ts — Đưa logic vào hook
- **Phase:** P5
- **Effort:** ~30m
- **File:** `utils/google-map.ts`, `hooks/use-branch-delivery.ts`

### T-504 | app/profile shared components → components/profile
- **Phase:** P5
- **Effort:** ~45m
- **Files:** Di chuyển components dùng chung từ app/profile sang components/profile, cập nhật imports

---

## Hướng Dẫn Thực Thi Hiệu Quả

### 1. Nguyên tắc vàng

| Nguyên tắc | Chi tiết |
|------------|----------|
| **Một task = một PR** | Dễ review, dễ rollback. Không gộp 5 task vào 1 PR. |
| **Luôn chạy typecheck + lint** | `npm run typecheck && npm run lint` trước khi commit. |
| **Test flow liên quan** | Mỗi task có flow cần test (xem mục Verify trong task). |
| **Commit sau mỗi task** | Message: `refactor(selector): T-101 voucher-list-drawer OrderFlow selectors` |

### 2. Thứ tự bắt buộc (phụ thuộc)

```
T-101, T-102  →  cùng file, làm chung 1 commit
T-129         →  Blocked by: hoàn thành ít nhất 5 task OrderFlow (T-101, T-103, T-104, T-105, T-106)
T-130         →  Blocked by: T-129
T-305         →  Phải xong trước T-306, T-307
```

**Không được làm T-129/T-130 trước khi có ít nhất 5 task OrderFlow.** Làm sớm sẽ thiếu pattern, phải refactor lại.

### 3. Workflow mỗi task (15–20 phút)

```
1. Đọc task → xác định file + pattern (selector / useShallow / scheduleStoreUpdate)
2. Mở file → tìm useXxxStore() destructure
3. Refactor theo pattern trong doc
4. npm run typecheck && npm run lint
5. Manual test flow (ví dụ: mở voucher drawer, add voucher)
6. Commit
```

### 4. Chiến lược batch (tối ưu context switch)

| Batch | Tasks | Lý do gộp |
|-------|-------|-----------|
| **Cart flow** | T-101, T-102, T-103, T-104, T-105 | Cùng flow: voucher, create-order, delete cart |
| **Table/Select** | T-107, T-108, T-109 | Cùng pattern: table dropdown + select |
| **Update order** | T-110 → T-115 | Cùng màn update-order, 1 lần mở codebase |
| **Profile** | T-116 → T-119 | Cùng app/profile |
| **scheduleStoreUpdate** | T-201 → T-204 | Cùng import, cùng pattern wrap |

**Gợi ý:** Làm theo batch thay vì theo số task. Mỗi batch 1 session (45–90 phút).

### 5. Thứ tự ưu tiên (impact cao → thấp)

| Ưu tiên | Tasks | Lý do |
|---------|-------|-------|
| **1** | T-101 → T-106 | Sheet + Dialog mở thường xuyên, impact FPS cao nhất |
| **2** | T-201 → T-205 | scheduleStoreUpdate giảm stutter khi add to cart trong transition |
| **3** | T-107 → T-115 | Table, select, update-order — flow checkout |
| **4** | T-116 → T-128 | Profile, auth, branch, cart, settings |
| **5** | T-129, T-130 | Selector layer — làm sau khi đủ pattern |
| **6** | T-301 → T-307 | List memo + FlashList |
| **7** | T-401 → T-405 | Motion tokens |
| **8** | P5 | Event-driven — optional, dài hạn |

### 6. Checklist trước khi bắt đầu

- [ ] Đã đọc pattern trong `TELEGRAM_LEVEL_IMPROVEMENT_ROADMAP.md` (Option A/B)
- [ ] Đã cài `useShallow` từ `zustand/react/shallow`
- [ ] Biết `scheduleStoreUpdate` import từ `@/lib/navigation`
- [ ] Có branch riêng (ví dụ: `feat/telegram-level-selectors`)

### 7. Các lỗi thường gặp

| Lỗi | Cách tránh |
|-----|------------|
| Dùng `useShallow` cho 1 field | Chỉ cần `useStore((s) => s.field)` |
| Quên wrap action trong scheduleStoreUpdate | Chỉ wrap khi gọi từ UI trong transition (add to cart, update quantity) |
| Tạo selector layer quá sớm | Làm T-129 sau khi có ≥5 task OrderFlow |
| Gộp nhiều task 1 PR | 1 task = 1 PR, dễ review |

### 8. Khi nào dừng / rollback

- **Typecheck fail** → Fix ngay, không commit
- **Lint fail** → Fix ngay
- **Manual test lỗi** → Revert task đó, tách PR nhỏ hơn
- **FPS tệ hơn** (đo bằng Profiler) → Revert, kiểm tra selector có subscribe đúng không

---

## Thứ Tự Thực Hiện Gợi Ý

```
Ngày 1: T-101, T-102, T-103, T-104, T-105
Ngày 2: T-106, T-107, T-108, T-109, T-110, T-111
Ngày 3: T-112 → T-119
Ngày 4: T-120 → T-128
Ngày 5: T-129, T-130 (selector layer)
Ngày 6: T-201 → T-205 (Phase 2)
Ngày 7: T-301 → T-304 (Phase 3 memo)
Ngày 8: T-305, T-306, T-307 (FlashList)
Ngày 9: T-401 → T-405 (Phase 4)
```

---

## Definition of Done (mỗi task)

- [ ] Code thay đổi đúng scope
- [ ] `npm run typecheck` pass
- [ ] `npm run lint` pass
- [ ] Manual test flow liên quan (nếu có)
- [ ] Không regression (FPS, re-render)
