/**
 * NavigationLock — Singleton cho single-flight navigation.
 *
 * Triple unlock: 1) transitionEnd, 2) runAfterInteractions, 3) setTimeout failsafe.
 * Unlock is idempotent — multiple calls safe.
 */
import { InteractionManager } from 'react-native'

import { TRANSITION_DURATION_MS } from './constants'
import { isLockedShared } from './navigation-lock-shared'

import type { Href } from 'expo-router'

export type HrefLike = Href | string

export type RouterLike = {
  push: (href: HrefLike) => void
  replace: (href: HrefLike) => void
  back: () => void
}

let routerRef: RouterLike | null = null

export const setNavigationRouter = (router: RouterLike | null) => {
  routerRef = router
}

export const getNavigationRouter = (): RouterLike | null => routerRef

let isTransitioning = false

export const isNavigationLocked = () => isTransitioning

export const lockNavigation = () => {
  isTransitioning = true
  isLockedShared.value = 1
}

export const unlockNavigation = () => {
  isTransitioning = false
  isLockedShared.value = 0
}

let earlyTimeoutId: ReturnType<typeof setTimeout> | null = null
let failsafeTimeoutId: ReturnType<typeof setTimeout> | null = null

const clearUnlockTimeouts = () => {
  if (earlyTimeoutId) {
    clearTimeout(earlyTimeoutId)
    earlyTimeoutId = null
  }
  if (failsafeTimeoutId) {
    clearTimeout(failsafeTimeoutId)
    failsafeTimeoutId = null
  }
}

/** Cancel scheduled unlock timers (call from transitionEnd) */
export const cancelScheduledUnlockTimers = () => {
  clearUnlockTimeouts()
}

const EARLY_UNLOCK_MS = TRANSITION_DURATION_MS + 100
const FAILSAFE_UNLOCK_MS = TRANSITION_DURATION_MS + 350

/**
 * Triple unlock: PRIMARY transitionEnd, SECONDARY runAfterInteractions, FAILSAFE setTimeout.
 */
export const scheduleUnlock = () => {
  clearUnlockTimeouts()

  const doUnlock = () => {
    clearUnlockTimeouts()
    unlockNavigation()
  }

  earlyTimeoutId = setTimeout(doUnlock, EARLY_UNLOCK_MS)
  failsafeTimeoutId = setTimeout(doUnlock, FAILSAFE_UNLOCK_MS)

  InteractionManager.runAfterInteractions(() => {
    doUnlock()
  })
}
