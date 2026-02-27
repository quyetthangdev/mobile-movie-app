/**
 * Predictive Prefetch — preload data khi user idle.
 * Chạy khi: screen focus, idle time. Không chạy trong transition lock.
 *
 * Routes: Home → banners + menu | Menu → public-specific-menu | Cart → (payment prefetch ở create-order)
 */
import { useQueryClient } from '@tanstack/react-query'
import { usePathname } from 'expo-router'
import { useEffect } from 'react'
import { InteractionManager } from 'react-native'

import { getBanners } from '@/api/banner'
import { getPublicSpecificMenu } from '@/api/menu'
import { BannerPage } from '@/constants'
import { isTransitionLocked } from '@/lib/navigation/transition-lock'

export function usePredictivePrefetch() {
  const pathname = usePathname()
  const queryClient = useQueryClient()

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      if (isTransitionLocked()) return

      if (pathname === '/' || pathname?.startsWith('/(tabs)/home')) {
        queryClient.prefetchQuery({
          queryKey: ['banners', BannerPage.HOME],
          queryFn: () => getBanners({ page: BannerPage.HOME, isActive: true }),
        })
        queryClient.prefetchQuery({
          queryKey: ['public-specific-menu', { date: '', branch: '', catalog: '' }],
          queryFn: () => getPublicSpecificMenu({ date: '', branch: '', catalog: '' }),
        })
      }

      if (pathname?.startsWith('/menu') || pathname?.includes('/(tabs)/menu')) {
        queryClient.prefetchQuery({
          queryKey: ['public-specific-menu', { date: '', branch: '', catalog: '' }],
          queryFn: () => getPublicSpecificMenu({ date: '', branch: '', catalog: '' }),
        })
      }
    })
    return () => task.cancel()
  }, [pathname, queryClient])
}
