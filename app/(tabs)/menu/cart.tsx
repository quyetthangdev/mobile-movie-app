/**
 * Cart trong menu stack — push từ product detail với slide_from_right.
 * Flow transition: mount shell nhẹ trước → transition mượt → sau đó mount CartContent.
 */
import { useRouter } from 'expo-router'
import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useColorScheme } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { CartContent } from '@/components/cart/cart-content'
import { CartTransitionShell } from '@/components/cart/cart-transition-shell'
import { TAB_ROUTES } from '@/constants/navigation.config'
import { useRunAfterTransition } from '@/hooks'

export default function MenuCartScreen() {
  const router = useRouter()
  const { t } = useTranslation('menu')
  const insets = useSafeAreaInsets()
  const [contentReady, setContentReady] = useState(false)
  const isDark = useColorScheme() === 'dark'

  // Defer CartContent đến sau slide — tối giản như Profile → thông tin (250ms)
  useRunAfterTransition(() => setContentReady(true), [], {
    androidDelayMs: 280, // 250ms animation + 30ms buffer
  })

  const handleBack = useCallback(() => {
    router.back()
  }, [router])

  const handleBackToMenu = useCallback(() => {
    router.replace(TAB_ROUTES.MENU)
  }, [router])

  // Shell pure UI — 0 hooks, nhận isDark + insets + title từ parent
  if (!contentReady) {
    return (
      <CartTransitionShell
        onBack={handleBack}
        isDark={isDark}
        insets={{ top: insets.top, bottom: insets.bottom }}
        title={t('tabs.cart', 'Giỏ hàng')}
      />
    )
  }

  return (
    <CartContent onBack={handleBack} onBackToMenu={handleBackToMenu} />
  )
}
