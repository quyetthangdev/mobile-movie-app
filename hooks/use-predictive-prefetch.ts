/**
 * Predictive Prefetch — preload data khi user idle.
 * Chạy khi: screen focus, idle time. Không chạy trong transition lock.
 *
 * Routes: Home → banners + menu (sau 2s idle) | Menu → public-specific-menu | Cart → (payment prefetch ở create-order)
 *
 * Phase 6 Task 6: Khi user ở Home 2s, prefetch Menu data để chuyển tab mượt hơn.
 */
import { useQueryClient } from '@tanstack/react-query'
import { usePathname } from 'expo-router'
import moment from 'moment'
import { useEffect, useMemo, useRef } from 'react'
import { InteractionManager } from 'react-native'

import { getBanners } from '@/api/banner'
import { getPublicSpecificMenu, getSpecificMenu } from '@/api/menu'
import { BannerPage, FILTER_VALUE } from '@/constants'
import { isTransitionLocked } from '@/lib/navigation/transition-lock'
import { useAuthStore, useBranchStore, useMenuFilterStore, useUserStore } from '@/stores'
import type { ISpecificMenuRequest } from '@/types'

const HOME_IDLE_PREFETCH_MS = 2000

export function usePredictivePrefetch() {
  const pathname = usePathname()
  const queryClient = useQueryClient()
  const branchSlug = useBranchStore((s) => s.branch?.slug)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated())
  const userSlug = useUserStore((s) => s.userInfo?.slug)
  const menuFilter = useMenuFilterStore((s) => s.menuFilter)
  const hasPrefetchedRef = useRef(false)

  const isOnHome =
    pathname === '/' ||
    pathname === '/(tabs)' ||
    pathname?.startsWith('/(tabs)/home')

  const hasUser = isAuthenticated && !!userSlug
  const hasBranch = !!branchSlug

  const menuRequest = useMemo<ISpecificMenuRequest>(
    () => ({
      date: moment().format('YYYY-MM-DD'),
      branch: branchSlug,
      catalog: menuFilter.catalog,
      productName: menuFilter.productName,
      minPrice: menuFilter.minPrice ?? FILTER_VALUE.MIN_PRICE,
      maxPrice: menuFilter.maxPrice ?? FILTER_VALUE.MAX_PRICE,
      slug: menuFilter.menu,
    }),
    [
      branchSlug,
      menuFilter.catalog,
      menuFilter.productName,
      menuFilter.minPrice,
      menuFilter.maxPrice,
      menuFilter.menu,
    ],
  )

  // Prefetch ngay khi vào Home (banners) + Menu/Menu khi đang ở Menu
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      if (isTransitionLocked()) return

      if (isOnHome) {
        queryClient.prefetchQuery({
          queryKey: ['banners', BannerPage.HOME],
          queryFn: () => getBanners({ page: BannerPage.HOME, isActive: true }),
        })
      }

      if (pathname?.startsWith('/menu') || pathname?.includes('/(tabs)/menu')) {
        if (hasBranch) {
          if (hasUser) {
            queryClient.prefetchQuery({
              queryKey: ['specific-menu', menuRequest],
              queryFn: () => getSpecificMenu(menuRequest),
            })
          } else {
            queryClient.prefetchQuery({
              queryKey: ['public-specific-menu', menuRequest],
              queryFn: () => getPublicSpecificMenu(menuRequest),
            })
          }
        }
      }
    })
    return () => task.cancel()
  }, [pathname, isOnHome, hasBranch, hasUser, queryClient, menuRequest])

  // Phase 6 Task 6: Prefetch Menu sau 2s idle trên Home
  useEffect(() => {
    if (!isOnHome || !hasBranch) {
      hasPrefetchedRef.current = false
      return
    }

    const timeoutId = setTimeout(() => {
      InteractionManager.runAfterInteractions(() => {
        if (isTransitionLocked()) return
        if (hasPrefetchedRef.current) return
        hasPrefetchedRef.current = true

        if (hasUser) {
          queryClient.prefetchQuery({
            queryKey: ['specific-menu', menuRequest],
            queryFn: () => getSpecificMenu(menuRequest),
          })
        } else {
          queryClient.prefetchQuery({
            queryKey: ['public-specific-menu', menuRequest],
            queryFn: () => getPublicSpecificMenu(menuRequest),
          })
        }
      })
    }, HOME_IDLE_PREFETCH_MS)

    return () => clearTimeout(timeoutId)
  }, [isOnHome, hasBranch, hasUser, queryClient, menuRequest])
}
