# Performance Optimization Roadmap

**Mục tiêu:** Nâng cấp từ L3 (Scalable) → L4/L5 (Production Optimized / Native-grade)  
**Ngày:** 2025-03-03  
**Input:** Performance Baseline Audit, Transition Smoothness Diagnosis, Deep Architecture Audit

---

## 1. Optimization Dependency Graph

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ LAYER 0 — Zero-Dependency (có thể làm ngay)                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│ • I18nProvider: subscribeWithSelector (chỉ language)                             │
│ • SliderRelatedProducts: useUserStore(s => s.userInfo?.slug)                     │
│ • FlashList: thêm estimatedItemSize (4 lists)                                    │
│ • Cart: keyExtractor ổn định (item.id only)                                      │
└─────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ LAYER 1 — Store Selector Consolidation (UNLOCKS Layer 2)                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│ • ClientMenus: useOrderFlowMenuSelector (1 subscription thay 6)                   │
│ • MenuItemQuantityControl: useOrderFlowMenuSelector (1 thay 7)                   │
│ • Cart: useOrderFlowCartSelector (1 thay 6)                                      │
│ • menu.tsx: gộp userInfo + userSlug → 1 selector                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ LAYER 2 — Render Stabilization (phụ thuộc Layer 1)                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│ • Reduce trong selector: tách useOrderFlowCartItemCount → derived selector       │
│ • Cart IIFE: extract voucher discount text → useMemo                             │
│ • CartItemRow props: stabilize displayItems ref (useMemo với deps hẹp)            │
└─────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ LAYER 3 — Navigation & Transition (độc lập, có thể song song Layer 2)           │
├─────────────────────────────────────────────────────────────────────────────────┤
│ • Root/Auth/Profile/Payment/UpdateOrder: thêm screenListeners (transitionEnd)     │
│ • Tabs: đánh giá detachInactiveScreens (cân nhắc true)                           │
└─────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ LAYER 4 — JS Thread Reduction (phụ thuộc Layer 1, 2)                             │
├─────────────────────────────────────────────────────────────────────────────────┤
│ • voucher-list-drawer: memoize sort/filter/reduce (useMemo)                       │
│ • Persist: custom middleware queue + idle flush (order-flow, cart)                │
└─────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ LAYER 5 — Advanced (phụ thuộc Layer 1–4)                                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│ • order-flow: inject userInfo từ caller thay vì getState()                       │
│ • Dual cart store: thống nhất hoặc deprecate cart.store                          │
│ • TransitionProgressSyncer: đánh giá native-only progress sync                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Quan hệ phụ thuộc:**
- Layer 1 **phải** trước Layer 2 — selector consolidation giảm re-render, giúp đo lường hiệu quả Layer 2.
- Layer 2 **phụ thuộc** Layer 1 — nếu không consolidate, reduce/IIFE fix vẫn chạy trong nhiều component.
- Layer 3 **độc lập** — có thể làm song song Layer 2.
- Layer 4 **phụ thuộc** Layer 1 — persist queue cần hiểu subscription pattern; voucher-list cần selector ổn.
- Layer 5 **sau cùng** — refactor sâu, rủi ro cao.

---

## 2. Phased Optimization Plan

### Phase 1 — Zero-Risk High Impact (1–2 ngày)

| # | Vấn đề | Mục tiêu | Gain ước lượng | Risk | Verification |
|---|--------|----------|----------------|------|--------------|
| 1.1 | I18nProvider full subscribe | Chỉ subscribe `userInfo?.language` | Giảm re-render mỗi user store change | **Zero** | So sánh re-render count trước/sau |
| 1.2 | SliderRelatedProducts useUserStore() | Dùng selector `(s) => s.userInfo?.slug` | Giảm re-render khi userInfo đổi | **Zero** | Profile re-render |
| 1.3 | FlashList estimatedItemSize | Thêm cho Cart, ClientMenus, UpdateOrderMenus, History | Cải thiện layout, scroll | **Zero** | Scroll FPS, mount time |
| 1.4 | Cart keyExtractor | Dùng `item.id` only (bỏ voucher slug) | Tránh re-mount khi đổi voucher | **Low** | Kiểm tra voucher discount vẫn đúng |

**Goal:** Giảm re-render không cần thiết, ổn định list, không thay đổi logic.

**Regression risk:** Rất thấp. Cần test: voucher discount hiển thị đúng khi đổi voucher (1.4).

---

### Phase 2 — Render Stabilization (2–3 ngày)

| # | Vấn đề | Mục tiêu | Gain ước lượng | Risk | Verification |
|---|--------|----------|----------------|------|--------------|
| 2.1 | ClientMenus 6 subscriptions | Tạo `useOrderFlowMenuSelector`, 1 subscription useShallow | Re-render 50+ → ~5 | **Low** | React DevTools Profiler |
| 2.2 | MenuItemQuantityControl 7 subscriptions | Dùng `useOrderFlowMenuSelector` | Re-render N×7 → N×1 | **Low** | Add to cart, re-render count |
| 2.3 | Cart 6+ subscriptions | Tạo `useOrderFlowCartSelector` | Re-render cascade giảm | **Low** | Cart screen profiler |
| 2.4 | menu.tsx userInfo + userSlug | Gộp 1 selector | Giảm 1 subscription | **Zero** | — |

**Goal:** Giảm mạnh re-render cascade khi add to cart, initializeOrdering.

**Regression risk:** Thấp. Cần test: add to cart, update quantity, voucher, table select.

---

### Phase 3 — Navigation Smoothness (1–2 ngày)

| # | Vấn đề | Mục tiêu | Gain ước lượng | Risk | Verification |
|---|--------|----------|----------------|------|--------------|
| 3.1 | Root stack không có transitionEnd | Thêm screenListeners (StackWithMasterTransition hoặc tương đương) | Unlock chính xác, giảm double-tap | **Medium** | Navigate Auth/Profile, test double-tap |
| 3.2 | Tabs detachInactiveScreens=false | Đánh giá đổi true (A/B test) | Giảm mount 4 tab | **Medium** | Tab switch, memory |

**Goal:** Unlock event-based, giảm double-tap, tối ưu tab mount.

**Regression risk:** Trung bình. detachInactiveScreens có thể ảnh hưởng state khi switch tab.

---

### Phase 4 — JS Thread Reduction (2–3 ngày)

| # | Vấn đề | Mục tiêu | Gain ước lượng | Risk | Verification |
|---|--------|----------|----------------|------|--------------|
| 4.1 | useOrderFlowCartItemCount reduce | Tách derived selector hoặc cache reduce result | Giảm 1–3ms mỗi orderingData change | **Low** | JS profile |
| 4.2 | useOrderFlowMenuItemDetail reduce | Tương tự 4.1 | Giảm compute mỗi render | **Low** | — |
| 4.3 | Cart renderCartHeader IIFE | Extract voucher text logic → useMemo | Giảm 2–5ms mỗi render | **Zero** | — |
| 4.4 | voucher-list-drawer reduce/filter/map | Memoize sortedVouchers, cartProductSlugs, v.v. | Giảm 5–15ms khi mở drawer | **Low** | Drawer open time |

**Goal:** Giảm JS blocking khi cart update, mở voucher drawer.

**Regression risk:** Thấp. Cần test voucher logic, discount calculation.

---

### Phase 5 — Advanced Scheduling (3–5 ngày)

| # | Vấn đề | Mục tiêu | Gain ước lượng | Risk | Verification |
|---|--------|----------|----------------|------|--------------|
| 5.1 | Persist JSON.stringify sync | Custom persist middleware: queue + requestIdleCallback flush | Giảm 5–20ms block mỗi set() | **High** | Cần test persist integrity, app kill/restore |
| 5.2 | scheduleStoreUpdate coverage | Audit, wrap thêm actions (initializeOrdering nếu gọi từ mount) | Giảm persist trong transition | **Medium** | Transition + add cart |

**Goal:** Defer persist ra khỏi critical path, mở rộng scheduleStoreUpdate.

**Regression risk:** Cao cho 5.1 — persist sai có thể mất data. Cần test kỹ.

---

### Phase 6 — Native-Grade Polish (1–2 tuần)

| # | Vấn đề | Mục tiêu | Gain ước lượng | Risk | Verification |
|---|--------|----------|----------------|------|--------------|
| 6.1 | order-flow getState() | Inject userInfo từ caller | Giảm coupling | **Medium** | Refactor, test |
| 6.2 | Dual cart store | Thống nhất hoặc deprecate | Đơn giản hóa flow | **High** | Full cart flow test |
| 6.3 | TransitionProgressSyncer | Đánh giá native-only sync (nếu có giải pháp) | Giảm bridge mỗi frame | **High** | Parallax vẫn hoạt động |

**Goal:** Kiến trúc sạch, giảm coupling, tối đa hóa UI thread.

**Regression risk:** Cao. Refactor sâu, cần regression test toàn diện.

---

## 3. Priority Execution Table

| ID | Optimization | Impact | Risk | Effort | Priority | Phase |
|----|--------------|--------|------|--------|----------|-------|
| O1 | I18nProvider subscribeWithSelector | 4 | 1 | 1 | **4.00** | 1 |
| O2 | SliderRelatedProducts selector | 3 | 1 | 1 | **3.00** | 1 |
| O3 | FlashList estimatedItemSize (4 lists) | 4 | 1 | 1 | **4.00** | 1 |
| O4 | Cart keyExtractor stable | 4 | 2 | 1 | **2.00** | 1 |
| O5 | ClientMenus useOrderFlowMenuSelector | 5 | 2 | 2 | **1.25** | 2 |
| O6 | MenuItemQuantityControl useOrderFlowMenuSelector | 5 | 2 | 2 | **1.25** | 2 |
| O7 | Cart useOrderFlowCartSelector | 5 | 2 | 2 | **1.25** | 2 |
| O8 | menu.tsx gộp userInfo/userSlug | 2 | 1 | 1 | **2.00** | 2 |
| O9 | Root stack screenListeners | 4 | 3 | 2 | **0.67** | 3 |
| O10 | Tabs detachInactiveScreens | 3 | 3 | 1 | **0.33** | 3 |
| O11 | useOrderFlowCartItemCount derived | 3 | 2 | 2 | **0.75** | 4 |
| O12 | Cart IIFE → useMemo | 3 | 1 | 1 | **3.00** | 4 |
| O13 | voucher-list-drawer memoize | 4 | 2 | 2 | **1.00** | 4 |
| O14 | Persist queue middleware | 5 | 4 | 4 | **0.31** | 5 |
| O15 | order-flow inject userInfo | 2 | 3 | 3 | **0.22** | 6 |
| O16 | Dual cart store unification | 3 | 5 | 5 | **0.12** | 6 |

**Thứ tự thực thi đề xuất:** O1 → O2 → O3 → O4 → O12 → O5 → O6 → O7 → O8 → O11 → O13 → O9 → O10 → O14 → O15 → O16

*(O12 sớm vì zero risk, high impact; O9/O10 sau khi render ổn định.)*

---

## 4. Expected Performance Evolution

| Metric | Baseline (L3) | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Phase 5 | Phase 6 |
|--------|---------------|---------|---------|---------|---------|---------|---------|
| **Re-renders / add to cart** | 50–80 | 45–70 | **8–15** | 8–15 | 8–15 | 8–15 | 8–15 |
| **Store subscriptions / Menu** | 6 + 7×N | 6 + 7×N | **1 + 1×N** | 1 + 1×N | 1 + 1×N | 1 + 1×N | 1 + 1×N |
| **Transition stability** | Medium | Medium | Medium | **High** | High | High | High |
| **JS blocking probability** | 55% | 52% | 50% | 50% | **35%** | **25%** | 25% |
| **Scroll smoothness** | 52/100 | **65/100** | 65/100 | 65/100 | 70/100 | 72/100 | 75/100 |
| **Persist block (ms)** | 5–20 | 5–20 | 5–20 | 5–20 | 5–20 | **&lt;2** | &lt;2 |
| **Architecture Level** | L3 | L3.2 | **L3.5** | **L4.0** | **L4.2** | **L4.5** | **L5.0** |

### Progression Path

```
L3 (Baseline)
    │
    ├─ Phase 1: I18n + Slider + FlashList + keyExtractor
    │       → L3.2 (Quick wins)
    │
    ├─ Phase 2: Selector consolidation
    │       → L3.5 (Render cascade eliminated)
    │
    ├─ Phase 3: Navigation screenListeners
    │       → L4.0 (Transition authority unified)
    │
    ├─ Phase 4: JS thread reduction
    │       → L4.2 (Blocking reduced)
    │
    ├─ Phase 5: Persist queue
    │       → L4.5 (Production optimized)
    │
    └─ Phase 6: Architecture cleanup
            → L5.0 (Native-grade)
```

---

## 5. Architectural Risk Warnings

### Không nên làm sớm

| Hành động | Lý do |
|-----------|-------|
| Persist queue trước Phase 2 | Cần hiểu rõ subscription pattern; queue sai có thể mất data |
| Dual cart store unification trước Phase 2 | Nhiều component phụ thuộc; refactor lớn |
| detachInactiveScreens=true không test | Có thể gây state loss khi switch tab nhanh |
| Bỏ TransitionProgressSyncer | Parallax mất; cần giải pháp native thay thế |

### Điều kiện an toàn

| Optimization | Điều kiện |
|--------------|-----------|
| Cart keyExtractor (item.id only) | Đảm bảo item.id unique; voucher discount vẫn đúng khi đổi voucher |
| useOrderFlowMenuSelector | Selector trả về đủ field; không thiếu cho ensureOrdering |
| Persist queue | Flush trước app background; test kill/restore; không mất data |
| detachInactiveScreens | Test tab state (cart, form) khi switch; có thể cần lazy hydration |

### Regression test bắt buộc

- Add to cart (menu, detail)
- Update quantity, variant
- Voucher apply/remove
- Table select
- Navigate: Home → Menu → Detail → Back
- Navigate: Profile → Info → Back
- Tab switch: Menu ↔ Cart ↔ Profile
- App kill + restore (persist)
- Màn hình có FlashList: scroll, mount

---

## 6. Guardrails — Rules to Prevent Regression

### Store & Subscription

- **G1:** Không dùng full-store subscription (`subscribe` không selector, `useStore()` không selector).
- **G2:** Mỗi component tối đa 1–2 subscription gộp (useShallow) cho mỗi store.
- **G3:** Không đặt `reduce`/`filter`/`map` nặng trong selector — tách derived selector hoặc useMemo.
- **G4:** Không gọi `set()` store trong transition (dùng scheduleStoreUpdate/scheduleTransitionTask).

### List & Virtualization

- **G5:** FlashList/FlatList bắt buộc có `estimatedItemSize` (hoặc getItemLayout).
- **G6:** `keyExtractor` phải ổn định — không phụ thuộc state thay đổi thường xuyên (voucher, cart totals).
- **G7:** `renderItem` phải được memo (useCallback với deps đúng) hoặc component con memo.

### Navigation & Transition

- **G8:** Mọi stack có transition phải có `transitionEnd` listener để unlock (timeout chỉ failsafe).
- **G9:** Không mount heavy content trong transition — dùng runAfterInteractions + delay.

### Persistence

- **G10:** Persist không được block JS — queue + idle flush nếu payload lớn.
- **G11:** Không persist state quá lớn (>50KB) mà không có strategy (lazy, partial).

### Render

- **G12:** Không có derived calculation phức tạp trong render — dùng useMemo.
- **G13:** Không truyền inline object/function làm prop cho component trong list (trừ khi memo với deps đúng).

---

## 7. Final Target Architecture Shape

### Store Layer

- Mỗi screen/flow có 1 selector gộp (useShallow).
- Không full-store subscribe.
- Persist: queue + idle flush cho order-flow, cart.
- Không reduce nặng trong selector.

### Rendering Layer

- Re-render / add to cart: &lt;15.
- Subscription / Menu: 1 + 1×N.
- Không IIFE hoặc logic nặng trong render.

### Navigation Layer

- Mọi stack dùng transitionEnd để unlock.
- scheduleStoreUpdate cho mọi store update từ UI trong transition.
- freezeOnBlur, detachInactiveScreens (sau khi test).

### List Layer

- FlashList có estimatedItemSize.
- keyExtractor ổn định.
- renderItem memo.

### JS Thread

- Blocking probability &lt;25%.
- Persist không block critical path.
- voucher-list và cart logic memoized.

### Architecture Level

- **L4.5** sau Phase 5 (Production Optimized).
- **L5.0** sau Phase 6 (Native-grade) — với điều kiện dual cart resolved, persist queue stable.

---

*Roadmap này chỉ là kế hoạch thực thi. Không bao gồm code implementation.*
