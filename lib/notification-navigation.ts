/**
 * Notification Navigation — map notification data → app route.
 *
 * Used by:
 * - Background tap handler (user taps system notification)
 * - Cold start handler (app opened via notification tap)
 * - Notification list (user taps item in list)
 */
import { NotificationMessageCode } from '@/constants'
import { navigateNative } from '@/lib/navigation'

interface NotificationRouteData {
  message?: string
  order?: string
  [key: string]: string | undefined
}

function parseNotificationData(
  data: Record<string, string> | undefined,
): NotificationRouteData {
  if (!data) return {}

  // Backend may send metadata as JSON string in data.payload
  let parsed: Record<string, string> = {}
  if (data.payload && typeof data.payload === 'string') {
    try {
      parsed = JSON.parse(data.payload) as Record<string, string>
    } catch {
      // Ignore
    }
  }

  return { ...data, ...parsed }
}

function getRouteForMessage(
  routeData: NotificationRouteData,
): string | null {
  const { message, order } = routeData

  switch (message) {
    case NotificationMessageCode.ORDER_NEEDS_READY_TO_GET:
      // Customer: order is ready → navigate to order detail
      return order ? `/payment/${order}` : null

    case NotificationMessageCode.ORDER_NEEDS_PROCESSED:
    case NotificationMessageCode.ORDER_NEEDS_DELIVERED:
    case NotificationMessageCode.ORDER_NEEDS_CANCELLED:
      // Staff/Chef: order status change → navigate to order detail
      return order ? `/payment/${order}` : null

    case NotificationMessageCode.ORDER_PAID:
    case NotificationMessageCode.CARD_ORDER_PAID:
      return order ? `/payment/${order}` : null

    case NotificationMessageCode.ORDER_BILL_FAILED_PRINTING:
    case NotificationMessageCode.ORDER_CHEF_ORDER_FAILED_PRINTING:
    case NotificationMessageCode.ORDER_LABEL_TICKET_FAILED_PRINTING:
      // Printer failure → navigate to order detail
      return order ? `/payment/${order}` : null

    default:
      return null
  }
}

/**
 * Navigate to the screen associated with a notification.
 * Returns true if navigation was performed.
 */
export function navigateFromNotification(
  data: Record<string, string> | undefined,
): boolean {
  const routeData = parseNotificationData(data)
  const route = getRouteForMessage(routeData)

  if (!route) return false

  // Small delay to ensure app is mounted (cold start case)
  setTimeout(() => {
    navigateNative.push(route)
  }, 300)

  return true
}
