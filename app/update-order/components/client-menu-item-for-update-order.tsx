import { Plus } from 'lucide-react-native'
import moment from 'moment'
import React from 'react'
import { useTranslation } from 'react-i18next'
import type { ImageSourcePropType } from 'react-native'
import { Image, Pressable, Text, TouchableOpacity, View } from 'react-native'

import { Images } from '@/assets/images'
import { publicFileURL } from '@/constants'
import { useOrderFlowStore } from '@/stores'
import { IMenuItem, IOrderItem, IProduct } from '@/types'
import { formatCurrency, showToast } from '@/utils'

interface ClientMenuItemForUpdateOrderProps {
  item: IMenuItem
}

/**
 * Menu item cho Update Order - thêm món vào draft (addDraftItem).
 * Không switch OrderFlowStep, không init ordering.
 */
export default function ClientMenuItemForUpdateOrder({
  item,
}: ClientMenuItemForUpdateOrderProps) {
  const { t } = useTranslation('menu')
  const { t: tToast } = useTranslation('toast')
  const { addDraftItem, updatingData } = useOrderFlowStore()

  const getPriceRange = (variants: IProduct['variants']) => {
    if (!variants || variants.length === 0) return null
    const prices = variants.map((v) => v.price)
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    return { min: minPrice, max: maxPrice, isSinglePrice: minPrice === maxPrice }
  }

  const handleAddToDraft = () => {
    if (!updatingData || !item?.product?.variants?.length) return

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
      promotion: item?.promotion ?? null,
      promotionValue: item?.promotion?.value ?? 0,
      note: '',
    }

    try {
      addDraftItem(orderItem)
      showToast(tToast('toast.addSuccess', 'Đã thêm vào đơn hàng'))
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('❌ Error adding item to draft:', error)
    }
  }

  const currentStock = item.currentStock ?? 0
  const defaultStock = item.defaultStock ?? 0
  const hasStock = !item.isLocked && (currentStock > 0 || !item.product.isLimit)
  const priceRange = getPriceRange(item.product.variants)
  const hasPromotion = item.promotion && item.promotion.value > 0

  return (
    <View className="min-h-[10rem] flex-1 flex-col justify-between rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      {/* Image */}
      <Pressable className="flex-shrink-0 items-center justify-center p-2">
        <View
          className="relative h-28 w-full overflow-hidden rounded-t-xl bg-gray-100 dark:bg-gray-700"
          style={{ aspectRatio: 1 }}
        >
          <Image
            source={
              (item.product.image
                ? { uri: `${publicFileURL}/${item.product.image}` }
                : Images.Food.ProductImage) as ImageSourcePropType
            }
            className="h-full w-full rounded-t-xl"
            resizeMode="cover"
          />
          {hasPromotion && (
            <View className="absolute right-2 top-2 z-50 rounded-full bg-primary px-2 py-1">
              <Text className="text-xs font-bold text-white">
                -{item.promotion?.value}%
              </Text>
            </View>
          )}
        </View>
      </Pressable>

      {/* Content */}
      <View className="flex flex-1 flex-col justify-between gap-1.5 p-2">
        <View className="flex-col gap-1">
          <Text className="text-sm font-bold" numberOfLines={1}>
            {item.product.name}
          </Text>
          <Text className="text-xs text-gray-500" numberOfLines={2}>
            {item.product.description}
          </Text>
          <View className="flex-row items-center gap-1">
            {item.product.variants?.length > 0 ? (
              <View className="flex-col gap-1">
                {hasPromotion ? (
                  <View className="flex-col">
                    <Text className="text-sm font-bold text-primary">
                      {priceRange
                        ? formatCurrency(
                            priceRange.min * (1 - (item.promotion?.value || 0) / 100),
                          )
                        : formatCurrency(0)}
                    </Text>
                    <Text className="text-xs line-through text-gray-400">
                      {priceRange ? formatCurrency(priceRange.min) : formatCurrency(0)}
                    </Text>
                  </View>
                ) : (
                  <Text className="text-sm font-bold text-primary">
                    {priceRange ? formatCurrency(priceRange.min) : formatCurrency(0)}
                  </Text>
                )}
                {item.product.isLimit && (
                  <Text className="text-[0.7rem] text-gray-500">
                    {t('menu.amount')} {currentStock}/{defaultStock}
                  </Text>
                )}
              </View>
            ) : (
              <Text className="text-sm font-bold text-primary">
                {t('menu.contactForPrice')}
              </Text>
            )}
          </View>
        </View>

        {hasStock ? (
          <TouchableOpacity
            onPress={handleAddToDraft}
            className="flex items-center justify-center rounded-full bg-primary py-2"
          >
            <Plus size={18} color="#ffffff" />
          </TouchableOpacity>
        ) : (
          <View className="flex items-center justify-center rounded-full bg-red-500 py-2">
            <Text className="text-xs font-semibold text-white">
              {t('menu.outOfStock')}
            </Text>
          </View>
        )}
      </View>
    </View>
  )
}
