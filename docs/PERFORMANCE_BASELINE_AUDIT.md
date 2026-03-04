# Performance Baseline Audit

**Ngày:** 2025-03-03  
**Phạm vi:** Rendering, Store, Navigation, JS Thread, List, Lifecycle  
**Mục tiêu:** Chẩn đoán trạng thái hiện tại — KHÔNG đề xuất tối ưu.

---

## 1. Performance Summary

| Hạng mục | Điểm | Ghi chú |
|----------|------|---------|
| **Rendering** | 62/100 | Nhiều subscription rời, full-store subscribe, derived trong render |
| **Store** | 58/100 | 20+ persist, I18nProvider full subscribe, selector có reduce |
| **Navigation** | 68/100 | freezeOnBlur, JS Stack, Root stack không có transitionEnd |
| **JS Thread** | 55/100 | Reduce trong selector, IIFE trong render, voucher-list nặng |
| **List** | 52/100 | FlashList thiếu estimatedItemSize, keyExtractor không ổn định |
| **Lifecycle** | 70/100 | Một số dynamic key, ít effect loop |

**Tổng quan:** App ở mức L3 (Scalable), có nền tảng ổn nhưng nhiều điểm có thể gây jank khi scale hoặc trên thiết bị yếu.

---

## 2. Critical Bottlenecks

### 2.1 Full-Store Subscriptions

| File | Component | Trigger | Tần suất | Risk |
|------|-----------|---------|----------|------|
| `providers/i18n-provider.tsx` | I18nProvider | `useUserStore.subscribe(syncLanguage)` — mọi thay đổi user store | Mỗi `set()` trên useUserStore | **Critical** |
| `app/menu/slider-related-products.tsx` | SliderRelatedProducts | `const { userInfo } = useUserStore()` — không dùng selector | Mỗi thay đổi user store | **High** |

### 2.2 Multi-Subscription Cascade

| File | Component | Subscriptions | Trigger | Risk |
|------|------------|---------------|---------|------|
| `components/menu/client-menus.tsx` | ClientMenus | 6 useOrderFlowStore + 1 useUserStore | orderingData, currentStep, isHydrated thay đổi | **High** |
| `components/menu/menu-item-quantity-control.tsx` | MenuItemQuantityControl | 7 useOrderFlowStore + 1 useUserStore | Mỗi item trong list subscribe | **High** |
| `app/(tabs)/cart.tsx` | ClientCartPage | 6 useOrderFlowStore + 2 useUserStore + 1 useBranchStore | orderingData, userInfo, branch thay đổi | **High** |

### 2.3 Derived Calculations in Render

| File | Vị trí | Mô tả | Risk |
|------|--------|-------|------|
| `app/(tabs)/cart.tsx` | renderCartHeader, dòng ~410–445 | IIFE `(() => { const v = currentCartItems?.voucher; ... return \`${discountValueText} ${ruleText}\` })()` | **Medium** |
| `stores/selectors/order-flow.selectors.ts` | useOrderFlowCartItemCount | `reduce` trong selector — chạy mỗi khi orderingData thay đổi | **Medium** |
| `stores/selectors/order-flow.selectors.ts` | useOrderFlowMenuItemDetail | `reduce` cho cartItemCount trong useShallow object | **Medium** |

### 2.4 Inline Object/Function Props

| File | Prop | Vấn đề | Risk |
|------|------|--------|------|
| `app/(tabs)/cart.tsx` | renderCartItem → CartItemRow | Truyền `displayItems`, `currentCartItems` — reference thay đổi khi cart đổi | **Medium** |
| `app/(tabs)/cart.tsx` | CartItemRow `primaryColor` | `primaryColor` từ `useColorScheme()` — ổn | Low |
| `components/navigation/floating-cart-button.tsx` | style | Inline object `{ width: 64, ... }` | Low |

### 2.5 Unstable References

| File | Mô tả | Risk |
|------|-------|------|
| `app/(tabs)/cart.tsx` | `keyExtractor`: `${item.id}-${currentCartItems?.voucher?.slug \|\| 'no-voucher'}` — key đổi khi voucher đổi → FlashList coi là list mới | **High** |
| `app/(tabs)/menu.tsx` | `userInfo` và `userSlug` subscribe riêng — userSlug = userInfo?.slug, redundant | Medium |

### 2.6 Re-render During Transition

| Component | Khi nào | Risk |
|-----------|---------|------|
| FloatingCartButton | useOrderFlowCartItemCount — mỗi add/remove item | **High** — luôn visible, re-render mỗi cart change |
| ClientMenus | initializeOrdering() → set() → 6 subscriptions fire | **High** |
| MenuItemQuantityControl × N | Cùng trigger với ClientMenus | **High** |

---

## 3. Store Subscription Audit

### Store Health Score: **58/100**

| Store | Persist | Subscribers | Vấn đề | Score |
|-------|---------|-------------|--------|-------|
| **order-flow** | ✅ | 25+ components | Payload lớn (orderingData), reduce trong selector, nhiều subscription rời | 45 |
| **user** | ✅ | 20+ | I18nProvider full subscribe, userInfo object — thay đổi bất kỳ field | 50 |
| **auth** | ✅ | 10+ | needsUserInfo(), isAuthenticated() — function call mỗi render | 55 |
| **cart** | ✅ | Ít (order-flow thay thế) | Dual store với order-flow, persist payload lớn | 50 |
| **menu-filter** | ✅ | 5+ | useShallow ở một số nơi | 65 |
| **branch** | ✅ | 5+ | Selector ổn | 70 |
| **catalog** | ✅ | 3+ | Selector ổn | 72 |
| **payment-method** | ✅ | 2+ | Ít dùng | 75 |
| **ui, loading, request** | ❌ | Nhiều | Không persist | 70 |

### Chi tiết

- **Full store:** I18nProvider `subscribe`, SliderRelatedProducts `useUserStore()`.
- **Selector granularity:** ClientMenus, MenuItemQuantityControl, Cart — 6–7 subscription/component.
- **Object mutation:** Không thấy mutation trực tiếp; spread tạo object mới.
- **JSON.stringify:** Zustand persist dùng `createJSONStorage` → mỗi `set()` serialize toàn bộ partialize state.
- **Cross-store:** order-flow gọi `useUserStore.getState()` trong actions; requestClearStoresExcept mediator.

---

## 4. Navigation Performance Audit

### Navigation Transition Risk Level: **Medium–High**

| Yếu tố | Trạng thái | Ghi chú |
|--------|------------|---------|
| **freezeOnBlur** | ✅ true | js-stack, custom-stack |
| **detachInactiveScreens** | Mặc định (stack) | @react-navigation/stack |
| **Tabs detachInactiveScreens** | ❌ false | `app/(tabs)/_layout.tsx` — tất cả tab mount |
| **Screen mount timing** | Mount ngay khi push | Màn mới mount trong transition |
| **Transition-triggered updates** | scheduleStoreUpdate, scheduleTransitionTask | Chỉ một phần action dùng |
| **Heavy logic on focus** | MenuItemDetailContent | runAfterInteractions + 50ms — defer content |

**Rủi ro:**
- Root/Auth/Profile stack không có transitionEnd listener → unlock bằng timeout.
- Tabs `detachInactiveScreens={false}` → 4 tab mount cùng lúc.
- Màn mới mount ngay khi push → shell + hooks chạy trong transition.

---

## 5. JS Thread Load Detection

### JS Thread Blocking Probability: **Medium (55%)**

| Loại | File | Mô tả | Block ước lượng |
|------|------|-------|------------------|
| **Sync heavy** | `components/sheet/voucher-list-drawer.tsx` | Nhiều reduce, filter, map trên cartItems, voucherProducts | 5–15ms |
| **Reduce trong selector** | order-flow.selectors | useOrderFlowCartItemCount, useOrderFlowMenuItemDetail | 1–3ms/lần |
| **Blocking reducer** | Không có Redux | N/A | — |
| **Mapping trong render** | `app/(tabs)/cart.tsx` | IIFE trong renderCartHeader | 2–5ms |
| **Recalculation** | ClientMenus | useMemo sort + group — ổn | Low |

**Nguồn block chính:**
1. Persist `JSON.stringify` khi order-flow/cart `set()` — 5–20ms.
2. voucher-list-drawer: sort, filter, reduce trên voucher list.
3. useOrderFlowCartItemCount: reduce mỗi khi orderingData thay đổi.
4. Cart renderCartHeader: IIFE với logic voucher phức tạp.

---

## 6. List & Scrolling Performance

### Scrolling Performance Readiness: **52/100**

| List | Type | estimatedItemSize | keyExtractor | renderItem memo | Risk |
|------|------|-------------------|--------------|-----------------|------|
| **Cart** | FlashList | ❌ Thiếu | Không ổn định (voucher slug) | useCallback, deps đầy đủ | **High** |
| **ClientMenus** | FlashList | ❌ Thiếu | ổn (item.slug) | useCallback | **Medium** |
| **UpdateOrderMenus** | FlashList | ❌ Thiếu | ổn | useCallback | **Medium** |
| **Profile History** | FlashList | ❌ Thiếu | ổn (item.slug) | useCallback | **Medium** |
| **VoucherListDrawer** | BottomSheetFlatList | N/A | ổn | — | Medium |
| **TableSelectSheet** | BottomSheetFlatList | N/A | ổn | — | Low |
| **ProductImageCarousel** | FlatList | N/A | index | — | Low |
| **SliderRelatedProducts** | FlatList | Có config | ổn | — | Low |
| **DataTableBody** | FlatList | Có config | — | useCallback | Low |

**Vấn đề:**
- FlashList yêu cầu `estimatedItemSize` — không có → layout/measure kém.
- Cart `keyExtractor` phụ thuộc voucher → thay voucher = list “mới” → re-mount items.
- CartItemRow nhận `displayItems`, `currentCartItems` — object thay đổi → re-render dây chuyền.

---

## 7. Lifecycle & Mount Behavior

| Vấn đề | File | Mô tả | Risk |
|--------|------|-------|------|
| **Dynamic key** | floating-cart-button | `key={cartItemCount}` — remount Animated.View khi count đổi (có chủ đích) | Low |
| **Dynamic key** | client-menus | `key={index}` cho skeleton — ổn | Low |
| **Effect loop** | Không phát hiện | — | — |
| **Hydration re-render** | cart, order-flow | onRehydrateStorage → setTimeout setState | Medium |
| **Store update on mount** | ClientMenus | useEffect gọi initializeOrdering khi mount | Medium |

**Hydration:** cart.store, order-flow.store dùng `setTimeout(0)` set isHydrated → có thể gây re-render sau mount.

---

## 8. Architecture Level Classification

### **L3 — Scalable**

**Lý do không đạt L4/L5:**

1. **Subscription không tối ưu:** Nhiều component 6–7 subscription, full-store subscribe (I18nProvider, SliderRelatedProducts).
2. **FlashList thiếu estimatedItemSize:** 4 FlashList đều thiếu → virtualization kém.
3. **Key không ổn định:** Cart keyExtractor phụ thuộc voucher.
4. **Reduce trong selector:** useOrderFlowCartItemCount, useOrderFlowMenuItemDetail — tính mỗi lần store đổi.
5. **Persist sync:** 20+ store, mỗi `set()` → JSON.stringify ngay.
6. **Navigation:** JS Stack, Root không dùng transitionEnd, Tabs không detach.

**Điểm mạnh giữ ở L3:**
- Có React.memo, useMemo, useCallback ở nhiều chỗ.
- Một số selector dùng useShallow.
- scheduleStoreUpdate cho cart actions.
- freezeOnBlur.
- FlashList thay FlatList cho list chính.

---

## 9. Measurable Risks

| Risk | Xác suất | Impact | Mitigation hiện tại |
|------|----------|--------|---------------------|
| Frame drop khi add to cart | Cao | 1–3 frame | scheduleStoreUpdate |
| Frame drop khi mở voucher drawer | Trung bình | 2–5 frame | — |
| Re-render cascade khi initializeOrdering | Cao | 50+ component | — |
| Stutter cuối transition | Trung bình | 1–2 frame | runAfterInteractions + 50ms |
| Persist block khi cart lớn | Trung bình | 5–20ms | — |
| FlashList layout chậm | Trung bình | Mount/scroll | — |

---

## 10. Baseline Metrics Estimate

| Metric | Ước lượng | Ghi chú |
|--------|----------|---------|
| **Re-renders / add to cart** | 50–80 | ClientMenus + MenuItemQuantityControl × N + FloatingCartButton + Cart |
| **Store subscriptions / Menu screen** | 6 + 7×N (N = số item) | ClientMenus + mỗi MenuItemQuantityControl |
| **Persist serialize / cart update** | 5–20ms | order-flow orderingData |
| **Transition mount cost** | 10–30ms | Shell + hooks |
| **voucher-list-drawer open** | 10–30ms | reduce, filter, map |
| **useOrderFlowCartItemCount** | 1–3ms | reduce mỗi orderingData change |

---

## 11. Top 5 Performance Threats

| # | Threat | Cơ chế | Severity |
|---|--------|--------|----------|
| 1 | **ClientMenus + MenuItemQuantityControl cascade** | initializeOrdering() → set() → 6–7 subscription × (1 + N items) re-render | Critical |
| 2 | **I18nProvider full subscribe** | Mọi thay đổi useUserStore → syncLanguage → i18n.changeLanguage | High |
| 3 | **FlashList thiếu estimatedItemSize** | 4 FlashList không có → layout/measure kém, scroll jank | High |
| 4 | **Cart keyExtractor không ổn định** | Voucher đổi → key đổi → FlashList coi list mới → re-mount items | High |
| 5 | **Persist JSON.stringify sync** | 20+ store, mỗi set() → serialize ngay → block 5–20ms khi payload lớn | High |

---

*Báo cáo này chỉ chẩn đoán. Không bao gồm đề xuất tối ưu hay thay đổi code.*
