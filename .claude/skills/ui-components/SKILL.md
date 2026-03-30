---
name: ui-components
description: Trigger when building UI, using or creating components, designing screens, implementing interactive elements. Always check for existing components first before creating new ones. Reuse and compose when possible.
---

# UI Components Library

This project has a comprehensive **shared component library** in `components/` organized by category. Always check here before creating new UI elements.

## Core UI Components

### Button

**File**: `components/ui/button.tsx`

```tsx
import { Button } from '@/components/ui/button'

// Basic usage
<Button onPress={handlePress}>Submit</Button>

// With variant
<Button variant="secondary" size="lg">
  Secondary Button
</Button>

// Loading state
<Button loading={isLoading} disabled={isLoading}>
  Submit
</Button>

// Custom styling
<Button className="w-full rounded-lg">Full Width</Button>
```

**Props**:
```tsx
interface ButtonProps {
  variant?: 'default' | 'secondary' | 'outline' | 'destructive' | 'ghost'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  loading?: boolean
  disabled?: boolean
  children?: React.ReactNode
  onPress?: () => void
  className?: string
}
```

**Variants**:
- `default` — Black button, white text
- `secondary` — Gray background, dark text
- `outline` — Border only, transparent bg
- `destructive` — Red button for delete/cancel
- `ghost` — Transparent, text only

### Input

**File**: `components/ui/input.tsx`

```tsx
import { Input } from '@/components/ui/input'

// Basic
<Input placeholder="Enter email" />

// With error state
<Input
  placeholder="Password"
  error={!!formError}
  secureTextEntry
/>

// Custom className
<Input
  className="h-14 text-lg"
  placeholderTextColor="#999"
/>
```

**Props**:
```tsx
interface InputProps extends TextInput.Props {
  error?: boolean
  className?: string
}
```

### Card

**File**: `components/ui/card.tsx`

```tsx
import { Card } from '@/components/ui/card'

<Card className="p-4">
  <Text className="text-lg font-semibold">Card Title</Text>
  <Text className="text-sm text-muted-foreground mt-2">
    Card content goes here
  </Text>
</Card>
```

**Variants**: Default is white/light with shadow.

### Badge

**File**: `components/ui/badge.tsx`

```tsx
import { Badge } from '@/components/ui/badge'

// Default
<Badge>New</Badge>

// With variant
<Badge variant="secondary">Secondary</Badge>
<Badge variant="destructive">Deleted</Badge>
```

**Variants**: `default`, `secondary`, `destructive`, `outline`

### Sheet

**File**: `components/ui/sheet.tsx`

Bottom sheet modal for selections:

```tsx
import { Sheet } from '@/components/ui/sheet'

<Sheet open={open} onOpenChange={setOpen}>
  <SheetContent>
    <SheetHeader>
      <SheetTitle>Select Option</SheetTitle>
    </SheetHeader>
    <View className="gap-3 p-4">
      <Pressable onPress={() => selectOption('opt1')}>
        <Text>Option 1</Text>
      </Pressable>
      {/* More options */}
    </View>
  </SheetContent>
</Sheet>
```

### Dialog

**File**: `components/ui/dialog.tsx` or `components/dialog/`

```tsx
import { Dialog } from '@/components/dialog'

<Dialog open={showConfirm} onOpenChange={setShowConfirm}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Confirm Action</DialogTitle>
    </DialogHeader>
    <Text>Are you sure?</Text>
    <DialogFooter>
      <Button variant="outline" onPress={handleCancel}>
        Cancel
      </Button>
      <Button onPress={handleConfirm}>Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

## Specialized Components

### Quantity Selector

**File**: `components/button/quantity-selector.tsx`

```tsx
import { QuantitySelector } from '@/components/button'

<QuantitySelector
  value={quantity}
  onValueChange={setQuantity}
  min={1}
  max={10}
/>
```

### Price Tag

**File**: `components/menu/price-tag.tsx`

```tsx
import { PriceTag } from '@/components/menu/price-tag'

<PriceTag price={29.99} discountedPrice={19.99} />
```

### Favorite Button

**File**: `components/menu/favorite-button.tsx`

```tsx
import { FavoriteButton } from '@/components/menu'

<FavoriteButton
  isFavorite={isFav}
  onPress={toggleFavorite}
/>
```

### Skeleton Loaders

**File**: `components/ui/skeleton.tsx` & `components/skeletons/`

```tsx
import { Skeleton } from '@/components/ui/skeleton'
import { MenuItemSkeletonShell } from '@/components/skeletons'

// Generic skeleton
<Skeleton className="h-10 w-full rounded-lg" />

// Specific shells
<MenuItemSkeletonShell />
<ScreenShellSkeleton />
```

### Loading Overlay

**File**: `components/ui/global-loading-overlay.tsx`

Automatically shown during slow navigation (if QueryClient cache misses).

No manual usage needed — managed by navigation engine.

## Form Components

### Form Input Wrapper

**File**: `components/form/form-input.tsx`

Integrates with React Hook Form:

```tsx
import { FormInput } from '@/components/form'

<FormInput
  control={form.control}
  name="email"
  label="Email"
  placeholder="Enter email"
  rules={{ required: 'Email is required' }}
/>
```

### OTP Input

**File**: `components/auth/otp-input.tsx`

```tsx
import { OtpInput } from '@/components/auth'

<OtpInput
  value={otp}
  onValueChange={setOtp}
  length={6}
/>
```

### Password Rules Input

**File**: `components/input/password-rules-input.tsx`

Shows password strength requirements:

```tsx
import { PasswordRulesInput } from '@/components/input'

<PasswordRulesInput
  value={password}
  onChangeText={setPassword}
/>
```

## Navigation Components

### Animated Tab Button

**File**: `components/navigation/animated-tab-button.tsx`

Used in bottom tab bar — don't use directly.

### Tab Button

**File**: `components/navigation/tab-button.tsx`

Custom tab button with icon + label.

### Navigate Pressable

**File**: `components/navigation/navigate-pressable.tsx`

Pressable that handles navigation + prefetch:

```tsx
import { NavigatePressable } from '@/components/navigation'

<NavigatePressable
  to="/(tabs)/menu"
  params={{ menuId: 123 }}
  disabled={isLoading}
>
  <Text>Go to Menu</Text>
</NavigatePressable>
```

## Data Display Components

### Data Table

**File**: `components/ui/data-table/`

Complex table component for web/desktop:

```tsx
import { DataTable } from '@/components/ui/data-table'

<DataTable
  columns={columns}
  data={data}
  pagination={true}
  search={true}
/>
```

### Carousel

**File**: `components/ui/carousel.tsx`

For image galleries:

```tsx
import { Carousel } from '@/components/ui/carousel'

<Carousel
  data={images}
  renderItem={({ item }) => <Image source={{ uri: item.url }} />}
/>
```

### Product Image Carousel

**File**: `components/menu/product-image-carousel.tsx`

Optimized for product images with zoom:

```tsx
import { ProductImageCarousel } from '@/components/menu'

<ProductImageCarousel images={product.images} />
```

## Selection Components

### Select / Dropdown

**Files**: `components/select/` & `components/dropdown/`

```tsx
import { Select } from '@/components/select'

<Select
  options={[
    { label: 'Option 1', value: '1' },
    { label: 'Option 2', value: '2' },
  ]}
  value={selected}
  onValueChange={setSelected}
  placeholder="Choose..."
/>
```

### Product Variant Select

**File**: `components/select/product-variant-select.tsx`

For size/color/flavor selection:

```tsx
import { ProductVariantSelect } from '@/components/select'

<ProductVariantSelect
  variants={product.variants}
  onSelect={setSelectedVariant}
/>
```

### Table Select Sheet

**File**: `components/select/table-select-sheet.tsx`

For selecting dine-in tables:

```tsx
import { TableSelectSheet } from '@/components/select'

<TableSelectSheet
  tables={availableTables}
  onSelect={selectTable}
/>
```

## Auth Components

### Login Form

**File**: `components/auth/login-form.tsx`

```tsx
import { LoginForm } from '@/components/auth'

<LoginForm onSuccess={handleLoginSuccess} />
```

### Auth Form Layout

**File**: `components/auth/auth-form-layout.tsx`

Wrapper for auth screens.

## Cart Components

Located in `components/cart/`:

- `cart-content.tsx` — Main cart list
- `cart-item-row.tsx` — Individual item row
- `cart-empty.tsx` — Empty state
- `cart-footer.tsx` — Total + checkout button
- `cart-swipeable.tsx` — Swipe-to-delete
- `cart-voucher-sheet.tsx` — Voucher application
- `cart-size-sheet.tsx` — Size/variant selection
- `voucher-card.tsx` — Voucher display
- `voucher-condition-modal.tsx` — Voucher details

## Profile Components

Located in `components/profile/`:

- `profile-header.tsx` — User info section
- `info-card.tsx` — Info display card
- `birthday-picker.tsx` — Date picker
- `settings-item.tsx` — Settings option row
- `logout-confirm-bottom-sheet.tsx` — Logout confirmation

## Common Composition Patterns

### Form Pattern

```tsx
import { Button } from '@/components/ui/button'
import { FormInput } from '@/components/form'
import { useZodForm } from '@/hooks'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export function LoginScreen() {
  const form = useZodForm({ schema })

  const onSubmit = form.handleSubmit(async (data) => {
    await login(data)
  })

  return (
    <View className="flex-1 p-4">
      <FormInput
        control={form.control}
        name="email"
        placeholder="Email"
      />
      <FormInput
        control={form.control}
        name="password"
        placeholder="Password"
        secureTextEntry
      />
      <Button onPress={onSubmit} className="mt-4">
        Login
      </Button>
    </View>
  )
}
```

### List Item Pattern

```tsx
import { FlashList } from '@shopify/flash-list'
import { Pressable } from 'react-native'

export function OrderList({ orders }: { orders: IOrder[] }) {
  const handlePress = useCallback((orderId: string) => {
    navigation.navigate('OrderDetail', { orderId })
  }, [navigation])

  return (
    <FlashList
      data={orders}
      renderItem={({ item }) => (
        <Pressable onPress={() => handlePress(item.id)}>
          <View className="p-3 border-b border-gray-200">
            <Text className="font-semibold">{item.id}</Text>
            <Text className="text-sm text-muted-foreground">
              ${item.total}
            </Text>
          </View>
        </Pressable>
      )}
      keyExtractor={(item) => item.id}
      estimatedItemSize={80}
    />
  )
}
```

### Modal/Sheet Pattern

```tsx
import { Sheet } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'

export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Confirm</SheetTitle>
        </SheetHeader>
        <Text className="my-4">Are you sure?</Text>
        <View className="flex-row gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onPress={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            className="flex-1"
            onPress={() => {
              onConfirm()
              onOpenChange(false)
            }}
          >
            Confirm
          </Button>
        </View>
      </SheetContent>
    </Sheet>
  )
}
```

## Creating New Components

### Checklist

Before creating a new component:

1. **Search existing components** — Is something similar already built?
2. **Use composition** — Can it be built from existing components?
3. **Atomic design** — Keep it small, focused, reusable
4. **Document props** — Clear interface with TypeScript
5. **Export from barrel** — Add to `index.tsx` in folder
6. **Test dark mode** — Use `useColorScheme()` if needed
7. **Optimize rendering** — Use `React.memo()` for list items

### Component Template

```tsx
// components/[category]/MyComponent.tsx
import React, { useCallback } from 'react'
import { View, Text, Pressable, useColorScheme } from 'react-native'
import { cn } from '@/utils/cn'

export interface MyComponentProps {
  title: string
  onPress?: () => void
  variant?: 'default' | 'secondary'
  disabled?: boolean
  className?: string
}

export const MyComponent = React.forwardRef<
  View,
  MyComponentProps
>(
  (
    {
      title,
      onPress,
      variant = 'default',
      disabled = false,
      className,
    },
    ref,
  ) => {
    const isDark = useColorScheme() === 'dark'

    const handlePress = useCallback(() => {
      if (!disabled && onPress) {
        onPress()
      }
    }, [disabled, onPress])

    return (
      <Pressable
        ref={ref}
        onPress={handlePress}
        disabled={disabled}
        className={cn(
          'px-4 py-3 rounded-lg',
          variant === 'default' && 'bg-primary',
          variant === 'secondary' && 'bg-gray-200 dark:bg-gray-700',
          disabled && 'opacity-50',
          className,
        )}
      >
        <Text className="text-center font-semibold text-white">
          {title}
        </Text>
      </Pressable>
    )
  },
)

MyComponent.displayName = 'MyComponent'

// components/[category]/index.tsx
export { MyComponent, type MyComponentProps } from './MyComponent'
```

## Accessibility

Always include:

```tsx
<Pressable
  accessibilityRole="button"
  accessibilityLabel="Submit form"
  testID="submit-button"
>
  <Text>Submit</Text>
</Pressable>
```

## Dark Mode Support

Use `useColorScheme()`:

```tsx
import { useColorScheme } from 'react-native'

const isDark = useColorScheme() === 'dark'

<View className={isDark ? 'bg-gray-900' : 'bg-white'}>
  {/* Or use Tailwind dark: prefix */}
  <View className="bg-white dark:bg-gray-900" />
</View>
```

---

**Rule**: Before creating any new UI element, check the existing components. Composition > creation.
