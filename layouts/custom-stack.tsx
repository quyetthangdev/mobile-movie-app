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

import { colors } from '@/constants'

const { Navigator } = createNativeStackNavigator()

export const CustomStack = withLayoutContext<
  NativeStackNavigationOptions,
  typeof Navigator,
  import('@react-navigation/native').StackNavigationState<ParamListBase>,
  NativeStackNavigationEventMap
>(Navigator)

export const nativeStackScreenOptions: NativeStackNavigationOptions = {
  headerShown: false,
  animation: 'simple_push',
  animationDuration: 250,
  animationTypeForReplace: 'push',
  presentation: 'card',
  contentStyle: { backgroundColor: colors.background.light },
  statusBarStyle: 'dark',
  statusBarTranslucent: true,
  // Bỏ gesture/shadow options tạm thời — tránh lỗi "expected boolean, had string" trên native bridge
  // gestureEnabled, fullScreenGestureEnabled, animationMatchesGesture, fullScreenGestureShadowEnabled
  ...(Platform.OS === 'android' && { headerTranslucent: true }),
}

/**
 * Profile: slide_from_right + animationDuration 250ms (snappy).
 * fullScreenGestureEnabled: true — vuốt đóng có quán tính hãm phanh đồng bộ.
 * Header: headerShown: false (màn tự custom header). Bật headerShown: true nếu cần header native.
 */
export const profileNativeStackScreenOptions: NativeStackNavigationOptions = {
  ...nativeStackScreenOptions,
  animation: 'slide_from_right',
  animationDuration: 250,
  /**
   * Giữ gesture toàn màn + animation bám theo ngón tay để cảm giác kéo-thả như Telegram.
   */
  fullScreenGestureEnabled: true,
  animationMatchesGesture: true,
  /**
   * Giữ presentation dạng card với shadow (kế thừa từ nativeStackScreenOptions) để tạo chiều sâu khi trượt.
   */
  presentation: 'card',
  /**
   * Mặc định ẩn header native; header custom trong màn sẽ trượt cùng card nên không bị giật.
   */
  headerShown: false,
}
