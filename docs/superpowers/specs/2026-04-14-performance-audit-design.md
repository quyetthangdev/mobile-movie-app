# Performance Audit Design Spec
**Date:** 2026-04-14  
**Status:** Approved  
**Scope:** Full app — stores, hooks, screens, components  
**Output:** Static analysis report (no runtime profiling)  
**Audience:** Developer (technical detail) + Lead/Manager (executive summary)

---

## Goal

Produce a comprehensive audit report that identifies all performance issues across 4 categories without making any code changes. The report is the deliverable — fixes come in a separate sprint.

## Report Structure

### Part 1 — Executive Summary
- Total issue count, breakdown by severity (Critical / High / Medium / Low)
- Top 3 critical risks with business impact (UX lag, crash risk, memory pressure)
- Recommended action order for the fix sprint

### Part 2 — Severity Matrix
A consolidated table of all findings:

| File | Line | Category | Severity | Impact |
|------|------|----------|----------|--------|

Severity levels:
- **Critical** — can cause crash or UI freeze
- **High** — visible frame drops, user can feel it
- **Medium** — subtle cumulative degradation
- **Low** — best practice violation, no measurable impact yet

### Part 3 — Findings by Category

Each category section contains:
1. Short explanation of why this is a problem (for non-technical readers)
2. List of findings with `file:line`, code snippet, and specific explanation
3. Pattern guide: "correct" vs "incorrect" example

Categories:
- **Category 1: Re-renders** — unnecessary component re-renders
- **Category 2: JS Thread Blocked** — synchronous/heavy work on main thread
- **Category 3: Memory Leaks** — resources not cleaned up
- **Category 4: Rendering Performance** — list virtualization, images, memoization

### Part 4 — Scan Methodology
Documents the grep patterns used for each category so the team can re-run or extend the audit.

---

## Audit Methodology

### Category 1 — Re-renders
Patterns to detect:
- `useStore(s => s)` or `useStore()` — returns full store object, re-renders on any field change
- `useCallback`/`useMemo` missing or with incorrect dependency arrays
- Inline object/array/function props — new reference every render triggers child re-render
- `useEffect(fn, [])` that reads props/state inside (stale closure risk)

### Category 2 — JS Thread Blocked
Patterns to detect:
- `new Date()`, `Date.now()`, date formatting called directly in render body (not wrapped in `useMemo`)
- Large loops (`for`, `map`, `filter`, `reduce`) on long arrays in render
- Synchronous `AsyncStorage` access not properly awaited
- Heavy computation after `router.push()` not wrapped in `scheduleTransitionTask`

### Category 3 — Memory Leaks
Patterns to detect:
- `setInterval`/`setTimeout` in `useEffect` without cleanup return function
- `addEventListener`/`addListener` without `removeEventListener`/`.remove()` in cleanup
- Firebase/Expo subscription calls without corresponding unsubscribe
- Module-level mutable arrays/objects that grow unbounded

### Category 4 — Rendering Performance
Patterns to detect:
- `FlatList` usage instead of `FlashList` on lists with many items
- `FlashList` missing `estimatedItemSize` prop
- `Image` from react-native instead of `expo-image` (no cache policy)
- Expensive components missing `memo()` wrapper
- Inline style objects instead of NativeWind classes or `StyleSheet.create`

---

## Execution Plan

Scans run in this order (highest-risk areas first):

| Pass | Target | Focus |
|------|--------|-------|
| 1 | `stores/*.ts` (39 files) | Zustand selector patterns, module-level state, subscriptions |
| 2 | `hooks/*.ts` (64 files) | Timer/listener leaks, dependency arrays, date calculations |
| 3 | `app/**/*.tsx` (screens) | Inline props, FlatList usage, heavy render body computation |
| 4 | `components/**/*.tsx` | Missing `memo()`, image optimization, `estimatedItemSize` |
| 5 | Full app | Cross-cutting: `new Date()` in render, large loops, AsyncStorage sync |

---

## Severity Assignment Rules

| Condition | Severity |
|-----------|----------|
| Memory leak in continuously-running flow (notification, countdown, cart) | Critical |
| Re-render cascade (parent → many children) | High |
| `FlatList` instead of `FlashList` on list > 20 items | High |
| Missing `memo()` on list item components | Medium |
| Inline object props, date format not memoized | Medium |
| Best practice violations with no measurable impact | Low |

---

## Out of Scope
- Runtime profiling (Flipper, React DevTools Profiler) — separate follow-up activity
- Fixing any identified issues — handled in a separate fix sprint
- Network/API performance — separate concern
- Bundle size analysis — separate concern

---

## Deliverable
A markdown report at `docs/superpowers/reports/2026-04-14-performance-audit-report.md` containing all 4 parts described above, committed to git.
