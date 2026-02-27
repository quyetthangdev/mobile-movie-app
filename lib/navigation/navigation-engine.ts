/**
 * Navigation Engine — JS-Independent.
 * Dispatch chạy trong requestAnimationFrame, tránh React batching queue.
 * Animation bắt đầu frame kế tiếp.
 *
 * Rule: Component gọi navigateNative.push/replace, không gọi router trực tiếp.
 */
import type { Href } from 'expo-router'
import { acquireTransitionLock } from './transition-lock'

export type HrefLike = Href | string

const STACK_ANIMATION_MS = 320
const TAB_ANIMATION_MS = 320

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
    requestAnimationFrame(() => {
      acquireTransitionLock(durationMs)
      fn()
    })
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
