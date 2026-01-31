import _ from 'lodash'
import { useEffect, useState } from 'react'
// import Joyride from 'react-joyride';
import { useRouter } from 'expo-router'
import {
  ChevronRight,
  CircleAlert,
  ShoppingCartIcon,
} from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { Image, ScrollView, Text, TouchableOpacity, useColorScheme, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Images } from '@/assets/images'
import { QuantitySelector } from '@/components/button'
import {
  CreateOrderDialog,
  DeleteAllCartDialog,
  DeleteCartItemDialog,
} from '@/components/dialog'
import {
  OrderTypeDropdown,
  PickupTimeDropdown,
  ProductVariantDropdown,
  TableDropdown,
} from '@/components/dropdown'
import { CartNoteInput, OrderNoteInput } from '@/components/input'
import { Badge } from '@/components/ui'
import {
  APPLICABILITY_RULE,
  publicFileURL,
  ROUTE,
  VOUCHER_TYPE,
} from '@/constants'
import { useBranchStore, useOrderFlowStore } from '@/stores'
import { OrderTypeEnum } from '@/types'
import {
  calculateCartItemDisplay,
  calculateCartTotals,
  formatCurrency,
  parseKm,
  showErrorToast,
  showErrorToastMessage,
  useCalculateDeliveryFee,
} from '@/utils'
// import { MapAddressSelector } from './components'

export default function ClientCartPage() {
  const { t } = useTranslation('menu')
  const { t: tVoucher } = useTranslation('voucher')
  const { branch } = useBranchStore()
  const router = useRouter()
  // const [runJoyride, setRunJoyride] = useState(false)
  const { removeVoucher, getCartItems, addOrderingProductVariant } =
    useOrderFlowStore()
  const [isMounted] = useState(true)

  const currentCartItems = getCartItems()
  const voucherSlug = currentCartItems?.voucher?.slug
  const voucherMaxItems = currentCartItems?.voucher?.maxItems || 0
  const cartItemQuantity =
    currentCartItems?.orderItems?.reduce(
      (total, item) => total + (item.quantity || 0),
      0,
    ) || 0

  const displayItems = calculateCartItemDisplay(
    currentCartItems,
    currentCartItems?.voucher || null,
  )

  const cartTotals = calculateCartTotals(
    displayItems,
    currentCartItems?.voucher || null,
  )

  const deliveryFee = useCalculateDeliveryFee(
    parseKm(currentCartItems?.deliveryDistance) || 0,
    branch?.slug || '',
  )

  const handleChangeVariant = (id: string) => {
    addOrderingProductVariant(id)
  }

  // Kiểm tra voucher validity cho SAME_PRICE_PRODUCT
  useEffect(() => {
    if (
      currentCartItems?.voucher &&
      currentCartItems.voucher.type === VOUCHER_TYPE.SAME_PRICE_PRODUCT
    ) {
      const voucherProductSlugs =
        currentCartItems.voucher.voucherProducts?.map(
          (vp) => vp.product.slug,
        ) || []
      const hasValidProducts = currentCartItems.orderItems.some((item) =>
        voucherProductSlugs.includes(item.slug),
      )

      if (!hasValidProducts) {
        showErrorToast(143422)
        removeVoucher()
      }
    }
  }, [currentCartItems, removeVoucher])

  // use useEffect to check if subtotal is less than minOrderValue of voucher
  useEffect(() => {
    if (currentCartItems && currentCartItems.voucher) {
      const { voucher, orderItems } = currentCartItems

      // Nếu không phải SAME_PRICE_PRODUCT thì mới cần check
      const shouldCheckMinOrderValue =
        voucher.type !== VOUCHER_TYPE.SAME_PRICE_PRODUCT

      if (shouldCheckMinOrderValue) {
        // Tính subtotal trực tiếp từ orderItems sau promotion, không sử dụng calculations để tránh circular dependency
        const subtotalAfterPromotion = orderItems.reduce((total, item) => {
          const original = item?.originalPrice
          const afterPromotion = (original || 0) - (item.promotionDiscount || 0)
          return total + afterPromotion * item.quantity
        }, 0)

        if (subtotalAfterPromotion < (voucher.minOrderValue || 0)) {
          removeVoucher()
          showErrorToast(1004)
        }
      }
    }
  }, [currentCartItems, removeVoucher])

  // Component is always mounted in React Native
  // Scroll handled by ScrollView in React Native

  // Check if the total quantity of products in the cart exceeds the voucher's maxItems
  useEffect(() => {
    if (!voucherSlug || !voucherMaxItems) return
    if (cartItemQuantity > voucherMaxItems) {
      removeVoucher()
      showErrorToastMessage('toast.voucherMaxItemsExceeded')
    }
  }, [voucherSlug, voucherMaxItems, cartItemQuantity, removeVoucher])

  const isDark = useColorScheme() === 'dark'
  const primaryColor = isDark ? '#D68910' : '#F7A737' // hsl(35 70% 53%) vs hsl(35 93% 55%)

  if (_.isEmpty(currentCartItems?.orderItems)) {
    return (
      <SafeAreaView className="flex-1" edges={['top']}>
        <View className="flex-1 items-center justify-center px-4">
          <View className="flex-col items-center gap-6">
            <View 
              className="w-32 h-32 items-center justify-center rounded-full"
              style={{ backgroundColor: isDark ? 'rgba(214, 137, 16, 0.1)' : 'rgba(247, 167, 55, 0.1)' }}
            >
              <ShoppingCartIcon size={64} color={primaryColor} />
            </View>
            <View className="flex-col items-center gap-2">
              <Text className="text-xl font-bold text-gray-900 dark:text-white text-center">
                {t('order.emptyCart', 'Giỏ hàng trống')}
              </Text>
              <Text className="text-sm text-gray-600 dark:text-gray-400 text-center max-w-xs">
                {t('order.noOrders', 'Chưa có sản phẩm nào trong giỏ hàng')}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push(ROUTE.CLIENT_MENU)}
              className="mt-2 px-6 py-3 rounded-lg items-center justify-center"
              style={{
                backgroundColor: primaryColor,
                shadowColor: primaryColor,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 3,
                elevation: 3,
              }}
            >
              <Text className="text-white font-semibold text-base">
                {t('order.backToMenu', 'Xem thực đơn')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ paddingBottom: 120 }}
    >
      <View className="px-4 py-4">
        {/* Warning message */}
        <View className="mb-4 flex-row items-center gap-2 rounded-lg bg-gray-100 p-3">
          <CircleAlert size={16} color="#ef4444" />
          <Text className="flex-1 text-xs text-red-600">
            {t('order.selectTableNote')}
          </Text>
        </View>

        {/* Order type and table selection */}
        <View className="mb-4 flex-col gap-2">
          {/* <OrderTypeSelect /> */}
          <OrderTypeDropdown />
          {currentCartItems?.type !== OrderTypeEnum.DELIVERY && (
            <View className="flex-row items-center">
              <View className="flex-1">
                {currentCartItems?.type === OrderTypeEnum.TAKE_OUT ? (
                  <PickupTimeDropdown />
                ) : (
                  <TableDropdown />
                )}
              </View>
              <DeleteAllCartDialog />
            </View>
          )}
          {currentCartItems?.type === OrderTypeEnum.DELIVERY && (
            <View className="flex-row justify-end">
              <DeleteAllCartDialog />
            </View>
          )}
        </View>

        {currentCartItems?.type === OrderTypeEnum.DELIVERY && (
          <View className="mb-4">{/* <MapAddressSelector /> */}</View>
        )}

        {/* Cart items */}
        <View className="mb-4 flex-col gap-3">
          {currentCartItems?.orderItems.map((item) => (
            <View
              key={`${item.id}-${currentCartItems?.voucher?.slug || 'no-voucher'}`}
              className="rounded-lg border border-gray-200 bg-white p-3"
            >
              {/* Item header with image and name */}
              <View className="flex-row gap-3">
                {/* Product image */}
                <View className="h-20 w-20 overflow-hidden rounded-lg bg-gray-100">
                  {item?.image ? (
                    <Image
                      source={{ uri: publicFileURL + '/' + item?.image }}
                      className="h-full w-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <Image
                      source={Images.Food.ProductImage as unknown as number}
                      className="h-full w-full"
                      resizeMode="cover"
                    />
                  )}
                </View>

                {/* Product info */}
                <View className="flex-1 flex-col gap-2">
                  {/* Name and delete icon */}
                  <View className="flex-row items-start justify-between">
                    <Text
                      className="flex-1 pr-2 text-base font-bold text-gray-900"
                      numberOfLines={2}
                    >
                      {item.name}
                    </Text>
                    <DeleteCartItemDialog cartItem={item} />
                  </View>

                  {/* Variant select */}
                  {/* <ProductVariantSelect variant={item.allVariants} onChange={handleChangeVariant} /> */}
                  <ProductVariantDropdown
                    variant={item.allVariants}
                    onChange={handleChangeVariant}
                  />

                  {/* Price and quantity */}
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-1">
                      {(() => {
                        const displayItem = displayItems.find(
                          (di) => di.slug === item.slug,
                        )
                        const original = item.originalPrice || 0
                        const priceAfterPromotion =
                          displayItem?.priceAfterPromotion || 0
                        const finalPrice = displayItem?.finalPrice || 0

                        const isSamePriceVoucher =
                          currentCartItems?.voucher?.type ===
                            VOUCHER_TYPE.SAME_PRICE_PRODUCT &&
                          currentCartItems?.voucher?.voucherProducts?.some(
                            (vp) => vp.product?.slug === item.slug,
                          )

                        const isAtLeastOneVoucher =
                          currentCartItems?.voucher?.applicabilityRule ===
                            APPLICABILITY_RULE.AT_LEAST_ONE_REQUIRED &&
                          currentCartItems?.voucher?.voucherProducts?.some(
                            (vp) => vp.product?.slug === item.slug,
                          )

                        const hasVoucherDiscount =
                          (displayItem?.voucherDiscount ?? 0) > 0
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

                        const note = isSamePriceVoucher
                          ? '(**)'
                          : hasPromotionDiscount
                            ? '(*)'
                            : ''

                        return (
                          <>
                            {shouldShowLineThrough &&
                              original !== finalPrice && (
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
                            {note && (
                              <Text className="text-xs text-gray-500">
                                {note}
                              </Text>
                            )}
                          </>
                        )
                      })()}
                    </View>
                    <View className="w-24 flex-row items-center gap-1">
                      <QuantitySelector cartItem={item} />
                    </View>
                  </View>
                </View>
              </View>

              {/* Item note */}
              <View className="mt-3">
                <CartNoteInput cartItem={item} />
              </View>
            </View>
          ))}
        </View>
        {/* Order note */}
        <View className="mb-4">
          <OrderNoteInput order={currentCartItems} />
        </View>

        {/* Discount explanation box */}
        <View className="mb-3 rounded-lg bg-gray-100 p-3">
          <Text className="mb-2 text-xs font-bold text-gray-900">
            {t('order.voucher')}
          </Text>
          <View className="flex-col gap-1">
            <View className="flex-row items-center gap-1">
              <Text className="text-xs font-bold text-gray-900">*</Text>
              <Text className="text-xs text-gray-700">
                {t('order.promotionDiscount')}
              </Text>
            </View>
            <View className="flex-row items-center gap-1">
              <Text className="text-xs font-bold text-gray-900">**</Text>
              <Text className="text-xs text-gray-700">
                {t('order.itemLevelVoucher')}
              </Text>
            </View>
          </View>
        </View>

        {/* Voucher section */}
        <View className="mb-4">
          <Text className="mb-2 text-xs text-gray-600">
            {t('order.voucher')}
          </Text>
          {currentCartItems?.voucher ? (
            <Badge
              variant="outline"
              className="self-start px-2 py-1 text-xs"
              style={{
                borderColor: primaryColor,
                borderWidth: 1,
              }}
            >
              <Text style={{ color: primaryColor }}>
                {(() => {
                  const voucher = currentCartItems?.voucher
                  if (!voucher) return null

                  const { type, value, applicabilityRule: rule } = voucher

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
              </Text>
            </Badge>
          ) : (
            <TouchableOpacity className="flex-row items-center justify-between rounded-lg bg-orange-500 px-4 py-3">
              <Text className="text-sm font-semibold text-white">
                Sử dụng voucher
              </Text>
              <ChevronRight size={16} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        {/* Order summary */}
        <View className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
          <View className="flex-col gap-2">
            {/* Tổng giá gốc */}
            <View className="flex-row justify-between">
              <Text className="text-sm text-gray-700">
                {t('order.subtotalBeforeDiscount')}
              </Text>
              <Text className="text-sm text-gray-900">
                {formatCurrency(cartTotals.subTotalBeforeDiscount)}
              </Text>
            </View>

            {/* Giảm giá khuyến mãi */}
            {cartTotals.promotionDiscount > 0 && (
              <View className="flex-row justify-between">
                <Text className="text-sm italic text-gray-600">
                  {t('order.promotionDiscount')}
                </Text>
                <Text className="text-sm italic text-gray-600">
                  -{formatCurrency(cartTotals.promotionDiscount)}
                </Text>
              </View>
            )}

            {/* Tổng giảm giá voucher */}
            {cartTotals.voucherDiscount > 0 && (
              <View className="flex-col gap-1">
                <View className="flex-row justify-between">
                  <Text className="text-sm italic text-green-600">
                    {t('order.voucherDiscount')}
                  </Text>
                  <Text className="text-sm italic text-green-600">
                    -{formatCurrency(cartTotals.voucherDiscount)}
                  </Text>
                </View>
                <Text className="text-xs italic text-gray-500">
                  ({t('order.partialAppliedNote')})
                </Text>
              </View>
            )}

            {/* Delivery fee */}
            {currentCartItems?.type === OrderTypeEnum.DELIVERY && (
              <View className="flex-row justify-between">
                <Text className="text-sm text-gray-700">
                  {t('order.deliveryFee')}
                </Text>
                <Text className="text-sm text-gray-900">
                  {formatCurrency(deliveryFee.deliveryFee)}
                </Text>
              </View>
            )}

            {/* Total */}
            <View className="mt-2 flex-row items-center justify-between border-t border-gray-200 pt-2">
              <Text className="text-base font-semibold text-gray-900">
                {t('order.totalPayment')}
              </Text>
              <Text 
                className="text-2xl font-bold"
                style={{ color: primaryColor }}
              >
                {formatCurrency(
                  cartTotals.finalTotal + deliveryFee.deliveryFee,
                )}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Bottom action bar */}
      <View
        className="absolute bottom-0 left-0 right-0 border-t border-gray-200 bg-white shadow-lg"
        style={{ paddingBottom: 20 }}
      >
        <View className="flex-row items-center justify-between px-4 py-3">
          <View className="flex-1">
            <Text 
              className="text-xl font-bold"
              style={{ color: primaryColor }}
            >
              {formatCurrency(cartTotals.finalTotal + deliveryFee.deliveryFee)}
            </Text>
          </View>
          <View className="flex-1 items-end">
            {isMounted && (
              <CreateOrderDialog
                disabled={
                  !currentCartItems ||
                  (currentCartItems?.type === OrderTypeEnum.AT_TABLE &&
                    !currentCartItems?.table)
                }
              />
            )}
          </View>
        </View>
      </View>
    </ScrollView>
  )
}
