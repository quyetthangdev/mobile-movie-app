import { ScreenContainer } from '@/components/layout'
import { FlashList } from '@shopify/flash-list'
import { useQueryClient } from '@tanstack/react-query'
import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import { ChevronLeft, Package } from 'lucide-react-native'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native'

import { getOrderBySlug } from '@/api'
import { Skeleton } from '@/components/ui'
import {
  colors,
  NotificationMessageCode,
} from '@/constants'
import { STATIC_TOP_INSET } from '@/constants/status-bar'
import { useOrders, useRunAfterTransition } from '@/hooks'
import { navigateNative } from '@/lib/navigation'
import { useNotificationStore, useUserStore } from '@/stores'
import type { IOrder } from '@/types'
import { OrderStatus } from '@/types'
import { calculateOrderDisplayAndTotals } from '@/utils'

import OrderCard from './order-card'
import type { OrderDisplayData } from './order-card'

// ─── Filter bar ───────────────────────────────────────────────────────────────

const FilterBar = React.memo(function FilterBar({
  status,
  isPending,
  primaryColor,
  isDark,
  onSelect,
  labels,
}: {
  status: OrderStatus
  isPending: boolean
  primaryColor: string
  isDark: boolean
  onSelect: (s: OrderStatus) => void
  labels: { all: string; pending: string; shipping: string; completed: string }
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={pageStyles.filterScroll}>
      {STATUS_FILTER_OPTIONS.map((opt) => {
        const sel = status === opt.value
        const label =
          opt.labelKey === 'all' ? labels.all
          : opt.labelKey === 'pending' ? labels.pending
          : opt.labelKey === 'shipping' ? labels.shipping
          : labels.completed
        return (
          <Pressable
            key={opt.value}
            onPress={isPending ? undefined : () => onSelect(opt.value)}
            style={[
              pageStyles.filterChip,
              sel
                ? { borderColor: primaryColor, backgroundColor: primaryColor }
                : { borderColor: isDark ? colors.gray[700] : colors.gray[200], backgroundColor: isDark ? colors.gray[800] : colors.white.light },
              isPending && !sel && { opacity: 0.5 },
            ]}
          >
            <Text style={[pageStyles.filterChipText, { color: sel ? colors.white.light : (isDark ? colors.gray[300] : colors.gray[700]) }]}>
              {label}
            </Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
})

function OrderHistoryPage() {
  const { t } = useTranslation('menu')
  const { t: tProfile } = useTranslation('profile')
  const queryClient = useQueryClient()
  const isDark = useColorScheme() === 'dark'
  const primaryColor = isDark ? colors.primary.dark : colors.primary.light

  const userInfo = useUserStore((s) => s.userInfo)
  const [status, setStatus] = useState<OrderStatus>(OrderStatus.ALL)
  const [page, setPage] = useState(1)
  const pageSize = 10

  // Fetch sau khi transition xong → màn trượt ngay, skeleton hiện, data load không block animation
  const [allowFetch, setAllowFetch] = useState(false)
  useRunAfterTransition(() => setAllowFetch(true), [])

  const { data: orderResponse, isPending, refetch, isRefetching } = useOrders(
    {
      page,
      size: pageSize,
      owner: userInfo?.slug,
      order: 'DESC',
      hasPaging: true,
      status: status === OrderStatus.ALL ? undefined : status,
    },
    { enabled: allowFetch && !!userInfo?.slug },
  )

  // ── Auto-refetch on FCM ORDER_PAID notification ──
  const processedRef = useRef<Set<string>>(new Set())
  const latestNotification = useNotificationStore((s) => s.notifications[0])
  useEffect(() => {
    if (!latestNotification || latestNotification.isRead) return
    if (processedRef.current.has(latestNotification.slug)) return
    if (latestNotification.message === NotificationMessageCode.ORDER_PAID) {
      processedRef.current.add(latestNotification.slug)
      refetch()
    }
  }, [latestNotification, refetch])

  const orders = useMemo(() => orderResponse?.items || [], [orderResponse?.items])

  // Pre-compute display data once when orders change — O(1) lookup in renderItem
  const orderDisplayMap = useMemo(() => {
    const map = new Map<string, OrderDisplayData>()
    for (const order of orders) {
      const items = order.orderItems || []
      const voucher = order.voucher || null
      const { displayItems, cartTotals } = calculateOrderDisplayAndTotals(items, voucher)
      const diMap = new Map<string, (typeof displayItems)[number]>()
      for (const di of displayItems) diMap.set(di.slug, di)
      map.set(order.slug, { displayItemMap: diMap, cartTotals })
    }
    return map
  }, [orders])

  const hasNext = orderResponse?.hasNext || false
  const hasPrevious = orderResponse?.hasPrevious || false
  const currentPage = orderResponse?.page || 1
  const totalPages = orderResponse?.totalPages || 0


  const handleOrderPress = useCallback(
    (orderSlug: string) => {
      if (orderSlug) {
        queryClient.prefetchQuery({
          queryKey: ['order', orderSlug],
          queryFn: () => getOrderBySlug(orderSlug),
        })
      }
      navigateNative.push(
        `/order/${orderSlug}` as Parameters<typeof navigateNative.push>[0],
      )
    },
    [queryClient],
  )

  // getStatusLabel depends on t — stays as hook
  const getStatusLabel = useCallback(
    (status: OrderStatus) => {
      const s = typeof status === 'string' ? status.toLowerCase() : status
      switch (s) {
        case OrderStatus.PENDING:
          return t('order.pending', 'Chờ xử lý')
        case OrderStatus.SHIPPING:
          return t('order.shipping', 'Đang giao')
        case OrderStatus.COMPLETED:
          return t('order.completed', 'Hoàn thành')
        case OrderStatus.PAID:
          return t('order.paid', 'Đã thanh toán')
        case OrderStatus.FAILED:
          return t('order.failed', 'Thất bại')
        default:
          return status
      }
    },
    [t],
  )

  const orderCardLabels = useMemo(() => ({
    subtotal: t('order.subtotal', 'Tổng tiền hàng'),
    promotionDiscount: t('order.promotionDiscount', 'Giảm giá khuyến mãi'),
    voucher: t('order.voucher', 'Mã giảm giá'),
    loyaltyPoint: t('order.loyaltyPoint', 'Điểm tích lũy'),
    deliveryFee: t('order.deliveryFee', 'Phí giao hàng'),
    totalPayment: t('order.totalPayment', 'Tổng thanh toán'),
    moreItems: t('order.moreItems', 'sản phẩm khác'),
  }), [t])

  const filterBarLabels = useMemo(() => ({
    all: tProfile('profile.all', 'Tất cả'),
    pending: t('order.pending', 'Chờ xử lý'),
    shipping: tProfile('profile.shipping', 'Đang giao'),
    completed: tProfile('profile.completed', 'Hoàn thành'),
  }), [t, tProfile])

  const handleFilterSelect = useCallback((s: OrderStatus) => {
    setStatus(s)
    setPage(1)
  }, [])

  const renderOrderItem = useCallback(
    ({ item: orderItem }: { item: IOrder }) => (
      <OrderCard
        order={orderItem}
        displayData={orderDisplayMap.get(orderItem.slug) ?? null}
        primaryColor={primaryColor}
        isDark={isDark}
        statusLabel={getStatusLabel(orderItem.status)}
        onPress={handleOrderPress}
        labels={orderCardLabels}
      />
    ),
    [orderDisplayMap, primaryColor, isDark, getStatusLabel, handleOrderPress, orderCardLabels],
  )

  const keyExtractor = useCallback((item: IOrder) => item.slug ?? '', [])

  const ListFooterComponent = useMemo(() => {
    if (totalPages <= 1) return null
    return (
      <View style={pageStyles.paginationRow}>
        <Pressable
          onPress={() => setPage(page - 1)}
          disabled={!hasPrevious}
          style={[pageStyles.pageBtn, { backgroundColor: isDark ? colors.gray[800] : colors.white.light, borderColor: isDark ? colors.gray[700] : colors.gray[200] }, !hasPrevious && { opacity: 0.5 }]}
        >
          <Text style={[pageStyles.pageBtnText, { color: hasPrevious ? (isDark ? colors.gray[50] : colors.gray[900]) : colors.gray[400] }]}>
            {t('order.previous', 'Trước')}
          </Text>
        </Pressable>
        <Text style={[pageStyles.pageInfo, { color: isDark ? colors.gray[400] : colors.gray[600] }]}>
          {currentPage} / {totalPages}
        </Text>
        <Pressable
          onPress={() => setPage(page + 1)}
          disabled={!hasNext}
          style={[pageStyles.pageBtn, { backgroundColor: isDark ? colors.gray[800] : colors.white.light, borderColor: isDark ? colors.gray[700] : colors.gray[200] }, !hasNext && { opacity: 0.5 }]}
        >
          <Text style={[pageStyles.pageBtnText, { color: hasNext ? (isDark ? colors.gray[50] : colors.gray[900]) : colors.gray[400] }]}>
            {t('order.next', 'Sau')}
          </Text>
        </Pressable>
      </View>
    )
  }, [totalPages, hasPrevious, hasNext, page, currentPage, t, isDark])

  const ListEmptyComponent = useMemo(
    () => (
      <View style={pageStyles.emptyWrap}>
        <Package size={64} color={isDark ? colors.gray[400] : colors.gray[500]} />
        <Text style={[pageStyles.emptyTitle, { color: isDark ? colors.gray[50] : colors.gray[900] }]}>
          {t('order.noOrders', 'Chưa có đơn hàng')}
        </Text>
        <Text style={[pageStyles.emptyDesc, { color: isDark ? colors.gray[400] : colors.gray[600] }]}>
          {t('order.noOrdersDescription', 'Bạn chưa có đơn hàng nào')}
        </Text>
      </View>
    ),
    [isDark, t],
  )

  const screenBg = isDark ? colors.background.dark : colors.background.light
  const headerBg = isDark ? colors.gray[800] : colors.white.light
  const headerBorder = isDark ? colors.gray[700] : colors.gray[200]
  const gradientColors = useMemo(
    () => [screenBg, `${screenBg}E6`, `${screenBg}B0`, `${screenBg}50`, `${screenBg}00`] as const,
    [screenBg],
  )

  const showSkeleton = !allowFetch || (isPending && page === 1)
  if (showSkeleton) {
    return (
      <ScreenContainer edges={['top', 'bottom']} style={[pageStyles.flex, { backgroundColor: screenBg }]}>
        <View style={[pageStyles.headerBar, { backgroundColor: headerBg, borderBottomColor: headerBorder }]}>
          <Skeleton style={{ width: 24, height: 24, borderRadius: 12, marginRight: 12 }} />
          <Skeleton style={{ width: 160, height: 20, borderRadius: 6 }} />
        </View>
        <ScrollView contentContainerStyle={pageStyles.listPadding}>
          {[1, 2, 3].map((key) => (
            <View key={key} style={[pageStyles.skeletonCard, { backgroundColor: headerBg, borderColor: headerBorder }]}>
              <View style={pageStyles.skeletonHeaderRow}>
                <Skeleton style={{ width: 128, height: 12, borderRadius: 6 }} />
                <Skeleton style={{ width: 96, height: 24, borderRadius: 12 }} />
              </View>
              <View style={pageStyles.skeletonItemRow}>
                <Skeleton style={{ width: 64, height: 64, borderRadius: 8 }} />
                <View style={{ flex: 1, gap: 8 }}>
                  <Skeleton style={{ width: 160, height: 16, borderRadius: 6 }} />
                  <Skeleton style={{ width: 96, height: 12, borderRadius: 6 }} />
                  <Skeleton style={{ width: 112, height: 16, borderRadius: 6 }} />
                </View>
              </View>
              <View style={[pageStyles.skeletonSummary, { borderTopColor: headerBorder }]}>
                <View style={pageStyles.skeletonSummaryRow}>
                  <Skeleton style={{ width: 96, height: 12, borderRadius: 6 }} />
                  <Skeleton style={{ width: 80, height: 12, borderRadius: 6 }} />
                </View>
                <View style={pageStyles.skeletonSummaryRow}>
                  <Skeleton style={{ width: 112, height: 16, borderRadius: 6 }} />
                  <Skeleton style={{ width: 96, height: 16, borderRadius: 6 }} />
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      </ScreenContainer>
    )
  }

  return (
    <View style={[pageStyles.flex, { backgroundColor: screenBg }]}>
      <ScreenContainer edges={['top', 'bottom']} style={pageStyles.flex}>
        {/* List — full screen, content padded to clear floating header */}
        <FlashList
          data={orders}
          renderItem={renderOrderItem}
          keyExtractor={keyExtractor}
ListFooterComponent={ListFooterComponent}
          ListEmptyComponent={ListEmptyComponent}
          contentContainerStyle={pageStyles.listPadding}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={primaryColor} colors={[primaryColor]} />
          }
        />

        {/* Floating header — blur + gradient overlay */}
        <View style={pageStyles.floatingHeader} pointerEvents="box-none">
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {Platform.OS === 'ios' && (
              <BlurView
                intensity={20}
                tint={isDark ? 'dark' : 'light'}
                style={StyleSheet.absoluteFill}
              />
            )}
            <LinearGradient
              colors={gradientColors}
              locations={[0, 0.3, 0.62, 0.85, 1]}
              style={StyleSheet.absoluteFill}
            />
          </View>

          {/* Row: back + title + spacer */}
          <View style={[pageStyles.headerRow, { paddingTop: STATIC_TOP_INSET + 10 }]} pointerEvents="auto">
            <Pressable
              onPress={navigateNative.back}
              hitSlop={8}
              style={[pageStyles.circleBtn, { backgroundColor: isDark ? colors.gray[800] : colors.white.light }, pageStyles.shadow]}
            >
              <ChevronLeft size={20} color={isDark ? colors.gray[50] : colors.gray[900]} />
            </Pressable>

            <Text style={[pageStyles.headerTitle, { color: isDark ? colors.gray[50] : colors.gray[900] }]}>
              {t('order.history', 'Lịch sử đơn hàng')}
            </Text>

            <View style={pageStyles.circleBtn} />
          </View>

          {/* Filter chips */}
          <View style={pageStyles.filterRow} pointerEvents="auto">
            <FilterBar
              status={status}
              isPending={isPending}
              primaryColor={primaryColor}
              isDark={isDark}
              onSelect={handleFilterSelect}
              labels={filterBarLabels}
            />
          </View>
        </View>
      </ScreenContainer>
    </View>
  )
}

OrderHistoryPage.displayName = 'OrderHistoryPage'
export default React.memo(OrderHistoryPage)

// ─── Module-level constants ─────────────────────────────────────────────────

const STATUS_FILTER_OPTIONS = [
  { value: OrderStatus.ALL, labelKey: 'all' as const },
  { value: OrderStatus.PENDING, labelKey: 'pending' as const },
  { value: OrderStatus.SHIPPING, labelKey: 'shipping' as const },
  { value: OrderStatus.COMPLETED, labelKey: 'completed' as const },
]

const pageStyles = StyleSheet.create({
  flex: { flex: 1 },
  floatingHeader: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20, paddingBottom: 24 },
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  circleBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  shadow: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 24, elevation: 2 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  filterRow: { paddingTop: 10, paddingBottom: 4 },
  filterScroll: { flexDirection: 'row', gap: 8, paddingHorizontal: 16 },
  filterChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 },
  filterChipText: { fontSize: 14, fontWeight: '500' },
  listPadding: { paddingHorizontal: 16, paddingTop: 130, paddingBottom: 24 },
  paginationRow: { marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  pageBtn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  pageBtnText: { fontSize: 14, fontWeight: '500' },
  pageInfo: { fontSize: 14 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 64 },
  emptyTitle: { marginTop: 16, fontSize: 18, fontWeight: '600' },
  emptyDesc: { marginTop: 8, fontSize: 14, textAlign: 'center' },
  skeletonCard: { marginBottom: 16, borderRadius: 12, borderWidth: 1, padding: 16 },
  skeletonHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  skeletonItemRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  skeletonSummary: { marginTop: 8, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, gap: 8 },
  skeletonSummaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
})
