import { BottomSheetModalProvider } from '@gorhom/bottom-sheet'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Stack } from 'expo-router'
import * as SystemUI from 'expo-system-ui'
import { useLayoutEffect } from 'react'
import { Platform } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { stackScreenOptions } from '@/constants/navigation.config'
import { setNavigationBarColorFixed, useNavigationBarFixed } from '@/hooks/use-navigation-bar-fixed'
import '@/lib/navigation-setup'
import { AppToastProvider, I18nProvider } from '@/providers'

import './global.css'

// Stack từ expo-router = Native Stack (createNativeStackNavigator) + react-native-screens

// Global error handlers để suppress lỗi keep awake không cần thiết
// Lỗi này đến từ expo-modules-core khi một dependency cố gắng activate keep awake
// nhưng không thành công (có thể do không có quyền hoặc không được setup đúng)

// Handler cho synchronous errors
if (__DEV__ && typeof ErrorUtils !== 'undefined') {
  const originalErrorHandler = ErrorUtils.getGlobalHandler()
  ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
    const errorMessage = error?.message || String(error)
    
    // Suppress lỗi keep awake - không ảnh hưởng đến chức năng
    if (errorMessage.includes('Unable to activate keep awake') || 
        errorMessage.includes('keep awake')) {
      // Silently ignore - không cần thiết cho app này
      return
    }
    
    // Gọi original handler cho các lỗi khác
    if (originalErrorHandler) {
      originalErrorHandler(error, isFatal)
    }
  })
}

// Handler cho unhandled promise rejections (chạy ở đây để đảm bảo chạy sau polyfills)
if (typeof global !== 'undefined' && !global.onunhandledrejection) {
  global.onunhandledrejection = function(event: PromiseRejectionEvent) {
    const error = event?.reason as Error | undefined
    const errorMessage = error?.message || String(error || '')
    
    // Suppress lỗi keep awake - không ảnh hưởng đến chức năng
    if (typeof errorMessage === 'string' && 
        (errorMessage.includes('Unable to activate keep awake') || 
         errorMessage.includes('keep awake'))) {
      // Prevent default error logging
      if (event?.preventDefault) {
        event.preventDefault()
      }
      return
    }
    
    // Log các lỗi promise rejection khác (chỉ trong dev)
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('Unhandled promise rejection:', error)
    }
  }
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
      // Tăng delay để đảm bảo Activity đã được attach
      setTimeout(() => {
        setNavigationBarColorFixed('#FFFFFF', true, true).catch(() => {
          // Silently fail - error đã được handle trong function
        })
      }, 800)
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
