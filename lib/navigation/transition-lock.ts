/**
 * Transition Lock — Telegram pattern.
 * Trong lúc animation chạy (~250–280ms): JS updates bị trì hoãn.
 * Mục tiêu: JS thread không phá animation frame.
 */

const ANIMATION_DURATION_MS = 280

let lockUntil = 0

export const isTransitionLocked = () => Date.now() < lockUntil

export const acquireTransitionLock = (durationMs = ANIMATION_DURATION_MS) => {
  lockUntil = Date.now() + durationMs
}

export const releaseTransitionLock = () => {
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
