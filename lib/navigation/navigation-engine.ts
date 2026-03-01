/**
 * Navigation Engine — JS-Independent.
 * Đã tối ưu hóa: Dùng dispatchImmediate để đảm bảo <16ms latency.
 * Sửa lỗi lost tap: Thêm cơ chế retry khi router chưa sẵn sàng.
 */
import type { Href } from 'expo-router'
import {
  getNavigationRouter,
  setNavigationRouter,
  type HrefLike as LockHrefLike,
  type RouterLike as LockRouterLike,
} from './navigation-lock'
import { acquireTransitionLock } from './transition-lock'

export type HrefLike = Href | string

const STACK_ANIMATION_MS = 320
const TAB_ANIMATION_MS = 320

export type RouterLike = LockRouterLike

export { setNavigationRouter }

/**
 * Task 1 — Zero-Latency: setImmediate.
 * Đẩy navigation vào cuối microtask hiện tại → <16ms từ tap.
 */
const dispatchImmediate = (fn: () => void, durationMs: number) => {
  setImmediate(() => {
    acquireTransitionLock(durationMs)
    fn()
  })
}

const getRouter = () => getNavigationRouter()

/**
 * Thực hiện lệnh push/replace với cơ chế Retry nếu router chưa sẵn sàng
 */
const executeWithRetry = (
  type: 'push' | 'replace' | 'back',
  href?: HrefLike,
  duration = STACK_ANIMATION_MS,
) => {
  const r = getRouter()
  if (!r) {
    // Nếu router chưa sẵn sàng, thử lại ở frame tiếp theo
    requestAnimationFrame(() => executeWithRetry(type, href, duration))
    return
  }

  dispatchImmediate(() => {
    if (type === 'push') r.push(href as LockHrefLike)
    else if (type === 'replace') r.replace(href as LockHrefLike)
    else if (type === 'back') r.back()
  }, duration)
}

/**
 * navigateNative giờ đây đã tối ưu latency và có retry.
 * Dùng cho cả NativeGesturePressable và pressable thông thường.
 */
export const navigateNative = {
  push: (href: HrefLike) => executeWithRetry('push', href, STACK_ANIMATION_MS),
  replace: (href: HrefLike) =>
    executeWithRetry('replace', href, TAB_ANIMATION_MS),
  back: () => executeWithRetry('back', undefined, STACK_ANIMATION_MS),
}

// Giữ lại alias để tương thích code cũ
export const navigateNativeImmediate = navigateNative
