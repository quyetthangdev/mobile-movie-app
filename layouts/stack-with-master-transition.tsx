/**
 * JsStack wrappers với MasterTransitionProvider listeners.
 *
 * StackWithMasterTransition: Telegram-style (parallax, scale, borderRadius)
 * SimpleStackWithMasterTransition: Simple slide (no parallax/overlay)
 * NativeStackWithMasterTransition: Native Stack — slide_from_right, spring deceleration (hãm phanh)
 *
 * Cả hai đều có screenListeners → transitionEnd unlock navigation đúng cách.
 * __DEV__: Merge Transition FPS Monitor.
 */
import { useMemo } from 'react'

import {
  // nativeStackScreenOptions,
  profileNativeStackScreenOptions,
} from '@/layouts/custom-stack'
import {
  JsStack,
  jsStackScreenOptions,
  jsStackSimpleScreenOptions,
} from '@/layouts/js-stack'
import { useMasterTransition } from '@/lib/navigation/master-transition-provider'
import {
  startTransitionFPSMonitor,
  stopTransitionFPSMonitor,
} from '@/lib/qa/transition-fps-monitor'
import type { StackNavigationOptions } from '@react-navigation/stack'
import { Stack } from 'expo-router'

function useTransitionListeners() {
  const { screenListeners } = useMasterTransition()

  return useMemo(() => {
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
}

/** Telegram-style: Parallax + scale + borderRadius + overlay + shadow */
export function StackWithMasterTransition() {
  const mergedListeners = useTransitionListeners()

  return (
    <JsStack
      screenOptions={jsStackScreenOptions}
      screenListeners={mergedListeners}
    />
  )
}

/** Simple slide — dùng cho Profile, Auth, Payment, UpdateOrder */
export function SimpleStackWithMasterTransition({
  screenOptions,
}: { screenOptions?: StackNavigationOptions } = {}) {
  const mergedListeners = useTransitionListeners()

  return (
    <JsStack
      screenOptions={screenOptions ?? jsStackSimpleScreenOptions}
      screenListeners={mergedListeners}
    />
  )
}

/**
 * Native Stack — slide_from_right + hãm phanh (giống Profile).
 * Dùng cho Menu → Chi tiết món, Product Detail, ...
 * profileNativeStackScreenOptions: 380ms, fullScreenGestureEnabled, animationMatchesGesture.
 */
export function NativeStackWithMasterTransition() {
  const mergedListeners = useTransitionListeners()

  return (
    <Stack
      screenOptions={profileNativeStackScreenOptions}
      screenListeners={mergedListeners}
    />
  )
}
