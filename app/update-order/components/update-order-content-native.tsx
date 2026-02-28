import { useEffect } from 'react'
import { ShoppingCartIcon } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import type { ImageSourcePropType } from 'react-native'
import { Dimensions, Image, ScrollView, Text, useColorScheme, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Images } from '@/assets/images'
import { Badge } from '@/components/ui'
import {
  APPLICABILITY_RULE,
  colors,
  publicFileURL,
  VOUCHER_TYPE,
} from '@/constants'
import {
  calculateOrderItemDisplay,
  calculatePlacedOrderTotals,
  capitalizeFirstLetter,
  formatCurrency,
  showErrorToastMessage,
  transformOrderItemToOrderDetail,
} from '@/utils'
import { IOrderItem, OrderStatus, OrderTypeEnum } from '@/types'
import { useOrderFlowStore } from '@/stores'

import ConfirmUpdateOrderDialog from './confirm-update-order-dialog'
import OrderItemNoteInUpdateOrderInput from './order-item-note-in-update-order-input'
import OrderNoteInUpdateOrderInput from './order-note-in-update-order-input'
import OrderTypeSelectInUpdateOrder from './order-type-select-in-update-order'
import PickupTimeSelectInUpdateOrder from './pickup-time-select-in-update-order'
import RemoveOrderItemInUpdateOrderDialog from './remove-order-item-in-update-order-dialog'
import TableSelectInUpdateOrder from './table-select-in-update-order'
import UpdateOrderQuantityNative from './update-order-quantity-native'

interface UpdateOrderContentNativeProps {
  orderType: OrderTypeEnum
  table: string
  orderSlug: string
}

export default function UpdateOrderContentNative({
  orderType,
  table,
  orderSlug,
}: UpdateOrderContentNativeProps) {
  const { t } = useTranslation('menu')
  const { t: tCommon } = useTranslation('common')
  const { t: tVoucher } = useTranslation('voucher')
  const isDark = useColorScheme() === 'dark'
  const primaryColor = isDark ? colors.primary.dark : colors.primary.light
  const insets = useSafeAreaInsets()

  const { updatingData, removeDraftVoucher } = useOrderFlowStore()
  const voucher = updatingData?.updateDraft?.voucher || null
  const voucherSlug = voucher?.slug
  const voucherMaxItems = voucher?.maxItems || 0
  const orderItems = updatingData?.updateDraft?.orderItems || []
  const cartItemQuantity = orderItems.reduce((total, item) => total + (item.quantity || 0), 0)
  const deliveryFee = updatingData?.originalOrder?.deliveryFee || 0
  const accumulatedPointsToUse = updatingData?.originalOrder?.accumulatedPointsToUse || 0

  const transformedOrderItems = transformOrderItemToOrderDetail(orderItems)
  const displayItems = calculateOrderItemDisplay(transformedOrderItems, voucher)
  const cartTotals = calculatePlacedOrderTotals(displayItems, voucher)
  const finalTotal =
    (cartTotals?.finalTotal || 0) + deliveryFee - (accumulatedPointsToUse || 0)

  useEffect(() => {
    if (!voucherSlug || !voucherMaxItems) return
    if (cartItemQuantity > voucherMaxItems) {
      removeDraftVoucher()
      showErrorToastMessage('toast.voucherMaxItemsExceeded')
    }
  }, [voucherSlug, voucherMaxItems, cartItemQuantity, removeDraftVoucher])

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header: Order type + Bàn/Pickup cùng hàng */}
      <View className="gap-2 border-b border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <View className="flex-row gap-2">
          <View className="flex-1 min-w-0">
            <OrderTypeSelectInUpdateOrder typeOrder={orderType} />
          </View>
          {orderType === OrderTypeEnum.AT_TABLE && (
            <View className="flex-1 min-w-0">
              <TableSelectInUpdateOrder
                tableOrder={updatingData?.originalOrder?.table}
                orderType={orderType}
              />
            </View>
          )}
          {orderType === OrderTypeEnum.TAKE_OUT && (
            <View className="flex-1 min-w-0">
              <PickupTimeSelectInUpdateOrder />
            </View>
          )}
        </View>
        {orderType === OrderTypeEnum.DELIVERY &&
          updatingData?.updateDraft?.deliveryTo && (
            <View className="mt-3 gap-1">
              <Text className="text-sm font-bold text-gray-900 dark:text-gray-50">
                {t('order.deliveryAddress')}:
              </Text>
              <Text className="text-sm text-gray-600 dark:text-gray-400">
                {updatingData.updateDraft.deliveryTo.formattedAddress}
              </Text>
              <Text className="text-sm font-bold text-gray-900 dark:text-gray-50">
                {t('order.deliveryPhone')}:
              </Text>
              <Text className="text-sm text-gray-600 dark:text-gray-400">
                {updatingData.updateDraft.deliveryPhone}
              </Text>
            </View>
          )}
      </View>

      {/* Order items - chiều cao cố định để scroll ổn định, tránh chập chờn */}
      <ScrollView
        style={{ maxHeight: Dimensions.get('window').height * 0.38 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 16 }}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled
      >
        {orderItems && orderItems.length > 0 ? (
          <View className="gap-3">
            <Text className="mb-1 text-sm font-semibold text-gray-700 dark:text-gray-300">
              {t('order.orderItems', 'Món đã chọn')} ({orderItems.length})
            </Text>
            {orderItems.map((item: IOrderItem) => {
              const displayItem = displayItems.find((di) => di.slug === item.slug)
              const original = item.originalPrice || 0
              const priceAfterPromotion = displayItem?.priceAfterPromotion || 0
              const finalPrice = displayItem?.finalPrice || 0

              const isSamePriceVoucher =
                voucher?.type === VOUCHER_TYPE.SAME_PRICE_PRODUCT &&
                voucher?.voucherProducts?.some(
                  (vp) => vp.product?.slug === item.productSlug,
                )
              const isAtLeastOneVoucher =
                voucher?.applicabilityRule ===
                  APPLICABILITY_RULE.AT_LEAST_ONE_REQUIRED &&
                voucher?.voucherProducts?.some(
                  (vp) => vp.product?.slug === item.productSlug,
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
                  key={item.id || item.slug}
                  className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
                >
                  <View className="flex-row gap-3 p-3">
                    {/* Product image */}
                    <View className="h-20 w-20 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-700">
                      <Image
                        source={
                          (item?.image
                            ? { uri: `${publicFileURL}/${item.image}` }
                            : Images.Food.ProductImage) as ImageSourcePropType
                        }
                        className="h-full w-full"
                        resizeMode="cover"
                      />
                    </View>
                    {/* Product info */}
                    <View className="flex-1">
                      <Text
                        className="text-sm font-semibold text-gray-900 dark:text-gray-50"
                        numberOfLines={2}
                      >
                        {item.name}
                      </Text>
                      <Text className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        {capitalizeFirstLetter(item.variant?.size?.name || '')}
                      </Text>
                      <View className="mt-2 flex-row items-center justify-between">
                        <View className="flex-row items-center gap-1">
                          {shouldShowLineThrough && (
                            <Text className="text-xs text-gray-400 line-through">
                              {formatCurrency(original)}
                            </Text>
                          )}
                          <Text
                            className="text-sm font-bold"
                            style={{ color: primaryColor }}
                          >
                            {formatCurrency(displayPrice)}
                          </Text>
                        </View>
                        <View className="flex-row items-center gap-2">
                          <UpdateOrderQuantityNative orderItem={item} />
                          <RemoveOrderItemInUpdateOrderDialog
                            orderItem={item}
                            totalOrderItems={orderItems.length}
                          />
                        </View>
                      </View>
                    </View>
                  </View>
                  <View className="border-t border-gray-100 px-3 pb-2 pt-1 dark:border-gray-700">
                    <OrderItemNoteInUpdateOrderInput orderItem={item} />
                  </View>
                </View>
              )
            })}
          </View>
        ) : (
          <View className="min-h-[12rem] items-center justify-center gap-2">
            <View className="rounded-full bg-gray-200/50 p-2 dark:bg-gray-700/50">
              <ShoppingCartIcon size={40} color="#9ca3af" />
            </View>
            <Text className="text-center font-medium text-gray-500 dark:text-gray-400">
              {tCommon('common.noData')}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Footer: Note, voucher, totals, confirm - safe area bottom tránh chèn thanh điều hướng */}
      {orderItems && orderItems.length > 0 && (
        <View
          className="border-t border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
          style={{ paddingBottom: Math.max(insets.bottom, 16) + 16 }}
        >
          <View className="mb-3 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/50">
            <Text className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-50">
              {t('order.orderNote')}
            </Text>
            <OrderNoteInUpdateOrderInput order={updatingData?.updateDraft} />
          </View>

          {voucher && (
            <View className="mt-2">
              <Badge
                variant="outline"
                className="border-primary px-1 text-xs text-primary"
              >
                {(() => {
                  const v = updatingData?.updateDraft?.voucher
                  if (!v) return null
                  const { type, value, applicabilityRule: rule } = v
                  const discountValueText =
                    type === VOUCHER_TYPE.PERCENT_ORDER
                      ? tVoucher('voucher.percentDiscount', { value })
                      : type === VOUCHER_TYPE.FIXED_VALUE
                        ? tVoucher('voucher.fixedDiscount', {
                            value: formatCurrency(value),
                          })
                        : type === VOUCHER_TYPE.SAME_PRICE_PRODUCT
                          ? tVoucher('voucher.samePriceProduct', {
                              value: formatCurrency(value),
                            })
                          : ''
                  const ruleText =
                    rule === APPLICABILITY_RULE.ALL_REQUIRED
                      ? tVoucher(
                          type === VOUCHER_TYPE.SAME_PRICE_PRODUCT
                            ? 'voucher.requireAllSamePrice'
                            : type === VOUCHER_TYPE.PERCENT_ORDER
                              ? 'voucher.requireAllPercent'
                              : 'voucher.requireAllFixed',
                        )
                      : rule === APPLICABILITY_RULE.AT_LEAST_ONE_REQUIRED
                        ? tVoucher(
                            type === VOUCHER_TYPE.SAME_PRICE_PRODUCT
                              ? 'voucher.requireAtLeastOneSamePrice'
                              : type === VOUCHER_TYPE.PERCENT_ORDER
                                ? 'voucher.requireAtLeastOnePercent'
                                : 'voucher.requireAtLeastOneFixed',
                          )
                        : ''
                  return `${discountValueText} ${ruleText}`
                })()}
              </Badge>
            </View>
          )}

          <View className="mt-4 gap-2 border-t border-gray-200 pt-4 dark:border-gray-700">
            <Text className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-50">
              {t('order.orderSummary', 'Tóm tắt đơn hàng')}
            </Text>
            <View className="flex-row justify-between text-sm text-gray-600 dark:text-gray-400">
              <Text>{t('order.subtotalBeforeDiscount')}</Text>
              <Text>{formatCurrency(cartTotals?.subTotalBeforeDiscount || 0)}</Text>
            </View>
            {(cartTotals?.promotionDiscount || 0) > 0 && (
              <View className="flex-row justify-between text-xs italic text-yellow-600">
                <Text>{t('order.promotionDiscount')}</Text>
                <Text>-{formatCurrency(cartTotals?.promotionDiscount || 0)}</Text>
              </View>
            )}
            {(cartTotals?.voucherDiscount || 0) > 0 && (
              <View className="flex-row justify-between text-xs italic text-green-600">
                <Text>{t('order.voucherDiscount')}</Text>
                <Text>-{formatCurrency(cartTotals?.voucherDiscount || 0)}</Text>
              </View>
            )}
            {(accumulatedPointsToUse || 0) > 0 && (
              <View className="flex-row justify-between text-xs italic text-primary">
                <Text>{t('order.accumulatedPointsToUse')}</Text>
                <Text>-{formatCurrency(accumulatedPointsToUse || 0)}</Text>
              </View>
            )}
            {orderType === OrderTypeEnum.DELIVERY && (
              <View className="flex-row justify-between text-xs italic text-gray-500 dark:text-gray-400">
                <Text>{t('order.deliveryFee')}</Text>
                <Text>{formatCurrency(deliveryFee)}</Text>
              </View>
            )}
            <View className="flex-row items-center justify-between border-t border-gray-200 pt-2 dark:border-gray-700">
              <Text className="text-base font-semibold text-gray-900 dark:text-gray-50">
                {t('order.totalPayment')}
              </Text>
              <Text
                className="text-2xl font-bold"
                style={{ color: primaryColor }}
              >
                {formatCurrency(finalTotal)}
              </Text>
            </View>

            {updatingData?.originalOrder?.status === OrderStatus.PENDING && (
              <View className="mt-4">
                <ConfirmUpdateOrderDialog
                  orderSlug={orderSlug}
                  disabled={
                    (orderType === OrderTypeEnum.AT_TABLE && !table) ||
                    (orderType === OrderTypeEnum.DELIVERY &&
                      !updatingData?.updateDraft?.deliveryAddress)
                  }
                />
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  )
}
