/**
 * Task 4 — Total Thread Isolation (Steel Curtain).
 *
 * Global Task Queue: Side effects (Analytics, Storage Write, Heavy Selectors)
 * được queue khi isTransitioning = true.
 * Flush sau transitionProgress === 1 + 100ms để frame ổn định.
 */
const FLUSH_DELAY_MS = 100

const queue: Array<() => void> = []
let isQueueing = false
let flushTimeoutId: ReturnType<typeof setTimeout> | null = null

function clearFlushTimeout() {
  if (flushTimeoutId) {
    clearTimeout(flushTimeoutId)
    flushTimeoutId = null
  }
}

function flush() {
  clearFlushTimeout()
  const tasks = [...queue]
  queue.length = 0
  tasks.forEach((fn) => {
    try {
      fn()
    } catch (err) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn('[TransitionTaskQueue] Task error:', err)
      }
    }
  })
}

function scheduleFlush() {
  clearFlushTimeout()
  flushTimeoutId = setTimeout(flush, FLUSH_DELAY_MS)
}

/**
 * Gọi khi transition bắt đầu. Side effects sẽ được queue.
 */
export function setTransitionQueueing(enabled: boolean) {
  isQueueing = enabled
  if (!enabled) {
    scheduleFlush()
  }
}

/**
 * Lên lịch side effect. Nếu đang transitioning → queue. Ngược lại → chạy ngay.
 * Dùng cho: Analytics, Storage Write, Zustand updates nặng, Heavy selectors.
 */
export function scheduleTransitionTask(fn: () => void) {
  if (isQueueing) {
    queue.push(fn)
  } else {
    try {
      fn()
    } catch (err) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn('[TransitionTaskQueue] Task error:', err)
      }
    }
  }
}

/**
 * Kiểm tra có đang queue không (để tránh double-schedule).
 */
export function isTransitionQueueing() {
  return isQueueing
}
