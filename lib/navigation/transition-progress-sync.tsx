/**
 * Transition Progress Sync — Đồng bộ progress từ react-native-screens sang SharedValue.
 *
 * Thay thế withSpring độc lập: Parallax lái theo tiến độ thực của native stack.
 * Giảm jank do 2 animation chạy lệch pha.
 *
 * Phải render trong screen của Native Stack (useTransitionProgress yêu cầu).
 */
import { useEffect } from 'react'
import { useTransitionProgress } from 'react-native-screens'
import { runOnUI } from 'react-native-reanimated'

import { useMasterTransition } from './master-transition-provider'

export function TransitionProgressSyncer() {
  const { progress: nativeProgress } = useTransitionProgress()
  const { transitionProgress } = useMasterTransition()

  useEffect(() => {
    const listener = nativeProgress.addListener(({ value }) => {
      runOnUI((v: number) => {
        'worklet'
        transitionProgress.value = v
      })(value)
    })
    return () => nativeProgress.removeListener(listener)
  }, [nativeProgress, transitionProgress])

  return null
}
