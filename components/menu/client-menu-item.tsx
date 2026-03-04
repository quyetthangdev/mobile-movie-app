import React from 'react'
import { useTranslation } from 'react-i18next'
import type { ImageSourcePropType } from 'react-native'
import { Text, View } from 'react-native'
import { Image } from 'expo-image'

import Animated from 'react-native-reanimated'

import { Images } from '@/assets/images'
import { publicFileURL, ROUTE } from '@/constants'
import { NativeGesturePressable } from '@/components/navigation'
import { useGhostMount } from '@/lib/navigation'
import { useIsMobile, usePressInPrefetchMenuItem } from '@/hooks'
import { IMenuItem, IProduct } from '@/types'
import { formatCurrency } from '@/utils'

import { MenuItemQuantityControl } from './menu-item-quantity-control'

interface IClientMenuItemProps {
  item: IMenuItem
}

function getMinPrice(variants: IProduct['variants']): number | null {
  if (!variants?.length) return null
  return Math.min(...variants.map((v) => v.price))
}

function clientMenuItemAreEqual(
  prev: Readonly<IClientMenuItemProps>,
  next: Readonly<IClientMenuItemProps>,
): boolean {
  const a = prev.item
  const b = next.item
  return (
    a.slug === b.slug &&
    a.product?.slug === b.product?.slug &&
    a.currentStock === b.currentStock &&
    a.defaultStock === b.defaultStock &&
    a.isLocked === b.isLocked &&
    a.promotion?.value === b.promotion?.value &&
    getMinPrice(a.product?.variants) === getMinPrice(b.product?.variants)
  )
}

/**
 * ClientMenuItem — Chỉ chứa hình ảnh, tên, giá (tĩnh).
 * Không subscribe store. MenuItemQuantityControl xử lý quantity + Add to cart.
 */
export const ClientMenuItem = React.memo(function ClientMenuItem({ item }: IClientMenuItemProps) {
  const { t } = useTranslation('menu')
  const prefetchMenuItem = usePressInPrefetchMenuItem()
  const { preload } = useGhostMount()
  const isMobile = useIsMobile()

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

  const currentStock = item.currentStock ?? 0
  const defaultStock = item.defaultStock ?? 0
  const hasStock = !item.isLocked && (currentStock > 0 || !item.product.isLimit)
  const priceRange = getPriceRange(item.product.variants)
  const hasPromotion = item.promotion && item.promotion.value > 0

  return (
    <View className="flex-row sm:flex-col justify-between bg-white border border-gray-200 dark:border-gray-700 rounded-xl min-h-[2rem] dark:bg-gray-800 overflow-hidden">
      {/* Image */}
      <NativeGesturePressable
        navigation={{
          type: 'push',
          href: { pathname: ROUTE.CLIENT_MENU_ITEM_DETAIL, params: { slug: item.slug } },
        }}
        onPressIn={() => {
          prefetchMenuItem(item.slug)
          // Pre-warm Image Cache: prefetch ngay khi chạm xuống — vài chục ms đủ để decode trước khi Detail mở
          if (item.product.image) {
            const urls = new Set<string>([`${publicFileURL}/${item.product.image}`])
            item.product.images?.forEach((img) => urls.add(`${publicFileURL}/${img}`))
            Image.prefetch([...urls]).catch(() => {})
          }
          setTimeout(() => preload('menu-item', { slug: item.slug }), 0)
        }}
        className={`flex-shrink-0 justify-center items-center ${
          isMobile ? 'w-32 h-32 p-2' : 'w-full aspect-square p-0'
        }`}
      >
        <Animated.View
          {...({ sharedTransitionTag: `menu-item-${item.slug}` } as object)}
          className="relative w-full h-full overflow-hidden bg-gray-100 dark:bg-gray-700 rounded-xl"
          style={{ aspectRatio: 1 }}
        >
          <Image
            source={
              item.product.image
                ? { uri: `${publicFileURL}/${item.product.image}` }
                : (Images.Food.ProductImage as ImageSourcePropType)
            }
            className="w-full h-full rounded-xl"
            contentFit="contain"
            style={{ backgroundColor: 'transparent' }}
          />
          {item.product.isLimit && !isMobile && (
            <View className="absolute bottom-3 left-3 z-50 px-3 py-1 rounded-full bg-primary">
              <Text className="text-xs text-white">
                {t('menu.amount', 'Số lượng')} {currentStock}/{defaultStock}
              </Text>
            </View>
          )}
          {hasPromotion && (
            <View className="absolute top-2 right-2 z-50 px-2 py-1 rounded-full bg-primary">
              <Text className="text-xs font-bold text-white">
                -{item.promotion.value}%
              </Text>
            </View>
          )}
        </Animated.View>
      </NativeGesturePressable>

      {/* Content */}
      <View className="flex-1 flex-col justify-between px-2 py-3">
        {isMobile ? (
          <View className="flex-col gap-2 items-start">
            <Text className="flex-1 text-lg font-bold py-1" numberOfLines={1}>
              {item.product.name}
            </Text>
            {item.product.isLimit && (
              <View className="px-2 py-1 rounded-full bg-primary">
                <Text className="text-xs text-white whitespace-nowrap">
                  {t('menu.amount', 'Số lượng')} {currentStock}/{defaultStock}
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View className="h-auto sm:h-fit py-1">
            <Text className="text-base text-lg font-bold" numberOfLines={1}>
              {item.product.name}
            </Text>
          </View>
        )}

        {/* Mobile: Price and Button */}
        {isMobile ? (
          <View className="flex-row justify-between items-center mt-2">
            {hasStock && (
              <View className="flex-1 py-1">
                {item.product.variants.length > 0 ? (
                  hasPromotion ? (
                    <View className="flex-col">
                      <Text className="text-xs line-through text-gray-500 dark:text-gray-400">
                        {priceRange ? formatCurrency(priceRange.min) : formatCurrency(0)}
                      </Text>
                      <Text className="text-sm font-bold text-primary">
                        {priceRange
                          ? formatCurrency(
                              priceRange.min * (1 - (item.promotion?.value || 0) / 100),
                            )
                          : formatCurrency(0)}
                      </Text>
                    </View>
                  ) : (
                    <Text className="text-sm font-bold text-primary">
                      {priceRange ? formatCurrency(priceRange.min) : formatCurrency(0)}
                    </Text>
                  )
                ) : (
                  <Text className="text-sm font-bold text-primary">
                    {t('menu.contactForPrice', 'Liên hệ')}
                  </Text>
                )}
              </View>
            )}
            <View>
              <MenuItemQuantityControl item={item} hasStock={hasStock} isMobile={true} />
            </View>
          </View>
        ) : (
          item.product.variants.length > 0 ? (
            <View className="flex-col gap-1 py-1">
              <View className="flex-col">
                {hasPromotion ? (
                  <View className="flex-row gap-2 items-center">
                    <Text className="text-xs sm:text-sm line-through text-gray-500 dark:text-gray-400">
                      {priceRange ? formatCurrency(priceRange.min) : formatCurrency(0)}
                    </Text>
                    <Text className="text-sm font-bold sm:text-lg text-primary">
                      {priceRange
                        ? formatCurrency(
                            priceRange.min * (1 - (item.promotion?.value || 0) / 100),
                          )
                        : formatCurrency(0)}
                    </Text>
                  </View>
                ) : (
                  <Text className="text-sm font-bold sm:text-lg text-primary">
                    {priceRange ? formatCurrency(priceRange.min) : formatCurrency(0)}
                  </Text>
                )}
              </View>
            </View>
          ) : (
            <Text className="text-sm font-bold text-primary py-1">
              {t('menu.contactForPrice', 'Liên hệ')}
            </Text>
          )
        )}
      </View>

      {/* Desktop: Add to Cart / Quantity */}
      {!isMobile && (
        <View className="flex justify-end items-end p-2 sm:w-full">
          <MenuItemQuantityControl item={item} hasStock={hasStock} isMobile={false} />
        </View>
      )}
    </View>
  )
}, clientMenuItemAreEqual)
