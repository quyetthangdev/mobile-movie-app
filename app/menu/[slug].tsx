import { useLocalSearchParams, useRouter } from 'expo-router'
import { ArrowLeft, ShoppingBag, ShoppingCart } from 'lucide-react-native'
import moment from 'moment'
import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Image, ScrollView, Text, TouchableOpacity, useColorScheme, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Images } from '@/assets/images'
import NonPropQuantitySelector from '@/components/button/non-prop-quantity-selector'
import { ProductImageCarousel, SliderRelatedProducts } from '@/components/menu'
import { Badge, Button } from '@/components/ui'
import { OrderFlowStep, publicFileURL, ROUTE } from '@/constants'
import { useSpecificMenuItem } from '@/hooks'
import { useOrderFlowStore, useUserStore } from '@/stores'
import { IOrderItem, IProductVariant } from '@/types'
import { formatCurrency, showToast } from '@/utils'

export default function MenuItemDetailPage() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const router = useRouter()
  const { t } = useTranslation('product')
  const { t: tMenu } = useTranslation('menu')
  const { t: tToast } = useTranslation('toast')
  const { userInfo } = useUserStore()
  const isDark = useColorScheme() === 'dark'

  const {
    currentStep,
    isHydrated,
    orderingData,
    initializeOrdering,
    addOrderingItem,
    setCurrentStep,
    getCartItems,
  } = useOrderFlowStore()

  // Calculate cart item count
  const currentCartItems = getCartItems()
  const cartItemCount =
    currentCartItems?.orderItems?.reduce(
      (total, item) => total + (item.quantity || 0),
      0,
    ) || 0

  const { data: product, isLoading } = useSpecificMenuItem(slug || '')

  const productDetail = product?.result

  // Calculate initial variant (lowest price) using useMemo
  const initialVariant = useMemo(() => {
    if (productDetail?.product.variants && productDetail.product.variants.length > 0) {
      return productDetail.product.variants.reduce((prev, curr) =>
        prev.price < curr.price ? prev : curr
      )
    }
    return null
  }, [productDetail])

  // Initialize state
  const [size, setSize] = useState<string | null>(null)
  const [price, setPrice] = useState<number | null>(null)
  const [note, setNote] = useState<string>('')
  const [quantity, setQuantity] = useState<number>(1)
  const [selectedVariant, setSelectedVariant] = useState<IProductVariant | null>(null)
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

  // 🚀 Đảm bảo đang ở ORDERING phase khi component mount
  useEffect(() => {
    if (isHydrated) {
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
  }, [isHydrated, currentStep, orderingData, userInfo?.slug, setCurrentStep, initializeOrdering])

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#e50914" />
          <Text className="mt-4 text-gray-600 dark:text-gray-400">Đang tải...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!productDetail) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
        <View className="flex-1 justify-center items-center px-4">
          <Text className="text-2xl font-bold mb-4">Không tìm thấy món</Text>
          <Button onPress={() => router.back()}>
            <Text>Quay lại</Text>
          </Button>
        </View>
      </SafeAreaView>
    )
  }

  const handleSizeChange = (variant: IProductVariant) => {
    setSelectedVariant(variant)
    setSize(variant.size.name)
    setPrice(variant.price)
  }

  const handleQuantityChange = (newQuantity: number) => {
    setQuantity(newQuantity)
  }

  const handleAddToCart = () => {
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
      promotionValue: productDetail?.promotion ? productDetail?.promotion?.value : 0,
      note: note.trim(),
    }

    try {
      addOrderingItem(orderItem)
      showToast(tToast('toast.addSuccess', 'Đã thêm vào giỏ hàng'), 'Thông báo')
      
      // Reset states
      setNote('')
      if (productDetail?.product.variants && productDetail.product.variants.length > 0) {
        const smallestVariant = productDetail.product.variants.reduce((prev, curr) =>
          prev.price < curr.price ? prev : curr
        )
        setSelectedVariant(smallestVariant)
        setSize(smallestVariant.size.name)
        setPrice(smallestVariant.price)
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('❌ Error adding item to cart:', error)
    }
  }

  const handleBuyNow = () => {
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
      promotionValue: productDetail?.promotion ? productDetail?.promotion?.value : 0,
      note: note.trim(),
    }

    try {
      addOrderingItem(orderItem)
      showToast(tToast('toast.addSuccess', 'Đã thêm vào giỏ hàng'), 'Thông báo')
      
      // Reset states
      setNote('')
      if (productDetail?.product.variants && productDetail.product.variants.length > 0) {
        const smallestVariant = productDetail.product.variants.reduce((prev, curr) =>
          prev.price < curr.price ? prev : curr
        )
        setSelectedVariant(smallestVariant)
        setSize(smallestVariant.size.name)
        setPrice(smallestVariant.price)
      }
      
      // Navigate to cart
      router.push(ROUTE.CLIENT_CART)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('❌ Error adding item to cart:', error)
    }
  }

  const hasPromotion = productDetail?.promotion && productDetail.promotion.value > 0
  const finalPrice = price && hasPromotion
    ? price - (price * productDetail.promotion.value) / 100
    : price
  const isOutOfStock = productDetail?.isLocked || productDetail?.currentStock === 0
  const isDisabled = !size || quantity <= 0 || isOutOfStock

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <ArrowLeft size={24} color={isDark ? '#ffffff' : '#000000'} />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900 dark:text-white">
          {t('product.detail', 'Chi tiết món')}
        </Text>
        <TouchableOpacity
          onPress={() => router.push(ROUTE.CLIENT_CART)}
          className="w-10 h-10 rounded-full border border-gray-200 dark:border-gray-700 items-center justify-center bg-white dark:bg-gray-800"
        >
          <ShoppingCart size={20} color={isDark ? '#ffffff' : '#111827'} />
          {cartItemCount > 0 && (
            <View
              className="absolute -top-1 -right-1 bg-red-600 rounded-full min-w-[18px] h-[18px] items-center justify-center px-1"
              style={{
                borderWidth: 2,
                borderColor: isDark ? '#1f2937' : '#ffffff',
              }}
            >
              <Text className="text-white text-[10px] font-bold">
                {cartItemCount > 99 ? '99+' : cartItemCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Product Images */}
        <View className="px-4 pt-4">
          <View className="w-full mb-2" style={{ aspectRatio: 1 }}>
            <Image
              source={
                selectedImage
                  ? { uri: `${publicFileURL}/${selectedImage}` }
                  : Images.Food.ProductImage as unknown as number
              }
              className="w-full h-full rounded-lg"
              resizeMode="cover"
            />
          </View>
          <ProductImageCarousel
            images={
              productDetail
                ? [productDetail.product.image, ...(productDetail.product.images || [])]
                : []
            }
            onImageClick={setSelectedImage}
          />
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
                    <View className="flex-row gap-2 items-center">
                      <Text className="text-base line-through text-gray-400">
                        {formatCurrency(price)}
                      </Text>
                      <Badge className="text-xs bg-red-600">
                        {t('product.discount', 'Giảm')} {productDetail.promotion.value}%
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
              <View className="flex-row gap-6 items-center">
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('product.selectSize', 'Chọn size')}
                </Text>
                <View className="flex-row gap-2 flex-1 flex-wrap">
                  {productDetail.product.variants.map((variant) => (
                    <TouchableOpacity
                      key={variant.slug}
                      onPress={() => handleSizeChange(variant)}
                      className={`px-5 py-1 rounded-full border ${
                        size === variant.size.name
                          ? 'border-red-600 dark:border-primary bg-red-600 dark:bg-primary'
                          : 'border-gray-500 dark:border-gray-400 bg-transparent'
                      }`}
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
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Quantity Selector */}
            {productDetail.product.variants.length > 0 && (
              <View className="flex-row gap-6 items-center">
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('product.selectQuantity', 'Số lượng')}
                </Text>
                <View className="flex-row gap-2 items-center flex-1">
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
              <View className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border-l-4 border-yellow-500">
                <View className="flex-row gap-2 items-center mb-2">
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

        {/* Related Products */}
        {productDetail.product.catalog?.slug && (
          <View className="pb-6">
            <SliderRelatedProducts
              currentProduct={slug || ''}
              catalog={productDetail.product.catalog.slug}
            />
          </View>
        )}
      </ScrollView>

      {/* Fixed Bottom Buttons */}
      <View className="px-4 py-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
        <View className="flex-row gap-2">
          <Button
            onPress={handleBuyNow}
            disabled={isDisabled}
            className="flex-1"
            variant={isDisabled ? 'outline' : 'default'}
          >
            <Text className="text-white font-semibold">
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
              <ShoppingBag size={20} color={isDisabled ? '#9ca3af' : '#374151'} />
              <Text className="font-semibold">
                {isOutOfStock
                  ? tMenu('menu.outOfStock', 'Hết hàng')
                  : tMenu('menu.addToCart', 'Thêm vào giỏ')}
              </Text>
            </View>
          </Button>
        </View>
      </View>
    </SafeAreaView>
  )
}
