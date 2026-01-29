import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Stack } from 'expo-router'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { AppToastProvider, I18nProvider } from '@/providers'

import './global.css'

const queryClient = new QueryClient()

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <AppToastProvider>
            <Stack screenOptions={{ headerShown: false }} />
          </AppToastProvider>
        </I18nProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  )
}
