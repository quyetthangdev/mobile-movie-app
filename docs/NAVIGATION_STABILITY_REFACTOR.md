# Navigation Stability Refactor

**Ngày:** 2025-03-01

---

## 1. FILES MODIFIED

| File | Changes |
|------|---------|
| `lib/navigation/navigation-lock.ts` | Triple unlock, cancelScheduledUnlockTimers |
| `lib/navigation/navigation-engine.ts` | try/finally scheduleUnlock, retry unlock on fail, debug logs |
| `lib/navigation/master-transition-provider.tsx` | cancelScheduledUnlockTimers before unlock |
| `lib/navigation/index.ts` | Export cancelScheduledUnlockTimers |

---

## 2. LOCK IMPLEMENTATION

### Lifecycle

```
lockNavigation()
try {
  acquireTransitionLock(duration)
  router.push(href)
} catch (err) {
  unlockNavigation()
  throw err
} finally {
  scheduleUnlock()  // ALWAYS
}
```

### Retry path (router null)

- Max 20 rAF attempts
- On fail: `unlockNavigation()` (never leave lock active)
- On success: same try/finally as above

---

## 3. UNLOCK FLOW

```
                    ┌─────────────────────────────────────┐
                    │         scheduleUnlock()            │
                    │  (called in finally after push)      │
                    └─────────────────┬───────────────────┘
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          │                           │                           │
          ▼                           ▼                           ▼
┌─────────────────────┐   ┌─────────────────────┐   ┌─────────────────────┐
│ PRIMARY             │   │ SECONDARY           │   │ FAILSAFE            │
│ transitionEnd       │   │ runAfterInteractions│   │ setTimeout(350ms)    │
│ (MasterTransition)  │   │                     │   │ setTimeout(600ms)   │
└──────────┬──────────┘   └──────────┬──────────┘   └──────────┬──────────┘
           │                        │                         │
           │ cancelScheduled        │   doUnlock()             │ doUnlock()
           │ UnlockTimers()         │   (clears timeouts)      │ (clears timeouts)
           │ unlockNavigation()     │   unlockNavigation()    │ unlockNavigation()
           └───────────────────────┴──────────────────────────┘
```

**Unlock timing:**
- PRIMARY: transitionEnd (when native stack fires)
- SECONDARY: runAfterInteractions (React considers interactions done)
- EARLY: 350ms (TRANSITION_DURATION_MS + 100) — Android fix
- FAILSAFE: 600ms (TRANSITION_DURATION_MS + 350)

---

## 4. REMAINING RISK AREAS

| Risk | Mitigation |
|------|------------|
| transitionEnd not firing | EARLY 350ms + FAILSAFE 600ms |
| runAfterInteractions delayed | Timeouts still fire |
| Heavy JS during transition | Unlock timers run on JS; 350ms/600ms may be delayed |
| console.count in production | Wrapped in `__DEV__` |
