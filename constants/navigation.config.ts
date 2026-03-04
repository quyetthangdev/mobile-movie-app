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
 * Lưu ý: Layout thực tế dùng nativeStackScreenOptions từ layouts/custom-stack.
 * stackScreenOptions dùng làm reference — Spring 350ms, bezier fallback.
 */
export const stackScreenOptions: NativeStackNavigationOptions = {
  headerShown: false,
  animation: 'slide_from_right',
  animationDuration: 350,
  gestureEnabled: true,
  fullScreenGestureEnabled: true,
  animationMatchesGesture: true,
  presentation: 'card',
  freezeOnBlur: true,
  contentStyle: { backgroundColor: '#ffffff' },
}

/** Bottom Tabs: fade 240ms, freezeOnBlur. lazy: false khi PHASE4_LAZY_DEBUG để debug crash. */
export const tabsScreenOptions = {
  headerShown: false,
  lazy: !LAZY_DEBUG,
  freezeOnBlur: true,
  animation: 'fade' as const,
  transitionSpec: {
    animation: 'timing' as const,
    config: {
      duration: 250,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1), // Dịu hơn linear, Telegram-style
    },
  },
}
