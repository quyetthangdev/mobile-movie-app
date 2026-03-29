import { ScreenContainer } from '@/components/layout'
import { FlashList } from '@shopify/flash-list'
import { useQueryClient } from '@tanstack/react-query'
import { BlurView } from 'expo-blur'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { ChevronLeft, Package } from 'lucide-react-native'
import React, { memo, useCallback, useMemo, useState } from 'react'
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
import { Images } from '@/assets/images'
import { CancelOrderDialog } from '@/components/dialog'
import { Skeleton } from '@/components/ui'
import {
  APPLICABILITY_RULE,
  colors,
  publicFileURL,
  ROUTE,
  VOUCHER_TYPE,
} from '@/constants'
import { STATIC_TOP_INSET } from '@/constants/status-bar'
import { useOrders, useRunAfterTransition } from '@/hooks'
import { navigateNative } from '@/lib/navigation'
import { useUpdateOrderStore, useUserStore } from '@/stores'
import type { IOrder, IOrderItems } from '@/types'
import { OrderStatus, OrderTypeEnum } from '@/types'
import {
  calculateOrderDisplayAndTotals,
  capitalizeFirstLetter,
  formatCurrency,
  formatDateTime,
  showErrorToast,
} from '@/utils'

// ─── Status helpers (module-level, zero hook overhead) ──────────────────────

type StatusBadgeColors = { bg: string; text: string }

function getStatusBadgeColors(status: OrderStatus): StatusBadgeColors {
  switch (status) {
    case OrderStatus.PENDING:
      return { bg: '#eab308', text: '#fff' }
    case OrderStatus.SHIPPING:
      return { bg: '#3b82f6', text: '#fff' }
    case OrderStatus.COMPLETED:
    case OrderStatus.PAID:
      return { bg: '#22c55e', text: '#fff' }
    case OrderStatus.FAILED:
      return { bg: '#ef4444', text: '#fff' }
    default:
      return { bg: '#6b7280', text: '#fff' }
  }
}

// ─── Pre-computed display data type ─────────────────────────────────────────

type OrderDisplayData = {
  displayItemMap: Map<string, ReturnType<typeof calculateOrderDisplayAndTotals>['displayItems'][number]>
  cartTotals: ReturnType<typeof calculateOrderDisplayAndTotals>['cartTotals']
}

// ─── OrderProductItem (memo'd) ──────────────────────────────────────────────

const OrderProductItem = memo(function OrderProductItem({
  product,
  displayData,
  voucher,
  primaryColor,
  isDark,
  isLast,
}: {
  product: IOrderItems
  displayData: OrderDisplayData | null
  voucher: IOrder['voucher']
  primaryColor: string
  isDark: boolean
  isLast: boolean
}) {
  const displayItem = displayData?.displayItemMap.get(product.slug) ?? null
  const original = product.variant?.price || 0
  const priceAfterPromotion = displayItem?.priceAfterPromotion || 0
  const finalPrice = displayItem?.finalPrice || 0

  const isSamePriceVoucher =
    voucher?.type === VOUCHER_TYPE.SAME_PRICE_PRODUCT &&
    voucher?.voucherProducts?.some(
      (vp) => vp.product?.slug === product.variant?.product?.slug,
    )
  const isAtLeastOneVoucher =
    voucher?.applicabilityRule === APPLICABILITY_RULE.AT_LEAST_ONE_REQUIRED &&
    voucher?.voucherProducts?.some(
      (vp) => vp.product?.slug === product.variant?.product?.slug,
    )
  const hasVoucherDiscount = (displayItem?.voucherDiscount ?? 0) > 0
  const hasPromotionDiscount = (displayItem?.promotionDiscount ?? 0) > 0

  const displayPrice = isSamePriceVoucher
    ? finalPrice
    : isAtLeastOneVoucher && hasVoucherDiscount
      ? original - (displayItem?.voucherDiscount || 0)
      : hasPromotionDiscount
        ? priceAfterPromotion
        : original

  const shouldShowLineThrough =
    (isSamePriceVoucher || hasPromotionDiscount || hasVoucherDiscount) &&
    original > displayPrice

  return (
    <View style={[cardStyles.productRow, !isLast && cardStyles.productRowBorder]}>
      <View style={cardStyles.productImageWrap}>
        <Image
          source={
            product.variant?.product?.image
              ? { uri: `${publicFileURL}/${product.variant.product.image}` }
              : Images.Food.ProductImage as unknown as number
          }
          style={cardStyles.productImage}
          contentFit="cover"
          cachePolicy="disk"
        />
        <View style={[cardStyles.qtyBadge, { backgroundColor: primaryColor }]}>
          <Text style={cardStyles.qtyText}>x{product.quantity}</Text>
        </View>
      </View>

      <View style={cardStyles.productInfo}>
        <Text
          style={[cardStyles.productName, { color: isDark ? colors.gray[50] : colors.gray[900] }]}
          numberOfLines={2}
        >
          {capitalizeFirstLetter(product.variant?.product?.name || '')}
        </Text>
        <View style={[cardStyles.sizeBadge, { borderColor: primaryColor, backgroundColor: isDark ? colors.gray[800] : `${primaryColor}18` }]}>
          <Text style={[cardStyles.sizeText, { color: primaryColor }]}>
            {capitalizeFirstLetter(product.variant?.size?.name || '')}
          </Text>
        </View>
        <View style={cardStyles.priceRow}>
          {shouldShowLineThrough && (
            <Text style={cardStyles.priceStrike}>
              {formatCurrency(original * product.quantity)}
            </Text>
          )}
          <Text style={[cardStyles.priceMain, { color: primaryColor }]}>
            {formatCurrency(displayPrice * product.quantity)}
          </Text>
        </View>
      </View>
    </View>
  )
})

// ─── OrderCard (memo'd) ─────────────────────────────────────────────────────

const OrderCard = memo(function OrderCard({
  order,
  displayData,
  primaryColor,
  isDark,
  statusLabel,
  onViewDetail,
  onUpdateOrder,
  onPayment,
  labels,
}: {
  order: IOrder
  displayData: OrderDisplayData | null
  primaryColor: string
  isDark: boolean
  statusLabel: string
  onViewDetail: (slug: string) => void
  onUpdateOrder: (order: IOrder) => void
  onPayment: (slug: string) => void
  labels: {
    subtotal: string
    promotionDiscount: string
    voucher: string
    loyaltyPoint: string
    deliveryFee: string
    totalPayment: string
    moreItems: string
    viewDetail: string
    updateOrder: string
    payment: string
  }
}) {
  const orderItems = order.orderItems || []
  const voucher = order.voucher || null
  const cartTotals = displayData?.cartTotals ?? null
  const statusColors = getStatusBadgeColors(order.status)
  const isPending = order.status === OrderStatus.PENDING

  const handleViewDetail = useCallback(() => onViewDetail(order.slug), [order.slug, onViewDetail])
  const handleUpdate = useCallback(() => onUpdateOrder(order), [order, onUpdateOrder])
  const handlePayment = useCallback(() => onPayment(order.slug), [order.slug, onPayment])

  return (
    <View style={[cardStyles.card, { backgroundColor: isDark ? colors.gray[800] : '#fff', borderColor: isDark ? colors.gray[700] : colors.gray[100] }]}>
      {/* Header */}
      <View style={[cardStyles.cardHeader, { backgroundColor: `${primaryColor}15`, borderBottomColor: `${primaryColor}30` }]}>
        <Text style={[cardStyles.dateText, { color: isDark ? colors.gray[400] : colors.gray[600] }]}>
          {formatDateTime(order.createdAt)}
        </Text>
        <View style={[cardStyles.statusBadge, { backgroundColor: statusColors.bg }]}>
          <Text style={[cardStyles.statusText, { color: statusColors.text }]}>
            {capitalizeFirstLetter(statusLabel)}
          </Text>
        </View>
      </View>

      {/* Products */}
      <View style={cardStyles.body}>
        {orderItems.slice(0, 3).map((product, index) => (
          <OrderProductItem
            key={product.slug || index}
            product={product}
            displayData={displayData}
            voucher={voucher}
            primaryColor={primaryColor}
            isDark={isDark}
            isLast={index === Math.min(orderItems.length - 1, 2)}
          />
        ))}

        {orderItems.length > 3 && (
          <Text style={[cardStyles.moreText, { color: isDark ? colors.gray[400] : colors.gray[500] }]}>
            +{orderItems.length - 3} {labels.moreItems}
          </Text>
        )}

        {/* Summary */}
        <View style={[cardStyles.summarySection, { borderTopColor: isDark ? colors.gray[700] : colors.gray[100] }]}>
          {cartTotals && (
            <>
              <View style={cardStyles.summaryRow}>
                <Text style={[cardStyles.summaryLabel, { color: isDark ? colors.gray[50] : colors.gray[900] }]}>{labels.subtotal}</Text>
                <Text style={[cardStyles.summaryValue, { color: isDark ? colors.gray[50] : colors.gray[900] }]}>{formatCurrency(cartTotals.subTotalBeforeDiscount)}</Text>
              </View>
              <View style={cardStyles.summaryRow}>
                <Text style={[cardStyles.summaryLabelMuted, { color: isDark ? colors.gray[600] : colors.gray[600] }]}>{labels.promotionDiscount}</Text>
                <Text style={[cardStyles.summaryValueMuted, { color: colors.gray[400] }]}>
                  -{formatCurrency(cartTotals.promotionDiscount)}
                </Text>
              </View>
              <View style={cardStyles.summaryRow}>
                <Text style={[cardStyles.summaryLabelMuted, { color: '#22c55e' }]}>{labels.voucher}</Text>
                <Text style={[cardStyles.summaryValueMuted, { color: primaryColor }]}>
                  -{formatCurrency(cartTotals.voucherDiscount)}
                </Text>
              </View>
            </>
          )}
          <View style={cardStyles.summaryRow}>
            <Text style={[cardStyles.summaryLabelMuted, { color: primaryColor }]}>{labels.loyaltyPoint}</Text>
            <Text style={[cardStyles.summaryValueMuted, { color: primaryColor }]}>
              -{formatCurrency(order.accumulatedPointsToUse || 0)}
            </Text>
          </View>
          {order.type === OrderTypeEnum.DELIVERY && order.deliveryFee > 0 && (
            <View style={cardStyles.summaryRow}>
              <Text style={[cardStyles.summaryLabelMuted, { color: colors.gray[400] }]}>{labels.deliveryFee}</Text>
              <Text style={[cardStyles.summaryValueMuted, { color: isDark ? colors.gray[50] : colors.gray[900] }]}>{formatCurrency(order.deliveryFee)}</Text>
            </View>
          )}
          <View style={[cardStyles.totalRow, { borderTopColor: isDark ? colors.gray[700] : colors.gray[100] }]}>
            <Text style={[cardStyles.totalLabel, { color: isDark ? colors.gray[50] : colors.gray[900] }]}>{labels.totalPayment}</Text>
            <Text style={[cardStyles.totalValue, { color: primaryColor }]}>{formatCurrency(order.subtotal || 0)}</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={cardStyles.actionsWrap}>
          {/* Row 1: primary actions */}
          <View style={cardStyles.actionsRow}>
            <Pressable onPress={handleViewDetail} style={[cardStyles.actionBtnOutline, { borderColor: isDark ? colors.gray[600] : colors.gray[300] }]}>
              <Text style={[cardStyles.actionBtnOutlineText, { color: isDark ? colors.gray[50] : colors.gray[700] }]}>{labels.viewDetail}</Text>
            </Pressable>
            {isPending && (
              <Pressable onPress={handlePayment} style={[cardStyles.actionBtn, { backgroundColor: primaryColor }]}>
                <Text style={cardStyles.actionBtnText}>{labels.payment}</Text>
              </Pressable>
            )}
          </View>
          {/* Row 2: secondary actions (pending only) */}
          {isPending && (
            <View style={cardStyles.actionsRow}>
              <Pressable onPress={handleUpdate} style={[cardStyles.actionBtnOutline, { borderColor: '#f97316' }]}>
                <Text style={[cardStyles.actionBtnOutlineText, { color: '#f97316' }]}>{labels.updateOrder}</Text>
              </Pressable>
              <CancelOrderDialog order={order} />
            </View>
          )}
        </View>
      </View>
    </View>
  )
}, (prev, next) =>
  prev.order.slug === next.order.slug &&
  prev.order.status === next.order.status &&
  prev.order.subtotal === next.order.subtotal &&
  prev.displayData === next.displayData &&
  prev.primaryColor === next.primaryColor &&
  prev.isDark === next.isDark &&
  prev.statusLabel === next.statusLabel &&
  prev.onViewDetail === next.onViewDetail &&
  prev.onUpdateOrder === next.onUpdateOrder &&
  prev.onPayment === next.onPayment,
)

const cardStyles = StyleSheet.create({
  card: { marginBottom: 16, borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  dateText: { fontSize: 12 },
  statusBadge: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  statusText: { fontSize: 12, fontWeight: '500' },
  body: { padding: 16 },
  productRow: { flexDirection: 'row', gap: 12 },
  productRowBorder: { marginBottom: 12, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e7eb' },
  productImageWrap: { position: 'relative' },
  productImage: { width: 64, height: 64, borderRadius: 8 },
  qtyBadge: { position: 'absolute', bottom: -2, right: -8, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  qtyText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  productInfo: { flex: 1, gap: 4 },
  productName: { fontSize: 14, fontWeight: '600' },
  sizeBadge: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  sizeText: { fontSize: 12, fontWeight: '500' },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'flex-end', gap: 4 },
  priceStrike: { fontSize: 12, color: '#9ca3af', textDecorationLine: 'line-through' },
  priceMain: { fontSize: 14, fontWeight: '700' },
  moreText: { marginTop: 8, textAlign: 'center', fontSize: 12 },
  summarySection: { marginTop: 16, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth, gap: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 14, fontWeight: '500' },
  summaryValue: { fontSize: 14, fontWeight: '500' },
  summaryLabelMuted: { fontSize: 12, fontStyle: 'italic' },
  summaryValueMuted: { fontSize: 12, fontWeight: '500', fontStyle: 'italic' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth },
  totalLabel: { fontSize: 16, fontWeight: '700' },
  totalValue: { fontSize: 18, fontWeight: '700' },
  actionsWrap: { marginTop: 16, gap: 8 },
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  // actions: { marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  actionBtnOutline: { flex: 1, height: 44, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  actionBtnOutlineText: { fontSize: 14, fontWeight: '600' },
  actionBtn: { height: 44, borderRadius: 8, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  actionBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  // pendingActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  // updateBtn: { height: 44, borderRadius: 8, borderWidth: 1, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  // updateBtnText: { fontSize: 14, fontWeight: '500', color: '#f97316' },
})

function OrderHistoryPage() {
  const { t } = useTranslation('menu')
  const { t: tProfile } = useTranslation('profile')
  const queryClient = useQueryClient()
  const isDark = useColorScheme() === 'dark'
  const primaryColor = isDark ? colors.primary.dark : colors.primary.light

  const userInfo = useUserStore((s) => s.userInfo)
  const getUserInfo = useUserStore((s) => s.getUserInfo)
  const setOrderItems = useUpdateOrderStore((s) => s.setOrderItems)
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

  const orders = useMemo(() => orderResponse?.items || [], [orderResponse?.items])

  // Pre-compute display data once when orders change — O(1) lookup in renderItem
  const orderDisplayMap = useMemo(() => {
    const map = new Map<string, {
      displayItemMap: Map<string, ReturnType<typeof calculateOrderDisplayAndTotals>['displayItems'][number]>
      cartTotals: ReturnType<typeof calculateOrderDisplayAndTotals>['cartTotals']
    }>()
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


  // Memoize callbacks
  const handleViewDetail = useCallback(
    (orderSlug: string) => {
      // Prefetch order detail to speed up navigation to payment page
      if (orderSlug) {
        queryClient.prefetchQuery({
          queryKey: ['order', orderSlug],
          queryFn: () => getOrderBySlug(orderSlug),
        })
      }

      navigateNative.push(
        `${ROUTE.CLIENT_PAYMENT.replace('[order]', orderSlug)}` as Parameters<
          typeof navigateNative.push
        >[0],
      )
    },
    [queryClient],
  )

  const handleUpdateOrder = useCallback(
    (order: IOrder) => {
      if (!getUserInfo()?.slug) {
        showErrorToast(1042)
        navigateNative.push(ROUTE.LOGIN)
        return
      }
      if (!order?.slug) return
      // Prefetch order để màn update-order load ngay, animation mượt
      queryClient.prefetchQuery({
        queryKey: ['order', order.slug],
        queryFn: () => getOrderBySlug(order.slug),
      })
      setOrderItems(order)
      navigateNative.push(
        `${ROUTE.CLIENT_UPDATE_ORDER.replace('[slug]', order.slug)}` as Parameters<
          typeof navigateNative.push
        >[0],
      )
    },
    [queryClient, setOrderItems, getUserInfo],
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
    viewDetail: t('order.viewDetail', 'Xem chi tiết'),
    updateOrder: t('order.updateOrder', 'Cập nhật'),
    payment: t('order.payment', 'Thanh toán'),
  }), [t])

  const renderOrderItem = useCallback(
    ({ item: orderItem }: { item: IOrder }) => (
      <OrderCard
        order={orderItem}
        displayData={orderDisplayMap.get(orderItem.slug) ?? null}
        primaryColor={primaryColor}
        isDark={isDark}
        statusLabel={getStatusLabel(orderItem.status)}
        onViewDetail={handleViewDetail}
        onUpdateOrder={handleUpdateOrder}
        onPayment={handleViewDetail}
        labels={orderCardLabels}
      />
    ),
    [orderDisplayMap, primaryColor, isDark, getStatusLabel, handleViewDetail, handleUpdateOrder, orderCardLabels],
  )

  const keyExtractor = useCallback((item: IOrder) => item.slug ?? '', [])

  const ListFooterComponent = useMemo(() => {
    if (totalPages <= 1) return null
    return (
      <View style={pageStyles.paginationRow}>
        <Pressable
          onPress={() => setPage(page - 1)}
          disabled={!hasPrevious}
          style={[pageStyles.pageBtn, { backgroundColor: isDark ? colors.gray[800] : '#fff', borderColor: isDark ? colors.gray[700] : colors.gray[200] }, !hasPrevious && { opacity: 0.5 }]}
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
          style={[pageStyles.pageBtn, { backgroundColor: isDark ? colors.gray[800] : '#fff', borderColor: isDark ? colors.gray[700] : colors.gray[200] }, !hasNext && { opacity: 0.5 }]}
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
        <Package size={64} color={isDark ? '#9ca3af' : '#6b7280'} />
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
  const headerBg = isDark ? colors.gray[800] : '#fff'
  const headerBorder = isDark ? colors.gray[700] : colors.gray[200]
  const gradientColors = useMemo(
    () => [`${screenBg}F0`, `${screenBg}AA`, `${screenBg}00`] as const,
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
          {Platform.OS === 'ios' ? (
            <BlurView
              intensity={20}
              tint={isDark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
          ) : null}
          <LinearGradient
            colors={gradientColors}
            locations={[0, 0.5, 1]}
            style={StyleSheet.absoluteFill}
          />

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
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={pageStyles.filterScroll}>
              {STATUS_FILTER_OPTIONS.map((opt) => {
                const sel = status === opt.value
                const label = opt.labelKey === 'all' ? tProfile('profile.all', 'Tất cả')
                  : opt.labelKey === 'pending' ? t('order.pending', 'Chờ xử lý')
                  : opt.labelKey === 'shipping' ? tProfile('profile.shipping', 'Đang giao')
                  : tProfile('profile.completed', 'Hoàn thành')
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => { setStatus(opt.value); setPage(1) }}
                    style={[
                      pageStyles.filterChip,
                      sel
                        ? { borderColor: primaryColor, backgroundColor: primaryColor }
                        : { borderColor: isDark ? colors.gray[700] : colors.gray[200], backgroundColor: isDark ? colors.gray[800] : '#ffffff' },
                    ]}
                  >
                    <Text style={[pageStyles.filterChipText, { color: sel ? '#fff' : (isDark ? colors.gray[300] : colors.gray[700]) }]}>
                      {label}
                    </Text>
                  </Pressable>
                )
              })}
            </ScrollView>
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
  circleBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  shadow: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 24, elevation: 2 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  filterRow: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 },
  filterScroll: { flexDirection: 'row', gap: 8 },
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
