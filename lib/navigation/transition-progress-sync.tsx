/**
 * Transition Progress Sync — Đồng bộ progress từ Stack sang SharedValue.
 *
 * JS Stack: useCardAnimation từ @react-navigation/stack.
 * Parallax lái theo tiến độ thực → giảm jank do 2 animation chạy lệch pha.
 */
import { useEffect } from 'react'
import { useCardAnimation } from '@react-navigation/stack'
import { runOnUI } from 'react-native-reanimated'

import { useMasterTransition } from './master-transition-provider'

export function TransitionProgressSyncer() {
  const { current } = useCardAnimation()
  const { transitionProgress } = useMasterTransition()
  const progress = current?.progress

  useEffect(() => {
    if (!progress) return
    const listener = progress.addListener(({ value }: { value: number }) => {
      runOnUI((v: number) => {
        'worklet'
        transitionProgress.value = v
      })(value)
    })
    return () => progress.removeListener(listener)
  }, [progress, transitionProgress])

  return null
}
