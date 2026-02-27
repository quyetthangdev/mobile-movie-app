import { Redirect } from 'expo-router'
import React, { useCallback } from 'react'
import { ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { LoginForm } from '@/components/auth'
import { navigateNative } from '@/lib/navigation'
import { useAuthStore } from '@/stores'

export default function LoginScreen() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated())

  const handleLoginSuccess = useCallback(() => {
    navigateNative.replace('/(tabs)/home')
  }, [])

  if (isAuthenticated) {
    return <Redirect href="/(tabs)/home" />
  }

  return (
    <SafeAreaView className="flex-1" edges={['top']}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <LoginForm onLoginSuccess={handleLoginSuccess} />
      </ScrollView>
    </SafeAreaView>
  )
}


