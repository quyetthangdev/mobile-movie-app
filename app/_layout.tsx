import { BottomSheetModalProvider } from '@gorhom/bottom-sheet'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as SplashScreen from 'expo-splash-screen'
import * as SystemUI from 'expo-system-ui'

import { NativeStackWithMasterTransition } from '@/layouts/stack-with-master-transition'
import { MasterTransitionProvider } from '@/lib/navigation/master-transition-provider'
import { useBeVietnamProFont } from '@/lib/fonts/be-vietnam-pro'
import { useEffect } from 'react'
import { InteractionManager, Platform } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import LogoutSheetPortal from '@/components/profile/logout-sheet-portal'
import { GhostMountProvider, NavigationEngineProvider } from '@/lib/navigation'
import { SharedElementProvider } from '@/lib/shared-element'
import { useBackHandlerForExit } from '@/hooks'
import { setNavigationBarColorFixed, useNavigationBarFixed } from '@/hooks/use-navigation-bar-fixed'
import '@/lib/http-setup'
import '@/lib/store-sync-setup'
import { AppToastProvider, I18nProvider } from '@/providers'

import './global.css'

SplashScreen.preventAutoHideAsync().catch(() => {})

// Global error handlers (keep awake suppress)
// Lỗi này đến từ expo-modules-core khi một dependency cố gắng activate keep awake
// nhưng không thành công (có thể do không có quyền hoặc không được setup đúng)

// Sync errors
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

// Unhandled promise rejections
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
    
    // Log other rejections (dev only)
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

const SPLASH_TIMEOUT_MS = 5000 // Fallback: ẩn splash sau 5s nếu font/init treo

function AppContent() {
  const [fontsLoaded, fontError] = useBeVietnamProFont()
  const ready = fontsLoaded || fontError

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync().catch(() => {})
    }
  }, [ready])

  // Fallback: ẩn splash sau timeout nếu font loading treo (mạng chậm, CDN block...)
  useEffect(() => {
    const t = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {})
    }, SPLASH_TIMEOUT_MS)
    return () => clearTimeout(t)
  }, [])

  if (!ready) {
    return null
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <BottomSheetModalProvider>
            <LogoutSheetPortal />
            <I18nProvider>
              <GhostMountProvider>
                <NavigationEngineProvider>
                  <MasterTransitionProvider>
                    <AppToastProvider>
                      <SharedElementProvider>
                        <NativeStackWithMasterTransition />
                      </SharedElementProvider>
                    </AppToastProvider>
                  </MasterTransitionProvider>
                </NavigationEngineProvider>
              </GhostMountProvider>
            </I18nProvider>
          </BottomSheetModalProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

export default function RootLayout() {
  useNavigationBarFixed('#FFFFFF', true, true)
  useBackHandlerForExit()

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      SystemUI.setBackgroundColorAsync('#ffffff').catch(() => {})

      if (Platform.OS === 'android') {
        setTimeout(() => {
          setNavigationBarColorFixed('#FFFFFF', true, true).catch(() => {})
        }, 800)
      }
    })
    return () => task.cancel()
  }, [])

  return <AppContent />
}
