/**
 * Transition Progress Sync — Đồng bộ progress từ Native Stack sang SharedValue.
 *
 * Dùng useTransitionProgress (react-native-screens) — progress từ native stack,
 * listener sync qua runOnUI để ParallaxDriver có frame-by-frame progress.
 */
import { useEffect, useRef } from 'react'
import { useTransitionProgress } from 'react-native-screens'
import { runOnUI } from 'react-native-reanimated'

import { useMasterTransition } from './master-transition-provider'

export function TransitionProgressSyncer() {
  const { progress } = useTransitionProgress()
  const { transitionProgress } = useMasterTransition()
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (!progress) return

    let lastValue = -1

    const syncValue = (v: number) => {
      if (v === lastValue) return
      lastValue = v
      transitionProgress.value = v
    }

    const progressRecord = progress as unknown as Record<string, unknown>
    const nativeTag = progressRecord.__nodeID ?? progressRecord._nativeTag
    if (nativeTag != null) {
      // Native-driven path: Animated.Value backed by native node.
      // addListener still fires on JS but we batch with rAF to reduce bridge pressure.
      const listener = progress.addListener(({ value }: { value: number }) => {
        if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
        rafRef.current = requestAnimationFrame(() => {
          runOnUI((v: number) => {
            'worklet'
            syncValue(v)
          })(value)
        })
      })
      return () => {
        progress.removeListener(listener)
        if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      }
    }

    // Fallback: direct listener (same as before but with dedup)
    const listener = progress.addListener(({ value }: { value: number }) => {
      runOnUI((v: number) => {
        'worklet'
        syncValue(v)
      })(value)
    })
    return () => progress.removeListener(listener)
  }, [progress, transitionProgress])

  return null
}
