/**
 * Store Safe Scheduler — delay Zustand update khi transition đang chạy.
 * Nếu transition lock active → delay update sang requestIdleCallback.
 */
import { isTransitionLocked } from './transition-lock'

const hasRequestIdleCallback = typeof requestIdleCallback === 'function'

export const scheduleStoreUpdate = (fn: () => void) => {
  if (!isTransitionLocked()) {
    fn()
    return
  }
  if (hasRequestIdleCallback) {
    requestIdleCallback(() => fn(), { timeout: 100 })
  } else {
    setTimeout(fn, 50)
  }
}
