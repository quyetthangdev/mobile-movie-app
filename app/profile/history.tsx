import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Package, RefreshCw } from 'lucide-react-native'
import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ActivityIndicator,
  Image,
  type ImageSourcePropType,
  ScrollView,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native'
import { ScrollView as GestureScrollView } from 'react-native-gesture-handler'
import { ScreenContainer } from '@/components/layout'

import { getOrderBySlug } from '@/api'
import { Images } from '@/assets/images'
import { CancelOrderDialog } from '@/components/dialog'
import { Badge, Button, Skeleton } from '@/components/ui'
import {
  APPLICABILITY_RULE,
  colors,
  publicFileURL,
  ROUTE,
  VOUCHER_TYPE,
} from '@/constants'
import { useOrders, useRunAfterTransition } from '@/hooks'
import { navigateNative } from '@/lib/navigation'
import { cn } from '@/lib/utils'
import { useUpdateOrderStore, useUserStore } from '@/stores'
import { IOrder, OrderStatus, OrderTypeEnum } from '@/types'
import {
  calculateOrderItemDisplay,
  calculatePlacedOrderTotals,
  capitalizeFirstLetter,
  formatCurrency,
  formatDateTime,
  showErrorToast,
} from '@/utils'

function OrderHistoryPage() {
  const { t } = useTranslation('menu')
  const { t: tProfile } = useTranslation('profile')
  const queryClient = useQueryClient()
  const isDark = useColorScheme() === 'dark'
  const primaryColor = isDark ? colors.primary.dark : colors.primary.light

  const { userInfo, getUserInfo } = useUserStore()
  const { setOrderItems } = useUpdateOrderStore()
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

  const orders = orderResponse?.items || []
  const hasNext = orderResponse?.hasNext || false
  const hasPrevious = orderResponse?.hasPrevious || false
  const currentPage = orderResponse?.page || 1
  const totalPages = orderResponse?.totalPages || 0

  const handleRefresh = useCallback(() => {
    refetch()
  }, [refetch])

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

  // Memoize getStatusBadgeColor to use in renderOrderItem
  const getStatusBadgeColor = useCallback((status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING:
        return 'bg-yellow-500 dark:bg-yellow-900/30'
      case OrderStatus.SHIPPING:
        return 'bg-blue-500 dark:bg-blue-900/30'
      case OrderStatus.COMPLETED:
        return 'bg-green-500 dark:bg-green-900/30'
      case OrderStatus.PAID:
        return 'bg-green-500 dark:bg-green-900/30'
      case OrderStatus.FAILED:
        return 'bg-red-500 dark:bg-red-900/30'
      default:
        return 'bg-gray-500 dark:bg-gray-800'
    }
  }, [])

  // Memoize getStatusTextColor to use in renderOrderItem
  const getStatusTextColor = useCallback((status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING:
        return 'text-white'
      case OrderStatus.SHIPPING:
        return 'text-white'
      case OrderStatus.COMPLETED:
        return 'text-white'
      case OrderStatus.PAID:
        return 'text-white'
      case OrderStatus.FAILED:
        return 'text-white'
      default:
        return 'text-white'
    }
  }, [])

  // Memoize getStatusLabel to use in renderOrderItem (chuẩn hóa status vì API có thể trả về "PENDING" thay vì "pending")
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

  // Memoize renderItem to avoid re-create each render
  const renderOrderItem = useCallback(
    ({ item: orderItem }: { item: IOrder }) => {
      const orderItems = orderItem.orderItems || []
      const voucher = orderItem.voucher || null
      const displayItems = calculateOrderItemDisplay(orderItems, voucher)
      const cartTotals = calculatePlacedOrderTotals(displayItems, voucher)

      return (
        <View className="mb-4 rounded-lg border border-gray-100 bg-white dark:border-gray-700 dark:bg-gray-800">
          {/* Header */}
          <View className="rounded-t-md border-b border-primary/20 bg-primary/10 px-4 py-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-xs text-gray-600 dark:text-gray-400">
                {formatDateTime(orderItem.createdAt)}
              </Text>
              <View
                className={cn(
                  'rounded-full px-4 py-2',
                  getStatusBadgeColor(orderItem.status),
                )}
              >
                <Text
                  className={cn(
                    'text-xs font-medium',
                    getStatusTextColor(orderItem.status),
                  )}
                >
                  {capitalizeFirstLetter(getStatusLabel(orderItem.status))}
                </Text>
              </View>
            </View>
          </View>

          {/* Order Items */}
          <View className="p-4">
            {orderItems.slice(0, 3).map((product, index) => {
              const displayItem = displayItems.find(
                (di) => di.slug === product.slug,
              )
              const original = product.variant?.price || 0
              const priceAfterPromotion = displayItem?.priceAfterPromotion || 0
              const finalPrice = displayItem?.finalPrice || 0

              const isSamePriceVoucher =
                voucher?.type === VOUCHER_TYPE.SAME_PRICE_PRODUCT &&
                voucher?.voucherProducts?.some(
                  (vp) => vp.product?.slug === product.variant?.product?.slug,
                )

              const isAtLeastOneVoucher =
                voucher?.applicabilityRule ===
                  APPLICABILITY_RULE.AT_LEAST_ONE_REQUIRED &&
                voucher?.voucherProducts?.some(
                  (vp) => vp.product?.slug === product.variant?.product?.slug,
                )

              const hasVoucherDiscount = (displayItem?.voucherDiscount ?? 0) > 0
              const hasPromotionDiscount =
                (displayItem?.promotionDiscount ?? 0) > 0

              const displayPrice = isSamePriceVoucher
                ? finalPrice
                : isAtLeastOneVoucher && hasVoucherDiscount
                  ? original - (displayItem?.voucherDiscount || 0)
                  : hasPromotionDiscount
                    ? priceAfterPromotion
                    : original

              const shouldShowLineThrough =
                (isSamePriceVoucher ||
                  hasPromotionDiscount ||
                  hasVoucherDiscount) &&
                original > displayPrice

              return (
                <View
                  key={product.slug || index}
                  className={
                    index !== Math.min(orderItems.length - 1, 2)
                      ? 'mb-3 border-b border-gray-100 pb-3 dark:border-gray-800'
                      : ''
                  }
                >
                  <View className="flex-row gap-3">
                    {/* Product Image */}
                    <View className="relative">
                      <Image
                        source={
                          (product.variant?.product?.image
                            ? {
                                uri: `${publicFileURL}/${product.variant.product.image}`,
                              }
                            : Images.Food.ProductImage) as ImageSourcePropType
                        }
                        className="h-16 w-16 rounded-md"
                        resizeMode="cover"
                      />
                      <View
                        className="absolute -bottom-0 -right-2 h-6 w-6 items-center justify-center rounded-full"
                        style={{ backgroundColor: primaryColor }}
                      >
                        <Text className="text-xs font-bold text-white">
                          x{product.quantity}
                        </Text>
                      </View>
                    </View>

                    {/* Product Info */}
                    <View className="flex-1">
                      <View className="mb-1 flex-row items-start gap-2">
                        <Text
                          className="flex-1 text-sm font-semibold text-gray-900 dark:text-gray-50"
                          numberOfLines={2}
                        >
                          {product.variant?.product?.name}
                        </Text>
                      </View>
                      <View className="mb-2 flex-row items-center gap-2">
                        <Badge
                          variant="outline"
                          className="rounded-md border border-primary bg-primary/10 text-primary dark:bg-gray-700"
                        >
                          <Text className="text-xs font-medium text-primary dark:text-primary">
                            {capitalizeFirstLetter(
                              product.variant?.size?.name || '',
                            )}
                          </Text>
                        </Badge>
                      </View>
                      <View className="flex-row items-end justify-end gap-1">
                        {shouldShowLineThrough && (
                          <Text className="text-xs text-gray-400 line-through">
                            {formatCurrency(original * product.quantity)}
                          </Text>
                        )}
                        <Text
                          className="text-sm font-bold"
                          style={{ color: primaryColor }}
                        >
                          {formatCurrency(displayPrice * product.quantity)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              )
            })}

            {orderItems.length > 3 && (
              <Text className="mt-2 text-center text-xs text-gray-500 dark:text-gray-400">
                +{orderItems.length - 3} {t('order.moreItems', 'sản phẩm khác')}
              </Text>
            )}

            {/* Order Summary */}
            <View className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-700">
              <View className="flex-col gap-2">
                {cartTotals && (
                  <>
                    {/* Tổng tiền hàng */}
                    <View className="flex-row justify-between">
                      <Text className="text-sm font-medium text-gray-900 dark:text-gray-50">
                        {t('order.subtotal', 'Tổng tiền hàng')}
                      </Text>
                      <Text className="text-sm font-medium text-gray-900 dark:text-gray-50">
                        {formatCurrency(cartTotals.subTotalBeforeDiscount)}
                      </Text>
                    </View>

                    {/* Giảm giá khuyến mãi */}
                    <View className="flex-row justify-between">
                      <Text className="text-xs italic text-gray-600 dark:text-gray-600">
                        {t('order.promotionDiscount', 'Giảm giá khuyến mãi')}
                      </Text>
                      <Text className="text-xs font-medium italic text-gray-400 dark:text-gray-400">
                        {cartTotals.promotionDiscount > 0
                          ? `-${formatCurrency(cartTotals.promotionDiscount)}`
                          : `-${formatCurrency(0)}`}
                      </Text>
                    </View>

                    {/* Mã giảm giá */}
                    <View className="flex-row justify-between">
                      <Text className="text-xs italic text-green-500 dark:text-green-500">
                        {t('order.voucher', 'Mã giảm giá')}
                      </Text>
                      <Text
                        className="text-xs font-medium italic"
                        style={{ color: primaryColor }}
                      >
                        {cartTotals.voucherDiscount > 0
                          ? `-${formatCurrency(cartTotals.voucherDiscount)}`
                          : `-${formatCurrency(0)}`}
                      </Text>
                    </View>
                  </>
                )}

                {/* Điểm tích lũy */}
                <View className="flex-row justify-between">
                  <Text className="text-xs italic text-primary">
                    {t('order.loyaltyPoint', 'Điểm tích lũy')}
                  </Text>
                  <Text
                    className="text-xs font-medium italic"
                    style={{ color: primaryColor }}
                  >
                    {(orderItem.accumulatedPointsToUse || 0) > 0
                      ? `-${formatCurrency(orderItem.accumulatedPointsToUse)}`
                      : `-${formatCurrency(0)}`}
                  </Text>
                </View>

                {/* Phí giao hàng - chỉ hiện khi phương thức thanh toán là giao hàng */}
                {orderItem.type === OrderTypeEnum.DELIVERY &&
                  orderItem.deliveryFee > 0 && (
                    <View className="flex-row justify-between">
                      <Text className="text-xs text-gray-400 dark:text-gray-400">
                        {t('order.deliveryFee', 'Phí giao hàng')}
                      </Text>
                      <Text className="text-xs font-medium text-gray-900 dark:text-gray-50">
                        {formatCurrency(orderItem.deliveryFee)}
                      </Text>
                    </View>
                  )}

                {/* Tổng thanh toán */}
                <View className="mt-2 flex-row justify-between border-t border-gray-100 pt-2 dark:border-gray-700">
                  <Text className="text-base font-bold text-gray-900 dark:text-gray-50">
                    {t('order.totalPayment', 'Tổng thanh toán')}
                  </Text>
                  <Text
                    className="text-lg font-bold"
                    style={{ color: primaryColor }}
                  >
                    {formatCurrency(orderItem.subtotal || 0)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Actions */}
            <View className="mt-4 flex-row items-center justify-between gap-2">
              <Button
                onPress={() => handleViewDetail(orderItem.slug)}
                className="rounded-md bg-primary"
              >
                {t('order.viewDetail', 'Xem chi tiết')}
              </Button>
              {orderItem.status === OrderStatus.PENDING && (
                <View className="flex-row items-center gap-2">
                  <CancelOrderDialog order={orderItem} />
                  <TouchableOpacity
                    onPress={() => handleUpdateOrder(orderItem)}
                    className="h-11 items-center justify-center rounded-md border border-orange-500 px-4 py-2"
                  >
                    <Text className="text-sm font-medium text-orange-500 dark:text-orange-400">
                      {t('order.updateOrder', 'Cập nhật')}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </View>
      )
    },
    [
      t,
      handleUpdateOrder,
      handleViewDetail,
      getStatusLabel,
      primaryColor,
      getStatusBadgeColor,
      getStatusTextColor,
    ],
  )

  const showSkeleton = !allowFetch || (isPending && page === 1)
  if (showSkeleton) {
    return (
      <ScreenContainer
        edges={['top', 'bottom']}
        className="flex-1 bg-gray-50 dark:bg-gray-900"
      >
        {/* Header skeleton */}
        <View className="flex-row items-center border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
          <Skeleton className="mr-3 h-6 w-6 rounded-full" />
          <Skeleton className="h-5 w-40 rounded-md" />
        </View>

        {/* List skeleton */}
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {[1, 2, 3].map((key) => (
            <View
              key={key}
              className="mb-4 rounded-lg border border-gray-100 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
            >
              {/* Header */}
              <View className="mb-4 flex-row items-center justify-between">
                <Skeleton className="h-3 w-32 rounded-md" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </View>

              {/* Items */}
              <View className="mb-4 flex-row gap-3">
                <Skeleton className="h-16 w-16 rounded-md" />
                <View className="flex-1 gap-2">
                  <Skeleton className="mb-1 h-4 w-40 rounded-md" />
                  <Skeleton className="mb-1 h-3 w-24 rounded-md" />
                  <Skeleton className="h-4 w-28 rounded-md" />
                </View>
              </View>

              {/* Summary */}
              <View className="mt-2 border-t border-gray-100 pt-2 dark:border-gray-700">
                <View className="mb-2 flex-row justify-between">
                  <Skeleton className="h-3 w-24 rounded-md" />
                  <Skeleton className="h-3 w-20 rounded-md" />
                </View>
                <View className="flex-row justify-between">
                  <Skeleton className="h-4 w-28 rounded-md" />
                  <Skeleton className="h-4 w-24 rounded-md" />
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      </ScreenContainer>
    )
  }

  return (
    <View style={{ flex: 1 }} className="bg-gray-50 dark:bg-gray-900">
      <ScreenContainer edges={['top', 'bottom']} style={{ flex: 1 }}>
        {/* Header */}
        <View className="flex-row items-center border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
          <TouchableOpacity
            onPress={() => navigateNative.back()}
            className="mr-3"
          >
            <ArrowLeft size={24} color={isDark ? '#9ca3af' : '#6b7280'} />
          </TouchableOpacity>
          <View className="flex-1 flex-row items-center gap-2">
            <Package size={20} color={primaryColor} />
            <Text className="text-lg font-semibold text-gray-900 dark:text-gray-50">
              {t('order.history', 'Lịch sử đơn hàng')}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleRefresh}
            disabled={isRefetching}
            className="p-2"
          >
            {isRefetching ? (
              <ActivityIndicator size="small" color={primaryColor} />
            ) : (
              <RefreshCw size={22} color={primaryColor} />
            )}
          </TouchableOpacity>
        </View>

        {/* Status Filter */}
        <View className="border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ flexDirection: 'row', gap: 8 }}
          >
            {[
              {
                value: OrderStatus.ALL,
                label: tProfile('profile.all', 'Tất cả'),
              },
              {
                value: OrderStatus.PENDING,
                label: t('order.pending', 'Chờ xử lý'),
              },
              {
                value: OrderStatus.SHIPPING,
                label: tProfile('profile.shipping', 'Đang giao'),
              },
              {
                value: OrderStatus.COMPLETED,
                label: tProfile('profile.completed', 'Hoàn thành'),
              },
            ].map((statusOption) => (
              <TouchableOpacity
                key={statusOption.value}
                onPress={() => {
                  setStatus(statusOption.value)
                  setPage(1)
                }}
                className={
                  status === statusOption.value
                    ? 'rounded-full border border-primary bg-primary/20 px-4 py-2'
                    : 'rounded-full border border-gray-200 bg-gray-100 px-4 py-2 dark:border-gray-700 dark:bg-gray-700'
                }
              >
                <Text
                  className={
                    status === statusOption.value
                      ? 'text-sm font-medium text-primary'
                      : 'text-sm font-medium text-gray-700 dark:text-gray-300'
                  }
                >
                  {statusOption.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Order List - GestureScrollView tránh conflict Stack swipe-back */}
        <View style={{ flex: 1 }}>
          {orders.length > 0 ? (
            <GestureScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
              showsVerticalScrollIndicator={true}
            >
            {orders.map((orderItem) => (
              <View key={orderItem.slug}>
                {renderOrderItem({ item: orderItem })}
              </View>
            ))}
            {totalPages > 1 ? (
              <View className="mt-4 flex-row items-center justify-center gap-4">
                <TouchableOpacity
                  onPress={() => setPage(page - 1)}
                  disabled={!hasPrevious}
                  className={`rounded-md px-4 py-2 ${hasPrevious ? 'border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800' : 'bg-gray-100 opacity-50 dark:bg-gray-800'}`}
                >
                  <Text
                    className={`text-sm font-medium ${hasPrevious ? 'text-gray-900 dark:text-gray-50' : 'text-gray-400'}`}
                  >
                    {t('order.previous', 'Trước')}
                  </Text>
                </TouchableOpacity>
                <Text className="text-sm text-gray-600 dark:text-gray-400">
                  {currentPage} / {totalPages}
                </Text>
                <TouchableOpacity
                  onPress={() => setPage(page + 1)}
                  disabled={!hasNext}
                  className={`rounded-md px-4 py-2 ${hasNext ? 'border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800' : 'bg-gray-100 opacity-50 dark:bg-gray-800'}`}
                >
                  <Text
                    className={`text-sm font-medium ${hasNext ? 'text-gray-900 dark:text-gray-50' : 'text-gray-400'}`}
                  >
                    {t('order.next', 'Sau')}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
            </GestureScrollView>
          ) : (
            <GestureScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 16 }}
            >
              <View className="items-center justify-center px-4">
                <Package size={64} color={isDark ? '#9ca3af' : '#6b7280'} />
                <Text className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-50">
                  {t('order.noOrders', 'Chưa có đơn hàng')}
                </Text>
                <Text className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
                  {t('order.noOrdersDescription', 'Bạn chưa có đơn hàng nào')}
                </Text>
              </View>
            </GestureScrollView>
          )}
        </View>
      </ScreenContainer>
    </View>
  )
}

OrderHistoryPage.displayName = 'OrderHistoryPage'
export default React.memo(OrderHistoryPage)
