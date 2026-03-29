/**
 * Notification Store — in-memory list of received notifications (max 50).
 *
 * addNotification: parse FCM payload → INotification → prepend to list
 * markAsRead / markAllAsRead: optimistic local update
 * hydrateFromApi: merge API data into local store (API takes priority)
 * getUnreadCount: derived count
 */
import { create } from 'zustand'

import type {
  INotification,
  INotificationMetadata,
} from '@/types/notification.type'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface NotificationPayload {
  notification?: {
    title?: string
    body?: string
    icon?: string
    image?: string
  }
  data?: Record<string, string>
  messageId?: string
}

interface NotificationStore {
  notifications: INotification[]
  addNotification: (
    payload: NotificationPayload,
    options?: { markAsRead?: boolean },
  ) => void
  markAsRead: (slug: string) => void
  markAllAsRead: () => void
  clearAll: () => void
  getUnreadCount: () => number
  hydrateFromApi: (items: INotification[]) => void
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const MAX_NOTIFICATIONS = 50

function transformPayloadToNotification(
  payload: NotificationPayload,
  markAsRead = false,
): INotification {
  const data = payload.data ?? {}

  // Parse data.payload JSON string (backend sends metadata here)
  let parsedPayload: Record<string, string> = {}
  if (data.payload && typeof data.payload === 'string') {
    try {
      parsedPayload = JSON.parse(data.payload) as Record<string, string>
    } catch {
      // Ignore parse errors
    }
  }

  // Merge: parsed payload takes priority over raw data
  const merged = { ...data, ...parsedPayload }

  const slug =
    merged.slug || data.slug || payload.messageId || `${Date.now()}`
  const createdAt =
    merged.createdAt || data.createdAt || new Date().toISOString()
  const message =
    merged.message || data.message || payload.notification?.body || ''
  const type = merged.type || data.type || 'system'

  const metadata: INotificationMetadata = {
    order: merged.order || '',
    orderType: merged.orderType || '',
    tableName: merged.tableName || '',
    table: merged.table || '',
    branchName: merged.branchName || '',
    branch: merged.branch || '',
    referenceNumber: merged.referenceNumber || '',
    createdAt: merged.createdAt || data.createdAt || createdAt,
  }

  return {
    slug,
    createdAt,
    message,
    senderId: merged.senderId || '',
    receiverId: merged.receiverId || '',
    type,
    isRead: markAsRead,
    metadata,
  }
}

// ─── Store ──────────────────────────────────────────────────────────────────

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],

  addNotification: (payload, options) => {
    set((state) => {
      const item = transformPayloadToNotification(
        payload,
        options?.markAsRead ?? false,
      )
      // Dedup by slug, prepend new, cap at MAX
      const filtered = state.notifications.filter(
        (n) => n.slug !== item.slug,
      )
      return { notifications: [item, ...filtered].slice(0, MAX_NOTIFICATIONS) }
    })
  },

  markAsRead: (slug) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.slug === slug ? { ...n, isRead: true } : n,
      ),
    }))
  },

  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({
        ...n,
        isRead: true,
      })),
    }))
  },

  clearAll: () => set({ notifications: [] }),

  getUnreadCount: () => {
    return get().notifications.filter((n) => !n.isRead).length
  },

  hydrateFromApi: (items) => {
    if (!items || items.length === 0) return
    set((state) => {
      const map = new Map<string, INotification>()
      // Existing local notifications first
      for (const n of state.notifications) map.set(n.slug, n)
      // API data overwrites
      for (const n of items) map.set(n.slug, n)
      const merged = Array.from(map.values())
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .slice(0, MAX_NOTIFICATIONS)
      return { notifications: merged }
    })
  },
}))
