/**
 * Navigation Engine — Telegram-level instant response.
 *
 * Ưu tiên độ trễ cực thấp từ lúc chạm tới lúc bắt đầu transition.
 * - Khi router sẵn sàng: gọi push/replace/back ngay (không rAF thêm)
 * - Khi router null: retry tối đa MAX_RETRY_FRAMES frame (đã dùng rAF trong retry)
 * - Transition lock: drop tap thứ 2 trong lúc đang transition
 *
 * Flow (gesture):
 * Tap → runOnJS → executeNav → Native Stack animation (UI thread)
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
  type: 'push' | 'replace' | 'navigate' | 'back',
  href?: HrefLike,
) => {
  // Instant path: không thêm rAF, để transition bắt đầu càng sớm càng tốt
  executeNav(type, href, TRANSITION_DURATION_MS)
}

const executeNav = (
  type: 'push' | 'replace' | 'navigate' | 'back',
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
      else if (type === 'navigate' && href && 'navigate' in r) (r as LockRouterLike).navigate(href as LockHrefLike)
      else if (type === 'navigate' && href) r.replace(href as LockHrefLike)
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
        else if (type === 'navigate' && href && 'navigate' in router) (router as LockRouterLike).navigate(href as LockHrefLike)
        else if (type === 'navigate' && href) router.replace(href as LockHrefLike)
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
  navigate: (href: HrefLike) => {
    if (isNavigationLocked()) return
    executeNav('navigate', href, TRANSITION_DURATION_MS)
  },
  back: () => {
    if (isNavigationLocked()) return
    executeNav('back', undefined, TRANSITION_DURATION_MS)
  },
}

export const navigateNativeImmediate = navigateNative

/** Alias — single entry point. Same as navigateNative. */
export const navigateSafely = navigateNative
