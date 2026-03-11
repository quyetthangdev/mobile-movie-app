/**
 * JS Stack — Tùy chỉnh sâu transition giống Telegram Authentic.
 *
 * Thông số lấy từ MOTION.jsStack (constants/motion.ts) — Single Source of Truth.
 * Chỉnh 1 con số trong MOTION.jsStack → toàn bộ Home + Menu Stack thay đổi đồng bộ.
 *
 * useNativeDriver: true — @react-navigation/stack Card dùng nội bộ.
 * Haptic Sync: MasterTransitionProvider kích hoạt tại transitionStart.
 *
 * Lưu ý: fullScreenGestureEnabled chỉ có trên Native Stack. JS Stack dùng
 * gestureResponseDistance = screenWidth trên iOS để mô phỏng swipe-to-close toàn màn.
 */
import type { ParamListBase } from '@react-navigation/native'
import {
  createStackNavigator,
  type StackNavigationEventMap,
  type StackNavigationOptions,
} from '@react-navigation/stack'
import { withLayoutContext } from 'expo-router'
import { Dimensions, Platform } from 'react-native'

import {
  forSimpleSlide,
  forTelegramHorizontal,
} from '@/lib/navigation/telegram-style-interpolator'
import {
  OPEN_SPEC,
  CLOSE_SPEC,
  GESTURE_RESPONSE_DISTANCE,
} from '@/lib/navigation/interactive-transition'

const { Navigator } = createStackNavigator()

export const JsStack = withLayoutContext<
  StackNavigationOptions,
  typeof Navigator,
  import('@react-navigation/native').StackNavigationState<ParamListBase>,
  StackNavigationEventMap
>(Navigator)

export const jsStackScreenOptions: StackNavigationOptions = {
  headerShown: false,
  cardStyleInterpolator: forTelegramHorizontal,
  transitionSpec: {
    open: OPEN_SPEC,
    close: CLOSE_SPEC,
  },

  /**
   * Giữ màn hình cũ luôn "sống" ở lớp dưới trong suốt transition.
   * Cần cho Shared Element fly-back + parallax depth effect.
   */
  detachPreviousScreen: false,

  /**
   * Nền card mặc định — forTelegramHorizontal override bằng '#ffffff' trực tiếp.
   * SharedElement overlay render ở root (zIndex 9998) nên không cần transparent card.
   */
  cardStyle: { backgroundColor: '#ffffff' },

  cardShadowEnabled: true,
  cardOverlayEnabled: true,
  gestureEnabled: true,
  gestureDirection: 'horizontal',
  gestureResponseDistance: GESTURE_RESPONSE_DISTANCE,
  animationTypeForReplace: 'push',
  presentation: 'card',
  freezeOnBlur: true,
}

export const jsStackSimpleScreenOptions: StackNavigationOptions = {
  ...jsStackScreenOptions,
  cardStyleInterpolator: forSimpleSlide,
  cardShadowEnabled: false,
  cardOverlayEnabled: false,
}

/**
 * Profile placeholder: forSimpleSlide (chỉ translateX, không parallax/shadow) — giảm CPU/GPU.
 * Transition: OPEN_SPEC (ease-out cubic) + CLOSE_SPEC (spring) từ interactive-transition.
 * iOS: gestureResponseDistance = screenWidth để mô phỏng fullScreenGestureEnabled.
 */
export const jsStackProfileScreenOptions: StackNavigationOptions = {
  ...jsStackScreenOptions,
  cardStyleInterpolator: forSimpleSlide,
  cardShadowEnabled: false,
  cardOverlayEnabled: false,
  gestureResponseDistance:
    Platform.OS === 'ios'
      ? Dimensions.get('window').width
      : GESTURE_RESPONSE_DISTANCE,
}
