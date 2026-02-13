import { type DependencyList, useEffect, useRef } from 'react'
import { InteractionManager } from 'react-native'

/**
 * Chạy callback sau khi animation chuyển màn (và mọi interaction) xong.
 * Dùng để delay API/heavy work → tránh drop frame, mượt như Telegram.
 *
 * @example
 * useRunAfterTransition(() => { refetch() }, [])
 */
export function useRunAfterTransition(callback: () => void, deps: DependencyList = []) {
  const cancelled = useRef(false)

  useEffect(() => {
    cancelled.current = false
    const task = InteractionManager.runAfterInteractions(() => {
      if (cancelled.current) return
      callback()
    })
    return () => {
      cancelled.current = true
      task.cancel()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
