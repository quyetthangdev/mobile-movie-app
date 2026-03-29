/**
 * useNotificationResponse — handle user tapping a notification (background + cold start).
 *
 * expo-notifications fires this for:
 * - Background: user taps system notification while app is in background
 * - Cold start: user taps notification that opens the app from killed state
 *
 * Both cases are handled by the same listener + getLastNotificationResponseAsync.
 */
import { useEffect, useRef } from 'react'
import * as Notifications from 'expo-notifications'

import { navigateFromNotification } from '@/lib/notification-navigation'
import { useNotificationStore } from '@/stores/notification.store'

export function useNotificationResponse(enabled = true) {
  const processedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!enabled) return

    const handleResponse = (
      response: Notifications.NotificationResponse,
    ) => {
      const id = response.notification.request.identifier
      // Dedup — avoid processing same notification twice
      if (processedRef.current.has(id)) return
      processedRef.current.add(id)

      const data = response.notification.request.content.data as
        | Record<string, string>
        | undefined

      // Mark as read in store
      const slug = data?.slug
      if (slug) {
        useNotificationStore.getState().markAsRead(slug)
      }

      // Navigate to relevant screen
      navigateFromNotification(data)
    }

    // Background tap listener
    const subscription =
      Notifications.addNotificationResponseReceivedListener(handleResponse)

    // Cold start: check if app was opened by tapping a notification
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) handleResponse(response)
    })

    return () => {
      subscription.remove()
    }
  }, [enabled])
}
