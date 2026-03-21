/**
 * Product Detail — Trong tab Menu, push trong menu stack.
 * Flow: Menu → tap → router.push('/(tabs)/menu/product/[id]') → slide_from_right.
 * Chuyển sang Cart tab không unmount Product Detail (detachInactiveScreens=false).
 */
import { ScreenContainer } from '@/components/layout'
import { useFocusEffect } from '@react-navigation/native'
import dayjs from 'dayjs'
import { Image } from 'expo-image'
import { useLocalSearchParams, useNavigation } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useTranslation } from 'react-i18next'
import {
  InteractionManager,
  RefreshControl,
  Image as RNImage,
  Text,
  useColorScheme,
  useWindowDimensions,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Images } from '@/assets/images'
import { PriceTag, SliderRelatedProducts } from '@/components/menu'
import { NavigatePressable } from '@/components/navigation'
import {
  ProductDetailHeader,
  ProductDetailHeaderSimple,
} from '@/components/product/product-detail-header'
import {
  DeferredOptionsSection,
  ProductDetailOptionsSection,
} from '@/components/product/product-detail-options-section'
import { ProductDetailPriceFooter } from '@/components/product/product-detail-price-footer'
import { Button } from '@/components/ui'
import { colors, OrderFlowStep } from '@/constants'
import { MENU_ITEM_DETAIL_LAYOUT } from '@/constants/menu-item-detail-layout'
import { MENU_STACK_CART } from '@/constants/navigation.config'
import { useSpecificMenuItem } from '@/hooks'
import { HIT_SLOP_ICON, navigateNative } from '@/lib/navigation'
import { useSharedElementDest } from '@/lib/shared-element'
import { useUserStore } from '@/stores'
import {
  useDetailNote,
  useDetailPrice,
  useDetailQuantity,
  useDetailResetForProduct,
  useDetailSelectedVariant,
  useDetailSetNote,
  useDetailSetProductPromotion,
  useDetailSetSelection,
  useDetailSize,
  useOrderFlowMenuItemDetailActions,
  useOrderFlowMenuItemDetailState,
} from '@/stores/selectors'
import { IOrderItem } from '@/types'
import { showToast } from '@/utils'
import { cn } from '@/utils/cn'
import { getProductImageUrl } from '@/utils/product-image-url'
import Animated, {
  runOnJS,
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated'
import Carousel, { CarouselRenderItem } from 'react-native-reanimated-carousel'

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

  const { isHydrated, currentStep, hasOrderingData, hasOrderingOwner } =
    useOrderFlowMenuItemDetailState()
  const { initializeOrdering, setCurrentStep, addOrderingItem } =
    useOrderFlowMenuItemDetailActions()

  const { width: screenWidth } = useWindowDimensions()
  const resetForProduct = useDetailResetForProduct()

  useEffect(() => {
    if (slug) resetForProduct(slug)
  }, [slug, resetForProduct])

  // Query chạy ngay khi screen mount (cache-first, không block animation)
  const {
    data: product,
    isLoading,
    refetch,
    isRefetching,
  } = useSpecificMenuItem(slug, true)
  // B7: Ref để guard setState khi blur — tránh CPU waste khi chuyển sang Cart
  const isFocusedRef = useRef(true)
  const [heavyReady, setHeavyReady] = useState(false)
  const [contentReady, setContentReady] = useState(false)
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    const task = InteractionManager.runAfterInteractions(() => {
      timeoutId = setTimeout(() => {
        if (!isFocusedRef.current) return
        setHeavyReady(true)
      }, 100)
    })
    return () => {
      task.cancel()
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [])

  // P1/P6: Defer content (price, size, quantity, description) 150ms sau Carousel — giảm spike mount
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    const task = InteractionManager.runAfterInteractions(() => {
      timeoutId = setTimeout(() => {
        if (!isFocusedRef.current) return
        setContentReady(true)
      }, 150)
    })
    return () => {
      task.cancel()
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [])

  // P5: Defer SliderRelatedProducts 600ms sau contentReady — giảm spike CPU lúc 6s (T1)
  const [sliderRelatedReady, setSliderRelatedReady] = useState(false)
  useEffect(() => {
    if (!contentReady) return
    const id = setTimeout(() => {
      if (!isFocusedRef.current) return
      setSliderRelatedReady(true)
    }, 600)
    return () => clearTimeout(id)
  }, [contentReady])

  // P8: Defer Hero Image 100-150ms — placeholder màu trước, Carousel mount sau để giảm decode spike trong transition
  const [carouselReady, setCarouselReady] = useState(false)
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    const task = InteractionManager.runAfterInteractions(() => {
      timeoutId = setTimeout(() => {
        if (!isFocusedRef.current) return
        setCarouselReady(true)
      }, 120)
    })
    return () => {
      task.cancel()
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [])

  // P7: Carousel lazy ảnh 2+ — chỉ render ảnh đầu ngay, ảnh 2+ defer 500ms
  const [carouselExtraImagesReady, setCarouselExtraImagesReady] =
    useState(false)
  useEffect(() => {
    const id = setTimeout(() => {
      if (!isFocusedRef.current) return
      setCarouselExtraImagesReady(true)
    }, 500)
    return () => clearTimeout(id)
  }, [])

  const productDetail = product?.result
  const setProductPromotion = useDetailSetProductPromotion()

  useEffect(() => {
    if (!productDetail) return
    setProductPromotion(productDetail.promotion?.value ?? 0)
  }, [productDetail?.promotion?.value, setProductPromotion, productDetail])

  const imageContainerStyle = useMemo(
    () => ({
      width: screenWidth,
      height: MENU_ITEM_DETAIL_LAYOUT.imageContainerSize(screenWidth),
    }),
    [screenWidth],
  )

  const [sliderVisible, setSliderVisible] = useState(false)
  const [sliderScrollNear, setSliderScrollNear] = useState(false)
  const [isFocused, setIsFocused] = useState(true)
  // P4: 1200ms spread Carousel mount xa transition — giảm spike
  const SLIDER_DEFER_MS = 1200

  const handleNavigateToCart = useCallback(() => {
    navigateNative.push(MENU_STACK_CART)
  }, [])

  useFocusEffect(
    useCallback(() => {
      isFocusedRef.current = true
      setIsFocused(true)
      return () => {
        isFocusedRef.current = false
        setIsFocused(false)
      }
    }, []),
  )

  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isFavorite, setIsFavorite] = useState(false)
  const carouselIndexUpdateRef = useRef({ lastIndex: -1, lastTime: 0 })

  useEffect(() => {
    const id = setTimeout(() => {
      if (!isFocusedRef.current) return
      setSliderVisible(true)
    }, SLIDER_DEFER_MS)
    return () => clearTimeout(id)
  }, [])

  const headerFadeDistance =
    MENU_ITEM_DETAIL_LAYOUT.imageContainerSize(screenWidth)
  // Ngưỡng scroll để lazy mount SliderRelatedProducts — chỉ mount khi user cuộn gần tới
  const sliderMountThreshold = headerFadeDistance + 400

  const headerFade = useSharedValue(0)
  /** Tránh runOnJS mỗi frame khi đã scroll qua ngưỡng — chỉ báo JS một lần mỗi lần “vào vùng”. */
  const sliderNearNotified = useSharedValue(0)

  const handleScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      'worklet'
      const y = event.contentOffset.y
      const p = Math.max(0, Math.min(1, y / headerFadeDistance))
      headerFade.value = p
      if (y >= sliderMountThreshold) {
        if (sliderNearNotified.value === 0) {
          sliderNearNotified.value = 1
          runOnJS(setSliderScrollNear)(true)
        }
      } else {
        sliderNearNotified.value = 0
      }
    },
  })

  const productImages = useMemo(
    () =>
      productDetail
        ? [productDetail.product.image, ...(productDetail.product.images || [])]
        : [],
    [productDetail],
  )

  const heroRenderItem: CarouselRenderItem<string | null> = useCallback(
    ({ item, index }) => {
      // P7: Defer ảnh 2+ — placeholder 500ms, giảm decode đồng thời
      if (index >= 1 && !carouselExtraImagesReady) {
        return (
          <View
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: isDark ? '#374151' : '#e5e7eb',
            }}
          />
        )
      }
      const imageKey = item?.trim()
      const uri = imageKey ? getProductImageUrl(imageKey) : null
      if (uri) {
        return (
          <Image
            source={{ uri }}
            contentFit="cover"
            cachePolicy="memory-disk"
            priority={index === 0 ? 'high' : 'low'}
            recyclingKey={(imageKey || '').replace(/^\//, '')}
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
    [carouselExtraImagesReady, isDark],
  )

  const {
    animatedRef: heroRef,
    onLayout: onHeroLayout,
    contentStyle: sharedContentStyle,
  } = useSharedElementDest()

  const price = useDetailPrice()
  const quantity = useDetailQuantity()
  const size = useDetailSize()

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
    if (!productDetail?.product?.image) return
    requestAnimationFrame(() => {
      if (!isFocusedRef.current) return
      setCurrentImageIndex(0)
    })
  }, [productDetail?.product?.image])

  useEffect(() => {
    if (!isHydrated) return
    const run = () => {
      if (!isFocusedRef.current) return
      if (currentStep !== OrderFlowStep.ORDERING) {
        setCurrentStep(OrderFlowStep.ORDERING)
      }
      if (!hasOrderingData) {
        initializeOrdering()
        return
      }
      if (userSlug && !hasOrderingOwner) {
        initializeOrdering()
      }
    }
    const id = setTimeout(run, 500)
    return () => clearTimeout(id)
  }, [
    isHydrated,
    currentStep,
    hasOrderingData,
    hasOrderingOwner,
    userSlug,
    setCurrentStep,
    initializeOrdering,
  ])

  const selectedVariant = useDetailSelectedVariant()
  const note = useDetailNote()
  const setSelection = useDetailSetSelection()
  const setNote = useDetailSetNote()

  const handleAddToCart = useCallback(() => {
    if (!selectedVariant || !isHydrated) return
    if (currentStep !== OrderFlowStep.ORDERING) {
      setCurrentStep(OrderFlowStep.ORDERING)
    }
    if (!hasOrderingData) {
      initializeOrdering()
      return
    }
    if (userSlug && !hasOrderingOwner) {
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
        setSelection({
          variant: smallestVariant,
          size: smallestVariant.size.name,
          price: smallestVariant.price,
          quantity: 1,
        })
      }
    } catch {
      // Silent fail
    }
  }, [
    selectedVariant,
    isHydrated,
    currentStep,
    hasOrderingData,
    hasOrderingOwner,
    userSlug,
    quantity,
    note,
    productDetail,
    setCurrentStep,
    setSelection,
    setNote,
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
        className={cn(
          'flex-1',
          isDark ? 'bg-gray-900' : colors.background.light,
        )}
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
        className={cn(
          'flex-1',
          isDark ? 'bg-gray-900' : colors.background.light,
        )}
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
  // const isOutOfStock = derivedState?.isOutOfStock ?? false
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
        <View className="flex-1">
          <Animated.ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={32}
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
            {isFocused ? (
              <>
                <Animated.View
                  ref={heroRef}
                  onLayout={onHeroLayout}
                  className="overflow-hidden bg-gray-100 dark:bg-gray-800"
                  style={imageContainerStyle}
                >
                  {carouselReady ? (
                    <>
                      <Carousel
                        width={screenWidth}
                        height={MENU_ITEM_DETAIL_LAYOUT.imageContainerSize(
                          screenWidth,
                        )}
                        data={productImages}
                        loop={productImages.length > 1}
                        defaultIndex={currentImageIndex}
                        onProgressChange={(_, absoluteProgress) => {
                          if (!isFocusedRef.current) return
                          const index = Math.round(absoluteProgress)
                          if (index < 0 || index >= productImages.length) return
                          const now = Date.now()
                          const { lastIndex, lastTime } =
                            carouselIndexUpdateRef.current
                          if (index === lastIndex) return
                          const forceUpdate = Math.abs(index - lastIndex) >= 2
                          if (!forceUpdate && now - lastTime < 80) return
                          carouselIndexUpdateRef.current = {
                            lastIndex: index,
                            lastTime: now,
                          }
                          setCurrentImageIndex(index)
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
                    </>
                  ) : (
                    <View
                      style={{
                        width: '100%',
                        height: '100%',
                        backgroundColor: isDark ? '#374151' : '#e5e7eb',
                      }}
                    />
                  )}
                </Animated.View>

                <View className="flex-col gap-5 py-6">
                  {contentReady ? (
                    <>
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

                      {/* Progressive Options: Deferred render để giảm mount spike khi có nhiều topping */}
                      <View className="border-b border-muted-foreground/5 px-4 pb-4">
                        <DeferredOptionsSection
                          fallback={
                            <View
                              style={{
                                minHeight: 200,
                                marginHorizontal: 0,
                                backgroundColor: isDark ? '#374151' : '#e5e7eb',
                                borderRadius: 12,
                              }}
                            />
                          }
                        >
                          <ProductDetailOptionsSection
                            productSlug={productDetail.product.slug}
                            variants={productDetail.product.variants || []}
                            description={
                              productDetail.product.description || ''
                            }
                            isLimit={productDetail.product.isLimit}
                            isLocked={productDetail.isLocked}
                            currentStock={productDetail.currentStock}
                            defaultStock={productDetail.defaultStock}
                            inStockLabel={labels.inStock}
                            selectSizeLabel={labels.selectSize}
                            selectQuantityLabel={labels.selectQuantity}
                            descriptionLabel={labels.productDescription}
                            noDescriptionLabel={labels.noDescription}
                            promotionDescription={
                              productDetail.promotion?.description || undefined
                            }
                            promotionSpecialLabel={labels.specialOffer}
                          />
                        </DeferredOptionsSection>
                      </View>
                    </>
                  ) : (
                    <View
                      style={{
                        minHeight: 200,
                        marginHorizontal: 16,
                        backgroundColor: isDark ? '#374151' : '#e5e7eb',
                        borderRadius: 12,
                      }}
                    />
                  )}

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
                    <View
                      className="relative pb-6"
                      style={{
                        opacity:
                          heavyReady &&
                          sliderRelatedReady &&
                          (sliderVisible || sliderScrollNear)
                            ? 1
                            : 0,
                        minHeight: 120,
                      }}
                      pointerEvents={
                        heavyReady &&
                        sliderRelatedReady &&
                        (sliderVisible || sliderScrollNear)
                          ? 'auto'
                          : 'none'
                      }
                    >
                      <SliderRelatedProducts
                        currentProduct={slug}
                        catalog={productDetail.product.catalog.slug}
                      />
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
          {isFocused ? (
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

          {/* Bottom bar — atomic ProductDetailPriceFooter */}
          {isFocused && (
            <ProductDetailPriceFooter
              totalPriceLabel={labels.totalPrice}
              chooseSizeLabel={labels.chooseSizeToViewPrice}
              addToCartLabel={labels.addToCart}
              outOfStockLabel={labels.outOfStock}
              isDisabled={isDisabled}
              onAddToCart={handleAddToCart}
            />
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
