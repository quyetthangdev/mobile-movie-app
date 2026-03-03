import { ScreenContainer, ScreenParallaxWrapper } from '@/components/layout'
import { MenuItemSkeletonShell } from '@/components/skeletons'
import { Image } from 'expo-image'
import { useLocalSearchParams } from 'expo-router'
import { ArrowLeft, ShoppingBag, ShoppingCart } from 'lucide-react-native'
import moment from 'moment'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Animated, {
  runOnUI,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { useTranslation } from 'react-i18next'
import {
  InteractionManager,
  Platform,
  Pressable,
  Text,
  useColorScheme,
  useWindowDimensions,
  View,
} from 'react-native'
import { ScrollView as GestureScrollView } from 'react-native-gesture-handler'

import { Images } from '@/assets/images'
import NonPropQuantitySelector from '@/components/button/non-prop-quantity-selector'
import { ProductImageCarousel, SliderRelatedProducts } from '@/components/menu'
import { Badge, Button, Skeleton } from '@/components/ui'
import { MENU_ITEM_DETAIL_LAYOUT } from '@/constants/menu-item-detail-layout'
import { OrderFlowStep, publicFileURL, ROUTE } from '@/constants'
import { useSpecificMenuItem } from '@/hooks'
import { HIT_SLOP_ICON, navigateNative } from '@/lib/navigation'
import { NavigatePressable } from '@/components/navigation'
import { useOrderFlowMenuItemDetail } from '@/stores/selectors'
import { useUserStore } from '@/stores'
import { IOrderItem, IProductVariant } from '@/types'
import { formatCurrency, showToast } from '@/utils'

/** Delay sau animation để load Carousel, Image, RelatedProducts — tránh block JS thread khi slide */
const HEAVY_CONTENT_DELAY_MS = 450

const MenuItemDetailContent = React.memo(function MenuItemDetailContent() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const { t } = useTranslation('product')
  const { t: tMenu } = useTranslation('menu')
  const { t: tToast } = useTranslation('toast')
  const userInfo = useUserStore((s) => s.userInfo)
  const isDark = useColorScheme() === 'dark'

  const {
    isHydrated,
    currentStep,
    orderingData,
    initializeOrdering,
    setCurrentStep,
    addOrderingItem,
    cartItemCount,
  } = useOrderFlowMenuItemDetail()

  const { width: screenWidth } = useWindowDimensions()
  const { data: product, isLoading } = useSpecificMenuItem(slug || '')

  const productDetail = product?.result

  const imageContainerStyle = useMemo(
    () => ({
      width: MENU_ITEM_DETAIL_LAYOUT.imageContainerSize(screenWidth),
      height: MENU_ITEM_DETAIL_LAYOUT.imageContainerSize(screenWidth),
    }),
    [screenWidth],
  )

  // Staged Rendering: phần động (Image, Carousel, RelatedProducts) load sau animation (~300ms).
  // Phần tĩnh (Header, product info) render ngay — không block JS thread khi slide vào.
  const [heavyContentReady, setHeavyContentReady] = useState(false)
  const [carouselReady, setCarouselReady] = useState(false)
  const [sliderReady, setSliderReady] = useState(false)
  const skeletonOpacity = useSharedValue(1)
  const contentOpacity = useSharedValue(0)

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    const task = InteractionManager.runAfterInteractions(() => {
      timeoutId = setTimeout(() => setHeavyContentReady(true), HEAVY_CONTENT_DELAY_MS)
    })
    return () => {
      task.cancel()
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [])

  // Defer ProductImageCarousel 1 frame (rAF) — tách mount khỏi content spike, giảm stutter
  useEffect(() => {
    if (!heavyContentReady) return
    const id = requestAnimationFrame(() => setCarouselReady(true))
    return () => cancelAnimationFrame(id)
  }, [heavyContentReady])

  // Defer SliderRelatedProducts 2 frame (double rAF) — tách xa ProductImageCarousel, giảm spike
  useEffect(() => {
    if (!heavyContentReady) return
    const ids = { second: -1 }
    const id1 = requestAnimationFrame(() => {
      ids.second = requestAnimationFrame(() => setSliderReady(true))
    })
    return () => {
      cancelAnimationFrame(id1)
      if (ids.second >= 0) cancelAnimationFrame(ids.second)
    }
  }, [heavyContentReady])

  // Task 5.3: Fade out skeleton, fade in content khi heavyContentReady
  useEffect(() => {
    if (!heavyContentReady) return
    runOnUI(() => {
      'worklet'
      skeletonOpacity.value = withTiming(0, { duration: 200 })
      contentOpacity.value = withTiming(1, { duration: 200 })
    })()
  }, [heavyContentReady, skeletonOpacity, contentOpacity])

  const skeletonOpacityStyle = useAnimatedStyle(() => ({
    opacity: skeletonOpacity.value,
  }))
  const contentOpacityStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }))

  // Calculate initial variant (lowest price) using useMemo
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

  // Initialize state
  const [size, setSize] = useState<string | null>(null)
  const [price, setPrice] = useState<number | null>(null)
  const [note, setNote] = useState<string>('')
  const [quantity, setQuantity] = useState<number>(1)
  const [selectedVariant, setSelectedVariant] =
    useState<IProductVariant | null>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  // Update state when productDetail loads (only once)
  useEffect(() => {
    if (initialVariant && !selectedVariant) {
      setSelectedVariant(initialVariant)
      setSize(initialVariant.size.name)
      setPrice(initialVariant.price)
    }
    if (productDetail?.product?.image && !selectedImage) {
      setSelectedImage(productDetail.product.image)
    }
    // Only run when productDetail changes, not when state changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productDetail])

  // Stage 3: Zustand updates — 350ms (tránh cascade trong transition, giảm FPS drop)
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
      if (userInfo?.slug && !orderingData.owner?.trim()) {
        initializeOrdering()
      }
    }

    const id = setTimeout(run, 350)
    return () => clearTimeout(id)
  }, [
    isHydrated,
    currentStep,
    orderingData,
    userInfo?.slug,
    setCurrentStep,
    initializeOrdering,
  ])

  // Handlers phải gọi trước early return (Rules of Hooks)
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

    if (userInfo?.slug && !orderingData.owner?.trim()) {
      initializeOrdering()
    }

    const orderItem: IOrderItem = {
      id: `item_${moment().valueOf()}_${Math.random().toString(36).substr(2, 9)}`,
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
      showToast(tToast('toast.addSuccess', 'Đã thêm vào giỏ hàng'), 'Thông báo')

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
      // Silent fail — toast đã xử lý feedback
    }
  }, [
    selectedVariant,
    isHydrated,
    currentStep,
    orderingData,
    userInfo?.slug,
    quantity,
    note,
    productDetail,
    setCurrentStep,
    initializeOrdering,
    addOrderingItem,
    tToast,
  ])

  const handleBuyNow = useCallback(() => {
    if (!selectedVariant || !isHydrated) return

    if (currentStep !== OrderFlowStep.ORDERING) {
      setCurrentStep(OrderFlowStep.ORDERING)
    }

    if (!orderingData) {
      initializeOrdering()
      return
    }

    if (userInfo?.slug && !orderingData.owner?.trim()) {
      initializeOrdering()
    }

    const orderItem: IOrderItem = {
      id: `item_${moment().valueOf()}_${Math.random().toString(36).substr(2, 9)}`,
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
      showToast(tToast('toast.addSuccess', 'Đã thêm vào giỏ hàng'), 'Thông báo')

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

      navigateNative.replace(ROUTE.CLIENT_CART)
    } catch {
      // Silent fail — toast đã xử lý feedback
    }
  }, [
    selectedVariant,
    isHydrated,
    currentStep,
    orderingData,
    userInfo?.slug,
    quantity,
    note,
    productDetail,
    setCurrentStep,
    initializeOrdering,
    addOrderingItem,
    tToast,
  ])

  // Loading: layout khớp MenuItemSkeletonShell — dùng MENU_ITEM_DETAIL_LAYOUT.
  if (isLoading) {
    const relatedItemWidth = MENU_ITEM_DETAIL_LAYOUT.relatedProductItemWidth(screenWidth)
    return (
      <ScreenContainer
        edges={['top']}
        className="flex-1 bg-white dark:bg-gray-900"
      >
        <View
          className="flex-row items-center justify-between border-b border-gray-200 dark:border-gray-700"
          style={{
            paddingHorizontal: MENU_ITEM_DETAIL_LAYOUT.PADDING_X,
            paddingVertical: 12,
          }}
        >
          <NavigatePressable
            onPress={() => navigateNative.back()}
            hitSlop={HIT_SLOP_ICON}
            className="p-2 active:opacity-70"
          >
            <ArrowLeft size={24} color={isDark ? '#ffffff' : '#000000'} />
          </NavigatePressable>
          <Skeleton style={{ width: 128, height: 20 }} className="rounded-md" />
          <View style={{ width: 40, height: 40 }} />
        </View>
        <GestureScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View
            style={{
              paddingHorizontal: MENU_ITEM_DETAIL_LAYOUT.PADDING_X,
              paddingTop: MENU_ITEM_DETAIL_LAYOUT.PADDING_TOP_IMAGES,
            }}
          >
            <View
              className="overflow-hidden rounded-lg"
              style={[
                imageContainerStyle,
                { marginBottom: MENU_ITEM_DETAIL_LAYOUT.IMAGE_MARGIN_BOTTOM },
              ]}
            >
              <Skeleton className="h-full w-full rounded-lg" />
            </View>
          </View>
          <View
            style={{
              paddingHorizontal: MENU_ITEM_DETAIL_LAYOUT.PADDING_X,
              paddingVertical: MENU_ITEM_DETAIL_LAYOUT.PADDING_Y_INFO,
            }}
          >
            <View style={{ flexDirection: 'column', gap: MENU_ITEM_DETAIL_LAYOUT.GAP_4 } as object}>
              <View style={{ flexDirection: 'column', gap: 4 } as object}>
                <Skeleton style={{ width: '75%', height: 32 }} className="rounded-md" />
                <Skeleton style={{ width: '50%', height: 16 }} className="rounded-md" />
              </View>
              <View style={{ flexDirection: 'column', gap: MENU_ITEM_DETAIL_LAYOUT.GAP_2 } as object}>
                <Skeleton style={{ width: 80, height: 24 }} className="rounded-md" />
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: MENU_ITEM_DETAIL_LAYOUT.GAP_6,
                } as object}
              >
                <Skeleton style={{ width: 72, height: 16 }} className="rounded-md" />
                <View
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: MENU_ITEM_DETAIL_LAYOUT.GAP_2,
                  } as object}
                >
                  <Skeleton style={{ width: 48, height: 32 }} className="rounded-full" />
                  <Skeleton style={{ width: 48, height: 32 }} className="rounded-full" />
                  <Skeleton style={{ width: 48, height: 32 }} className="rounded-full" />
                </View>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: MENU_ITEM_DETAIL_LAYOUT.GAP_6,
                } as object}
              >
                <Skeleton style={{ width: 72, height: 16 }} className="rounded-md" />
                <View
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: MENU_ITEM_DETAIL_LAYOUT.GAP_2,
                  } as object}
                >
                  <Skeleton style={{ width: 120, height: 44 }} className="rounded-full" />
                </View>
              </View>
            </View>
          </View>
          <View
            style={{
              gap: MENU_ITEM_DETAIL_LAYOUT.GAP_3,
              paddingHorizontal: MENU_ITEM_DETAIL_LAYOUT.PADDING_X,
              paddingBottom: MENU_ITEM_DETAIL_LAYOUT.PADDING_BOTTOM,
            }}
          >
            <Skeleton style={{ width: 128, height: 16 }} className="rounded-md" />
            <View
              style={{
                flexDirection: 'row',
                gap: MENU_ITEM_DETAIL_LAYOUT.RELATED_ITEM_SPACING,
              }}
            >
              <Skeleton
                style={{
                  width: relatedItemWidth,
                  height: MENU_ITEM_DETAIL_LAYOUT.RELATED_PRODUCT_IMAGE_HEIGHT,
                }}
                className="rounded-xl"
              />
              <Skeleton
                style={{
                  width: relatedItemWidth,
                  height: MENU_ITEM_DETAIL_LAYOUT.RELATED_PRODUCT_IMAGE_HEIGHT,
                }}
                className="rounded-xl"
              />
              <Skeleton
                style={{
                  width: relatedItemWidth,
                  height: MENU_ITEM_DETAIL_LAYOUT.RELATED_PRODUCT_IMAGE_HEIGHT,
                }}
                className="rounded-xl"
              />
            </View>
          </View>
        </GestureScrollView>
        <View className="border-t border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
          <View
            style={{
              paddingHorizontal: MENU_ITEM_DETAIL_LAYOUT.PADDING_X,
              paddingVertical: MENU_ITEM_DETAIL_LAYOUT.PADDING_X,
              flexDirection: 'row',
              gap: MENU_ITEM_DETAIL_LAYOUT.GAP_2,
            }}
          >
            <Skeleton style={{ flex: 1, height: 44 }} className="rounded-full" />
            <Skeleton style={{ flex: 1, height: 44 }} className="rounded-full" />
          </View>
        </View>
      </ScreenContainer>
    )
  }

  if (!productDetail) {
    return (
      <ScreenContainer
        edges={['top']}
        className="flex-1 bg-white dark:bg-gray-900"
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

  const hasPromotion =
    productDetail?.promotion && productDetail.promotion.value > 0
  const finalPrice =
    price && hasPromotion
      ? price - (price * productDetail.promotion.value) / 100
      : price
  const isOutOfStock =
    productDetail?.isLocked || productDetail?.currentStock === 0
  const isDisabled = !size || quantity <= 0 || isOutOfStock

  return (
    <ScreenContainer
      edges={['top']}
      className="flex-1 bg-white dark:bg-gray-900"
    >
      <ScreenParallaxWrapper>
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
        <NavigatePressable
          onPress={() => navigateNative.back()}
          hitSlop={HIT_SLOP_ICON}
          className="p-2 active:opacity-70"
        >
          <ArrowLeft size={24} color={isDark ? '#ffffff' : '#000000'} />
        </NavigatePressable>
        <Text className="text-lg font-bold text-gray-900 dark:text-white">
          {t('product.detail', 'Chi tiết món')}
        </Text>
        <NavigatePressable
          onPress={() => navigateNative.replace(ROUTE.CLIENT_CART)}
          hitSlop={HIT_SLOP_ICON}
          className="h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 active:opacity-80"
        >
          <ShoppingCart size={20} color={isDark ? '#ffffff' : '#111827'} />
          {cartItemCount > 0 && (
            <View
              className="absolute -right-1 -top-1 h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1"
              style={{
                borderWidth: 2,
                borderColor: isDark ? '#1f2937' : '#ffffff',
              }}
            >
              <Text className="text-[10px] font-bold text-white">
                {cartItemCount > 99 ? '99+' : cartItemCount}
              </Text>
            </View>
          )}
        </NavigatePressable>
      </View>

      <GestureScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
      >
        {/* Product Images — Fade skeleton out, content in khi heavyContentReady */}
        <View className="px-4 pt-4">
          <View
            className="mb-2 overflow-hidden rounded-lg"
            style={imageContainerStyle}
            {...(Platform.OS === 'android' && { renderToHardwareTextureAndroid: true })}
          >
            {/* Skeleton overlay — fade out */}
            <Animated.View
              style={[{ position: 'absolute', inset: 0 }, skeletonOpacityStyle]}
              pointerEvents={heavyContentReady ? 'none' : 'auto'}
            >
              <Skeleton className="h-full w-full rounded-lg" />
            </Animated.View>
            {/* Content — fade in */}
            {heavyContentReady && (
              <Animated.View style={[{ flex: 1 }, contentOpacityStyle]}>
                <Image
                  source={
                    selectedImage
                      ? { uri: `${publicFileURL}/${selectedImage}` }
                      : (Images.Food.ProductImage as unknown as number)
                  }
                  placeholder={
                    selectedImage
                      ? (Images.Food.ProductImage as unknown as number)
                      : undefined
                  }
                  placeholderContentFit="cover"
                  contentFit="cover"
                  transition={200}
                  cachePolicy="memory-disk"
                  style={{ width: '100%', height: '100%' }}
                />
              </Animated.View>
            )}
          </View>
          {heavyContentReady && carouselReady && (productDetail?.product?.images?.length ?? 0) > 0 ? (
            <Animated.View
              style={contentOpacityStyle}
              {...(Platform.OS === 'android' && { renderToHardwareTextureAndroid: true })}
            >
              <ProductImageCarousel
                images={
                  productDetail
                    ? [
                        productDetail.product.image,
                        ...(productDetail.product.images || []),
                      ]
                    : []
                }
                onImageClick={setSelectedImage}
              />
            </Animated.View>
          ) : null}
        </View>

        {/* Product Info */}
        <View className="px-4 py-6">
          <View className="flex-col gap-4">
            {/* Name and Description */}
            <View className="flex-col gap-1">
              <Text className="text-3xl font-extrabold text-gray-900 dark:text-white">
                {productDetail.product.name}
              </Text>
              <Text className="text-base text-gray-600 dark:text-gray-400">
                {productDetail.product.description}
              </Text>
            </View>

            {/* Price */}
            {price ? (
              <View className="flex-col gap-2">
                {hasPromotion ? (
                  <View className="flex-col gap-1">
                    <View className="flex-row items-center gap-2">
                      <Text className="text-base text-gray-400 line-through">
                        {formatCurrency(price)}
                      </Text>
                      <Badge className="bg-red-600 text-xs">
                        {t('product.discount', 'Giảm')}{' '}
                        {productDetail.promotion.value}%
                      </Badge>
                    </View>
                    <Text className="text-2xl font-extrabold text-red-600 dark:text-primary">
                      {formatCurrency(finalPrice || 0)}
                    </Text>
                  </View>
                ) : (
                  <Text className="text-xl font-semibold text-red-600 dark:text-primary">
                    {formatCurrency(price)}
                  </Text>
                )}
              </View>
            ) : (
              <Text className="font-semibold text-red-600 dark:text-primary">
                {t('product.chooseSizeToViewPrice', 'Chọn size để xem giá')}
              </Text>
            )}

            {/* Size Selector */}
            {productDetail.product.variants.length > 0 && (
              <View className="flex-row items-center gap-6">
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('product.selectSize', 'Chọn size')}
                </Text>
                <View className="flex-1 flex-row flex-wrap gap-2">
                  {productDetail.product.variants.map((variant) => (
                    <Pressable
                      key={variant.slug}
                      onPress={() => handleSizeChange(variant)}
                      hitSlop={HIT_SLOP_ICON}
                      className={`rounded-full border px-5 py-1 active:opacity-80 ${
                        size === variant.size.name
                          ? 'border-red-600 bg-red-600 dark:border-primary dark:bg-primary'
                          : 'border-gray-500 bg-transparent dark:border-gray-400'
                      }`}
                      {...({ unstable_pressDelay: 0 } as object)}
                    >
                      <Text
                        className={`text-xs ${
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

            {/* Quantity Selector */}
            {productDetail.product.variants.length > 0 && (
              <View className="flex-row items-center gap-6">
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('product.selectQuantity', 'Số lượng')}
                </Text>
                <View className="flex-1 flex-row items-center gap-2">
                  <NonPropQuantitySelector
                    quantity={quantity}
                    onChange={handleQuantityChange}
                    isLimit={productDetail.product.isLimit}
                    disabled={productDetail.isLocked}
                    currentQuantity={productDetail.currentStock}
                  />
                  {productDetail.product.isLimit && (
                    <Text className="text-xs text-gray-600 dark:text-gray-400">
                      {productDetail.currentStock}/{productDetail.defaultStock}{' '}
                      {t('product.inStock', 'còn hàng')}
                    </Text>
                  )}
                </View>
              </View>
            )}

            {/* Note Input */}
            {/* <View className="flex-col gap-2">
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {tMenu('menu.note', 'Ghi chú')}
              </Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder={tMenu('menu.notePlaceholder', 'Nhập ghi chú cho món này...')}
                multiline
                numberOfLines={3}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800"
                textAlignVertical="top"
              />
            </View> */}

            {/* Promotion Info */}
            {productDetail.promotion && (
              <View className="rounded-lg border-l-4 border-yellow-500 bg-yellow-50 p-4 dark:bg-yellow-900/20">
                <View className="mb-2 flex-row items-center gap-2">
                  <Text className="text-lg font-bold text-red-600 dark:text-primary">
                    🎉 {t('product.specialOffer', 'Ưu đãi đặc biệt')}
                  </Text>
                </View>
                <Text className="text-sm text-gray-700 dark:text-gray-300">
                  {productDetail.promotion.description}
                </Text>
              </View>
            )}
          </View>
        </View>

        {productDetail.product.catalog?.slug ? (
          <View
            className="relative pb-6"
            {...(Platform.OS === 'android' && { renderToHardwareTextureAndroid: true })}
          >
            {/* Content — fade in (chỉ mount khi heavyContentReady) */}
            {heavyContentReady && sliderReady && (
              <Animated.View style={contentOpacityStyle}>
                <SliderRelatedProducts
                  currentProduct={slug || ''}
                  catalog={productDetail.product.catalog.slug}
                />
              </Animated.View>
            )}
            {/* Skeleton — in flow khi !heavyContentReady, overlay khi heavyContentReady */}
            <Animated.View
              style={[
                heavyContentReady && {
                  position: 'absolute' as const,
                  top: 0,
                  left: 0,
                  right: 0,
                },
                skeletonOpacityStyle,
              ]}
              pointerEvents={heavyContentReady ? 'none' : 'auto'}
            >
              <View
                style={{
                  gap: MENU_ITEM_DETAIL_LAYOUT.GAP_3,
                  paddingHorizontal: MENU_ITEM_DETAIL_LAYOUT.PADDING_X,
                }}
              >
                <Skeleton
                  style={{ width: 128, height: 16 }}
                  className="rounded-md"
                />
                <View
                  style={{
                    flexDirection: 'row',
                    gap: MENU_ITEM_DETAIL_LAYOUT.RELATED_ITEM_SPACING,
                  }}
                >
                  <Skeleton
                    style={{
                      width: MENU_ITEM_DETAIL_LAYOUT.relatedProductItemWidth(screenWidth),
                      height: MENU_ITEM_DETAIL_LAYOUT.RELATED_PRODUCT_IMAGE_HEIGHT,
                    }}
                    className="rounded-xl"
                  />
                  <Skeleton
                    style={{
                      width: MENU_ITEM_DETAIL_LAYOUT.relatedProductItemWidth(screenWidth),
                      height: MENU_ITEM_DETAIL_LAYOUT.RELATED_PRODUCT_IMAGE_HEIGHT,
                    }}
                    className="rounded-xl"
                  />
                  <Skeleton
                    style={{
                      width: MENU_ITEM_DETAIL_LAYOUT.relatedProductItemWidth(screenWidth),
                      height: MENU_ITEM_DETAIL_LAYOUT.RELATED_PRODUCT_IMAGE_HEIGHT,
                    }}
                    className="rounded-xl"
                  />
                </View>
              </View>
            </Animated.View>
          </View>
        ) : null}
      </GestureScrollView>

      {/* Fixed Bottom Buttons */}
      <View className="border-t border-gray-200 bg-white px-4 py-4 dark:border-gray-700 dark:bg-gray-900">
        <View className="flex-row gap-2">
          <Button
            onPress={handleBuyNow}
            disabled={isDisabled}
            className="flex-1"
            variant={isDisabled ? 'outline' : 'default'}
          >
            <Text className="font-semibold text-white">
              {isOutOfStock
                ? tMenu('menu.outOfStock', 'Hết hàng')
                : tMenu('menu.buyNow', 'Mua ngay')}
            </Text>
          </Button>
          <Button
            onPress={handleAddToCart}
            disabled={isDisabled}
            variant="outline"
            className="flex-1"
          >
            <View className="flex-row items-center gap-2">
              <ShoppingBag
                size={20}
                color={isDisabled ? '#9ca3af' : '#374151'}
              />
              <Text className="font-semibold">
                {isOutOfStock
                  ? tMenu('menu.outOfStock', 'Hết hàng')
                  : tMenu('menu.addToCart', 'Thêm vào giỏ')}
              </Text>
            </View>
          </Button>
        </View>
      </View>
      </ScreenParallaxWrapper>
    </ScreenContainer>
  )
})

/**
 * MenuItemDetailPage — Render pipeline tối ưu cho Android.
 *
 * Lần render đầu: chỉ Skeleton (phần tĩnh) — hiện ngay, không block JS thread.
 * Frame tiếp theo: mount MenuItemDetailContent (fetch data, phần động defer 300ms).
 */
export default function MenuItemDetailPage() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])

  if (!mounted) return <MenuItemSkeletonShell />
  return <MenuItemDetailContent />
}
