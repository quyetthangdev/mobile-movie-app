# Báo Cáo Phân Tích & Tối Ưu Animation

## 📊 Tổng Quan

Báo cáo này phân tích các animation trong ứng dụng React Native và đề xuất các cải tiến để đạt 60 FPS ổn định trên thiết bị thật (tablet/kiosk/mobile).

---

## 🔴 Vấn Đề Nghiêm Trọng Đã Phát Hiện

### 1. **Dropdown Component - Animated API Cũ (JS Thread)** ✅ ĐÃ FIX

**File:** `components/ui/dropdown.tsx`

**Vấn đề:**
- Sử dụng `Animated.Value`, `Animated.spring`, `Animated.timing` từ React Native core
- Animation chạy trên **JS thread**, không phải UI thread
- Gây lag khi mở/đóng dropdown, đặc biệt trên thiết bị yếu

**Code cũ:**
```typescript
const scaleAnim = useRef(new Animated.Value(0.95)).current
const opacityAnim = useRef(new Animated.Value(0)).current

Animated.parallel([
  Animated.spring(scaleAnim, { ... }),
  Animated.timing(opacityAnim, { ... }),
]).start()
```

**Giải pháp:**
- ✅ Refactor sang `react-native-reanimated` v2+
- ✅ Dùng `useSharedValue` và `useAnimatedStyle`
- ✅ Animation chạy trên **UI thread** (60 FPS)

**Code mới:**
```typescript
const scale = useSharedValue(0.95)
const opacity = useSharedValue(0)

scale.value = withSpring(1, { damping: 20, stiffness: 300 })
opacity.value = withTiming(1, { duration: 200 })

const animatedStyle = useAnimatedStyle(() => ({
  opacity: opacity.value,
  transform: [{ scale: scale.value }],
}))
```

---

### 2. **setState Trong onScroll Handlers** ✅ ĐÃ FIX (một phần)

**Files:**
- `components/home/swipper-banner.tsx`
- `components/home/store-carousel.tsx`
- `components/menu/product-image-carousel.tsx`

**Vấn đề:**
- `setState` được gọi trong `onScroll` handler
- Trigger re-render **mỗi frame** (60 lần/giây)
- Gây lag nghiêm trọng khi scroll

**Code cũ:**
```typescript
const handleScroll = (event) => {
  const index = Math.round(event.nativeEvent.contentOffset.x / slideSize)
  setActiveIndex(index) // ❌ Re-render mỗi frame!
}
```

**Giải pháp:**
- ✅ Dùng `onMomentumScrollEnd` thay vì `onScroll`
- ✅ Chỉ update state khi scroll **kết thúc**, không phải mỗi frame
- ✅ Memo hóa component và renderItem

**Code mới:**
```typescript
const handleScrollEnd = useCallback((event) => {
  const index = Math.round(event.nativeEvent.contentOffset.x / slideSize)
  setActiveIndexState(index) // ✅ Chỉ update khi scroll kết thúc
}, [screenWidth])

<FlatList
  onMomentumScrollEnd={handleScrollEnd} // ✅ Không dùng onScroll
/>
```

---

### 3. **Pagination Dots - Animate Width (Layout Animation)** ✅ ĐÃ FIX (một phần)

**Files:**
- `components/home/swipper-banner.tsx`
- `components/home/store-carousel.tsx`
- `components/menu/product-image-carousel.tsx`

**Vấn đề:**
- Pagination dots animate `width` (layout property)
- Layout animation trigger reflow, gây lag
- Không nên animate layout properties

**Code cũ:**
```typescript
<View className={`h-2 rounded-full ${
  index === activeIndex
    ? 'w-6 bg-white'  // ❌ Width change = layout animation
    : 'w-2 bg-white/50'
}`} />
```

**Giải pháp:**
- ✅ Dùng `scaleX` transform thay vì width
- ✅ Transform chạy trên UI thread, không trigger layout

**Code mới:**
```typescript
const PaginationDot = ({ isActive }) => {
  const scale = useSharedValue(isActive ? 3 : 1)
  
  useEffect(() => {
    scale.value = withTiming(isActive ? 3 : 1, { duration: 200 })
  }, [isActive])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: scale.value }], // ✅ Transform, không phải width
  }))

  return (
    <Animated.View style={animatedStyle} className="h-2 w-2 rounded-full" />
  )
}
```

---

## ⚠️ Vấn Đề Cần Xử Lý Tiếp

### 4. **Component Chưa Được Memo Hóa**

**Files cần fix:**
- `components/home/store-carousel.tsx`
- `components/menu/product-image-carousel.tsx`

**Vấn đề:**
- Component không được wrap với `React.memo`
- `renderItem` không được `useCallback`
- Gây re-render không cần thiết

**Đề xuất:**
```typescript
const StoreCarousel = React.memo(function StoreCarousel({ images }) {
  const renderItem = useCallback(({ item }) => {
    // ...
  }, [dependencies])
  
  // ...
})
```

---

### 5. **Scroll Event Throttle**

**Files:**
- `components/ui/scroll-area.tsx` - `scrollEventThrottle={16}` ✅ Tốt
- Các carousel đã được tối ưu

**Lưu ý:**
- `scrollEventThrottle={16}` = 60 FPS (tốt)
- Nhưng vẫn không nên setState trong onScroll
- Ưu tiên dùng `onMomentumScrollEnd`

---

## ✅ Các Component Đã Tối Ưu Tốt

### 1. **Toast Component** ✅
- Dùng `react-native-reanimated`
- Animation chạy trên UI thread
- Đã được memo hóa

### 2. **Sheet Component** ✅
- Dùng `react-native-reanimated`
- Transform và opacity animation
- Duration hợp lý (200-250ms)

### 3. **Drawer Component** ✅
- Dùng `react-native-reanimated`
- Slide animation với transform
- Easing đơn giản

### 4. **Select Component** ✅
- Dùng `react-native-reanimated`
- Scale và opacity animation
- Duration ngắn (200ms)

---

## 📋 Checklist Tối Ưu Animation

### ✅ Đã Hoàn Thành
- [x] Refactor dropdown.tsx sang react-native-reanimated
- [x] Fix setState trong onScroll (swipper-banner.tsx)
- [x] Refactor pagination dots sang scale transform (swipper-banner.tsx)
- [x] Memo hóa SwiperBanner component
- [x] useCallback cho renderItem và handlers

### ⏳ Cần Hoàn Thành
- [ ] Fix store-carousel.tsx (setState trong onScroll + pagination)
- [ ] Fix product-image-carousel.tsx (setState trong onScroll + pagination)
- [ ] Memo hóa các carousel components còn lại
- [ ] Kiểm tra và tối ưu các animation khác trong app

---

## 🎯 Best Practices Đã Áp Dụng

### 1. **UI Thread Animation**
```typescript
// ✅ Đúng - UI thread
const scale = useSharedValue(0.95)
scale.value = withSpring(1)
const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

// ❌ Sai - JS thread
const scale = useRef(new Animated.Value(0.95)).current
Animated.spring(scale, { toValue: 1 }).start()
```

### 2. **Chỉ Animate Transform & Opacity**
```typescript
// ✅ Đúng - Transform
transform: [{ scaleX: scale.value }, { translateY: y.value }]
opacity: opacity.value

// ❌ Sai - Layout properties
width: width.value  // Gây layout reflow
height: height.value
```

### 3. **Không setState Trong onScroll**
```typescript
// ✅ Đúng - Chỉ update khi scroll kết thúc
onMomentumScrollEnd={handleScrollEnd}

// ❌ Sai - Update mỗi frame
onScroll={handleScroll} // setState trong đây!
```

### 4. **Memo Hóa Component**
```typescript
// ✅ Đúng
const Component = React.memo(function Component({ props }) {
  const renderItem = useCallback(({ item }) => {
    // ...
  }, [deps])
})

// ❌ Sai
function Component({ props }) {
  const renderItem = ({ item }) => {
    // Re-create mỗi render
  }
}
```

### 5. **Animation Duration Ngắn**
```typescript
// ✅ Đúng - 100-300ms
withTiming(1, { duration: 200 })

// ❌ Sai - Quá dài
withTiming(1, { duration: 1000 })
```

### 6. **Easing Đơn Giản**
```typescript
// ✅ Đúng
easing: Easing.out(Easing.ease)

// ❌ Sai - Quá phức tạp
easing: Easing.bezier(0.68, -0.55, 0.265, 1.55) // Bounce quá đà
```

---

## 📚 Thư Viện Đề Xuất

### ✅ Đang Sử Dụng
- **react-native-reanimated** v4.1.1 - Animation trên UI thread
- **react-native-gesture-handler** v2.28.0 - Gesture handling

### 💡 Gợi Ý Bổ Sung (Nếu Cần)
- **react-native-redash** - Utilities cho reanimated (optional)
- **react-native-skeleton-placeholder** - Skeleton loading (nếu cần)

---

## 🚀 Kết Quả Mong Đợi

Sau khi áp dụng các tối ưu:

1. **60 FPS ổn định** trên thiết bị thật
2. **Giảm lag** khi scroll và animate
3. **Smooth transitions** cho dropdown, sheet, drawer
4. **Không block JS thread** khi animation chạy
5. **Better UX** trên tablet/kiosk/mobile

---

## 📝 Ghi Chú

- Ưu tiên **ổn định & dễ kiểm soát** hơn hiệu ứng "đẹp nhưng nặng"
- Animation ngắn (100-300ms) phù hợp với POS/Kiosk
- Test trên thiết bị thật để đảm bảo performance
- Monitor FPS bằng React DevTools hoặc Flipper

---

**Ngày tạo:** $(date)
**Phiên bản:** 1.0

