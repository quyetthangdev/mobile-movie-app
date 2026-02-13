/**
 * Routing: React Navigation + Native Stack + React Native Screens
 * → Animation 60fps/120fps, transition chạy trên native thread.
 *
 * - Root Stack (Expo Router): Native Stack (createNativeStackNavigator).
 * - Push màn con: slide_from_right 280ms, gesture back native.
 * - Bottom tabs: fade 250ms, lazy + freezeOnBlur.
 *
 * Bootstrap: lib/navigation-setup.ts (enableScreens + enableFreeze).
 */
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack'
import { Easing } from 'react-native'

/** Tab segment paths — dùng với router.replace() để đổi tab (không push stack). */
export const TAB_ROUTES = {
  HOME: '/(tabs)/home',
  MENU: '/(tabs)/menu',
  CART: '/(tabs)/cart',
  GIFT_CARD: '/(tabs)/gift-card',
  PROFILE: '/(tabs)/profile',
} as const

export type TabRouteKey = keyof typeof TAB_ROUTES

/** Native Stack: slide từ phải, gesture back, freezeOnBlur. Áp cho mọi màn push. */
export const stackScreenOptions: NativeStackNavigationOptions = {
  headerShown: false,
  animation: 'slide_from_right',
  animationDuration: 280,
  gestureEnabled: true,
  fullScreenGestureEnabled: true,
  animationMatchesGesture: true,
  presentation: 'card',
  freezeOnBlur: true,
  contentStyle: { backgroundColor: '#ffffff' },
}

/** Bottom Tabs (native screens): fade 250ms, lazy + freezeOnBlur, detachInactiveScreens=false ở layout. */
export const tabsScreenOptions = {
  headerShown: false,
  lazy: true,
  freezeOnBlur: true,
  animation: 'fade' as const,
  transitionSpec: {
    animation: 'timing' as const,
    config: {
      duration: 250,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    },
  },
}
