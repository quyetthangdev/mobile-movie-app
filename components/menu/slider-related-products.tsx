import dayjs from 'dayjs'
import { Image } from 'expo-image'
import type { TFunction } from 'i18next'
import React, { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dimensions,
  FlatList,
  Image as RNImage,
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

/** Ngày cố định trong session — thay useRef vì linter cấm đọc ref trong render */
const SESSION_DATE_STR = dayjs().format('YYYY-MM-DD')

interface SliderRelatedProductsProps {
  currentProduct: string
  catalog: string
}

const RelatedProductItem = React.memo(
  function RelatedProductItem({
    item,
    itemWidth,
    itemSpacing,
    onPress,
    onPressIn,
    t,
  }: {
    item: import('@/types').IMenuItem
    itemWidth: number
    itemSpacing: number
    onPress: (slug: string) => void
    onPressIn: (slug: string) => void
    t: TFunction<'menu'>
  }) {
    const imageUrl = useMemo(() => {
      const imagePath = item?.product.image?.trim()
      if (!imagePath) return null
      if (/^https?:\/\//i.test(imagePath)) return imagePath
      const base = publicFileURL ?? ''
      if (!base) return null
      return `${base.replace(/\/$/, '')}/${imagePath.replace(/^\//, '')}`
    }, [item.product.image])
    const hasProductImage = imageUrl != null
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
        className="min-h-[210px] w-full flex-col active:opacity-80"
        style={{ width: itemWidth, marginRight: itemSpacing }}
        {...({ unstable_pressDelay: 0 } as object)}
      >
        <View
          className="relative mb-2 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800"
          style={{ width: itemWidth, height: 120 }}
        >
          {hasProductImage ? (
            <Image
              source={{ uri: imageUrl }}
              style={{ width: itemWidth, height: 120, borderRadius: 12 }}
              contentFit="cover"
              placeholder={(Images.Food.DefaultProductImage as unknown as number)}
              placeholderContentFit="cover"
              cachePolicy="memory-disk"
              priority="low"
            />
          ) : (
            <RNImage
              source={Images.Food.DefaultProductImage as number}
              resizeMode="cover"
              style={{ width: '100%', height: '100%', borderRadius: 12 }}
            />
          )}
          {hasPromotion && (
            <View className="absolute right-2 top-2 rounded-md bg-red-500 px-2 py-1">
              <Text className="text-[11px] font-semibold uppercase tracking-wide text-white">
                {t('menu.discount', 'Giảm')} {item.promotion?.value}%
              </Text>
            </View>
          )}
        </View>
        <View
          className={`flex-1 flex-col pt-2 ${item.product.isLimit ? 'justify-between' : 'justify-start'} gap-1.5`}
        >
          <Text
            className="text-sm font-bold capitalize text-gray-900 dark:text-white"
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {item.product.name}
          </Text>
          {hasPromotion ? (
            <>
              <View className="flex-row items-center gap-2">
                <Text className="text-xs text-gray-400 line-through">
                  {priceRange
                    ? formatCurrency(priceRange.min)
                    : formatCurrency(0)}
                </Text>
                <Text className="text-base font-semibold text-primary dark:text-primary">
                  {priceRange
                    ? formatCurrency(
                        priceRange.min *
                          (1 - (item.promotion?.value || 0) / 100),
                      )
                    : formatCurrency(0)}
                </Text>
              </View>
              {item.product.isLimit && (
                <View className="self-start rounded-full bg-primary/10 px-3 py-1">
                  <Text className="text-[11px] font-medium text-primary dark:text-primary">
                    {t('menu.amount', 'Số lượng')} {item.currentStock}/
                    {item.defaultStock}
                  </Text>
                </View>
              )}
            </>
          ) : (
            <Text className="text-base font-semibold text-primary dark:text-primary">
              {priceRange
                ? formatCurrency(priceRange.min)
                : t('menu.contactForPrice', 'Liên hệ')}
            </Text>
          )}
        </View>
      </Pressable>
    )
  },
  (prev, next) => prev.item.slug === next.item.slug,
)

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
      date: SESSION_DATE_STR,
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

  const { itemWidth, itemSpacing, itemLength } = useMemo(() => {
    const w = Dimensions.get('window').width
    const width = w * 0.45
    const spacing = 12
    return {
      itemWidth: width,
      itemSpacing: spacing,
      itemLength: width + spacing,
    }
  }, [])

  const handleItemPress = useCallback((slug: string) => {
    navigateNative.push({
      pathname: ROUTE.CLIENT_PRODUCT_DETAIL,
      params: { id: slug },
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
        t={t}
      />
    ),
    [itemWidth, itemSpacing, handleItemPress, handlePressIn, t],
  )

  const getItemLayout = useCallback(
    (_: ArrayLike<IMenuItem> | null | undefined, index: number) => ({
      length: itemLength,
      offset: itemLength * index,
      index,
    }),
    [itemLength],
  )

  const renderSkeleton = useCallback(
    () => (
      <View
        className="min-h-[210px] w-full flex-col"
        style={{ width: itemWidth, marginRight: itemSpacing }}
      >
        <View
          className="mb-2 w-full rounded-xl bg-gray-200 dark:bg-gray-700"
          style={{ height: 120 }}
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
          <Text className="mb-4 text-lg font-bold text-gray-900 dark:text-white">
            {t('menu.relatedProducts', 'Sản phẩm liên quan')}
          </Text>
          <FlatList
            data={[...Array(6).keys()]}
            horizontal
            initialNumToRender={2}
            maxToRenderPerBatch={1}
            windowSize={3}
            removeClippedSubviews
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, index) => `skeleton-${index}`}
            renderItem={renderSkeleton}
            contentContainerStyle={{ paddingHorizontal: 4 }}
            getItemLayout={(_, index) => ({
              length: itemLength,
              offset: itemLength * index,
              index,
            })}
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
      <Text className="mb-4 text-lg font-bold text-gray-900 dark:text-white">
        {t('menu.relatedProducts', 'Sản phẩm liên quan')}
      </Text>
      <FlatList
        data={relatedProductsData}
        horizontal
        initialNumToRender={2}
        maxToRenderPerBatch={1}
        windowSize={3}
        removeClippedSubviews={true}
        getItemLayout={getItemLayout}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.slug}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 4 }}
      />
    </View>
  )
}
