import { BottomSheetModalProvider } from '@gorhom/bottom-sheet'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Stack } from 'expo-router'
import * as SystemUI from 'expo-system-ui'
import { useLayoutEffect } from 'react'
import { Platform } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { enableScreens } from 'react-native-screens'

import { setNavigationBarColorFixed, useNavigationBarFixed } from '@/hooks/use-navigation-bar-fixed'
import { AppToastProvider, I18nProvider } from '@/providers'

import './global.css'

// Enable native screens for better performance (POS/Kiosk critical)
enableScreens(true)

// ============================================================================
// NAVIGATION TRANSITION CONFIG - Tối ưu animation chuyển trang
// ============================================================================
const stackScreenOptions = {
  headerShown: false,
  // Enable animation transitions
  animation: Platform.select({
    ios: 'default', // iOS native transition (mượt nhất)
    android: 'fade_from_bottom', // Android native transition
    default: 'default',
  }) as 'default' | 'fade_from_bottom' | 'fade' | 'slide_from_right' | 'slide_from_left' | 'slide_from_bottom' | 'none',
  // Animation enabled
  animationEnabled: true,
  // Gesture enabled for iOS swipe back
  gestureEnabled: Platform.OS === 'ios',
  // Presentation mode
  presentation: 'card' as const,
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Performance optimizations: stale time 30s, cache 5min
      staleTime: 30 * 1000,
      gcTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export default function RootLayout() {
  useNavigationBarFixed('#FFFFFF', true, true)

  useLayoutEffect(() => {
    SystemUI.setBackgroundColorAsync('#ffffff').catch(() => {})
    
    if (Platform.OS === 'android') {
      setTimeout(() => {
        setNavigationBarColorFixed('#FFFFFF', true, true).catch(() => {})
      }, 300)
    }
  }, [])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <BottomSheetModalProvider>
          <QueryClientProvider client={queryClient}>
            <I18nProvider>
              <AppToastProvider>
                <Stack screenOptions={stackScreenOptions} />
              </AppToastProvider>
            </I18nProvider>
          </QueryClientProvider>
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
