/**
 * CustomStack (Native Stack) với MasterTransitionProvider listeners.
 * screenListeners là prop của Navigator, không nằm trong screenOptions.
 */
import { useMemo } from 'react'

import { CustomStack, nativeStackScreenOptions } from '@/layouts/custom-stack'
import {
  startTransitionFPSMonitor,
  stopTransitionFPSMonitor,
} from '@/lib/qa/transition-fps-monitor'
import { useMasterTransition } from '@/lib/navigation/master-transition-provider'

/**
 * Wrapper: Native Stack + Master Transition listeners.
 * Native Stack mặc định giữ màn trong memory (react-native-screens).
 * __DEV__: Merge Transition FPS Monitor để log FPS trong lúc slide.
 */
export function StackWithMasterTransition() {
  const { screenListeners } = useMasterTransition()

  const mergedListeners = useMemo(() => {
    if (!__DEV__) return screenListeners
    return {
      ...screenListeners,
      transitionStart: (e: { data: { closing: boolean } }) => {
        startTransitionFPSMonitor()
        screenListeners.transitionStart?.(e)
      },
      transitionEnd: (e: { data: { closing: boolean } }) => {
        screenListeners.transitionEnd?.(e)
        stopTransitionFPSMonitor()
      },
    }
  }, [screenListeners])

  return (
    <CustomStack
      screenOptions={nativeStackScreenOptions}
      screenListeners={mergedListeners}
    />
  )
}
