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

const { Navigator } = createNativeStackNavigator()

export const CustomStack = withLayoutContext<
  NativeStackNavigationOptions,
  typeof Navigator,
  import('@react-navigation/native').StackNavigationState<ParamListBase>,
  NativeStackNavigationEventMap
>(Navigator)

/** Screen options for Native Stack — Telegram-level performance */
export const nativeStackScreenOptions: NativeStackNavigationOptions = {
  headerShown: false,
  animation: 'slide_from_right',
  gestureEnabled: true,
  fullScreenGestureEnabled: true,
  contentStyle: { backgroundColor: '#ffffff' },
  /** freezeOnBlur: màn background bị freeze → giảm re-render (enableFreeze từ react-native-screens) */
  freezeOnBlur: true,
}
