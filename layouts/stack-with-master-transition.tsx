/**
 * Native Stack với MasterTransitionProvider listeners.
 *
 * Chuyển hẳn sang Native Stack (UINavigationController / Fragments) — giảm Bridge Crossing,
 * animation chạy native, không phụ thuộc JS thread để bắt đầu transition.
 *
 * __DEV__: Merge Transition FPS Monitor.
 */
import { useMemo } from 'react'

import { profileNativeStackScreenOptions } from '@/layouts/custom-stack'
import { useMasterTransition } from '@/lib/navigation/master-transition-provider'
import {
  startTransitionFPSMonitor,
  stopTransitionFPSMonitor,
} from '@/lib/qa/transition-fps-monitor'
import { Stack } from 'expo-router'

function isTransitionFPSMonitorEnabled(): boolean {
  const g = globalThis as { __ENABLE_TRANSITION_FPS_MONITOR?: boolean } | undefined
  return !!g?.__ENABLE_TRANSITION_FPS_MONITOR
}

function useTransitionListeners() {
  const { screenListeners } = useMasterTransition()

  return useMemo(() => {
    if (!__DEV__ || !isTransitionFPSMonitorEnabled()) return screenListeners
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

/**
 * Native Stack — slide_from_right + hãm phanh.
 * Dùng cho root, Menu, Home, Auth, Payment, UpdateOrder, ...
 */
export function NativeStackWithMasterTransition() {
  const mergedListeners = useTransitionListeners()

  return (
    <Stack
      // Native Stack tren react-native-screens tu dong detach/freeze man khong active.
      screenOptions={{
        ...profileNativeStackScreenOptions,
        headerShown: false,
      }}
      screenListeners={mergedListeners}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="notification" options={{ headerShown: false }} />
      <Stack.Screen name="payment" options={{ headerShown: false }} />
      <Stack.Screen name="profile" options={{ headerShown: false }} />
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="cart" options={{ headerShown: false }} />
      <Stack.Screen name="product" options={{ headerShown: false }} />
      <Stack.Screen name="system" options={{ headerShown: false }} />
      <Stack.Screen name="update-order" options={{ headerShown: false }} />
    </Stack>
  )
}
