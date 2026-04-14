# Performance Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a static analysis audit report identifying all performance issues across 4 categories (Re-renders, JS Thread, Memory Leaks, Rendering Performance) in the full app codebase — no code changes, report only.

**Architecture:** Run 5 sequential grep passes over stores → hooks → screens → components → full app. Collect all findings into a structured markdown report with executive summary, severity matrix, and per-category details.

**Tech Stack:** grep/ripgrep for pattern scanning, markdown for report output. No dependencies to install.

---

## File Structure

| File | Action | Purpose |
|------|--------|---------|
| `docs/superpowers/reports/2026-04-14-performance-audit-report.md` | Create | Final audit report delivered to team |

---

## Task 1: Bootstrap Report File

**Files:**
- Create: `docs/superpowers/reports/2026-04-14-performance-audit-report.md`

- [ ] **Step 1: Create the reports directory and initialize the report file**

```bash
mkdir -p docs/superpowers/reports
```

Create `docs/superpowers/reports/2026-04-14-performance-audit-report.md` with this skeleton:

```markdown
# Performance Audit Report
**Date:** 2026-04-14
**Auditor:** [your name]
**Method:** Static analysis (grep patterns, no runtime profiling)
**Scope:** Full app — stores, hooks, screens, components

---

## Part 1 — Executive Summary

> _(Fill in after all passes complete)_

**Total issues found:** TBD
**Breakdown:** Critical: X | High: X | Medium: X | Low: X

### Top 3 Critical Risks

1. **[Risk name]** — [business impact]
2. **[Risk name]** — [business impact]
3. **[Risk name]** — [business impact]

### Recommended Action Order

1. Fix all Critical issues first (memory leaks in active flows)
2. Fix High severity re-renders and list virtualization
3. Address Medium severity memoization gaps
4. Low severity in next cleanup sprint

---

## Part 2 — Severity Matrix

| File | Line | Category | Severity | Impact |
|------|------|----------|----------|--------|
| _(populate from passes below)_ | | | | |

---

## Part 3 — Findings by Category

### Category 1: Re-renders

> **Why this matters:** Every unnecessary re-render executes the component's render function, diffs the virtual DOM, and potentially updates native views — burning JS thread budget and causing jank at 60fps.

#### Findings

_(populate from Pass 1 & 2)_

#### Pattern Guide

```tsx
// ❌ Wrong — re-renders on ANY store change
const { items, loading } = useCartStore()

// ✅ Correct — re-renders only when `items` changes
const items = useCartStore(s => s.items)
const loading = useCartStore(s => s.loading)
```

---

### Category 2: JS Thread Blocked

> **Why this matters:** React Native runs JS on a single thread. Synchronous heavy work (date calculations, large loops) during render blocks the thread, delaying touch responses and dropping frames.

#### Findings

_(populate from Pass 2 & 5)_

#### Pattern Guide

```tsx
// ❌ Wrong — new Date() called every render
function OrderCard({ expiresAt }: Props) {
  const timeLeft = new Date(expiresAt).getTime() - Date.now()
  return <Text>{timeLeft}</Text>
}

// ✅ Correct — memoized, only recalculates when expiresAt changes
function OrderCard({ expiresAt }: Props) {
  const timeLeft = useMemo(
    () => new Date(expiresAt).getTime() - Date.now(),
    [expiresAt]
  )
  return <Text>{timeLeft}</Text>
}
```

---

### Category 3: Memory Leaks

> **Why this matters:** Uncleaned timers and subscriptions keep running after a component unmounts, accumulating memory over time. On mobile this causes crashes after extended sessions and drains battery.

#### Findings

_(populate from Pass 1 & 2)_

#### Pattern Guide

```tsx
// ❌ Wrong — interval runs forever after unmount
useEffect(() => {
  const id = setInterval(tick, 1000)
}, [])

// ✅ Correct — interval cleared on unmount
useEffect(() => {
  const id = setInterval(tick, 1000)
  return () => clearInterval(id)
}, [])
```

---

### Category 4: Rendering Performance

> **Why this matters:** Unvirtualized lists render all items at once, bloating memory and slowing scroll. Non-memoized expensive components re-render on every parent update, wasting CPU.

#### Findings

_(populate from Pass 3 & 4)_

#### Pattern Guide

```tsx
// ❌ Wrong — FlatList renders all items
<FlatList data={products} renderItem={renderItem} />

// ✅ Correct — FlashList virtualizes with recycling
<FlashList
  data={products}
  renderItem={renderItem}
  estimatedItemSize={88}
/>
```

---

## Part 4 — Scan Methodology

### Grep Patterns Used

#### Category 1 — Re-renders
```bash
# Full store subscriptions (bad Zustand selectors)
grep -rn "use.*Store()" stores/ hooks/ app/ components/ --include="*.ts" --include="*.tsx"

# Missing useCallback on function props
grep -rn "onPress={(" app/ components/ --include="*.tsx"
grep -rn "onChange={(" app/ components/ --include="*.tsx"
grep -rn "onSubmit={(" app/ components/ --include="*.tsx"

# Empty dependency array with props/state inside
grep -rn "useEffect.*\[\]" hooks/ app/ components/ --include="*.ts" --include="*.tsx"
```

#### Category 2 — JS Thread Blocked
```bash
# Date calculations in render (not in useMemo/useCallback)
grep -rn "new Date\|Date\.now()" app/ components/ --include="*.tsx"

# AsyncStorage outside useEffect
grep -rn "AsyncStorage\." app/ components/ hooks/ --include="*.ts" --include="*.tsx"

# router.push without scheduleTransitionTask for heavy work
grep -rn "router\.push\|router\.replace" app/ components/ hooks/ --include="*.ts" --include="*.tsx"
```

#### Category 3 — Memory Leaks
```bash
# setInterval/setTimeout without visible cleanup
grep -rn "setInterval\|setTimeout" hooks/ app/ components/ --include="*.ts" --include="*.tsx"

# addListener without remove
grep -rn "addListener\|addEventListener" hooks/ app/ components/ --include="*.ts" --include="*.tsx"

# Module-level mutable state
grep -rn "^let \|^var " stores/ hooks/ --include="*.ts"
```

#### Category 4 — Rendering Performance
```bash
# FlatList usage
grep -rn "FlatList" app/ components/ --include="*.tsx"

# FlashList missing estimatedItemSize
grep -rn "FlashList" app/ components/ --include="*.tsx"

# React Native Image (not expo-image)
grep -rn "from 'react-native'.*Image\|Image.*from 'react-native'" app/ components/ --include="*.tsx"

# Missing memo() on components
grep -rn "^export function\|^export const.*=.*(" components/ --include="*.tsx"
```
```

- [ ] **Step 2: Commit the skeleton**

```bash
git add docs/superpowers/reports/2026-04-14-performance-audit-report.md
git commit -m "docs: initialize performance audit report skeleton"
```

---

## Task 2: Pass 1 — Scan Stores (Category 1 & 3)

**Files:**
- Modify: `docs/superpowers/reports/2026-04-14-performance-audit-report.md`

- [ ] **Step 1: Scan for bad Zustand selector patterns in stores**

Run:
```bash
grep -rn "use.*Store()" stores/ --include="*.ts"
```

For each hit, open the file at that line. Determine if the call returns the full store object (no selector function) or a broad object. Document findings in the report under **Category 1: Re-renders > Findings** with format:

```
- `stores/cart.store.ts:45` — `useCartStore()` returns full store; any field change re-renders consumer  
  **Severity:** High
```

- [ ] **Step 2: Scan for module-level mutable state in stores**

Run:
```bash
grep -rn "^let \|^var \|^const.*\[\]\s*$\|^const.*=\s*\{\}" stores/ --include="*.ts"
```

For each hit: check if the variable is mutated over time (push, assign, etc.) and never cleared. Document under **Category 3: Memory Leaks > Findings**:

```
- `stores/notification.store.ts:12` — `let cachedItems = []` at module level; grows unbounded  
  **Severity:** Critical
```

- [ ] **Step 3: Scan for subscriptions without cleanup in stores**

Run:
```bash
grep -rn "subscribe\|onSnapshot\|addListener" stores/ --include="*.ts"
```

For each hit: verify there is a corresponding unsubscribe/remove call. If not, document under **Category 3**.

- [ ] **Step 4: Commit findings from Pass 1**

```bash
git add docs/superpowers/reports/2026-04-14-performance-audit-report.md
git commit -m "docs: performance audit — Pass 1 stores findings"
```

---

## Task 3: Pass 2 — Scan Hooks (Category 1, 2, 3)

**Files:**
- Modify: `docs/superpowers/reports/2026-04-14-performance-audit-report.md`

- [ ] **Step 1: Scan for setInterval/setTimeout without cleanup**

Run:
```bash
grep -rn "setInterval\|setTimeout" hooks/ --include="*.ts" -A 5
```

For each hit: check if the enclosing `useEffect` has a `return () => clear...` statement. If missing, document under **Category 3 > Findings**:

```
- `hooks/use-countdown.ts:28` — `setInterval` inside `useEffect` with no cleanup return  
  **Severity:** Critical — countdown runs in cart screen, always active
```

- [ ] **Step 2: Scan for addListener/addEventListener without remove**

Run:
```bash
grep -rn "addListener\|addEventListener" hooks/ --include="*.ts" -A 10
```

For each hit: check if `.remove()` or `removeEventListener` exists in the cleanup. Document under **Category 3** if missing.

- [ ] **Step 3: Scan for date calculations not in useMemo**

Run:
```bash
grep -rn "new Date\|Date\.now\|getTime()\|\.format(" hooks/ --include="*.ts"
```

For each hit: check if the call is inside `useMemo`, `useCallback`, or `useEffect`. If it's in the hook's return value or a plain variable, document under **Category 2 > Findings**:

```
- `hooks/use-pickup-time.ts:34` — `new Date(slot.time).getTime()` in hook body, not memoized  
  **Severity:** Medium — recalculates every render
```

- [ ] **Step 4: Scan for useEffect with empty deps but reading props/state**

Run:
```bash
grep -rn "useEffect" hooks/ --include="*.ts" -A 15 | grep -B 10 "\[\]"
```

Review each `useEffect(() => { ... }, [])` block. If the callback body references props, external variables, or store values without them being in deps, document under **Category 1 > Findings**:

```
- `hooks/use-order-type-options.ts:52` — `useEffect` with `[]` reads `branchId` from store inside body; stale closure risk  
  **Severity:** Medium
```

- [ ] **Step 5: Commit findings from Pass 2**

```bash
git add docs/superpowers/reports/2026-04-14-performance-audit-report.md
git commit -m "docs: performance audit — Pass 2 hooks findings"
```

---

## Task 4: Pass 3 — Scan Screens (Category 1, 2, 4)

**Files:**
- Modify: `docs/superpowers/reports/2026-04-14-performance-audit-report.md`

- [ ] **Step 1: Scan for FlatList usage in screens**

Run:
```bash
grep -rn "FlatList" app/ --include="*.tsx" -n
```

For each hit: open the file and check the `data` prop source. If it comes from an API (React Query) or store that returns many items (products, orders, vouchers), document under **Category 4 > Findings**:

```
- `app/(tabs)/menu/index.tsx:87` — `<FlatList data={menuItems}>` — menu can have 50+ items; should use FlashList  
  **Severity:** High
```

- [ ] **Step 2: Scan for FlashList missing estimatedItemSize**

Run:
```bash
grep -rn "FlashList" app/ --include="*.tsx" -A 5
```

For each `<FlashList` hit: check if `estimatedItemSize` prop is present. If not, document under **Category 4**:

```
- `app/profile/history.tsx:120` — `<FlashList>` missing `estimatedItemSize`; disables recycler optimization  
  **Severity:** Medium
```

- [ ] **Step 3: Scan for inline object/array/function props in screens**

Run:
```bash
grep -rn "onPress={(" app/ --include="*.tsx" | grep -v "useCallback"
grep -rn "style={{" app/ --include="*.tsx"
grep -rn "contentContainerStyle={{" app/ --include="*.tsx"
```

For each hit in render JSX (not inside `useCallback`): document under **Category 1 > Findings** if the component receiving it is a list item or heavy component:

```
- `app/payment/[order].tsx:203` — `style={{ marginTop: 16, flexDirection: 'row' }}` inline object; new ref each render  
  **Severity:** Low
```

- [ ] **Step 4: Scan for new Date() / date formatting in screen render bodies**

Run:
```bash
grep -rn "new Date\|Date\.now\|\.format(" app/ --include="*.tsx"
```

For each hit: check if it's inside `useMemo`. If it's a plain variable or JSX expression, document under **Category 2**:

```
- `app/order/[id].tsx:67` — `new Date(order.createdAt).toLocaleDateString()` in JSX, runs every render  
  **Severity:** Medium
```

- [ ] **Step 5: Commit findings from Pass 3**

```bash
git add docs/superpowers/reports/2026-04-14-performance-audit-report.md
git commit -m "docs: performance audit — Pass 3 screens findings"
```

---

## Task 5: Pass 4 — Scan Components (Category 4)

**Files:**
- Modify: `docs/superpowers/reports/2026-04-14-performance-audit-report.md`

- [ ] **Step 1: Scan for list item components missing memo()**

Run:
```bash
grep -rn "FlatList\|FlashList" app/ components/ --include="*.tsx" -A 3 | grep "renderItem"
```

For each `renderItem={renderXxx}` or `renderItem={({ item }) =>` reference: find the component definition and check if it is wrapped in `memo()`. Document under **Category 4 > Findings** if not:

```
- `components/menu/menu-item-row.tsx:1` — exported as plain function; used as FlashList renderItem; missing memo()  
  **Severity:** Medium — re-renders on every parent state change during scroll
```

- [ ] **Step 2: Scan for react-native Image instead of expo-image**

Run:
```bash
grep -rn "from 'react-native'" components/ app/ --include="*.tsx" | grep "Image"
```

For each hit using `Image` from `react-native`: document under **Category 4**. Note that `expo-image` provides disk+memory cache, progressive loading, and blurhash support:

```
- `components/home/brand-section.tsx:3` — `import { Image } from 'react-native'`; no cache policy, no blurhash  
  **Severity:** Medium
```

- [ ] **Step 3: Scan for FlatList in components**

Run:
```bash
grep -rn "FlatList" components/ --include="*.tsx" -n
```

Same evaluation as Pass 3 Step 1. Document any `FlatList` that renders variable-length data from API/store.

- [ ] **Step 4: Scan for expensive components missing memo()**

Run:
```bash
grep -rn "^export function\|^export const.*= (" components/ --include="*.tsx" | grep -v "memo\|styled\|forwardRef"
```

For components that contain `useQuery`, `useStore`, or multiple `useMemo`/`useCallback` calls — these are "expensive" components that should be memoized. Check each one and document if missing `memo()`:

```
- `components/cart/cart-item.tsx:8` — `export function CartItem(...)` with 3 useStore calls; not wrapped in memo()  
  **Severity:** Medium
```

- [ ] **Step 5: Commit findings from Pass 4**

```bash
git add docs/superpowers/reports/2026-04-14-performance-audit-report.md
git commit -m "docs: performance audit — Pass 4 components findings"
```

---

## Task 6: Pass 5 — Cross-Cutting Scan (Category 2)

**Files:**
- Modify: `docs/superpowers/reports/2026-04-14-performance-audit-report.md`

- [ ] **Step 1: Scan for AsyncStorage outside useEffect/async functions**

Run:
```bash
grep -rn "AsyncStorage\." app/ components/ hooks/ stores/ --include="*.ts" --include="*.tsx" -B 2
```

For each hit: verify the call is inside an `async` function or `useEffect`. If it's in a synchronous render path, document under **Category 2 > Findings**:

```
- `stores/auth.store.ts:88` — `AsyncStorage.getItem('token')` called synchronously in store init  
  **Severity:** High — blocks JS thread during app start
```

- [ ] **Step 2: Scan for heavy computation after router.push without scheduleTransitionTask**

Run:
```bash
grep -rn "router\.push\|router\.replace" app/ hooks/ --include="*.ts" --include="*.tsx" -A 10
```

For each `router.push`/`router.replace`: check if the lines immediately following run heavy store updates, large data transforms, or analytics calls outside `scheduleTransitionTask`. Document under **Category 2**:

```
- `app/(tabs)/menu/index.tsx:145` — large store update immediately after router.push, not in scheduleTransitionTask  
  **Severity:** High — blocks animation thread during navigation
```

- [ ] **Step 3: Scan for large array operations in render bodies**

Run:
```bash
grep -rn "\.filter(\|\.map(\|\.reduce(\|\.sort(" app/ components/ --include="*.tsx" | grep -v "useMemo\|useCallback\|useEffect"
```

For each hit in JSX or plain render variable: check if the source array is large (from API/store list). Document under **Category 2**:

```
- `app/(tabs)/cart.tsx:78` — `cartItems.filter(i => !i.isRemoved).map(...)` in render body; not memoized  
  **Severity:** Medium
```

- [ ] **Step 4: Commit findings from Pass 5**

```bash
git add docs/superpowers/reports/2026-04-14-performance-audit-report.md
git commit -m "docs: performance audit — Pass 5 cross-cutting findings"
```

---

## Task 7: Compile Executive Summary & Severity Matrix

**Files:**
- Modify: `docs/superpowers/reports/2026-04-14-performance-audit-report.md`

- [ ] **Step 1: Count all findings and populate the severity matrix**

Go through all findings added in Tasks 2–6. For each finding, add a row to the **Part 2 — Severity Matrix** table:

```markdown
| `stores/cart.store.ts` | 45 | Re-renders | High | Full store subscription, re-renders on any field change |
| `hooks/use-countdown.ts` | 28 | Memory Leak | Critical | setInterval without cleanup in active cart flow |
```

Count totals: Critical: X, High: X, Medium: X, Low: X.

- [ ] **Step 2: Write the Executive Summary**

Replace the `_(Fill in after all passes complete)_` placeholder in Part 1 with:

```markdown
**Total issues found:** [N]
**Breakdown:** Critical: [X] | High: [X] | Medium: [X] | Low: [X]

### Top 3 Critical Risks

1. **Memory leaks in active flows** — [N] uncleaned timers/listeners in countdown, notification, and cart hooks.
   These leak memory over session lifetime and can cause app crashes after 30–60 minutes of use.

2. **Unvirtualized large lists** — [N] FlatList instances rendering full product/order/voucher datasets.
   Causes frame drops during scroll and high memory use on menu and history screens.

3. **Synchronous heavy work during navigation** — [N] heavy store updates or date calculations running
   inline after router.push, blocking the animation thread and causing visible transition jank.

### Recommended Action Order

1. Fix all Critical issues (memory leaks in active flows) — these are crash risks
2. Replace FlatList → FlashList on lists > 20 items — directly impacts scroll FPS
3. Wrap router.push heavy work in scheduleTransitionTask — fixes navigation jank
4. Add memo() to list item components and selector-heavy components
5. Memoize date calculations and array derivations in render
6. Clean up inline style objects and low-severity best practice violations
```

- [ ] **Step 3: Final commit**

```bash
git add docs/superpowers/reports/2026-04-14-performance-audit-report.md
git commit -m "docs: complete performance audit report with executive summary"
```

---

## Spec Coverage Check

| Spec requirement | Covered by |
|---|---|
| Executive summary with total counts and top 3 risks | Task 7 Step 2 |
| Severity matrix table | Task 7 Step 1 |
| Category 1: Re-renders findings | Tasks 2, 3, 4 |
| Category 2: JS Thread findings | Tasks 3, 5, 6 |
| Category 3: Memory Leaks findings | Tasks 2, 3 |
| Category 4: Rendering Performance findings | Tasks 3, 4, 5 |
| Pattern guide per category | Task 1 skeleton |
| Scan methodology documented | Task 1 skeleton |
| Committed to git | Each task has commit step |
