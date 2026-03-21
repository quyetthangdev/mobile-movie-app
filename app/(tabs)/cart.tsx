/**
 * Tab Cart — Wrapper dùng CartContent với router handlers.
 */
import { useRouter } from 'expo-router'
import React, { useCallback } from 'react'

import { CartContent } from '@/components/cart/cart-content'
import { TAB_ROUTES } from '@/constants/navigation.config'

export default function CartScreen() {
  const router = useRouter()

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back()
    } else {
      router.replace(TAB_ROUTES.MENU)
    }
  }, [router])

  const handleBackToMenu = useCallback(() => {
    router.replace(TAB_ROUTES.MENU)
  }, [router])

  return (
    <CartContent onBack={handleBack} onBackToMenu={handleBackToMenu} />
  )
}
