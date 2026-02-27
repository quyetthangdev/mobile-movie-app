/**
 * Predictive Prefetch — preload data khi user idle.
 * Chạy khi: user idle, không trong animation frame.
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
    })
    return () => task.cancel()
  }, [pathname, queryClient])
}
