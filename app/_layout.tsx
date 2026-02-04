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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Performance optimizations for POS/Kiosk: stale time 30s, cache 5min
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
                <Stack screenOptions={{ headerShown: false }} />
              </AppToastProvider>
            </I18nProvider>
          </QueryClientProvider>
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
