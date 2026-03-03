# Báo Cáo Phân Tích Hiệu Năng — Telegram-Ready

**Ngày:** 2025-03  
**Context:** React Native (Expo SDK 55), Zustand, NativeWind v4, Reanimated, Expo Router  
**Mục tiêu:** Consistent 60 FPS, không drop frame khi chuyển màn hình hoặc tương tác giỏ hàng

---

## 📊 Score: 7.5/10 (Telegram-Ready)

| Tiêu chí | Điểm | Ghi chú |
|----------|------|---------|
| Zustand Subscription | 7/10 | Một số destructuring chưa tối ưu, selectors chưa dùng useShallow |
| Rendering & List | 7/10 | FlashList đã dùng, Cart chưa virtualize, vài renderItem chưa memo |
| Interaction & Transition | 9/10 | scheduleStoreUpdate, useRunAfterTransition đã áp dụng tốt |
| Style & Layout | 7/10 | Inline style và dynamic className còn nhiều |

**Kết luận:** App đã qua Phase 1–6 tối ưu, nền tảng ổn. Còn vài "điểm đen" cần xử lý để đạt 9/10.

---

## 1. Zustand Subscription Audit

### 1.1 Destructuring không dùng selector (gây re-render thừa)

| File | Vấn đề |
|------|--------|
| `components/menu/slider-related-products.tsx` | `const { userInfo } = useUserStore()`, `const { menuFilter } = useMenuFilterStore()`, `const { branch } = useBranchStore()` |
| `components/menu/product-name-search.tsx` | `const { menuFilter, setMenuFilter } = useMenuFilterStore()` |
| `components/menu/client-catalog-select.tsx` | `const { menuFilter, setMenuFilter } = useMenuFilterStore()` |
| `components/menu/price-range-filter.tsx` | `const { menuFilter, setMenuFilter } = useMenuFilterStore()` |

### 1.2 Selectors chưa tối ưu — 4 subscription thay vì 1

**File:** `stores/selectors/order-flow.selectors.ts`

```ts
// ❌ BEFORE — 4 lần useOrderFlowStore = 4 subscription
export const useOrderFlowVoucherDrawer = () => ({
  getCartItems: useOrderFlowStore((s) => s.getCartItems),
  addVoucher: useOrderFlowStore((s) => s.addVoucher),
  removeVoucher: useOrderFlowStore((s) => s.removeVoucher),
  isHydrated: useOrderFlowStore((s) => s.isHydrated),
})

export const useOrderFlowDeleteCartItem = () => ({
  removeOrderingItem: useOrderFlowStore((s) => s.removeOrderingItem),
  getCartItems: useOrderFlowStore((s) => s.getCartItems),
  removeVoucher: useOrderFlowStore((s) => s.removeVoucher),
})
```

```ts
// ✅ AFTER — 1 subscription với useShallow
export const useOrderFlowVoucherDrawer = () =>
  useOrderFlowStore(
    useShallow((s) => ({
      getCartItems: s.getCartItems,
      addVoucher: s.addVoucher,
      removeVoucher: s.removeVoucher,
      isHydrated: s.isHydrated,
    })),
  )

export const useOrderFlowDeleteCartItem = () =>
  useOrderFlowStore(
    useShallow((s) => ({
      removeOrderingItem: s.removeOrderingItem,
      getCartItems: s.getCartItems,
      removeVoucher: s.removeVoucher,
    })),
  )
```

### 1.3 Double Source of Truth: cart.store vs order-flow.store

- **cart.store** (`useCartItemStore`): `cartItems` persisted, dùng trong `utils/cart.ts`, `store-sync-setup.ts`
- **order-flow.store**: `orderingData` — nguồn cart chính cho UI (cart screen, floating button, add to cart)

**Khuyến nghị:** Deprecate `cart.store`, gộp logic vào `order-flow.store` (đã ghi trong TELEGRAM_LEVEL_IMPROVEMENT_ROADMAP.md).

---

## 2. Rendering & List Optimization

### 2.1 Cart list chưa virtualized — Critical

**File:** `app/(tabs)/cart.tsx` L326

```tsx
// ❌ BEFORE — Render toàn bộ items, không recycle
{currentCartItems?.orderItems.map((item) => (
  <View key={...}>
    ...
  </View>
))}
```

```tsx
// ✅ AFTER — Dùng FlashList (hoặc FlatList)
import { FlashList } from '@shopify/flash-list'

const renderCartItem = useCallback(({ item }: { item: IOrderItem }) => (
  <CartItemRow item={item} onDelete={...} />
), [/* deps */])

<FlashList
  data={currentCartItems?.orderItems ?? []}
  renderItem={renderCartItem}
  estimatedItemSize={120}
  keyExtractor={(item) => `${item.id}-${currentCartItems?.voucher?.slug || 'no-voucher'}`}
/>
```

### 2.2 renderItem chưa memo

**File:** `components/menu/slider-related-products.tsx` L87

```tsx
// ❌ BEFORE — Inline function, tạo mới mỗi render
<FlatList
  renderItem={({ item }) => (
    <RelatedProductItem item={item} ... />
  )}
/>
```

```tsx
// ✅ AFTER
const renderRelatedItem = useCallback(
  ({ item }: { item: IMenuItem }) => (
    <RelatedProductItem
      item={item}
      itemWidth={itemWidth}
      itemSpacing={itemSpacing}
      onPress={handlePress}
      onPressIn={handlePressIn}
    />
  ),
  [itemWidth, itemSpacing, handlePress, handlePressIn],
)
<FlatList renderItem={renderRelatedItem} ... />
```

### 2.3 Logic nặng trong render — History

**File:** `app/profile/history.tsx` L186–191

`calculateOrderItemDisplay`, `calculatePlacedOrderTotals` gọi trong `renderOrderItem` → chạy mỗi lần render item.

**Fix:** Memo kết quả hoặc tính sẵn trong `useMemo` trước khi truyền vào FlashList.

---

## 3. Interaction & Transition ✅

Đã áp dụng đúng pattern:

- `scheduleStoreUpdate` wrap `addOrderingItem`, `addDraftItem`, `removeOrderingItem`, `removeVoucher`
- `useRunAfterTransition` cho tab screens (home, menu, profile, cart)
- `androidDelayMs: 60` để tránh mount nặng khi fade

**Không cần sửa thêm.**

---

## 4. Style & Layout Thrashing

### 4.1 Inline style — nên tách ra StyleSheet hoặc useMemo

**File:** `app/(tabs)/cart.tsx`, `app/payment/[order].tsx`, `app/menu/[slug].tsx`

```tsx
// ❌ BEFORE — Object mới mỗi render
contentContainerStyle={{ paddingBottom: 100 }}
style={{ width: '80%' }}
```

```tsx
// ✅ AFTER — StyleSheet hoặc constant
const styles = StyleSheet.create({
  content: { paddingBottom: 100 },
  width80: { width: '80%' },
})
// hoặc
const contentStyle = useMemo(() => ({ paddingBottom: 100 }), [])
```

### 4.2 Dynamic className — dùng cn()

**File:** `app/profile/history.tsx`, `app/payment/[order].tsx`

```tsx
// ❌ BEFORE — Template string dài
className={`rounded-md px-4 py-2 ${hasPrevious ? 'bg-primary' : 'bg-gray-300'}`}
```

```tsx
// ✅ AFTER — cn() từ class-variance hoặc clsx
import { cn } from '@/lib/utils'
className={cn('rounded-md px-4 py-2', hasPrevious ? 'bg-primary' : 'bg-gray-300')}
```

---

## 5. Critical Fixes — Ưu tiên thực hiện

| # | File | Fix | Effort |
|---|------|-----|--------|
| 1 | `stores/selectors/order-flow.selectors.ts` | useShallow cho useOrderFlowVoucherDrawer, useOrderFlowDeleteCartItem | 10m |
| 2 | `app/(tabs)/cart.tsx` | FlashList thay map() cho cart items | 30m |
| 3 | `components/menu/slider-related-products.tsx` | Memo renderItem + selector thay destructuring | 15m |
| 4 | `components/menu/product-name-search.tsx` | Selector: `useMenuFilterStore(s => ({ menuFilter: s.menuFilter, setMenuFilter: s.setMenuFilter }))` | 5m |
| 5 | `components/menu/client-catalog-select.tsx` | Tương tự product-name-search | 5m |
| 6 | `components/menu/price-range-filter.tsx` | Tương tự | 5m |

---

## 6. Lộ trình Refactor

### Phase A — Quick wins (1–2h)

1. Sửa `order-flow.selectors.ts` (useShallow)
2. Sửa 4 file menu filter (selector thay destructuring)
3. Memo renderItem trong `slider-related-products.tsx`, `news-carousel.tsx`

### Phase B — Cart virtualization (2–3h)

1. Tách `CartItemRow` thành component riêng, memo
2. Thay `map()` bằng FlashList trong `cart.tsx`
3. Test scroll với 20+ items

### Phase C — Style cleanup (1–2h)

1. Tách inline style thành StyleSheet ở cart, payment, menu detail
2. Dùng `cn()` cho dynamic className

### Phase D — Deprecate cart.store (2–4h)

1. Migrate logic từ cart.store sang order-flow.store
2. Xóa cart.store, cập nhật store-sync-setup
3. Test persist + clear cart

---

## 7. Tài liệu tham khảo

- `docs/TELEGRAM_LEVEL_IMPROVEMENT_ROADMAP.md`
- `docs/PHASE6_DEEPER_ANALYSIS_AND_RECOMMENDATIONS.md`
- `docs/IMPLEMENTATION_TASKS.md`
