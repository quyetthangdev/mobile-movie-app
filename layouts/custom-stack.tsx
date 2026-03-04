/**
 * Native Stack — Migrated from JS Stack (@react-navigation/stack).
 *
 * Uses @react-navigation/native-stack with native Fragment transitions (UI thread).
 * Animation chạy trên native thread → 60fps ổn định, không phụ thuộc JS.
 *
 * Deprecated props (JS Stack → Native Stack):
 * - cardStyleInterpolator → không hỗ trợ (dùng animation built-in)
 * - transitionSpec → dùng animationDuration nếu cần
 * - gestureResponseDistance → gestureResponseDistance (chỉ iOS)
 * - gestureVelocityImpact, gestureDirection → không có
 * - cardStyle → contentStyle
 * - cardShadowEnabled → native xử lý
 * - detachInactiveScreens → Native Stack không hỗ trợ
 *
 * @see docs/NATIVE_STACK_MIGRATION_AUDIT.md
 */
import type { ParamListBase } from '@react-navigation/native'
import {
  createNativeStackNavigator,
  type NativeStackNavigationEventMap,
  type NativeStackNavigationOptions,
} from '@react-navigation/native-stack'
import { withLayoutContext } from 'expo-router'
import { Platform } from 'react-native'

import { MOTION } from '@/constants'

const { Navigator } = createNativeStackNavigator()

export const CustomStack = withLayoutContext<
  NativeStackNavigationOptions,
  typeof Navigator,
  import('@react-navigation/native').StackNavigationState<ParamListBase>,
  NativeStackNavigationEventMap
>(Navigator)

export const nativeStackScreenOptions: NativeStackNavigationOptions = {
  headerShown: false,
  /** Animation: slide_from_right (Telegram style) */
  animation: 'slide_from_right',
  /** Spring-like timing: stiffness 300, damping 30 → ~350ms. Native Stack dùng duration thay animationSpec. */
  animationDuration: MOTION.stackTransition.durationMs,
  /** Vuốt trở về phản hồi ngay theo đầu ngón tay */
  gestureEnabled: true,
  fullScreenGestureEnabled: true,
  animationMatchesGesture: true,
  /** Replace dùng push animation thay vì pop — nhất quán với Telegram */
  animationTypeForReplace: 'push',
  presentation: 'card',
  /** Android: header translucent (edge-to-edge) */
  ...(Platform.OS === 'android' && { headerTranslucent: true }),
  contentStyle: { backgroundColor: '#ffffff' },
  /** Shadow đổ lên màn cũ — tạo chiều sâu, cảm giác tự nhiên như Telegram */
  fullScreenGestureShadowEnabled: true,
  /** freezeOnBlur: màn background bị freeze → giảm re-render */
  freezeOnBlur: true,
}
