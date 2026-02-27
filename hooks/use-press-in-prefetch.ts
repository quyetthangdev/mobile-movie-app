/**
 * PressIn Prefetch — prefetch data khi user nhấn (trước khi release).
 * Mục tiêu: Màn đích đã warm trước khi navigate.
 *
 * @example
 * const prefetchMenuItem = usePressInPrefetch()
 * <Pressable onPressIn={() => prefetchMenuItem(slug)} onPress={handleNavigate}>
 */
import { useCallback } from 'react'

import { getSpecificMenuItem } from '@/api/menu'
import { useQueryClient } from '@tanstack/react-query'
import { isTransitionLocked } from '@/lib/navigation/transition-lock'

export function usePressInPrefetchMenuItem() {
  const queryClient = useQueryClient()

  return useCallback(
    (slug: string) => {
      if (!slug?.trim() || isTransitionLocked()) return
      queryClient.prefetchQuery({
        queryKey: ['specific-menu-item', slug],
        queryFn: () => getSpecificMenuItem(slug),
      })
    },
    [queryClient],
  )
}
