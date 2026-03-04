import { ScreenContainer } from '@/components/layout'
import { Image } from 'expo-image'
import { useLocalSearchParams } from 'expo-router'
import { ArrowLeft, ShoppingBag, ShoppingCart } from 'lucide-react-native'
import moment from 'moment'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Animated, {
  runOnUI,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
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
import { FavoriteButton, ProductImageCarousel, SliderRelatedProducts } from '@/components/menu'
import { Badge, Button } from '@/components/ui'
import { MENU_ITEM_DETAIL_LAYOUT } from '@/constants/menu-item-detail-layout'
import { OrderFlowStep, publicFileURL, ROUTE, SPRING_CONFIGS } from '@/constants'
import { useSpecificMenuItem } from '@/hooks'
import { HIT_SLOP_ICON, navigateNative } from '@/lib/navigation'
import { NavigatePressable } from '@/components/navigation'
import { useOrderFlowMenuItemDetail } from '@/stores/selectors'
import { useUserStore } from '@/stores'
import { IOrderItem, IProductVariant } from '@/types'
import { formatCurrency, showToast } from '@/utils'

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

  // Freeze Content: runAfterInteractions + 50ms nghỉ chiến thuật.
  // Animation chuyển trang thường lag ở 50–80% — setTimeout(50) đảm bảo JS Thread hoàn toàn rảnh
  // trước khi mount ProductImageCarousel, SliderRelatedProducts, variants.map.
  const [contentReady, setContentReady] = useState(false)
  const [carouselReady, setCarouselReady] = useState(false)
  const [sliderReady, setSliderReady] = useState(false)
  const skeletonOpacity = useSharedValue(1)
  const contentOpacity = useSharedValue(0)

  const STRATEGIC_DELAY_MS = 50

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    let raf1 = -1
    let raf2 = -1
    const task = InteractionManager.runAfterInteractions(() => {
      timeoutId = setTimeout(() => {
        setContentReady(true)
        runOnUI(() => {
          'worklet'
          skeletonOpacity.value = withSpring(0, SPRING_CONFIGS.modal)
          contentOpacity.value = withSpring(1, SPRING_CONFIGS.modal)
        })()
        raf1 = requestAnimationFrame(() => {
          setCarouselReady(true)
          raf2 = requestAnimationFrame(() => setSliderReady(true))
        })
      }, STRATEGIC_DELAY_MS)
    })
    return () => {
      task.cancel()
      if (timeoutId != null) clearTimeout(timeoutId)
      if (raf1 >= 0) cancelAnimationFrame(raf1)
      if (raf2 >= 0) cancelAnimationFrame(raf2)
    }
  }, [skeletonOpacity, contentOpacity])

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
  const [isFavorite, setIsFavorite] = useState(false)

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

  // Loading: Skeleton đơn giản nhất — Animated.View với backgroundColor.
  // Tuyệt đối không mount layout phức tạp khi đang trượt trang (JS Stack).
  if (isLoading) {
    return (
      <ScreenContainer edges={['top']} className="flex-1 bg-white dark:bg-gray-900">
        <View className="flex-row items-center border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <NavigatePressable onPress={() => navigateNative.back()} hitSlop={HIT_SLOP_ICON} className="p-2">
            <ArrowLeft size={24} color={isDark ? '#ffffff' : '#000000'} />
          </NavigatePressable>
        </View>
        <Animated.View
          style={{ flex: 1, backgroundColor: isDark ? '#374151' : '#e5e7eb' }}
        />
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
        <View className="flex-row items-center gap-2">
          <FavoriteButton
            isFavorite={isFavorite}
            onToggle={() => setIsFavorite((v) => !v)}
            size={22}
            className="p-2"
          />
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
      </View>

      <GestureScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
      >
        {/* Product Images — Shared element từ ClientMenuItem, fade skeleton khi contentReady */}
        <View className="px-4 pt-4">
          <Animated.View
            {...(slug ? ({ sharedTransitionTag: `menu-item-${slug}` } as object) : {})}
            className="mb-2 overflow-hidden rounded-lg"
            style={imageContainerStyle}
            {...(Platform.OS === 'android' && { renderToHardwareTextureAndroid: true })}
          >
            {/* Skeleton overlay — chỉ màu nền, zIndex trên cùng, pointerEvents="none" khi contentReady */}
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: isDark ? '#374151' : '#e5e7eb',
                  zIndex: 10,
                },
                skeletonOpacityStyle,
              ]}
              pointerEvents={contentReady ? 'none' : 'auto'}
            />
            {/* Content — fade in */}
            {contentReady && (
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
          </Animated.View>
          {contentReady && carouselReady && (productDetail?.product?.images?.length ?? 0) > 0 ? (
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

        {/* Product Info — chỉ mount khi contentReady (tránh variants.map nặng khi đang trượt) */}
        {contentReady ? (
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
        ) : (
          /* Placeholder đơn giản — giữ khung layout (px-4 py-6) tránh Layout Shift */
          <View className="px-4 py-6">
            <View
              style={{
                height: 280,
                backgroundColor: isDark ? '#374151' : '#e5e7eb',
              }}
            />
          </View>
        )}

        {productDetail.product.catalog?.slug ? (
          <View
            className="relative pb-6"
            {...(Platform.OS === 'android' && { renderToHardwareTextureAndroid: true })}
          >
            {/* SliderRelatedProducts — chỉ mount khi sliderReady (sau carouselReady) */}
            {contentReady && sliderReady && (
              <Animated.View style={contentOpacityStyle}>
                <SliderRelatedProducts
                  currentProduct={slug || ''}
                  catalog={productDetail.product.catalog.slug}
                />
              </Animated.View>
            )}
            {/* Skeleton — chỉ màu nền, zIndex trên cùng, pointerEvents="none" khi contentReady */}
            <Animated.View
              style={[
                contentReady && {
                  position: 'absolute' as const,
                  top: 0,
                  left: 0,
                  right: 0,
                  zIndex: 10,
                },
                {
                  height: 120,
                  marginHorizontal: 16,
                  backgroundColor: isDark ? '#374151' : '#e5e7eb',
                },
                skeletonOpacityStyle,
              ]}
              pointerEvents={contentReady ? 'none' : 'auto'}
            />
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
    </ScreenContainer>
  )
})

/**
 * MenuItemDetailPage — Render pipeline tối ưu cho JS Stack.
 *
 * Lần render đầu: Animated.View đơn giản — không layout phức tạp khi đang trượt trang.
 * Frame tiếp theo: mount MenuItemDetailContent.
 */
export default function MenuItemDetailPage() {
  const isDark = useColorScheme() === 'dark'
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])

  if (!mounted) {
    return (
      <ScreenContainer edges={['top']} className="flex-1 bg-white dark:bg-gray-900">
        <View className="flex-row items-center border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <NavigatePressable onPress={() => navigateNative.back()} hitSlop={HIT_SLOP_ICON} className="p-2">
            <ArrowLeft size={24} color={isDark ? '#ffffff' : '#000000'} />
          </NavigatePressable>
        </View>
        <Animated.View
          style={{ flex: 1, backgroundColor: isDark ? '#374151' : '#e5e7eb' }}
        />
      </ScreenContainer>
    )
  }
  return <MenuItemDetailContent />
}
