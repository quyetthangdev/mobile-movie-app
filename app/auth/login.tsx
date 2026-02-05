import { Redirect, useRouter } from 'expo-router'
import React, { useCallback } from 'react'
import { ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { LoginForm } from '@/components/auth'
import { useAuthStore } from '@/stores'

export default function LoginScreen() {
  const router = useRouter()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated())

  const handleLoginSuccess = useCallback(() => {
    router.replace('/(tabs)/home')
  }, [router])

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


