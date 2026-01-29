# Đề Xuất Cấu Trúc Folder: NativeWind + Custom Primitives

## 📁 Cấu Trúc Hiện Tại vs Đề Xuất

### Hiện Tại
```
mobile-movie-app/
├── app/
├── components/
│   ├── auth/
│   ├── branch/
│   ├── dialog/
│   ├── home/
│   ├── menu/
│   └── ui/                    # ⚠️ Đang trống
├── hooks/
├── stores/
├── utils/
├── constants/
├── types/
└── assets/
```

### Đề Xuất Mới

```
mobile-movie-app/
├── app/                        # Expo Router pages (giữ nguyên)
│   ├── (tabs)/
│   ├── _layout.tsx
│   └── global.css
│
├── components/
│   ├── ui/                     # ✨ Primitive Components (NEW - Core)
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── dialog.tsx
│   │   ├── select.tsx
│   │   ├── card.tsx
│   │   ├── badge.tsx
│   │   ├── label.tsx
│   │   ├── separator.tsx
│   │   ├── sheet.tsx           # Bottom sheet / Drawer
│   │   ├── slider.tsx          # Range slider primitive
│   │   └── index.ts            # Export all
│   │
│   ├── primitives/             # ✨ Low-level Primitives (NEW - Optional)
│   │   ├── pressable.tsx       # Enhanced Pressable
│   │   ├── view.tsx            # Enhanced View with variants
│   │   └── text.tsx            # Enhanced Text with variants
│   │
│   ├── auth/                   # Feature Components (giữ nguyên)
│   │   ├── login-form.tsx
│   │   └── index.tsx
│   │
│   ├── branch/                 # Feature Components
│   │   ├── select-branch-dropdown.tsx
│   │   └── index.ts
│   │
│   ├── dialog/                 # Feature Components
│   │   ├── logout-dialog.tsx
│   │   └── index.tsx
│   │
│   ├── home/                   # Feature Components
│   │   ├── highlight-menu.tsx
│   │   ├── news-carousel.tsx
│   │   └── ...
│   │
│   └── menu/                   # Feature Components
│       ├── client-menu-item.tsx
│       ├── client-menus.tsx
│       ├── price-range-filter.tsx    # Sẽ dùng ui/sheet
│       ├── client-catalog-select.tsx # Sẽ dùng ui/select
│       └── ...
│
├── lib/                        # ✨ Utility Libraries (NEW)
│   ├── utils.ts                # cn(), variants(), etc.
│   └── cn.ts                   # className merge utility
│
├── hooks/                      # Custom hooks (giữ nguyên)
│   ├── use-auth.ts
│   ├── use-branch.ts
│   └── ...
│
├── stores/                     # Zustand stores (giữ nguyên)
│   ├── auth.store.ts
│   └── ...
│
├── utils/                      # Utility functions (giữ nguyên)
│   ├── format.ts
│   ├── http.ts
│   └── ...
│
├── constants/                  # Constants (giữ nguyên)
│   └── ...
│
├── types/                      # TypeScript types (giữ nguyên)
│   └── ...
│
└── assets/                     # Assets (giữ nguyên)
    └── images/
```

---

## 📋 Chi Tiết Từng Folder

### 1. `components/ui/` - Primitive Components

**Mục đích**: Các UI components cơ bản, reusable, có variants

**Components nên có:**
```typescript
// button.tsx
export function Button({ variant, size, ...props }) { ... }

// input.tsx
export function Input({ ...props }) { ... }

// dialog.tsx (Modal wrapper)
export function Dialog({ open, onOpenChange, ... }) { ... }

// select.tsx
export function Select({ ... }) { ... }

// card.tsx
export function Card({ ... }) { ... }

// badge.tsx
export function Badge({ variant, ... }) { ... }

// sheet.tsx (Bottom sheet / Drawer)
export function Sheet({ open, onOpenChange, ... }) { ... }
```

**Pattern:**
- Mỗi component trong file riêng
- Export qua `index.ts` để dễ import
- Sử dụng variants pattern cho styling
- Type-safe props với TypeScript

---

### 2. `components/primitives/` - Low-level Primitives (Optional)

**Mục đích**: Wrapper cho React Native components với variants

**Chỉ cần nếu:**
- Cần extend nhiều React Native components với variants
- Muốn có abstraction layer cho styling

**Nếu không cần thì bỏ qua**, dùng trực tiếp React Native components trong `ui/`

---

### 3. `lib/` - Utility Libraries

**Mục đích**: Shared utilities cho styling và helpers

**Files:**

#### `lib/utils.ts` hoặc `lib/cn.ts`
```typescript
// className merge utility (giống clsx + tailwind-merge)
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Variants helper
export function variants<T extends string>(
  base: string,
  variantMap: Record<T, string>
) {
  return (variant: T) => `${base} ${variantMap[variant]}`
}
```

**Cần cài:**
```bash
npm install clsx tailwind-merge
```

---

## 🔄 Migration Strategy cho Folder Structure

### Phase 1: Setup Foundation
```
1. Tạo folder lib/ và file lib/utils.ts (cn function)
2. Tạo folder components/ui/ với các primitives cơ bản
3. Tạo index.ts để export
```

### Phase 2: Migrate Components
```
1. Migrate component mới → dùng ui/ components
2. Migrate component cũ → dùng ui/ components từ từ
3. Giữ nguyên structure cũ cho đến khi migrate xong
```

### Phase 3: Cleanup
```
1. Xóa dependencies không cần thiết
2. Reorganize nếu cần
```

---

## 📝 Ví Dụ Usage

### Trước (hiện tại):
```typescript
// components/menu/price-range-filter.tsx
<TouchableOpacity
  className="px-4 py-2 bg-white dark:bg-gray-800 border..."
>
  <Text className="text-gray-900 dark:text-white">...</Text>
</TouchableOpacity>
```

### Sau (với primitives):
```typescript
// components/menu/price-range-filter.tsx
import { Button, Sheet, Input } from '@/components/ui'

<Button variant="outline" size="md">
  Khoảng giá
</Button>

<Sheet open={isOpen} onOpenChange={setIsOpen}>
  <Sheet.Content>
    <Input placeholder="Min price" />
    <Input placeholder="Max price" />
  </Sheet.Content>
</Sheet>
```

---

## ✅ Checklist Setup

### Bước 1: Tạo Folder Structure
- [ ] Tạo `lib/` folder
- [ ] Tạo `lib/utils.ts` với `cn()` function
- [ ] Tạo `components/ui/` folder
- [ ] Tạo `components/ui/index.ts` (export file)

### Bước 2: Install Dependencies
- [ ] `npm install clsx tailwind-merge`

### Bước 3: Tạo Primitive Components
- [ ] `components/ui/button.tsx`
- [ ] `components/ui/input.tsx`
- [ ] `components/ui/dialog.tsx`
- [ ] `components/ui/sheet.tsx` (cho drawer)
- [ ] `components/ui/card.tsx`
- [ ] `components/ui/index.ts` (export all)

### Bước 4: Update Imports
- [ ] Update các components để dùng primitives
- [ ] Test và verify

---

## 🎯 Lưu Ý Quan Trọng

1. **Không cần `primitives/` folder ngay**: Chỉ tạo nếu thực sự cần
2. **Giữ nguyên feature folders**: `auth/`, `menu/`, `home/` giữ nguyên
3. **Incremental migration**: Migrate từ từ, không cần refactor tất cả
4. **Documentation**: Nên có README.md trong `components/ui/` để document API

---

## 📚 Recommended Reading

- [shadcn/ui structure](https://ui.shadcn.com/docs/components)
- [Radix UI primitives](https://www.radix-ui.com/primitives) (concept)
- [NativeWind documentation](https://www.nativewind.dev/)

