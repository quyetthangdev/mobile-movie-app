/**
 * JS Stack — Tùy chỉnh sâu transition giống Telegram Authentic.
 *
 * Thông số lấy từ MOTION.jsStack (constants/motion.ts) — Single Source of Truth.
 * Chỉnh 1 con số trong MOTION.jsStack → toàn bộ Home + Menu Stack thay đổi đồng bộ.
 *
 * useNativeDriver: true — @react-navigation/stack Card dùng nội bộ.
 * Haptic Sync: MasterTransitionProvider kích hoạt tại transitionStart.
 */
import type { ParamListBase } from '@react-navigation/native'
import {
  createStackNavigator,
  type StackNavigationEventMap,
  type StackNavigationOptions,
} from '@react-navigation/stack'
import { withLayoutContext } from 'expo-router'
import { Easing } from 'react-native'

import { MOTION } from '@/constants'
import {
  forSimpleSlide,
  forTelegramHorizontal,
} from '@/lib/navigation/telegram-style-interpolator'

const { Navigator } = createStackNavigator()

export const JsStack = withLayoutContext<
  StackNavigationOptions,
  typeof Navigator,
  import('@react-navigation/native').StackNavigationState<ParamListBase>,
  StackNavigationEventMap
>(Navigator)

/** Timing + Bezier: Start → tăng tốc nhanh → giảm tốc mềm → dừng (Telegram-style, không tuyến tính) */
const TELEGRAM_TRANSITION_SPEC = {
  animation: 'timing' as const,
  config: {
    duration: MOTION.jsStack.durationMs,
    easing: Easing.bezier(...MOTION.jsStack.easingBezier),
  },
}

export const jsStackScreenOptions: StackNavigationOptions = {
  headerShown: false,
  /** Parallax, shadow, overlay — từ MOTION.jsStack qua forTelegramHorizontal */
  cardStyleInterpolator: forTelegramHorizontal,
  /** Timing + Bezier — Telegram-style: nhanh đầu, chậm mềm cuối */
  transitionSpec: {
    open: TELEGRAM_TRANSITION_SPEC,
    close: TELEGRAM_TRANSITION_SPEC,
  },
  /** Shadow + Overlay */
  cardShadowEnabled: true,
  cardOverlayEnabled: true,
  /** Gesture dính tay — JS Stack dùng gestureResponseDistance thay fullScreenGestureEnabled */
  gestureEnabled: true,
  gestureDirection: 'horizontal',
  gestureResponseDistance: 9999, // Toàn màn hình để vuốt back
  /** Replace dùng push animation */
  animationTypeForReplace: 'push',
  presentation: 'card',
  /** freezeOnBlur: giảm re-render màn background */
  freezeOnBlur: true,
  /** Màu solid — tránh alpha blending cho các lớp nằm dưới (không dùng transparent) */
  cardStyle: { backgroundColor: '#ffffff' },
  /**
   * detachInactiveScreens: mặc định true trong @react-navigation/stack.
   * Unmount màn không active — giảm memory, tránh tính toán layout cho màn ẩn.
   */
}

/** Slide đơn giản — cùng timing curve, không parallax/shadow/overlay. Dùng cho Root, Auth, Profile, Payment, UpdateOrder */
export const jsStackSimpleScreenOptions: StackNavigationOptions = {
  ...jsStackScreenOptions,
  cardStyleInterpolator: forSimpleSlide,
  cardShadowEnabled: false,
  cardOverlayEnabled: false,
}
