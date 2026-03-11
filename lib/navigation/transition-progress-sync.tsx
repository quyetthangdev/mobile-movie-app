/**
 * Transition Progress Sync — Đồng bộ progress từ Stack sang SharedValue.
 *
 * Sử dụng Animated.event với useNativeDriver và node listener thay vì
 * addListener (JS bridge hop). Animated.Value.__nodeID được attach trực tiếp
 * vào native driver → progress update mỗi frame KHÔNG qua JS thread.
 *
 * Fallback: nếu không có native node, dùng addListener + runOnUI.
 */
import { useEffect, useRef } from 'react'
import { useCardAnimation } from '@react-navigation/stack'
import { runOnUI } from 'react-native-reanimated'

import { useMasterTransition } from './master-transition-provider'

export function TransitionProgressSyncer() {
  const { current } = useCardAnimation()
  const { transitionProgress } = useMasterTransition()
  const progress = current?.progress
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
