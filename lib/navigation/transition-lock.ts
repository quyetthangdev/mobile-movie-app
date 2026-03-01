/**
 * Transition Lock — Telegram pattern.
 * Tối ưu hóa: Đồng bộ hóa lock với vòng đời animation.
 */
const FALLBACK_LOCK_MS = 600 // Tăng thời gian fallback để an toàn

let lockUntil = 0
let timeoutId: ReturnType<typeof setTimeout> | null = null

const clearTimeoutIfAny = () => {
  if (timeoutId) {
    clearTimeout(timeoutId)
    timeoutId = null
  }
}

export const isTransitionLocked = () => Date.now() < lockUntil

export const acquireTransitionLock = (durationMs = FALLBACK_LOCK_MS) => {
  clearTimeoutIfAny()

  // Khóa dựa trên thời gian tối đa + buffer
  lockUntil = Date.now() + Math.min(durationMs + 200, FALLBACK_LOCK_MS)

  // Fallback timer an toàn: tự mở khóa nếu có lỗi xảy ra
  timeoutId = setTimeout(
    () => {
      lockUntil = 0
      timeoutId = null
    },
    Math.min(durationMs + 200, FALLBACK_LOCK_MS),
  )
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
