import { useRouter } from 'expo-router'
import { Plus } from 'lucide-react-native'
import moment from 'moment'
import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { ImageSourcePropType } from 'react-native'
import { Image, Pressable, Text, TouchableOpacity, View } from 'react-native'

import { Images } from '@/assets/images'
import { OrderFlowStep, publicFileURL, ROUTE } from '@/constants'
import { useIsMobile } from '@/hooks'
import { useOrderFlowStore, useUserStore } from '@/stores'
import { IMenuItem, IOrderItem, IProduct } from '@/types'
import { formatCurrency, showToast } from '@/utils'

interface IClientMenuItemProps {
  item: IMenuItem
}

/**
 * ClientMenuItem Component
 * 
 * Displays a menu item with image, name, price, and add to cart button.
 * Supports mobile and desktop layouts.
 * 
 * @example
 * ```tsx
 * <ClientMenuItem item={menuItem} onAddToCart={handleAddToCart} />
 * ```
 */
export function ClientMenuItem({ item }: IClientMenuItemProps) {
  const { t } = useTranslation('menu')
  const { t: tToast } = useTranslation('toast')
  const router = useRouter()
  const isMobile = useIsMobile()
  const { userInfo } = useUserStore()

  // Using Order Flow Store
  const {
    currentStep,
    isHydrated,
    orderingData,
    initializeOrdering,
    addOrderingItem,
    setCurrentStep,
  } = useOrderFlowStore()

  const getPriceRange = (variants: IProduct['variants']) => {
    if (!variants || variants.length === 0) return null
    const prices = variants.map((v) => v.price)
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    return {
      min: minPrice,
      max: maxPrice,
      isSinglePrice: minPrice === maxPrice,
    }
  }

  // Ensure we are in ORDERING phase when component mounts
  useEffect(() => {
    if (isHydrated) {
      // Switch to ORDERING phase if we are not in it
      if (currentStep !== OrderFlowStep.ORDERING) {
        setCurrentStep(OrderFlowStep.ORDERING)
      }

      // Initialize ordering data if it doesn't exist
      if (!orderingData) {
        initializeOrdering()
        return
      }

      // Only re-initialize if user is logged in but orderingData doesn't have an owner
      if (userInfo?.slug && !orderingData.owner?.trim()) {
        initializeOrdering()
      }
    }
  }, [isHydrated, currentStep, orderingData, userInfo?.slug, setCurrentStep, initializeOrdering])

  const handleAddToCart = () => {
    if (!item?.product?.variants || item?.product?.variants.length === 0 || !isHydrated) {
      return
    }

    // Step 2: Ensure ORDERING phase
    if (currentStep !== OrderFlowStep.ORDERING) {
      setCurrentStep(OrderFlowStep.ORDERING)
    }

    // Initialize ordering data if it doesn't exist
    if (!orderingData) {
      initializeOrdering()
      return
    }

    // Only re-initialize if user is logged in but orderingData doesn't have an owner
    if (userInfo?.slug && !orderingData.owner?.trim()) {
      initializeOrdering()
    }

    // Step 3: Create order item with proper structure
    const orderItem: IOrderItem = {
      id: `item_${moment().valueOf()}_${Math.random().toString(36).substr(2, 9)}`,
      slug: item?.product?.slug,
      image: item?.product?.image,
      name: item?.product?.name,
      quantity: 1,
      size: item?.product?.variants[0]?.size?.name,
      allVariants: item?.product?.variants,
      variant: item?.product?.variants[0],
      originalPrice: item?.product?.variants[0]?.price,
      productSlug: item?.product?.slug,
      description: item?.product?.description,
      isLimit: item?.product?.isLimit,
      isGift: item?.product?.isGift,
      promotion: item?.promotion ? item?.promotion : null,
      promotionValue: item?.promotion ? item?.promotion?.value : 0,
      note: '',
    }

    try {
      // Step 4: Add to ordering data
      addOrderingItem(orderItem)

      // Step 5: Success feedback with tamagui toast
      const message = tToast('toast.addSuccess', 'Đã thêm vào giỏ hàng')
      showToast(message, 'Thông báo')
    } catch (error) {
      // Step 7: Error handling
      // eslint-disable-next-line no-console
      console.error('❌ Error adding item to cart:', error)
    }
  }

  const handleItemPress = () => {
    // Navigate to menu item detail page
    router.push({
      pathname: ROUTE.CLIENT_MENU_ITEM_DETAIL,
      params: { slug: item.slug },
    })
  }

  // Handle null values for currentStock and defaultStock from API
  const currentStock = item.currentStock ?? 0
  const defaultStock = item.defaultStock ?? 0
  const hasStock = !item.isLocked && (currentStock > 0 || !item.product.isLimit)
  const priceRange = getPriceRange(item.product.variants)
  const hasPromotion = item.promotion && item.promotion.value > 0

  return (
    <View className="flex-row sm:flex-col justify-between bg-white border border-gray-200 dark:border-gray-700 rounded-xl min-h-[2rem] dark:bg-gray-800">
      {/* Image - Square with rounded corners */}
      <Pressable
        onPress={handleItemPress}
        className={`flex-shrink-0 justify-center items-center ${
          isMobile ? 'w-32 h-32 p-2' : 'w-full aspect-square p-0'
        }`}
      >
        <View
          className="relative w-full h-full rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700"
          style={{ aspectRatio: 1 }}
        >
          <Image
            source={
              (item.product.image
                ? { uri: `${publicFileURL}/${item.product.image}` }
                : Images.Food.ProductImage) as ImageSourcePropType
            }
            className="w-full h-full"
            resizeMode="contain"
            style={{ backgroundColor: 'transparent' }}
          />
          {/* Stock badge - Desktop only */}
          {item.product.isLimit && !isMobile && (
            <View className="absolute bottom-3 left-3 z-50 px-3 py-1 rounded-full bg-red-600">
              <Text className="text-xs text-white">
                {t('menu.amount', 'Số lượng')} {currentStock}/{defaultStock}
              </Text>
            </View>
          )}
          {/* Promotion badge */}
          {hasPromotion && (
            <View className="absolute top-2 right-2 z-50 px-2 py-1 rounded-full bg-yellow-500">
              <Text className="text-xs font-bold text-white">
                -{item.promotion.value}%
              </Text>
            </View>
          )}
        </View>
      </Pressable>

      {/* Content */}
      <View className="flex-1 flex-col justify-between p-2">
        {/* Mobile: Name and Stock on same row */}
        {isMobile ? (
          <View className="flex-col gap-2 items-start">
            <Text className="flex-1 text-base font-bold" numberOfLines={1}>
              {item.product.name}
            </Text>
            {/* Stock */}
            {item.product.isLimit && (
              <View className="px-2 py-1 rounded-full bg-red-600">
                <Text className="text-xs text-white whitespace-nowrap">
                  {t('menu.amount', 'Số lượng')} {currentStock}/{defaultStock}
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View className="h-auto sm:h-fit">
            <Text className="text-base sm:text-lg font-bold" numberOfLines={1}>
              {item.product.name}
            </Text>
          </View>
        )}

        {/* Mobile: Price and Button on same row */}
        {isMobile ? (
          <View className="flex-row justify-between items-center mt-2">
            {/* Only show price if not out of stock */}
            {hasStock && (
              <View className="flex-1">
                {item.product.variants.length > 0 ? (
                  hasPromotion ? (
                    <View className="flex-col">
                      <Text className="text-xs line-through text-gray-500 dark:text-gray-400">
                        {priceRange ? formatCurrency(priceRange.min) : formatCurrency(0)}
                      </Text>
                      <Text className="text-sm font-bold text-red-600 dark:text-primary">
                        {priceRange
                          ? formatCurrency(priceRange.min * (1 - (item.promotion?.value || 0) / 100))
                          : formatCurrency(0)}
                      </Text>
                    </View>
                  ) : (
                    <Text className="text-sm font-bold text-red-600 dark:text-primary">
                      {priceRange ? formatCurrency(priceRange.min) : formatCurrency(0)}
                    </Text>
                  )
                ) : (
                  <Text className="text-sm font-bold text-red-600 dark:text-primary">
                    {t('menu.contactForPrice', 'Liên hệ')}
                  </Text>
                )}
              </View>
            )}
            {/* Button */}
            <View>
              {hasStock ? (
                <TouchableOpacity
                  onPress={handleAddToCart}
                  className="w-8 h-8 rounded-full bg-red-600 dark:bg-primary items-center justify-center z-50"
                >
                  <Plus size={20} color="#ffffff" />
                </TouchableOpacity>
              ) : (
                <View className="px-4 py-1 rounded-full bg-red-500">
                  <Text className="text-xs font-semibold text-white">
                    {t('menu.outOfStock', 'Hết hàng')}
                  </Text>
                </View>
              )}
            </View>
          </View>
        ) : (
          /* Desktop layout */
          item.product.variants.length > 0 ? (
            <View className="flex-col gap-1">
              {/* Prices */}
              <View className="flex-col">
                {hasPromotion ? (
                  <View className="flex-row gap-2 items-center">
                    <Text className="text-xs sm:text-sm line-through text-gray-500 dark:text-gray-400">
                      {priceRange ? formatCurrency(priceRange.min) : formatCurrency(0)}
                    </Text>
                    <Text className="text-sm font-bold sm:text-lg text-red-600 dark:text-primary">
                      {priceRange
                        ? formatCurrency(priceRange.min * (1 - (item.promotion?.value || 0) / 100))
                        : formatCurrency(0)}
                    </Text>
                  </View>
                ) : (
                  <Text className="text-sm font-bold sm:text-lg text-red-600 dark:text-primary">
                    {priceRange ? formatCurrency(priceRange.min) : formatCurrency(0)}
                  </Text>
                )}
              </View>
            </View>
          ) : (
            <Text className="text-sm font-bold text-red-600 dark:text-primary">
              {t('menu.contactForPrice', 'Liên hệ')}
            </Text>
          )
        )}
      </View>

      {/* Add to Cart / Out of Stock - Desktop only */}
      {!isMobile && (
        <View className="flex justify-end items-end p-2 sm:w-full">
          {hasStock ? (
            <TouchableOpacity
              onPress={handleAddToCart}
              className="w-full px-3 py-2 rounded-full bg-red-600 dark:bg-primary items-center justify-center"
            >
              <Plus size={20} color="#ffffff" />
            </TouchableOpacity>
          ) : (
            <View className="w-full px-3 py-2 rounded-full bg-red-500">
              <Text className="text-xs font-semibold text-white text-center">
                {t('menu.outOfStock', 'Hết hàng')}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  )
}

