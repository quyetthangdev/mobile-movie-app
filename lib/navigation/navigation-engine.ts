/**
 * Navigation Engine — JS-Independent.
 * Dispatch chạy trong requestAnimationFrame, tránh React batching queue.
 * Animation bắt đầu frame kế tiếp.
 *
 * Rule: Component gọi navigateNative.push/replace, không gọi router trực tiếp.
 */
import type { Href } from 'expo-router'

export type HrefLike = Href | string
import { acquireTransitionLock } from './transition-lock'

const STACK_ANIMATION_MS = 280
const TAB_ANIMATION_MS = 250

export type RouterLike = {
  push: (href: HrefLike) => void
  replace: (href: HrefLike) => void
  back: () => void
}

let routerRef: RouterLike | null = null

export const setNavigationRouter = (router: RouterLike | null) => {
  routerRef = router
}

const dispatch = (fn: () => void, durationMs: number) => {
  requestAnimationFrame(() => {
    acquireTransitionLock(durationMs)
    fn()
  })
}

export const navigateNative = {
  push: (href: HrefLike) => {
    const r = routerRef
    if (!r) return
    dispatch(() => r.push(href), STACK_ANIMATION_MS)
  },
  replace: (href: HrefLike) => {
    const r = routerRef
    if (!r) return
    dispatch(() => r.replace(href), TAB_ANIMATION_MS)
  },
  back: () => {
    const r = routerRef
    if (!r) return
    dispatch(() => r.back(), STACK_ANIMATION_MS)
  },
}
