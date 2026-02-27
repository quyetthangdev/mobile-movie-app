/**
 * Transition Lock — Telegram pattern.
 * Phase 7.5: Timeout protection, auto-release.
 * Trong lúc animation chạy (~320ms): JS updates bị trì hoãn.
 * Mục tiêu: JS thread không phá animation frame.
 */

const LOCK_DURATION_MS = 320
const MAX_LOCK_MS = 400

let lockUntil = 0
let timeoutId: ReturnType<typeof setTimeout> | null = null

const clearTimeoutIfAny = () => {
  if (timeoutId) {
    clearTimeout(timeoutId)
    timeoutId = null
  }
}

export const isTransitionLocked = () => Date.now() < lockUntil

export const acquireTransitionLock = (durationMs = LOCK_DURATION_MS) => {
  clearTimeoutIfAny()
  lockUntil = Date.now() + durationMs
  timeoutId = setTimeout(() => {
    lockUntil = 0
    timeoutId = null
  }, Math.min(durationMs + 80, MAX_LOCK_MS))
}

export const releaseTransitionLock = () => {
  clearTimeoutIfAny()
  lockUntil = 0
}

export const runWhenUnlocked = <T>(fn: () => T): Promise<T> => {
  return new Promise((resolve) => {
    const check = () => {
      if (!isTransitionLocked()) {
        resolve(fn())
        return
      }
      requestAnimationFrame(check)
    }
    requestAnimationFrame(check)
  })
}
