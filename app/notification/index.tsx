/**
 * Notification List Screen — paginated, pull-to-refresh, confirm sheet for mark all.
 */
import BottomSheet, {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet'
import { FlashList } from '@shopify/flash-list'
import { Bell } from 'lucide-react-native'
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Modal, Pressable, RefreshControl, StyleSheet, Text, useColorScheme, View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'

import { colors } from '@/constants'
import { NotificationMessageCode } from '@/constants/notification.constant'
import { useMarkNotificationAsRead, useNotifications } from '@/hooks/use-notification'
import { navigateFromNotification } from '@/lib/notification-navigation'
import { FloatingHeader } from '@/components/navigation/floating-header'
import { useUserStore } from '@/stores'
import { useNotificationStore } from '@/stores/notification.store'
import type { INotification } from '@/types/notification.type'

// ─── Message code → Vietnamese title ────────────────────────────────────────

function getNotificationTitle(message: string): string {
  switch (message) {
    case NotificationMessageCode.ORDER_NEEDS_PROCESSED:
      return 'Đơn hàng cần xử lý'
    case NotificationMessageCode.ORDER_NEEDS_DELIVERED:
      return 'Đơn hàng cần giao'
    case NotificationMessageCode.ORDER_NEEDS_READY_TO_GET:
      return 'Đơn hàng sẵn sàng'
    case NotificationMessageCode.ORDER_NEEDS_CANCELLED:
      return 'Đơn hàng đã hủy'
    case NotificationMessageCode.ORDER_BILL_FAILED_PRINTING:
      return 'In hóa đơn lỗi'
    case NotificationMessageCode.ORDER_CHEF_ORDER_FAILED_PRINTING:
      return 'In đơn hàng nhà bếp lỗi'
    case NotificationMessageCode.ORDER_LABEL_TICKET_FAILED_PRINTING:
      return 'In nhãn dán lỗi'
    default:
      return message || 'Thông báo'
  }
}

function getNotificationBody(message: string, refNum: string): string {
  switch (message) {
    case NotificationMessageCode.ORDER_NEEDS_PROCESSED:
      return `Đơn hàng #${refNum} cần xử lý. Vui lòng xử lý sớm!`
    case NotificationMessageCode.ORDER_NEEDS_DELIVERED:
      return `Đơn hàng #${refNum} cần giao. Vui lòng giao hàng sớm!`
    case NotificationMessageCode.ORDER_NEEDS_READY_TO_GET:
      return `Đơn hàng #${refNum} đã sẵn sàng. Vui lòng tới quầy để nhận!`
    case NotificationMessageCode.ORDER_BILL_FAILED_PRINTING:
      return `Hóa đơn #${refNum} in lỗi. Vui lòng in lại thủ công!`
    case NotificationMessageCode.ORDER_CHEF_ORDER_FAILED_PRINTING:
      return `Đơn hàng #${refNum} in lỗi. Vui lòng in lại thủ công!`
    case NotificationMessageCode.ORDER_LABEL_TICKET_FAILED_PRINTING:
      return `Nhãn dán cho đơn hàng #${refNum} in lỗi. Vui lòng in lại thủ công!`
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

// ─── NotificationItem (memo'd) ──────────────────────────────────────────────

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
    const data: Record<string, string> = {
      ...item.metadata,
      message: item.message,
      order: item.metadata?.order ?? '',
    }
    navigateFromNotification(data)
  }, [item.slug, item.message, item.metadata, onMarkRead])

  const timeAgo = formatTimeAgo(item.createdAt)

  const title = getNotificationTitle(item.message)
  const refNum = item.metadata?.order || item.metadata?.referenceNumber || ''
  const body = getNotificationBody(item.message, refNum)

  return (
    <Pressable
      onPress={handlePress}
      style={[
        ns.item,
        {
          backgroundColor: item.isRead
            ? (isDark ? colors.gray[900] : '#fff')
            : (isDark ? colors.gray[800] : '#fffbeb'),
        },
      ]}
    >
      <View style={[ns.iconWrap, { backgroundColor: `${primaryColor}20` }]}>
        <Bell size={18} color={primaryColor} />
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
        {body ? (
          <Text
            style={[ns.itemBody, { color: isDark ? colors.gray[400] : colors.gray[600] }]}
            numberOfLines={2}
          >
            {body}
          </Text>
        ) : null}
        <View style={ns.itemBottomRow}>
          <Text style={[ns.itemTime, { color: isDark ? colors.gray[500] : colors.gray[400] }]}>
            {timeAgo}
          </Text>
          {!item.isRead && (
            <Text style={[ns.unreadLabel, { color: primaryColor }]}>Chưa đọc</Text>
          )}
        </View>
      </View>
    </Pressable>
  )
})

// ─── Screen ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 15

export default function NotificationScreen() {
  const isDark = useColorScheme() === 'dark'
  const primaryColor = isDark ? colors.primary.dark : colors.primary.light
  const screenBg = isDark ? colors.background.dark : colors.background.light
  const notifications = useNotificationStore((s) => s.notifications)
  const userSlug = useUserStore((s) => s.userInfo?.slug)

  // Pagination
  const [page, setPage] = useState(1)

  const { data: apiData, isRefetching, isFetching, refetch } = useNotifications(
    { receiver: userSlug, page, size: PAGE_SIZE },
    { enabled: !!userSlug },
  )

  // Derive pagination from query — no useState needed
  const hasMore = apiData?.result?.hasNext ?? true
  const loadingMore = isFetching && page > 1

  // Hydrate store when data arrives
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



  const { mutate: markReadApi } = useMarkNotificationAsRead()
  const handleMarkRead = useCallback((slug: string) => {
    markReadApi(slug)
  }, [markReadApi])

  // Confirm sheet for "Mark all read"
  const [confirmSheetVisible, setConfirmSheetVisible] = useState(false)
  const handleOpenConfirm = useCallback(() => setConfirmSheetVisible(true), [])
  const handleCloseConfirm = useCallback(() => setConfirmSheetVisible(false), [])
  const handleConfirmMarkAll = useCallback(() => {
    useNotificationStore.getState().markAllAsRead()
    setConfirmSheetVisible(false)
  }, [])

  const renderItem = useCallback(
    ({ item }: { item: INotification }) => (
      <NotificationItem item={item} isDark={isDark} primaryColor={primaryColor} onMarkRead={handleMarkRead} />
    ),
    [isDark, primaryColor, handleMarkRead],
  )

  const keyExtractor = useCallback((item: INotification) => item.slug, [])

  const ListEmptyComponent = useMemo(
    () => (
      <View style={ns.emptyWrap}>
        <Bell size={64} color={isDark ? '#6b7280' : '#9ca3af'} />
        <Text style={[ns.emptyTitle, { color: isDark ? colors.gray[50] : colors.gray[900] }]}>
          Chưa có thông báo
        </Text>
        <Text style={[ns.emptyDesc, { color: isDark ? colors.gray[400] : colors.gray[600] }]}>
          Thông báo mới sẽ hiển thị tại đây
        </Text>
      </View>
    ),
    [isDark],
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

  const unreadCount = useNotificationStore(
    (s) => s.notifications.filter((n) => !n.isRead).length,
  )

  return (
    <View style={[ns.flex, { backgroundColor: screenBg }]}>
      {/* List */}
      <FlashList
        data={notifications}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListEmptyComponent={ListEmptyComponent}
        ListFooterComponent={ListFooterComponent}
        contentContainerStyle={ns.listPadding}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} tintColor={primaryColor} colors={[primaryColor]} />
        }
      />

      <FloatingHeader
        title="Thông báo"
        rightElement={
          unreadCount > 0 ? (
            <Pressable onPress={handleOpenConfirm} hitSlop={8} style={ns.markAllBtn}>
              <Text style={[ns.markAllText, { color: primaryColor }]}>Đọc tất cả</Text>
            </Pressable>
          ) : undefined
        }
      />

      {/* Confirm "Mark all read" sheet */}
      <MarkAllReadSheet
        visible={confirmSheetVisible}
        onClose={handleCloseConfirm}
        onConfirm={handleConfirmMarkAll}
        isDark={isDark}
        primaryColor={primaryColor}
      />
    </View>
  )
}

// ─── MarkAllReadSheet ───────────────────────────────────────────────────────

const CONFIRM_SNAP = ['28%']

const MarkAllReadSheet = memo(function MarkAllReadSheet({
  visible,
  onClose,
  onConfirm,
  isDark,
  primaryColor,
}: {
  visible: boolean
  onClose: () => void
  onConfirm: () => void
  isDark: boolean
  primaryColor: string
}) {
  const sheetRef = useRef<BottomSheet>(null)

  const bgStyle = useMemo(
    () => ({ backgroundColor: isDark ? colors.gray[900] : colors.white.light }),
    [isDark],
  )

  const handleChange = useCallback(
    (index: number) => { if (index === -1) onClose() },
    [onClose],
  )

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.4} pressBehavior="close" />
    ),
    [],
  )

  const handleConfirm = useCallback(() => {
    sheetRef.current?.close()
    onConfirm()
  }, [onConfirm])

  if (!visible) return null

  return (
    <Modal transparent visible statusBarTranslucent animationType="none" onRequestClose={() => sheetRef.current?.close()}>
      <GestureHandlerRootView style={ns.flex}>
        <BottomSheet
          ref={sheetRef}
          index={0}
          snapPoints={CONFIRM_SNAP}
          enablePanDownToClose
          enableContentPanningGesture={false}
          enableHandlePanningGesture
          enableDynamicSizing={false}
          backdropComponent={renderBackdrop}
          backgroundStyle={bgStyle}
          onChange={handleChange}
        >
          <View style={confirmStyles.content}>
            <Text style={[confirmStyles.title, { color: isDark ? colors.gray[50] : colors.gray[900] }]}>
              Đánh dấu đã đọc
            </Text>
            <Text style={[confirmStyles.desc, { color: isDark ? colors.gray[400] : colors.gray[500] }]}>
              Đánh dấu tất cả thông báo là đã đọc?
            </Text>
            <View style={confirmStyles.spacer} />
            <View style={confirmStyles.buttons}>
              <Pressable onPress={onClose} style={[confirmStyles.btn, { backgroundColor: isDark ? colors.gray[800] : colors.gray[100] }]}>
                <Text style={[confirmStyles.btnText, { color: isDark ? colors.gray[50] : colors.gray[700] }]}>Huỷ</Text>
              </Pressable>
              <Pressable onPress={handleConfirm} style={[confirmStyles.btn, { backgroundColor: primaryColor }]}>
                <Text style={confirmStyles.confirmText}>Xác nhận</Text>
              </Pressable>
            </View>
          </View>
        </BottomSheet>
      </GestureHandlerRootView>
    </Modal>
  )
})

const confirmStyles = StyleSheet.create({
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 4, paddingBottom: 20 },
  title: { fontSize: 17, fontWeight: '700', marginBottom: 8 },
  desc: { fontSize: 14 },
  spacer: { flex: 1 },
  buttons: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 15, fontWeight: '600' },
  confirmText: { fontSize: 15, fontWeight: '700', color: '#fff' },
})

const ns = StyleSheet.create({
  flex: { flex: 1 },
  markAllBtn: { minWidth: 38, paddingHorizontal: 8, paddingVertical: 8, alignItems: 'flex-end' as const },
  markAllText: { fontSize: 13, fontWeight: '600' },
  listPadding: { paddingTop: 100, paddingBottom: 24, paddingHorizontal: 16 },
  item: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, borderRadius: 12, marginBottom: 8, gap: 12 },
  iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  itemContent: { flex: 1, gap: 4 },
  itemTitle: { fontSize: 14 },
  itemTitleUnread: { fontWeight: '700' },
  itemBody: { fontSize: 13, lineHeight: 18 },
  itemBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  itemTime: { fontSize: 11 },
  unreadLabel: { fontSize: 11, fontStyle: 'italic', fontWeight: '500' },
  loadingMore: { paddingVertical: 16, alignItems: 'center' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyTitle: { marginTop: 16, fontSize: 18, fontWeight: '600' },
  emptyDesc: { marginTop: 8, fontSize: 14, textAlign: 'center' },
})
