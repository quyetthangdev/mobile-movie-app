import { Redirect } from 'expo-router'
import React, { useCallback } from 'react'
import { ScrollView } from 'react-native'
import { ScreenContainer } from '@/components/layout'

import { useQueryClient } from '@tanstack/react-query'
import { LoginForm } from '@/components/auth'
import { BannerPage } from '@/constants'
import { navigateNative } from '@/lib/navigation'
import { useMasterTransitionOptional } from '@/lib/navigation/master-transition-provider'
import { useAuthStore } from '@/stores'

export default function LoginScreen() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated())
  const masterTransition = useMasterTransitionOptional()
  const queryClient = useQueryClient()

  const handleLoginSuccess = useCallback(() => {
    const homeCached = !!queryClient.getQueryData(['banners', BannerPage.HOME])
    const overlayMs = homeCached ? 100 : 250
    masterTransition?.showLoadingFor(overlayMs)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        navigateNative.replace('/(tabs)/home')
      })
    })
  }, [masterTransition, queryClient])

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


