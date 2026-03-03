/**
 * Transition FPS Monitor — __DEV__ only.
 *
 * Đo FPS trong lúc slide animation (Menu List → Menu Item Detail).
 * rAF chạy trên JS thread → avg/max không phản ánh UI FPS thật.
 * min FPS là chỉ số đáng tin khi có jank (JS block → frame time tăng).
 *
 * Target 45: thiết bị mid-range, màn phức tạp (Zustand, list, carousel).
 * Set DISABLE_TRANSITION_FPS_MONITOR=true để tắt log.
 */
const TARGET_MIN_FPS = 45

function isDisabled(): boolean {
  return typeof global !== 'undefined' && !!(global as { __DISABLE_TRANSITION_FPS_MONITOR?: boolean }).__DISABLE_TRANSITION_FPS_MONITOR
}
const MAX_FPS_CAP = 120 // Bỏ qua outlier (2 rAF gần nhau → fps ảo)
const MIN_FRAME_TIME_MS = 1000 / MAX_FPS_CAP // ~8.3ms

type FPSResult = {
  attempt: number
  minFps: number
  frames: number
  durationMs: number
  passed: boolean
}

let rafId: number | null = null
let timeoutId: ReturnType<typeof setTimeout> | null = null
let frameCount = 0
let startTime = 0
let minFps = Infinity
let lastFrameTime = 0
let attemptCount = 0
const results: FPSResult[] = []

const FALLBACK_STOP_MS = 500 // transitionEnd có thể không fire trên một số pop

function onFrame(timestamp: number) {
  if (startTime === 0) {
    startTime = timestamp
    lastFrameTime = timestamp
  }
  frameCount++
  const frameTime = timestamp - lastFrameTime
  if (frameTime >= MIN_FRAME_TIME_MS) {
    const fps = 1000 / frameTime
    if (fps < minFps) minFps = fps
  }
  lastFrameTime = timestamp
  rafId = requestAnimationFrame(onFrame)
}

export function startTransitionFPSMonitor(): void {
  if (!__DEV__ || isDisabled()) return
  if (timeoutId) {
    clearTimeout(timeoutId)
    timeoutId = null
  }
  frameCount = 0
  startTime = 0
  minFps = Infinity
  lastFrameTime = 0
  rafId = requestAnimationFrame(onFrame)
  timeoutId = setTimeout(() => {
    timeoutId = null
    stopTransitionFPSMonitor()
  }, FALLBACK_STOP_MS)
}

export function stopTransitionFPSMonitor(): void {
  if (!__DEV__ || isDisabled()) return
  if (timeoutId) {
    clearTimeout(timeoutId)
    timeoutId = null
  }
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
  if (startTime === 0) return

  attemptCount++
  const durationMs = lastFrameTime - startTime
  const minFpsValue = minFps === Infinity ? 60 : minFps
  const passed = minFpsValue >= TARGET_MIN_FPS

  const result: FPSResult = {
    attempt: attemptCount,
    minFps: Math.round(minFpsValue * 10) / 10,
    frames: frameCount,
    durationMs: Math.round(durationMs),
    passed,
  }
  results.push(result)

  const status = result.passed ? '✅ PASS' : '❌ FAIL'
  // eslint-disable-next-line no-console
  console.log(
    `[TransitionFPS] ${status} attempt ${attemptCount}: min=${result.minFps} fps (target ≥${TARGET_MIN_FPS}), frames=${result.frames}, duration=${result.durationMs}ms`,
  )
}

/** Tắt FPS monitor log (gọi trước app mount, VD trong index.js) */
export function disableTransitionFPSMonitor(): void {
  ;(global as { __DISABLE_TRANSITION_FPS_MONITOR?: boolean }).__DISABLE_TRANSITION_FPS_MONITOR = true
}

export function getTransitionFPSResults(): FPSResult[] {
  return [...results]
}

export function resetTransitionFPSMonitor(): void {
  attemptCount = 0
  results.length = 0
}
