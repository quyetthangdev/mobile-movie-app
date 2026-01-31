import { useRouter } from 'expo-router'
import moment from 'moment'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dimensions,
  FlatList,
  Image,
  ImageSourcePropType,
  Pressable,
  Text,
  View
} from 'react-native'

import { Images } from '@/assets/images'
import { ROUTE, publicFileURL } from '@/constants'
import { usePublicSpecificMenu, useSpecificMenu } from '@/hooks'
import { useBranchStore, useUserStore } from '@/stores'
import { IMenuItem, IProduct } from '@/types'
import { formatCurrency } from '@/utils'

interface SliderRelatedProductsProps {
  currentProduct: string
  catalog: string
}

export default function SliderRelatedProducts({
  currentProduct,
  catalog,
}: SliderRelatedProductsProps) {
  const { t } = useTranslation('menu')
  const router = useRouter()
  const { branch } = useBranchStore()
  const { userInfo } = useUserStore()

  const [filters] = useState({
    date: moment().format('YYYY-MM-DD'),
    branch: branch?.slug,
    catalog: catalog,
    productName: '',
    minPrice: 0,
    maxPrice: 1000000,
  })

  const hasUser = !!userInfo?.slug
  const hasBranch = !!filters.branch

  const { data: relatedProducts, isPending } = useSpecificMenu(filters, hasUser && hasBranch)
  const { data: publicSpecificMenu, isPending: isPendingPublicSpecificMenu } =
    usePublicSpecificMenu(filters, !hasUser && hasBranch)

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

  const relatedProductsData =
    hasUser
      ? relatedProducts?.result.menuItems.filter((item) => item.slug !== currentProduct)
      : publicSpecificMenu?.result.menuItems.filter((item) => item.slug !== currentProduct)

  const isLoading = hasUser ? isPending : isPendingPublicSpecificMenu

  const screenWidth = Dimensions.get('window').width
  const itemWidth = screenWidth * 0.45 // 45% of screen width for mobile
  const itemSpacing = 12

  const handleItemPress = (slug: string) => {
    router.push({
      pathname: ROUTE.CLIENT_MENU_ITEM_DETAIL,
      params: { slug },
    })
  }

  const renderItem = ({ item }: { item: IMenuItem }) => {
    const imageProduct = item?.product.image
      ? `${publicFileURL}/${item.product.image}`
      : (Images.Food.ProductImage as unknown as number)

    const priceRange = getPriceRange(item.product.variants)
    const hasPromotion = item.promotion && item.promotion.value > 0

    return (
      <Pressable
        onPress={() => handleItemPress(item.slug)}
        className="flex-col w-full min-h-[200px] p-2 bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 active:opacity-80"
        style={{ width: itemWidth, marginRight: itemSpacing }}
      >
        {/* Image */}
        <View className="relative w-full rounded-md overflow-hidden mb-2" style={{ height: 112 }}>
          <Image
            source={
              typeof imageProduct === 'string'
                ? { uri: imageProduct }
                : (imageProduct as ImageSourcePropType)
            }
            className="w-full h-full"
            resizeMode="cover"
          />
          {/* Promotion Badge */}
          {hasPromotion && (
            <View className="absolute top-2 right-2 px-2 py-1 rounded-full bg-yellow-500">
              <Text className="text-xs font-bold text-white">
                {t('menu.discount', 'Giảm')} {item.promotion?.value}%
              </Text>
            </View>
          )}
        </View>

        {/* Content */}
        <View
          className={`flex-1 flex-col ${item.product.isLimit ? 'justify-between' : 'justify-start'} gap-1.5`}
        >
          {/* Product Name */}
          <View className="h-fit">
            <Text
              className="text-sm font-bold text-gray-900 dark:text-white"
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {item.product.name}
            </Text>
          </View>

          {/* Price */}
          {hasPromotion ? (
            <View className="flex-col gap-1">
              <View className="flex-row gap-2 items-center">
                <Text className="text-sm line-through text-gray-400">
                  {priceRange
                    ? formatCurrency(priceRange.min)
                    : formatCurrency(0)}
                </Text>
                <Text className="text-sm font-bold text-red-600 dark:text-primary">
                  {priceRange
                    ? formatCurrency(priceRange.min * (1 - (item.promotion?.value || 0) / 100))
                    : formatCurrency(0)}
                </Text>
              </View>
              {item.product.isLimit && (
                <View className="px-3 py-1 rounded-full bg-red-600 dark:bg-primary self-start">
                  <Text className="text-xs text-white">
                    {t('menu.amount', 'Số lượng')} {item.currentStock}/{item.defaultStock}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <Text className="text-sm font-bold text-red-600 dark:text-primary">
              {priceRange
                ? formatCurrency(priceRange.min)
                : t('menu.contactForPrice', 'Liên hệ')}
            </Text>
          )}
        </View>
      </Pressable>
    )
  }

  const renderSkeleton = () => (
    <View
      className="flex-col w-full min-h-[200px] p-2 bg-gray-100 dark:bg-gray-800 rounded-xl"
      style={{ width: itemWidth, marginRight: itemSpacing }}
    >
      <View className="w-full rounded-md bg-gray-200 dark:bg-gray-700 mb-2" style={{ height: 112 }} />
      <View className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
      <View className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
    </View>
  )

  if (!relatedProductsData || relatedProductsData.length === 0) {
    if (isLoading) {
      return (
        <View className="w-full mt-4 px-4">
          <Text className="text-lg font-bold text-red-600 dark:text-primary mb-4">
            {t('menu.relatedProducts', 'Sản phẩm liên quan')}
          </Text>
          <FlatList
            data={[...Array(6).keys()]}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, index) => `skeleton-${index}`}
            renderItem={renderSkeleton}
            contentContainerStyle={{ paddingHorizontal: 4 }}
          />
        </View>
      )
    }
    return null
  }

  return (
    <View className="w-full mt-4 px-4">
      <Text className="text-lg font-bold text-red-600 dark:text-primary mb-4">
        {t('menu.relatedProducts', 'Sản phẩm liên quan')}
      </Text>
      <FlatList
        data={relatedProductsData}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.slug}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 4 }}
      />
    </View>
  )
}
