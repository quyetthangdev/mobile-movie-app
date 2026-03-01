import { Redirect } from 'expo-router'
import React, { useCallback } from 'react'
import { ScrollView } from 'react-native'
import { ScreenContainer } from '@/components/layout'

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
    <ScreenContainer edges={['top']} className="flex-1">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <LoginForm onLoginSuccess={handleLoginSuccess} />
      </ScrollView>
    </ScreenContainer>
  )
}


