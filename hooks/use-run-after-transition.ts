import { type DependencyList, useEffect, useRef } from 'react'
import { InteractionManager, Platform } from 'react-native'

const ESTIMATED_TRANSITION_MS = 300

export type UseRunAfterTransitionOptions = {
  /**
   * Delay (ms) — chỉ Android.
   * - > 0: thêm delay sau runAfterInteractions (tránh mount trong transition).
   * - < 0: pre-emptive fire — callback chạy (ESTIMATED_TRANSITION_MS + androidDelayMs) ms từ mount.
   *   VD: -20 → fire ~280ms, content xuất hiện ngay khi slide sắp xong.
   */
  androidDelayMs?: number
}

/**
 * Chạy callback sau khi animation chuyển màn (và mọi interaction) xong.
 * Dùng để delay API/heavy work → tránh drop frame, mượt như Telegram.
 *
 * @param androidDelayMs — Trên Android:
 *   - > 0: delay thêm sau runAfterInteractions.
 *   - < 0: pre-emptive fire ~20–30ms trước transitionEnd (thử -20 hoặc -30).
 *
 * @example
 * useRunAfterTransition(() => setReady(true), [])
 * useRunAfterTransition(() => setReady(true), [], { androidDelayMs: -20 })
 */
export function useRunAfterTransition(
  callback: () => void,
  deps: DependencyList = [],
  options?: UseRunAfterTransitionOptions,
) {
  const cancelled = useRef(false)
  const androidDelay = options?.androidDelayMs ?? 0

  useEffect(() => {
    cancelled.current = false
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    if (Platform.OS === 'android' && androidDelay < 0) {
      const fireAtMs = Math.max(0, ESTIMATED_TRANSITION_MS + androidDelay)
      timeoutId = setTimeout(() => {
        if (!cancelled.current) callback()
        timeoutId = null
      }, fireAtMs)
      return () => {
        cancelled.current = true
        if (timeoutId) clearTimeout(timeoutId)
      }
    }

    const task = InteractionManager.runAfterInteractions(() => {
      if (cancelled.current) return
      if (Platform.OS === 'android' && androidDelay > 0) {
        timeoutId = setTimeout(() => {
          if (!cancelled.current) callback()
          timeoutId = null
        }, androidDelay)
      } else {
        callback()
      }
    })
    return () => {
      cancelled.current = true
      if (timeoutId) clearTimeout(timeoutId)
      task.cancel()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
