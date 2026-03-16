/**
 * Product Detail — Ngoài tab tree, push trên Root Stack.
 * Flow: Menu → tap → router.push('/product/[id]') → slide_from_right → Product Detail.
 */
import { ScreenContainer } from '@/components/layout'
import dayjs from 'dayjs'
import { Image } from 'expo-image'
import { useFocusEffect } from '@react-navigation/native'
import { useLocalSearchParams, useNavigation } from 'expo-router'
import { ChevronLeft, ShoppingBag } from 'lucide-react-native'
import React, { useCallback, useEffect, useMemo, useState } from 'react'

import { useTranslation } from 'react-i18next'
import {
  InteractionManager,
  Platform,
  Pressable,
  RefreshControl,
  Image as RNImage,
  Text,
  useColorScheme,
  useWindowDimensions,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Images } from '@/assets/images'
import NonPropQuantitySelector from '@/components/button/non-prop-quantity-selector'
import { PriceTag, SliderRelatedProducts } from '@/components/menu'
import { NavigatePressable } from '@/components/navigation'
import {
  ProductDetailHeader,
  ProductDetailHeaderSimple,
} from '@/components/product/product-detail-header'
import { Button, StaticText } from '@/components/ui'
import { OrderFlowStep, colors, publicFileURL } from '@/constants'
import { TAB_ROUTES } from '@/constants/navigation.config'
import { MENU_ITEM_DETAIL_LAYOUT } from '@/constants/menu-item-detail-layout'
import { useSpecificMenuItem } from '@/hooks'
import {
  HIT_SLOP_ICON,
  navigateNative,
  setFromProductDetail,
} from '@/lib/navigation'
import { useSharedElementDest } from '@/lib/shared-element'
import { useUserStore } from '@/stores'
import { useOrderFlowMenuItemDetail } from '@/stores/selectors'
import { IOrderItem, IProductVariant } from '@/types'
import { formatCurrency, showToast } from '@/utils'
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated'
import Carousel, { CarouselRenderItem } from 'react-native-reanimated-carousel'
import { cn } from '@/utils/cn'

const ProductDetailContent = React.memo(function ProductDetailContent() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const slug = id ?? ''
  const insets = useSafeAreaInsets()
  const { t } = useTranslation('product')
  const { t: tMenu } = useTranslation('menu')
  const { t: tToast } = useTranslation('toast')
  const userSlug = useUserStore((s) => s.userInfo?.slug)
  const isDark = useColorScheme() === 'dark'

  const labels = useMemo(
    () => ({
      totalPrice: t('product.totalPrice', 'Tổng giá'),
      noDescription: t('product.noDescription', 'Không có mô tả'),
      productDetail: t('product.detail', 'Chi tiết món'),
      productDescription: t('product.description', 'Mô tả món'),
      chooseSizeToViewPrice: t(
        'product.chooseSizeToViewPrice',
        'Chọn size để xem giá',
      ),
      discount: t('product.discount', 'Giảm'),
      specialOffer: t('product.specialOffer', 'Ưu đãi đặc biệt'),
      selectSize: t('product.selectSize', 'Kích thước'),
      selectQuantity: t('product.selectQuantity', 'Số lượng'),
      inStock: t('product.inStock', 'còn hàng'),
      addSuccess: tToast('toast.addSuccess', 'Đã thêm vào giỏ hàng'),
      outOfStock: tMenu('menu.outOfStock', 'Hết hàng'),
      buyNow: tMenu('menu.buyNow', 'Mua ngay'),
      addToCart: tMenu('menu.addToCart', 'Thêm vào giỏ'),
    }),
    [t, tMenu, tToast],
  )

  const {
    isHydrated,
    currentStep,
    orderingData,
    initializeOrdering,
    setCurrentStep,
    addOrderingItem,
  } = useOrderFlowMenuItemDetail()

  const { width: screenWidth } = useWindowDimensions()
  // Query chạy ngay khi screen mount (cache-first, không block animation)
  const {
    data: product,
    isLoading,
    refetch,
    isRefetching,
  } = useSpecificMenuItem(slug, true)
  const [heavyReady, setHeavyReady] = useState(false)
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    const task = InteractionManager.runAfterInteractions(() => {
      timeoutId = setTimeout(() => setHeavyReady(true), 100)
    })
    return () => {
      task.cancel()
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [])

  const productDetail = product?.result

  const imageContainerStyle = useMemo(
    () => ({
      width: screenWidth,
      height: MENU_ITEM_DETAIL_LAYOUT.imageContainerSize(screenWidth),
    }),
    [screenWidth],
  )

  const [sliderVisible, setSliderVisible] = useState(false)
  const [isFocused, setIsFocused] = useState(true)
  const [navigatingToCart, setNavigatingToCart] = useState(false)
  const SLIDER_DEFER_MS = 800

  const handleNavigateToCart = useCallback(() => {
    setNavigatingToCart(true)
    setFromProductDetail(true)
    // Tách unmount (frame 1) và navigation (frame 2) — tránh burst JS thread
    requestAnimationFrame(() => {
      navigateNative.replace(TAB_ROUTES.CART)
    })
  }, [])

  // #5 Giải phóng RAM khi unmount — Carousel + SliderRelatedProducts có nhiều ảnh
  useEffect(() => {
    return () => {
      Image.clearMemoryCache()
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true)
      return () => setIsFocused(false)
    }, []),
  )

  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isFavorite, setIsFavorite] = useState(false)

  useEffect(() => {
    const id = setTimeout(() => setSliderVisible(true), SLIDER_DEFER_MS)
    return () => clearTimeout(id)
  }, [])

  const headerFadeDistance =
    MENU_ITEM_DETAIL_LAYOUT.imageContainerSize(screenWidth)

  const headerFade = useSharedValue(0)

  const handleScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      'worklet'
      const y = event.contentOffset.y
      // Chỉ cập nhật shared value — KHÔNG gọi setState trong worklet (gây Bridge Traffic / JS spike)
      const p = Math.max(0, Math.min(1, y / headerFadeDistance))
      headerFade.value = p
    },
  })

  const initialVariant = useMemo(() => {
    if (
      productDetail?.product.variants &&
      productDetail.product.variants.length > 0
    ) {
      return productDetail.product.variants.reduce((prev, curr) =>
        prev.price < curr.price ? prev : curr,
      )
    }
    return null
  }, [productDetail])

  const [size, setSize] = useState<string | null>(null)
  const [price, setPrice] = useState<number | null>(null)
  const [note, setNote] = useState<string>('')
  const [quantity, setQuantity] = useState<number>(1)
  const [selectedVariant, setSelectedVariant] =
    useState<IProductVariant | null>(null)

  const productImages = useMemo(
    () =>
      productDetail
        ? [productDetail.product.image, ...(productDetail.product.images || [])]
        : [],
    [productDetail],
  )

  const heroRenderItem: CarouselRenderItem<string | null> = useCallback(
    ({ item }) => {
      const imageKey = item?.trim()
      const hasUri = imageKey && publicFileURL
      if (hasUri) {
        return (
          <Image
            source={{
              uri: `${publicFileURL!.replace(/\/$/, '')}/${imageKey.replace(/^\//, '')}`,
            }}
            contentFit="cover"
            cachePolicy="memory-disk"
            priority="high"
            style={{ width: '100%', height: '100%' }}
          />
        )
      }
      return (
        <RNImage
          source={Images.Food.DefaultProductImage as number}
          resizeMode="cover"
          style={{ width: '100%', height: '100%' }}
        />
      )
    },
    [],
  )

  const {
    animatedRef: heroRef,
    onLayout: onHeroLayout,
    contentStyle: sharedContentStyle,
  } = useSharedElementDest()

  const derivedState = useMemo(() => {
    if (!productDetail) return null
    const hasPromo =
      productDetail.promotion && productDetail.promotion.value > 0
    const outOfStock =
      productDetail.isLocked || productDetail.currentStock === 0
    return {
      hasPromotion: !!hasPromo,
      finalPrice:
        price && hasPromo
          ? price - (price * productDetail.promotion.value) / 100
          : price,
      isOutOfStock: outOfStock,
      isDisabled: !size || quantity <= 0 || outOfStock,
    }
  }, [productDetail, price, size, quantity])

  useEffect(() => {
    if (!initialVariant || selectedVariant) return
    requestAnimationFrame(() => {
      setSelectedVariant(initialVariant)
      setSize(initialVariant.size.name)
      setPrice(initialVariant.price)
    })
  }, [initialVariant, selectedVariant])

  useEffect(() => {
    if (!productDetail?.product?.image) return
    requestAnimationFrame(() => {
      setCurrentImageIndex(0)
    })
  }, [productDetail?.product?.image])

  useEffect(() => {
    if (!isHydrated) return
    const run = () => {
      if (currentStep !== OrderFlowStep.ORDERING) {
        setCurrentStep(OrderFlowStep.ORDERING)
      }
      if (!orderingData) {
        initializeOrdering()
        return
      }
      if (userSlug && !orderingData.owner?.trim()) {
        initializeOrdering()
      }
    }
    const id = setTimeout(run, 500)
    return () => clearTimeout(id)
  }, [
    isHydrated,
    currentStep,
    orderingData,
    userSlug,
    setCurrentStep,
    initializeOrdering,
  ])

  const handleSizeChange = useCallback((variant: IProductVariant) => {
    setSelectedVariant(variant)
    setSize(variant.size.name)
    setPrice(variant.price)
  }, [])

  const handleQuantityChange = useCallback((newQuantity: number) => {
    setQuantity(newQuantity)
  }, [])

  const handleAddToCart = useCallback(() => {
    if (!selectedVariant || !isHydrated) return
    if (currentStep !== OrderFlowStep.ORDERING) {
      setCurrentStep(OrderFlowStep.ORDERING)
    }
    if (!orderingData) {
      initializeOrdering()
      return
    }
    if (userSlug && !orderingData.owner?.trim()) {
      initializeOrdering()
    }

    const orderItem: IOrderItem = {
      id: `item_${dayjs().valueOf()}_${Math.random().toString(36).substr(2, 9)}`,
      slug: productDetail?.product?.slug || '',
      image: productDetail?.product?.image || '',
      name: productDetail?.product?.name || '',
      quantity: quantity,
      size: selectedVariant.size.name,
      allVariants: productDetail?.product?.variants || [],
      variant: selectedVariant,
      originalPrice: selectedVariant.price,
      productSlug: productDetail?.product?.slug || '',
      description: productDetail?.product?.description || '',
      isLimit: productDetail?.product?.isLimit || false,
      isGift: productDetail?.product?.isGift || false,
      promotion: productDetail?.promotion ? productDetail?.promotion : null,
      promotionValue: productDetail?.promotion
        ? productDetail?.promotion?.value
        : 0,
      note: note.trim(),
    }

    try {
      addOrderingItem(orderItem)
      showToast(labels.addSuccess, 'Thông báo')
      setNote('')
      if (
        productDetail?.product.variants &&
        productDetail.product.variants.length > 0
      ) {
        const smallestVariant = productDetail.product.variants.reduce(
          (prev, curr) => (prev.price < curr.price ? prev : curr),
        )
        setSelectedVariant(smallestVariant)
        setSize(smallestVariant.size.name)
        setPrice(smallestVariant.price)
      }
    } catch {
      // Silent fail
    }
  }, [
    selectedVariant,
    isHydrated,
    currentStep,
    orderingData,
    userSlug,
    quantity,
    note,
    productDetail,
    setCurrentStep,
    initializeOrdering,
    addOrderingItem,
    labels.addSuccess,
  ])

  // const handleBuyNow = useCallback(() => {
  //   if (!selectedVariant || !isHydrated) return
  //   if (currentStep !== OrderFlowStep.ORDERING) {
  //     setCurrentStep(OrderFlowStep.ORDERING)
  //   }
  //   if (!orderingData) {
  //     initializeOrdering()
  //     return
  //   }
  //   if (userSlug && !orderingData.owner?.trim()) {
  //     initializeOrdering()
  //   }

  //   const orderItem: IOrderItem = {
  //     id: `item_${dayjs().valueOf()}_${Math.random().toString(36).substr(2, 9)}`,
  //     slug: productDetail?.product?.slug || '',
  //     image: productDetail?.product?.image || '',
  //     name: productDetail?.product?.name || '',
  //     quantity: quantity,
  //     size: selectedVariant.size.name,
  //     allVariants: productDetail?.product?.variants || [],
  //     variant: selectedVariant,
  //     originalPrice: selectedVariant.price,
  //     productSlug: productDetail?.product?.slug || '',
  //     description: productDetail?.product?.description || '',
  //     isLimit: productDetail?.product?.isLimit || false,
  //     isGift: productDetail?.product?.isGift || false,
  //     promotion: productDetail?.promotion ? productDetail?.promotion : null,
  //     promotionValue: productDetail?.promotion
  //       ? productDetail?.promotion?.value
  //       : 0,
  //     note: note.trim(),
  //   }

  //   try {
  //     addOrderingItem(orderItem)
  //     showToast(labels.addSuccess, 'Thông báo')
  //     setNote('')
  //     if (
  //       productDetail?.product.variants &&
  //       productDetail.product.variants.length > 0
  //     ) {
  //       const smallestVariant = productDetail.product.variants.reduce(
  //         (prev, curr) => (prev.price < curr.price ? prev : curr),
  //       )
  //       setSelectedVariant(smallestVariant)
  //       setSize(smallestVariant.size.name)
  //       setPrice(smallestVariant.price)
  //     }
  //     navigateNative.replace(ROUTE.CLIENT_CART)
  //   } catch {
  //     // Silent fail
  //   }
  // }, [
  //   selectedVariant,
  //   isHydrated,
  //   currentStep,
  //   orderingData,
  //   userSlug,
  //   quantity,
  //   note,
  //   productDetail,
  //   setCurrentStep,
  //   initializeOrdering,
  //   addOrderingItem,
  //   labels.addSuccess,
  // ])

  if (!productDetail && isLoading) {
    // Skeleton: shell UI hiển thị ngay, content là block placeholder
    return (
      <ScreenContainer
        edges={['top', 'bottom']}
        className={cn('flex-1', isDark ? 'bg-gray-900' : colors.background.light)}
      >
        <View className="flex-row items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <NavigatePressable
            onPress={() => navigateNative.back()}
            hitSlop={HIT_SLOP_ICON}
            className="p-2"
          >
            <ChevronLeft size={24} color={isDark ? '#000000' : '#000000'} />
          </NavigatePressable>
          <Text className="text-lg font-bold text-gray-900 dark:text-white">
            {labels.productDetail}
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <View
          style={{
            flex: 1,
            backgroundColor: isDark ? '#374151' : '#e5e7eb',
          }}
        />
      </ScreenContainer>
    )
  }

  if (!productDetail) {
    return (
      <ScreenContainer
        edges={['top', 'bottom']}
        className={cn('flex-1', isDark ? 'bg-gray-900' : colors.background.light)}
      >
        <View className="flex-1 items-center justify-center px-4">
          <Text className="mb-4 text-2xl font-bold">Không tìm thấy món</Text>
          <Button onPress={() => navigateNative.back()}>
            <Text>Quay lại</Text>
          </Button>
        </View>
      </ScreenContainer>
    )
  }

  const hasPromotion = derivedState?.hasPromotion ?? false
  const finalPrice = derivedState?.finalPrice ?? price
  const isOutOfStock = derivedState?.isOutOfStock ?? false
  const isDisabled = derivedState?.isDisabled ?? true
  const isRefreshing = isRefetching && !!productDetail

  return (
    <ScreenContainer
      edges={['bottom']}
      className={cn('flex-1', isDark ? 'bg-gray-900' : colors.background.light)}
    >
      <Animated.View // shared element fades in real content after overlay
        style={sharedContentStyle}
        className="flex-1"
      >
        <View
          className="flex-1"
          {...(Platform.OS === 'android' && {
            renderToHardwareTextureAndroid: true,
          })}
        >
          <Animated.ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            contentContainerStyle={{
              paddingBottom: 88 + insets.bottom,
            }}
            refreshControl={
              isFocused ? (
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={refetch}
                  tintColor={isDark ? '#ffffff' : '#111827'}
                />
              ) : undefined
            }
          >
            {isFocused && !navigatingToCart ? (
              <>
                <Animated.View
                  ref={heroRef}
                  onLayout={onHeroLayout}
                  className="overflow-hidden bg-gray-100 dark:bg-gray-800"
                  style={imageContainerStyle}
                >
                  <Carousel
                    width={screenWidth}
                    height={MENU_ITEM_DETAIL_LAYOUT.imageContainerSize(screenWidth)}
                    data={productImages}
                    loop={productImages.length > 1}
                    defaultIndex={currentImageIndex}
                    onProgressChange={(_, absoluteProgress) => {
                      const index = Math.round(absoluteProgress)
                      if (
                        index >= 0 &&
                        index < productImages.length &&
                        index !== currentImageIndex
                      ) {
                        setCurrentImageIndex(index)
                      }
                    }}
                    renderItem={heroRenderItem}
                  />
                  {productImages.length > 1 && (
                    <View className="absolute bottom-3 right-3 rounded-full bg-black/55 px-2.5 py-1">
                      <Text className="text-xs font-semibold text-white">
                        {currentImageIndex + 1}/{productImages.length}
                      </Text>
                    </View>
                  )}
                </Animated.View>

                <View className="flex-col gap-5 py-6">
              {/* Thông tin món + giá */}
              <View className="border-b-[1px] border-muted-foreground/5 bg-white px-4 pb-4">
                <View className="flex-col gap-1">
                  <Text className="text-2xl font-bold capitalize text-gray-900 dark:text-white">
                    {productDetail.product.name}
                  </Text>
                  <PriceTag
                    price={price}
                    finalPrice={finalPrice}
                    hasPromotion={hasPromotion}
                    discountValue={productDetail.promotion?.value}
                    chooseSizeLabel={labels.chooseSizeToViewPrice}
                    // discountLabel={labels.discount}
                  />
                </View>
                {productDetail.promotion &&
                  productDetail.promotion.description !== '' && (
                    <View className="mt-4 rounded-2xl border border-yellow-400/70 bg-yellow-50 px-3 py-3 dark:border-yellow-500/60 dark:bg-yellow-900/25">
                      <Text className="mb-1 text-xs font-semibold uppercase tracking-wide text-yellow-700 dark:text-yellow-300">
                        {labels.specialOffer}
                      </Text>
                      <Text className="text-sm text-gray-800 dark:text-gray-100">
                        {productDetail.promotion.description}
                      </Text>
                    </View>
                  )}
              </View>

              {/* Tuỳ chọn size / số lượng + mô tả */}
              <View className="border-b border-muted-foreground/5 px-4 pb-4">
                <View className="flex-col gap-4">
                  {productDetail.product.variants.length > 0 && (
                    <View className="flex-row items-center justify-between gap-2">
                      <Text className="text-md font-semibold text-gray-900 dark:text-white">
                        {labels.selectSize}
                      </Text>
                      <View className="flex-row flex-wrap gap-2">
                        {productDetail.product.variants.map((variant) => (
                          <Pressable
                            key={variant.slug}
                            onPress={() => handleSizeChange(variant)}
                            hitSlop={HIT_SLOP_ICON}
                            className={`rounded-full border px-4 py-1.5 active:opacity-80 ${
                              size === variant.size.name
                                ? 'border-primary bg-primary dark:border-primary dark:bg-primary'
                                : 'border-gray-400 bg-transparent dark:border-gray-500'
                            }`}
                            {...({ unstable_pressDelay: 0 } as object)}
                          >
                            <Text
                              className={`text-xs font-semibold ${
                                size === variant.size.name
                                  ? 'text-white'
                                  : 'text-gray-700 dark:text-gray-300'
                              }`}
                            >
                              {variant.size.name.toUpperCase()}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  )}

                  {productDetail.product.variants.length > 0 && (
                    <View className="flex-row items-center justify-between gap-2 pt-2">
                      <Text className="text-md font-semibold text-gray-900 dark:text-white">
                        {labels.selectQuantity}
                      </Text>
                      <View className="flex-row items-center justify-between gap-3">
                        <NonPropQuantitySelector
                          quantity={quantity}
                          onChange={handleQuantityChange}
                          isLimit={productDetail.product.isLimit}
                          disabled={productDetail.isLocked}
                          currentQuantity={productDetail.currentStock}
                        />
                        {productDetail.product.isLimit && (
                          <Text className="text-xs text-gray-600 dark:text-gray-400">
                            {productDetail.currentStock}/
                            {productDetail.defaultStock} {labels.inStock}
                          </Text>
                        )}
                      </View>
                    </View>
                  )}

                  <View className="flex-col gap-1 pt-2">
                    <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                      {labels.productDescription}
                    </Text>
                    <StaticText
                      key={productDetail.product.slug}
                      contentKey={productDetail.product.slug}
                      className="text-base leading-relaxed text-gray-700 dark:text-gray-300"
                    >
                      {productDetail.product.description?.trim() ||
                        labels.noDescription}
                    </StaticText>
                  </View>
                </View>
              </View>

              {/* {__DEV__ && (
                <View className="mt-2 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-3 py-3 dark:border-gray-700 dark:bg-gray-900">
                  <Text className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Debug: Product images
                  </Text>
                  <Text
                    className="text-[11px] text-gray-700 dark:text-gray-300"
                    numberOfLines={3}
                  >
                    cover: {String(productDetail.product.image ?? 'null')}
                  </Text>
                  <Text
                    className="mt-1 text-[11px] text-gray-700 dark:text-gray-300"
                    numberOfLines={4}
                  >
                    images: {JSON.stringify(productDetail.product.images ?? [])}
                  </Text>
                </View>
              )} */}

              {productDetail.product.catalog?.slug ? (
                <View className="relative pb-6">
                  {heavyReady && sliderVisible ? (
                    <SliderRelatedProducts
                      currentProduct={slug}
                      catalog={productDetail.product.catalog.slug}
                    />
                  ) : (
                    <View
                      style={{
                        height: 120,
                        marginHorizontal: 16,
                        backgroundColor: isDark ? '#374151' : '#e5e7eb',
                        borderRadius: 8,
                      }}
                    />
                  )}
                </View>
              ) : null}
                </View>
              </>
            ) : (
              /* B6: Placeholder nhẹ khi blur — giảm unmount cost khi transition sang Cart */
              <View
                ref={heroRef}
                onLayout={onHeroLayout}
                style={[
                  imageContainerStyle,
                  {
                    backgroundColor: isDark ? '#1f2937' : '#f3f4f6',
                  },
                ]}
              />
            )}
          </Animated.ScrollView>

          {/* Header overlay — #3 khi blur dùng header đơn giản (không Reanimated) */}
          {isFocused && !navigatingToCart ? (
            <ProductDetailHeader
              isDark={isDark}
              title={productDetail.product.name}
              isFavorite={isFavorite}
              onToggleFavorite={() => setIsFavorite((v) => !v)}
              headerFade={headerFade}
              onNavigateToCart={handleNavigateToCart}
            />
          ) : (
            <ProductDetailHeaderSimple
              isDark={isDark}
              title={productDetail.product.name}
              isFavorite={isFavorite}
              onToggleFavorite={() => setIsFavorite((v) => !v)}
              onNavigateToCart={handleNavigateToCart}
            />
          )}

          {/* Bottom bar — floating style */}
          {isFocused && !navigatingToCart && (
          <View
            pointerEvents="box-none"
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              paddingHorizontal: 16,
              paddingBottom: insets.bottom + 12,
            }}
          >
            <View
              style={{
                borderRadius: 20,
                overflow: 'hidden',
                paddingHorizontal: 16,
                paddingVertical: 12,
                backgroundColor: isDark
                  ? 'rgba(17, 19, 24, 0.92)'
                  : 'rgba(255, 255, 255, 0.92)',
                ...Platform.select({
                  ios: {
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.15,
                    shadowRadius: 12,
                  },
                  android: { elevation: 8 },
                }),
              }}
            >
              <View className="flex-row items-center gap-3">
              <View className="min-w-0 flex-1 justify-center">
                <Text className="text-md font-semibold text-muted-foreground dark:text-muted-foreground/5">
                  {labels.totalPrice}
                </Text>
                <Text
                  className={
                    price != null
                      ? 'text-lg font-bold text-primary dark:text-primary'
                      : 'text-sm text-gray-500 dark:text-gray-400'
                  }
                  numberOfLines={1}
                >
                  {price != null
                    ? formatCurrency((finalPrice ?? 0) * quantity)
                    : labels.chooseSizeToViewPrice}
                </Text>
              </View>
              <Button
                onPress={handleAddToCart}
                disabled={isDisabled}
                variant="default"
                size="md"
                className="flex-1 flex-row items-center justify-center gap-2 rounded-full bg-primary dark:bg-primary"
              >
                <ShoppingBag
                  size={20}
                  color={isDisabled ? '#e5e7eb' : '#ffffff'}
                />
                <Text className="font-semibold text-white">
                  {isOutOfStock ? labels.outOfStock : labels.addToCart}
                </Text>
              </Button>
            </View>
            </View>
          </View>
          )}
        </View>
      </Animated.View>
    </ScreenContainer>
  )
})

export default function ProductDetailPage() {
  const navigation = useNavigation()

  useEffect(() => {
    navigation.setOptions({
      fullScreenGestureShadowEnabled: false,
    })
  }, [navigation])

  return <ProductDetailContent />
}
