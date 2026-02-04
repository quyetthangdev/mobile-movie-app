# Phân Tích Performance - TableSelect Component

## 🔴 Vấn Đề: Content Hiển Thị Chậm

### 1. **Translation Calls Trong Render Loop** ⚠️ NGHIÊM TRỌNG

**Vấn đề:**
```typescript
// Line 145 - Gọi t() trong map, chậm với nhiều tables
const tableLabel = `${table.name} - ${t(\`table.${table.status}\`)}`
```

**Tác động:**
- Mỗi table item gọi `t()` một lần
- Với 20 tables = 20 lần gọi translation function
- Translation có thể chậm nếu không được cache tốt
- Block JS thread khi render

**Giải pháp:**
- Pre-translate tất cả status values trước khi render
- Hoặc cache translation results

---

### 2. **DropdownContent Animation Phức Tạp** ⚠️ TRUNG BÌNH

**Vấn đề:**
```typescript
// DropdownContent có 4 animations cùng lúc:
scale.value = withSpring(1, { damping: 20, stiffness: 300, mass: 0.5 })
opacity.value = withTiming(1, { duration: 200 })
slideX.value = withSpring(0, { damping: 20, stiffness: 300, mass: 0.5 })
slideY.value = withSpring(0, { damping: 20, stiffness: 300, mass: 0.5 })
```

**Tác động:**
- 4 animations chạy đồng thời có thể gây lag
- Spring animation phức tạp hơn timing
- Duration 200ms + spring có thể làm chậm việc hiển thị content

**Giải pháp:**
- Giảm số lượng animations (chỉ dùng opacity + transform)
- Hoặc giảm duration xuống 150ms
- Hoặc dùng `withTiming` thay vì `withSpring` cho một số animations

---

### 3. **Content Layout Measurement** ⚠️ TRUNG BÌNH

**Vấn đề:**
```typescript
// Line 329-332 - Đo layout mỗi lần mở dropdown
const handleContentLayout = (event) => {
  const { width, height } = event.nativeEvent.layout
  setContentLayout({ width, height })
}
```

**Tác động:**
- Layout measurement trigger re-render
- Có thể chậm trên thiết bị yếu
- Gây delay trước khi content hiển thị

**Giải pháp:**
- Chỉ đo layout khi cần thiết
- Hoặc cache layout nếu không thay đổi

---

### 4. **useTables Hook Không Có Enabled Condition** ⚠️ NHẸ

**Vấn đề:**
```typescript
// Line 29 - Luôn fetch ngay cả khi branchSlug rỗng
const { data: tables } = useTables(branchSlug)
```

**Tác động:**
- Fetch API ngay cả khi không có branch
- Có thể gây delay nếu API chậm
- Không tận dụng cache tốt

**Giải pháp:**
- Thêm `enabled: !!branchSlug` vào useQuery
- Hoặc tăng staleTime cho tables data

---

### 5. **Render Tất Cả Items Cùng Lúc** ⚠️ TRUNG BÌNH

**Vấn đề:**
```typescript
// Line 141 - Render tất cả tables cùng lúc, không có virtualization
tablesList.map((table, index) => {
  // Render mỗi item
})
```

**Tác động:**
- Với nhiều tables (20+), render tất cả cùng lúc có thể chậm
- Không có lazy loading
- Block JS thread khi render

**Giải pháp:**
- Dùng FlatList với virtualization (nếu có nhiều items)
- Hoặc limit số items hiển thị ban đầu

---

### 6. **useMemo Dependencies Không Tối Ưu** ⚠️ NHẸ

**Vấn đề:**
```typescript
// Line 37 - getCartItems là function, có thể thay đổi reference
const cartItems = useMemo(() => getCartItems(), [getCartItems])
```

**Tác động:**
- `getCartItems` có thể thay đổi reference mỗi render
- Gây re-compute không cần thiết

**Giải pháp:**
- Chỉ depend vào cartItems thực tế, không phải function

---

## 📊 So Sánh Với OrderTypeSelect

### OrderTypeSelect (Nhanh):
- ✅ Không có translation trong render loop
- ✅ Ít items hơn (chỉ 2-3 order types)
- ✅ Logic đơn giản hơn
- ✅ Không có layout measurement

### TableSelect (Chậm):
- ❌ Translation trong render loop
- ❌ Có thể có nhiều items (10-50+ tables)
- ❌ Logic phức tạp hơn (reserved table dialog)
- ❌ Layout measurement

---

## 🚀 Giải Pháp Đề Xuất

### Ưu Tiên Cao:

1. **Pre-translate Status Values**
   ```typescript
   // Trước render loop
   const statusTranslations = useMemo(() => {
     const translations: Record<string, string> = {}
     Object.values(TableStatus).forEach(status => {
       translations[status] = t(`table.${status}`)
     })
     return translations
   }, [t])
   
   // Trong render
   const tableLabel = `${table.name} - ${statusTranslations[table.status]}`
   ```

2. **Tối Ưu Dropdown Animation**
   - Giảm duration xuống 150ms
   - Chỉ dùng opacity + translateY (bỏ scale và slideX)
   - Hoặc disable animation khi có nhiều items

3. **Thêm Enabled Condition cho useTables**
   ```typescript
   export const useTables = (branch?: string) => {
     return useQuery({
       queryKey: [QUERYKEY.tables, branch],
       queryFn: async () => getAllTables(branch as string),
       enabled: !!branch, // Chỉ fetch khi có branch
       staleTime: 60 * 1000, // Cache 1 phút
     })
   }
   ```

### Ưu Tiên Trung Bình:

4. **Tối Ưu Layout Measurement**
   - Chỉ đo layout khi dropdown mở lần đầu
   - Cache layout nếu không thay đổi

5. **Memo Hóa Translation Function**
   - Wrap `t` trong useMemo hoặc useCallback

### Ưu Tiên Thấp:

6. **Virtualization (Nếu Cần)**
   - Chỉ áp dụng nếu có > 30 tables
   - Dùng FlatList thay vì map

---

## 📝 Checklist Tối Ưu

- [ ] Pre-translate status values
- [ ] Tối ưu dropdown animation (giảm duration, đơn giản hóa)
- [ ] Thêm enabled condition cho useTables
- [ ] Tối ưu layout measurement
- [ ] Memo hóa translation function
- [ ] Test với nhiều tables (20+)

---

**Ngày phân tích:** $(date)

