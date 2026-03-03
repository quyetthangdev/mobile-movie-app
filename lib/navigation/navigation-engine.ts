/**
 * Navigation Engine — Telegram-level instant response.
 *
 * REFACTORED: Animation starts in same frame as tap.
 * - Sync push when router ready (no setImmediate)
 * - Transition lock: drop second tap during transition
 * - Retry limit: max 20 frames when router null
 *
 * Flow: Tap → runOnJS → (lock check) → push DIRECTLY → Native Stack animation
 * Target: Tap → first visual motion < 8ms
 */
import type { Href } from 'expo-router'
import {
  getNavigationRouter,
  isNavigationLocked,
  lockNavigation,
  scheduleUnlock,
  setNavigationRouter,
  unlockNavigation,
  type HrefLike as LockHrefLike,
  type RouterLike as LockRouterLike,
} from './navigation-lock'
import { TRANSITION_DURATION_MS } from './constants'
import { acquireTransitionLock } from './transition-lock'

export type HrefLike = Href | string

const MAX_RETRY_FRAMES = 20

export type RouterLike = LockRouterLike

export { setNavigationRouter }

const getRouter = () => getNavigationRouter()

/**
 * Push/replace/back — SYNC khi router sẵn sàng.
 * Không setImmediate: gọi push trực tiếp để animation bắt đầu ngay.
 */
export const executeNavFromGesture = (
  type: 'push' | 'replace' | 'back',
  href?: HrefLike,
) => {
  executeNav(type, href, TRANSITION_DURATION_MS)
}

const executeNav = (
  type: 'push' | 'replace' | 'back',
  href?: HrefLike,
  duration = TRANSITION_DURATION_MS,
) => {
  const r = getRouter()
  if (r) {
    lockNavigation()
    try {
      acquireTransitionLock(duration)
      if (type === 'push' && href) r.push(href as LockHrefLike)
      else if (type === 'replace' && href) r.replace(href as LockHrefLike)
      else if (type === 'back') r.back()
    } finally {
      scheduleUnlock()
    }
    return
  }

  // Router null: retry với limit
  let frame = 0
  const retry = () => {
    const router = getRouter()
    if (router) {
      lockNavigation()
      try {
        acquireTransitionLock(duration)
        if (type === 'push' && href) router.push(href as LockHrefLike)
        else if (type === 'replace' && href) router.replace(href as LockHrefLike)
        else if (type === 'back') router.back()
      } catch (err) {
        unlockNavigation()
        throw err
      } finally {
        scheduleUnlock()
      }
      return
    }
    frame++
    if (frame >= MAX_RETRY_FRAMES) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn('[NavigationEngine] routerRef null after', MAX_RETRY_FRAMES, 'retries')
      }
      unlockNavigation()
      return
    }
    requestAnimationFrame(retry)
  }
  requestAnimationFrame(retry)
}

/**
 * navigateNative — Instant transition.
 * - Drop tap nếu đang transitioning (tránh double-push)
 * - Push sync khi router ready
 * - Unlock: MasterTransitionProvider gọi unlockNavigation trong transitionEnd
 */
export const navigateNative = {
  push: (href: HrefLike) => {
    if (isNavigationLocked()) return
    executeNav('push', href, TRANSITION_DURATION_MS)
  },
  replace: (href: HrefLike) => {
    if (isNavigationLocked()) return
    executeNav('replace', href, TRANSITION_DURATION_MS)
  },
  back: () => {
    if (isNavigationLocked()) return
    executeNav('back', undefined, TRANSITION_DURATION_MS)
  },
}

export const navigateNativeImmediate = navigateNative

/** Alias — single entry point. Same as navigateNative. */
export const navigateSafely = navigateNative
