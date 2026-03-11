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
  /**
   * Animation: simple_push — 2D slide, không hiệu ứng 3D/card depth.
   * Vẫn chạy trên native thread, giữ gesture như iOS.
   */
  animation: 'simple_push',
  /**
   * Spring-like timing: stiffness 300, damping 30.
   * Native Stack chỉ cho cấu hình duration; dùng MOTION.nativeStack để tạo cảm giác hãm phanh (brake) ~260ms.
   */
  animationDuration: MOTION.nativeStack.durationMs,
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

/**
 * Profile: slide_from_right + animationDuration dài hơn → pha cuối chậm, êm.
 * fullScreenGestureEnabled: true — vuốt đóng có quán tính hãm phanh đồng bộ.
 * Header: headerShown: false (màn tự custom header). Bật headerShown: true nếu cần header native.
 */
export const profileNativeStackScreenOptions: NativeStackNavigationOptions = {
  ...nativeStackScreenOptions,
  animation: 'slide_from_right',
  /**
   * Duration vừa phải (~380ms) giống profile placeholder test trước đó:
   * đủ để cảm nhận hãm phanh nhưng không tạo cảm giác delay.
   */
  animationDuration: 380,
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
