/**
 * Notification List Screen — paginated, pull-to-refresh, tab filter, undo mark-all.
 */
import { FlashList } from '@shopify/flash-list'
import { Bell } from 'lucide-react-native'
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native'
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { FloatingHeader } from '@/components/navigation/floating-header'
import { Skeleton } from '@/components/ui'
import { colors } from '@/constants'
import { STATIC_TOP_INSET } from '@/constants/status-bar'
import { NotificationMessageCode } from '@/constants/notification.constant'
import { useMarkNotificationAsRead, useNotifications } from '@/hooks/use-notification'
import { navigateNative } from '@/lib/navigation'
import { useUserStore } from '@/stores'
import { useNotificationStore } from '@/stores/notification.store'
import type { INotification } from '@/types/notification.type'

// ─── Notification helpers ────────────────────────────────────────────────────

function getNotificationTitle(message: string): string {
  switch (message) {
    case NotificationMessageCode.ORDER_NEEDS_PROCESSED: return 'Đơn hàng cần xử lý'
    case NotificationMessageCode.ORDER_NEEDS_DELIVERED: return 'Đơn hàng cần giao'
    case NotificationMessageCode.ORDER_NEEDS_READY_TO_GET: return 'Đơn hàng sẵn sàng'
    case NotificationMessageCode.ORDER_NEEDS_CANCELLED: return 'Đơn hàng đã huỷ'
    case NotificationMessageCode.ORDER_BILL_FAILED_PRINTING: return 'In hoá đơn lỗi'
    case NotificationMessageCode.ORDER_CHEF_ORDER_FAILED_PRINTING: return 'In đơn bếp lỗi'
    case NotificationMessageCode.ORDER_LABEL_TICKET_FAILED_PRINTING: return 'In nhãn dán lỗi'
    case NotificationMessageCode.ORDER_PAID: return 'Đơn hàng đã thanh toán'
    case NotificationMessageCode.CARD_ORDER_PAID: return 'Thẻ quà tặng đã thanh toán'
    default: return message || 'Thông báo'
  }
}

function getNotificationBody(message: string, orderSlug: string): string {
  const ref = orderSlug ? `#${orderSlug}` : ''
  switch (message) {
    case NotificationMessageCode.ORDER_NEEDS_PROCESSED:
      return `Đơn ${ref} đang chờ xử lý`
    case NotificationMessageCode.ORDER_NEEDS_DELIVERED:
      return `Đơn ${ref} cần được giao`
    case NotificationMessageCode.ORDER_NEEDS_READY_TO_GET:
      return `Đơn ${ref} đã sẵn sàng để lấy`
    case NotificationMessageCode.ORDER_NEEDS_CANCELLED:
      return `Đơn ${ref} đã bị huỷ`
    case NotificationMessageCode.ORDER_BILL_FAILED_PRINTING:
      return `Hoá đơn ${ref} in thất bại`
    case NotificationMessageCode.ORDER_CHEF_ORDER_FAILED_PRINTING:
      return `Phiếu bếp ${ref} in thất bại`
    case NotificationMessageCode.ORDER_LABEL_TICKET_FAILED_PRINTING:
      return `Nhãn dán ${ref} in thất bại`
    case NotificationMessageCode.ORDER_PAID:
    case NotificationMessageCode.CARD_ORDER_PAID:
      return `Đơn ${ref} đã được thanh toán`
    default:
      return ''
  }
}

function formatTimeAgo(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Vừa xong'
  if (mins < 60) return `${mins} phút trước`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} giờ trước`
  const days = Math.floor(hours / 24)
  return `${days} ngày trước`
}

// ─── Skeleton item ───────────────────────────────────────────────────────────

const NotificationSkeletonItem = memo(function NotificationSkeletonItem() {
  return (
    <View style={ns.itemContainer}>
      <View style={ns.itemInner}>
        <Skeleton className="w-10 h-10 rounded-xl" />
        <View style={{ flex: 1, gap: 6 }}>
          <Skeleton className="h-3.5 rounded w-2/3" />
          <Skeleton className="h-3 rounded w-full" />
          <Skeleton className="h-3 rounded w-1/4" />
        </View>
      </View>
    </View>
  )
})

// ─── NotificationItem ────────────────────────────────────────────────────────

const NotificationItem = memo(function NotificationItem({
  item,
  isDark,
  primaryColor,
  onMarkRead,
}: {
  item: INotification
  isDark: boolean
  primaryColor: string
  onMarkRead: (slug: string) => void
}) {
  const handlePress = useCallback(() => {
    onMarkRead(item.slug)
    const orderSlug = item.metadata?.order
    if (orderSlug) {
      navigateNative.push({ pathname: '/order/[id]', params: { id: orderSlug } })
    }
  }, [item.slug, item.metadata?.order, onMarkRead])

  const title = useMemo(() => getNotificationTitle(item.message), [item.message])
  const orderSlug = item.metadata?.order ?? ''
  const body = useMemo(
    () => getNotificationBody(item.message, orderSlug),
    [item.message, orderSlug],
  )
  const timeAgo = useMemo(() => formatTimeAgo(item.createdAt), [item.createdAt])

  const cardBg = item.isRead
    ? (isDark ? colors.gray[900] : '#fff')
    : (isDark ? `${primaryColor}18` : `${primaryColor}12`)

  return (
    <Pressable
      onPress={handlePress}
      style={[
        ns.itemContainer,
        {
          backgroundColor: cardBg,
          borderWidth: 1,
          borderColor: !item.isRead
            ? `${primaryColor}40`
            : (isDark ? colors.gray[800] : colors.gray[200]),
        },
      ]}
    >
      <View style={ns.itemInner}>
        <View style={[ns.iconWrap, { backgroundColor: primaryColor }]}>
          <Bell size={18} color="#fff" />
        </View>
        <View style={ns.itemContent}>
          <Text
            style={[
              ns.itemTitle,
              { color: isDark ? colors.gray[50] : colors.gray[900] },
              !item.isRead && ns.itemTitleUnread,
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {!!body && (
            <Text
              style={[ns.itemBody, { color: isDark ? colors.gray[400] : colors.gray[500] }]}
              numberOfLines={2}
            >
              {body}
            </Text>
          )}
          <View style={ns.itemBottomRow}>
            <Text style={[ns.itemTime, { color: isDark ? colors.gray[500] : colors.gray[400] }]}>
              {timeAgo}
            </Text>
            {!item.isRead && (
              <Text style={[ns.statusLabel, { color: primaryColor }]}>
                Chưa đọc
              </Text>
            )}
          </View>
        </View>
      </View>
    </Pressable>
  )
})

// ─── Undo snackbar ───────────────────────────────────────────────────────────

const UndoSnackbar = memo(function UndoSnackbar({
  onUndo,
  isDark,
  primaryColor,
  bottomInset,
}: {
  onUndo: () => void
  isDark: boolean
  primaryColor: string
  bottomInset: number
}) {
  return (
    <Animated.View
      entering={FadeInDown.duration(200)}
      exiting={FadeOutDown.duration(200)}
      style={[
        snackStyles.container,
        {
          backgroundColor: isDark ? colors.gray[800] : colors.gray[900],
          bottom: bottomInset + 16,
        },
      ]}
    >
      <Text style={snackStyles.label}>Đã đọc tất cả thông báo</Text>
      <Pressable onPress={onUndo} hitSlop={8}>
        <Text style={[snackStyles.undoBtn, { color: primaryColor }]}>Hoàn tác</Text>
      </Pressable>
    </Animated.View>
  )
})

const snackStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  label: { fontSize: 13, color: '#fff', flex: 1 },
  undoBtn: { fontSize: 13, fontWeight: '700', marginLeft: 12 },
})

// ─── Tab header ──────────────────────────────────────────────────────────────

const NotificationTabHeader = memo(function NotificationTabHeader({
  activeTab,
  unreadCount,
  isDark,
  primaryColor,
  onTabChange,
}: {
  activeTab: 'all' | 'unread'
  unreadCount: number
  isDark: boolean
  primaryColor: string
  onTabChange: (tab: 'all' | 'unread') => void
}) {
  const inactiveBg = isDark ? colors.gray[800] : '#fff'
  const inactiveText = isDark ? colors.gray[400] : colors.gray[500]

  return (
    <View style={ns.tabs}>
      <Pressable
        style={[ns.tab, { backgroundColor: activeTab === 'all' ? primaryColor : inactiveBg }]}
        onPress={() => onTabChange('all')}
      >
        <Text style={[ns.tabText, { color: activeTab === 'all' ? '#fff' : inactiveText }]}>
          Tất cả
        </Text>
      </Pressable>
      <Pressable
        style={[ns.tab, { backgroundColor: activeTab === 'unread' ? primaryColor : inactiveBg }]}
        onPress={() => onTabChange('unread')}
      >
        <Text style={[ns.tabText, { color: activeTab === 'unread' ? '#fff' : inactiveText }]}>
          {unreadCount > 0 ? `Chưa đọc (${unreadCount})` : 'Chưa đọc'}
        </Text>
      </Pressable>
    </View>
  )
})

// ─── Screen ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 15
const UNDO_DURATION = 5000

export default function NotificationScreen() {
  const isDark = useColorScheme() === 'dark'
  const primaryColor = isDark ? colors.primary.dark : colors.primary.light
  const screenBg = isDark ? colors.background.dark : colors.background.light
  const { bottom: bottomInset } = useSafeAreaInsets()

  const notifications = useNotificationStore((s) => s.notifications)
  const unreadCount = useNotificationStore(
    (s) => s.notifications.filter((n) => !n.isRead).length,
  )
  const userSlug = useUserStore((s) => s.userInfo?.slug)

  // ── Tab filter ──────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all')
  const displayedNotifications = useMemo(
    () => activeTab === 'unread' ? notifications.filter((n) => !n.isRead) : notifications,
    [activeTab, notifications],
  )

  // ── Pagination ──────────────────────────────────────────────────────────
  const [page, setPage] = useState(1)
  const { data: apiData, isRefetching, isFetching, refetch } = useNotifications(
    { receiver: userSlug, page, size: PAGE_SIZE },
    { enabled: !!userSlug },
  )
  const hasMore = apiData?.result?.hasNext ?? true
  const loadingMore = isFetching && page > 1
  const isFirstLoad = isFetching && page === 1 && notifications.length === 0

  useEffect(() => {
    const items = apiData?.result?.items
    if (items && items.length > 0) {
      useNotificationStore.getState().hydrateFromApi(items)
    }
  }, [apiData])

  const handleRefresh = useCallback(() => {
    setPage(1)
    refetch()
  }, [refetch])

  const handleLoadMore = useCallback(() => {
    if (!hasMore || isFetching) return
    setPage((p) => p + 1)
  }, [hasMore, isFetching])

  // ── Mark as read ────────────────────────────────────────────────────────
  const { mutate: markReadApi } = useMarkNotificationAsRead()
  const handleMarkRead = useCallback((slug: string) => { markReadApi(slug) }, [markReadApi])

  // ── Mark all read with undo ─────────────────────────────────────────────
  const [undoPending, setUndoPending] = useState(false)
  const prevUnreadSlugsRef = useRef<string[]>([])
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const handleMarkAllRead = useCallback(() => {
    const unreadSlugs = useNotificationStore
      .getState()
      .notifications.filter((n) => !n.isRead)
      .map((n) => n.slug)
    if (unreadSlugs.length === 0) return

    prevUnreadSlugsRef.current = unreadSlugs
    useNotificationStore.getState().markAllAsRead()
    setUndoPending(true)

    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    undoTimerRef.current = setTimeout(() => {
      setUndoPending(false)
      prevUnreadSlugsRef.current = []
    }, UNDO_DURATION)
  }, [])

  const handleUndo = useCallback(() => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    const slugs = prevUnreadSlugsRef.current
    if (slugs.length > 0) {
      useNotificationStore.getState().setReadStates(
        slugs.map((slug) => ({ slug, isRead: false })),
      )
    }
    prevUnreadSlugsRef.current = []
    setUndoPending(false)
  }, [])

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    }
  }, [])

  // ── Render helpers ──────────────────────────────────────────────────────
  const renderItem = useCallback(
    ({ item }: { item: INotification }) => (
      <NotificationItem
        item={item}
        isDark={isDark}
        primaryColor={primaryColor}
        onMarkRead={handleMarkRead}
      />
    ),
    [isDark, primaryColor, handleMarkRead],
  )

  const keyExtractor = useCallback((item: INotification) => item.slug, [])

  const handleTabChange = useCallback((tab: 'all' | 'unread') => setActiveTab(tab), [])


  const ListEmptyComponent = useMemo(
    () =>
      isFirstLoad ? null : (
        <View style={ns.emptyWrap}>
          <Bell size={56} color={isDark ? colors.gray[600] : colors.gray[300]} />
          <Text style={[ns.emptyTitle, { color: isDark ? colors.gray[50] : colors.gray[900] }]}>
            {activeTab === 'unread' ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo'}
          </Text>
          <Text style={[ns.emptyDesc, { color: isDark ? colors.gray[400] : colors.gray[500] }]}>
            {activeTab === 'unread'
              ? 'Bạn đã đọc tất cả thông báo'
              : 'Thông báo mới sẽ hiển thị tại đây'}
          </Text>
        </View>
      ),
    [isDark, isFirstLoad, activeTab],
  )

  const ListFooterComponent = useMemo(() => {
    if (loadingMore) {
      return (
        <View style={ns.loadingMore}>
          <ActivityIndicator size="small" color={primaryColor} />
        </View>
      )
    }
    return null
  }, [loadingMore, primaryColor])

  return (
    <View style={[ns.flex, { backgroundColor: screenBg }]}>
      {isFirstLoad ? (
        <View style={ns.skeletonList}>
          {Array.from({ length: 6 }).map((_, i) => (
            <NotificationSkeletonItem key={i} />
          ))}
        </View>
      ) : (
        <FlashList
          data={displayedNotifications}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ListEmptyComponent={ListEmptyComponent}
          ListFooterComponent={ListFooterComponent}
          contentContainerStyle={ns.listPadding}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={handleRefresh}
              tintColor={primaryColor}
              colors={[primaryColor]}
            />
          }
        />
      )}

      {/* Fixed tab bar — transparent, nằm trong vùng gradient của FloatingHeader */}
      <View style={[ns.tabsFixed, { top: STATIC_TOP_INSET + 52 }]} pointerEvents="box-none">
        <NotificationTabHeader
          activeTab={activeTab}
          unreadCount={unreadCount}
          isDark={isDark}
          primaryColor={primaryColor}
          onTabChange={handleTabChange}
        />
      </View>

      <FloatingHeader
        title="Thông báo"
        rightElement={
          unreadCount > 0 ? (
            <Pressable onPress={handleMarkAllRead} hitSlop={8} style={ns.markAllBtn}>
              <Text style={[ns.markAllText, { color: primaryColor }]}>Đọc tất cả</Text>
            </Pressable>
          ) : undefined
        }
      />

      {undoPending && (
        <UndoSnackbar
          onUndo={handleUndo}
          isDark={isDark}
          primaryColor={primaryColor}
          bottomInset={bottomInset}
        />
      )}
    </View>
  )
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const TAB_BAR_TOP = STATIC_TOP_INSET + 52
const LIST_PADDING_TOP = TAB_BAR_TOP + 52

const ns = StyleSheet.create({
  flex: { flex: 1 },
  listPadding: { paddingTop: LIST_PADDING_TOP, paddingBottom: 32, paddingHorizontal: 16 },
  skeletonList: { paddingTop: LIST_PADDING_TOP, paddingHorizontal: 16, gap: 8 },

  // Fixed tab bar
  tabsFixed: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 24,
  },

  // Tabs
  tabs: { flexDirection: 'row', gap: 8 },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 99,
  },
  tabText: { fontSize: 13, fontWeight: '600' },

  // Item
  itemContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    marginBottom: 8,
  },
  itemInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  itemContent: { flex: 1, gap: 3 },
  itemTitle: { fontSize: 14, lineHeight: 20 },
  itemTitleUnread: { fontWeight: '700' },
  itemBody: { fontSize: 13, lineHeight: 18 },
  itemBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  itemTime: { fontSize: 11 },
  statusLabel: { fontSize: 11, fontWeight: '600' },

  // Helpers
  markAllBtn: { paddingHorizontal: 8, paddingVertical: 8, alignItems: 'flex-end' },
  markAllText: { fontSize: 13, fontWeight: '600' },
  loadingMore: { paddingVertical: 16, alignItems: 'center' },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyTitle: { marginTop: 14, fontSize: 17, fontWeight: '600' },
  emptyDesc: { marginTop: 6, fontSize: 14, textAlign: 'center', lineHeight: 20 },
})
