/**
 * Notification API hooks — fetch list (paginated) + mark as read.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { getNotifications, markNotificationAsRead } from '@/api/notification'
import type { IAllNotificationRequest } from '@/types/notification.type'
import { useNotificationStore } from '@/stores/notification.store'

const NOTIFICATION_QUERY_KEY = 'notifications'

export function useNotifications(
  params: IAllNotificationRequest,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [NOTIFICATION_QUERY_KEY, params],
    queryFn: () => getNotifications(params),
    enabled: options?.enabled ?? true,
    staleTime: 30_000,
  })
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (slug: string) => markNotificationAsRead(slug),
    onMutate: (slug) => {
      // Optimistic: mark as read in local store immediately
      useNotificationStore.getState().markAsRead(slug)
    },
    onSuccess: () => {
      // Invalidate list cache so next fetch reflects server state
      queryClient.invalidateQueries({ queryKey: [NOTIFICATION_QUERY_KEY] })
    },
  })
}
