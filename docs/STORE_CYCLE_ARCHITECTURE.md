# 3 Kiến trúc phá vỡ Circular Dependencies giữa Stores

## Tổng quan vấn đề

```
cart.store ↔ payment-method.store
payment-method.store ↔ update-order.store
```

**Nguyên nhân:** Các store gọi `clearStore`/`clearCart` của nhau khi chuyển context (vd: add cart → clear payment; set payment → clear cart).

---

## Approach 1: Mediator / Event Coordinator (Khuyến nghị)

**Ý tưởng:** Tạo module trung gian không phụ thuộc stores. Các store đăng ký callback clear của mình tại bootstrap. Khi cần clear store khác, gọi coordinator thay vì import trực tiếp.

**Luồng:**
```
lib/store-sync.ts (coordinator)
    ↑ đăng ký tại bootstrap
stores (cart, payment, update-order)
    → gọi requestClearStoresExcept('cart') 
    → coordinator gọi các callback đã đăng ký
```

**Ưu điểm:**
- Không có import giữa các store
- Dễ test (mock coordinator)
- Mở rộng thêm store mới chỉ cần đăng ký

**Nhược điểm:**
- Cần bootstrap init
- Thêm 1 layer indirection

---

## Approach 2: Tách shared state ra store mới (Order Flow Store)

**Ý tưởng:** Tạo `order-flow.store` làm "source of truth" cho mode hiện tại (cart | payment | update-order). Khi mode thay đổi, order-flow store clear các store con tương ứng.

**Luồng:**
```
order-flow.store (biết cart, payment, update-order)
    → setMode('cart') → clear payment + update-order
    → setMode('payment') → clear cart + update-order
    → setMode('update-order') → clear cart + payment

cart.store, payment-method.store, update-order.store
    → chỉ gọi order-flow.setMode(...), không import nhau
```

**Ưu điểm:**
- Logic rõ ràng: 1 store điều khiển flow
- Dễ thêm validation (vd: không cho chuyển mode khi đang submit)

**Nhược điểm:**
- Refactor lớn
- order-flow store vẫn import 3 store kia → cần dùng dynamic import hoặc callback

---

## Approach 3: Callback Injection (Setter pattern)

**Ý tưởng:** Mỗi store nhận callback `onBeforeMutate` khi khởi tạo. Callback này được inject từ bên ngoài (bootstrap) và gọi clear các store khác.

**Luồng:**
```
Bootstrap:
  cartStore = createCartStore({ 
    onBeforeMutate: () => { clearPayment(); clearUpdateOrder(); } 
  })
  paymentStore = createPaymentStore({ 
    onBeforeMutate: () => { clearCart(); clearUpdateOrder(); } 
  })
  ...

Stores không import nhau, chỉ gọi callback.
```

**Ưu điểm:**
- Không có cycle
- Inversion of control rõ ràng

**Nhược điểm:**
- Zustand `create()` mặc định không hỗ trợ inject — cần wrapper/factory
- Cấu trúc store phức tạp hơn

---

## So sánh nhanh

| Tiêu chí        | Mediator | Order Flow Store | Callback Injection |
|-----------------|----------|------------------|--------------------|
| Độ phức tạp     | Thấp     | Trung bình       | Cao                |
| Refactor        | Nhỏ      | Lớn              | Trung bình         |
| Testability     | Cao      | Trung bình       | Cao                |
| Mở rộng         | Dễ       | Dễ               | Trung bình         |

**Khuyến nghị:** Bắt đầu với **Approach 1 (Mediator)** — ít thay đổi nhất, dễ rollback.
