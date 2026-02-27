/** Native Stack + Tabs. Bootstrap: lib/navigation-setup.ts */
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack'
import { Easing } from 'react-native'

const LAZY_DEBUG = process.env.EXPO_PUBLIC_PHASE4_LAZY_DEBUG === 'true'

/** Tab paths — dùng router.replace() để đổi tab. */
export const TAB_ROUTES = {
  HOME: '/(tabs)/home',
  MENU: '/(tabs)/menu',
  CART: '/(tabs)/cart',
  GIFT_CARD: '/(tabs)/gift-card',
  PROFILE: '/(tabs)/profile',
} as const

export type TabRouteKey = keyof typeof TAB_ROUTES

/**
 * Stack: slide_from_right, gesture, freezeOnBlur.
 * Telegram-level: 220–240ms để tăng perceived velocity.
 * gestureResponseDistance: Native Stack không hỗ trợ (chỉ JS Stack).
 */
export const stackScreenOptions: NativeStackNavigationOptions = {
  headerShown: false,
  animation: 'slide_from_right',
  animationDuration: 230,
  gestureEnabled: true,
  fullScreenGestureEnabled: true,
  animationMatchesGesture: true,
  presentation: 'card',
  freezeOnBlur: true,
  contentStyle: { backgroundColor: '#ffffff' },
}

/** Bottom Tabs: fade 230ms (Telegram-level), freezeOnBlur. lazy: false khi PHASE4_LAZY_DEBUG để debug crash. */
export const tabsScreenOptions = {
  headerShown: false,
  lazy: !LAZY_DEBUG,
  freezeOnBlur: true,
  animation: 'fade' as const,
  transitionSpec: {
    animation: 'timing' as const,
    config: {
      duration: 230,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    },
  },
}
