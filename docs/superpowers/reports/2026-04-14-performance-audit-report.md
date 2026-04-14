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
