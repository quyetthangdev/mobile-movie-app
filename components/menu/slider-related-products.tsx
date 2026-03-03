import { Image } from 'expo-image'
import moment from 'moment'
import React, { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dimensions,
  FlatList,
  ImageSourcePropType,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native'

import { Images } from '@/assets/images'
import { ROUTE, publicFileURL } from '@/constants'
import {
  usePressInPrefetchMenuItem,
  usePublicSpecificMenu,
  useSpecificMenu,
} from '@/hooks'
import { navigateNative, useGhostMount } from '@/lib/navigation'
import { useBranchStore, useUserStore } from '@/stores'
import { IMenuItem } from '@/types'
import { formatCurrency } from '@/utils'

interface SliderRelatedProductsProps {
  currentProduct: string
  catalog: string
}

const RelatedProductItem = React.memo(function RelatedProductItem({
  item,
  itemWidth,
  itemSpacing,
  onPress,
  onPressIn,
}: {
  item: import('@/types').IMenuItem
  itemWidth: number
  itemSpacing: number
  onPress: (slug: string) => void
  onPressIn: (slug: string) => void
}) {
  const { t } = useTranslation('menu')
  const imageProduct = item?.product.image
    ? `${publicFileURL}/${item.product.image}`
    : (Images.Food.ProductImage as unknown as number)
  const priceRange = useMemo(() => {
    const variants = item.product.variants
    if (!variants?.length) return null
    const prices = variants.map((v) => v.price)
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
      isSinglePrice: Math.min(...prices) === Math.max(...prices),
    }
  }, [item.product.variants])
  const hasPromotion = item.promotion && item.promotion.value > 0

  return (
    <Pressable
      onPressIn={() => onPressIn(item.slug)}
      onPress={() => onPress(item.slug)}
      className="min-h-[200px] w-full flex-col rounded-xl border border-gray-200 bg-white p-2 active:opacity-80 dark:border-gray-600 dark:bg-gray-700"
      style={{ width: itemWidth, marginRight: itemSpacing }}
      {...({ unstable_pressDelay: 0 } as object)}
    >
      <View
        className="relative mb-2 w-full overflow-hidden rounded-md"
        style={{ height: 112 }}
      >
        <Image
          source={
            typeof imageProduct === 'string'
              ? { uri: imageProduct }
              : (imageProduct as ImageSourcePropType)
          }
          className="h-full w-full"
          contentFit="cover"
          placeholder={Images.Food.ProductImage as unknown as number}
          placeholderContentFit="cover"
          cachePolicy="memory-disk"
        />
        {hasPromotion && (
          <View className="absolute right-2 top-2 rounded-full bg-yellow-500 px-2 py-1">
            <Text className="text-xs font-bold text-white">
              {t('menu.discount', 'Giảm')} {item.promotion?.value}%
            </Text>
          </View>
        )}
      </View>
      <View
        className={`flex-1 flex-col ${item.product.isLimit ? 'justify-between' : 'justify-start'} gap-1.5`}
      >
        <View className="h-fit">
          <Text
            className="text-sm font-bold text-gray-900 dark:text-white"
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {item.product.name}
          </Text>
        </View>
        {hasPromotion ? (
          <View className="flex-col gap-1">
            <View className="flex-row items-center gap-2">
              <Text className="text-sm text-gray-400 line-through">
                {priceRange
                  ? formatCurrency(priceRange.min)
                  : formatCurrency(0)}
              </Text>
              <Text className="text-sm font-bold text-red-600 dark:text-primary">
                {priceRange
                  ? formatCurrency(
                      priceRange.min * (1 - (item.promotion?.value || 0) / 100),
                    )
                  : formatCurrency(0)}
              </Text>
            </View>
            {item.product.isLimit && (
              <View className="self-start rounded-full bg-red-600 px-3 py-1 dark:bg-primary">
                <Text className="text-xs text-white">
                  {t('menu.amount', 'Số lượng')} {item.currentStock}/
                  {item.defaultStock}
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
})

export default function SliderRelatedProducts({
  currentProduct,
  catalog,
}: SliderRelatedProductsProps) {
  const { t } = useTranslation('menu')
  const prefetchMenuItem = usePressInPrefetchMenuItem()
  const { preload } = useGhostMount()
  const branchSlug = useBranchStore((s) => s.branch?.slug)
  const userSlug = useUserStore((s) => s.userInfo?.slug)

  const filters = useMemo(
    () => ({
      date: moment().format('YYYY-MM-DD'),
      branch: branchSlug,
      catalog,
      productName: '',
      minPrice: 0,
      maxPrice: 1000000,
    }),
    [branchSlug, catalog],
  )

  const hasUser = !!userSlug
  const hasBranch = !!filters.branch

  const { data: relatedProducts, isPending } = useSpecificMenu(
    filters,
    hasUser && hasBranch,
  )
  const { data: publicSpecificMenu, isPending: isPendingPublicSpecificMenu } =
    usePublicSpecificMenu(filters, !hasUser && hasBranch)

  const relatedProductsData = useMemo(() => {
    const items = hasUser
      ? relatedProducts?.result.menuItems
      : publicSpecificMenu?.result.menuItems
    return items?.filter((item) => item.slug !== currentProduct) ?? []
  }, [
    hasUser,
    relatedProducts?.result.menuItems,
    publicSpecificMenu?.result.menuItems,
    currentProduct,
  ])

  const isLoading = hasUser ? isPending : isPendingPublicSpecificMenu

  const screenWidth = Dimensions.get('window').width
  const itemWidth = screenWidth * 0.45 // 45% of screen width for mobile
  const itemSpacing = 12

  const handleItemPress = useCallback((slug: string) => {
    navigateNative.push({
      pathname: ROUTE.CLIENT_MENU_ITEM_DETAIL,
      params: { slug },
    })
  }, [])

  const handlePressIn = useCallback(
    (slug: string) => {
      prefetchMenuItem(slug)
      setTimeout(() => preload('menu-item', { slug }), 0)
    },
    [prefetchMenuItem, preload],
  )

  const renderItem = useCallback(
    ({ item }: { item: IMenuItem }) => (
      <RelatedProductItem
        item={item}
        itemWidth={itemWidth}
        itemSpacing={itemSpacing}
        onPress={handleItemPress}
        onPressIn={handlePressIn}
      />
    ),
    [itemWidth, itemSpacing, handleItemPress, handlePressIn],
  )

  const renderSkeleton = useCallback(
    () => (
      <View
        className="min-h-[200px] w-full flex-col rounded-xl bg-gray-100 p-2 dark:bg-gray-800"
        style={{ width: itemWidth, marginRight: itemSpacing }}
      >
        <View
          className="mb-2 w-full rounded-md bg-gray-200 dark:bg-gray-700"
          style={{ height: 112 }}
        />
        <View className="mb-2 h-4 rounded bg-gray-200 dark:bg-gray-700" />
        <View className="h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
      </View>
    ),
    [itemWidth, itemSpacing],
  )

  if (!relatedProductsData || relatedProductsData.length === 0) {
    if (isLoading) {
      return (
        <View className="mt-4 w-full px-4">
          <Text className="mb-4 text-lg font-bold text-red-600 dark:text-primary">
            {t('menu.relatedProducts', 'Sản phẩm liên quan')}
          </Text>
          <FlatList
            data={[...Array(6).keys()]}
            horizontal
            initialNumToRender={2}
            maxToRenderPerBatch={2}
            windowSize={3}
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
    <View
      className="mt-4 w-full px-4"
      {...(Platform.OS === 'android' && {
        renderToHardwareTextureAndroid: true,
      })}
    >
      <Text className="mb-4 text-lg font-bold text-red-600 dark:text-primary">
        {t('menu.relatedProducts', 'Sản phẩm liên quan')}
      </Text>
      <FlatList
        data={relatedProductsData}
        horizontal
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        windowSize={3}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.slug}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 4 }}
      />
    </View>
  )
}
