/**
 * NavigationLock — Singleton cho single-flight navigation.
 * Tránh double-tap, lost tap, và race conditions.
 *
 * - isTransitioning: true khi đang chuyển màn
 * - navigateSafely: drop tap nếu đang transitioning, dùng single RAF
 * - unlock: gọi từ screen mới (useEffect) hoặc InteractionManager
 */
import { InteractionManager } from 'react-native'

import { acquireTransitionLock } from './transition-lock'

const STACK_ANIMATION_MS = 320
const TAB_ANIMATION_MS = 320
const MAX_ROUTER_RETRY_FRAMES = 20
/** Fallback: unlock nếu runAfterInteractions không fire (JS congestion / tap+gesture back) */
const UNLOCK_FALLBACK_MS = 600

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

/** Singleton state */
let isTransitioning = false

export const isNavigationLocked = () => isTransitioning

export const lockNavigation = () => {
  isTransitioning = true
}

export const unlockNavigation = () => {
  isTransitioning = false
}

/**
 * Chờ routerRef sẵn sàng (retry khi null lúc init).
 * Trả về router hoặc null sau max retries.
 */
const waitForRouter = (): Promise<RouterLike | null> => {
  return new Promise((resolve) => {
    let frame = 0
    const check = () => {
      const r = routerRef
      if (r) {
        resolve(r)
        return
      }
      frame++
      if (frame >= MAX_ROUTER_RETRY_FRAMES) {
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.warn('[NavigationLock] routerRef still null after retries')
        }
        resolve(null)
        return
      }
      requestAnimationFrame(check)
    }
    requestAnimationFrame(check)
  })
}

type NavAction = 'push' | 'replace' | 'back'

const executeNav = (
  action: NavAction,
  hrefOrNull: HrefLike | null,
  durationMs: number,
) => {
  lockNavigation()
  requestAnimationFrame(() => {
    waitForRouter().then((r) => {
      if (!r) {
        unlockNavigation()
        return
      }
      acquireTransitionLock(durationMs)
      try {
        if (action === 'push' && hrefOrNull) r.push(hrefOrNull)
        else if (action === 'replace' && hrefOrNull) r.replace(hrefOrNull)
        else if (action === 'back') r.back()
      } catch (err) {
        unlockNavigation()
        throw err
      }
    })
  })
}

/**
 * Unlock khi transition xong.
 * InteractionManager.runAfterInteractions + fallback 600ms (tránh lock vĩnh viễn khi JS congestion / tap+gesture back).
 */
export const scheduleUnlock = () => {
  const fallbackId = setTimeout(() => unlockNavigation(), UNLOCK_FALLBACK_MS)
  InteractionManager.runAfterInteractions(() => {
    clearTimeout(fallbackId)
    unlockNavigation()
  })
}

/**
 * navigateSafely — Single-flight, single RAF, xử lý routerRef null.
 *
 * - Nếu isTransitioning: drop tap (không queue)
 * - Set isTransitioning = true
 * - Single RAF → router.push/replace
 * - Unlock: gọi scheduleUnlock() sau khi animation xong
 */
export const navigateSafely = {
  push: (href: HrefLike) => {
    if (isTransitioning) return
    executeNav('push', href, STACK_ANIMATION_MS)
    scheduleUnlock()
  },
  replace: (href: HrefLike) => {
    if (isTransitioning) return
    executeNav('replace', href, TAB_ANIMATION_MS)
    scheduleUnlock()
  },
  back: () => {
    if (isTransitioning) return
    executeNav('back', null, STACK_ANIMATION_MS)
    scheduleUnlock()
  },
}
