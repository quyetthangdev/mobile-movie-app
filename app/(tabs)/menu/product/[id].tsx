/**
 * Product Detail — parallax hero + size/quantity controls.
 * UI & logic ported from perf/product/[id].tsx, store bridged to order-flow.
 */
import { useFocusEffect, useIsFocused } from '@react-navigation/native'
import dayjs from 'dayjs'
import { Image } from 'expo-image'
import { Stack, useLocalSearchParams, useNavigation, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppState, RefreshControl, StyleSheet, View, useColorScheme } from 'react-native'
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated'

import {
  ProductDetailHeaderAnimated,
  ProductDetailHeaderSimple,
} from '@/components/product/product-detail-header'
import { ProductHeroImage } from '@/components/product/product-hero-image'
import { ProductInfoCard } from '@/components/product/product-info-card'
import {
  DeferredOptionsSection,
  ProductDetailOptionsSection,
} from '@/components/product/product-detail-options-section'
import { PerfPriceFooter } from '@/components/product/product-price-footer'
import { useSpecificMenuItem } from '@/hooks'
import { usePrimaryColor } from '@/hooks/use-primary-color'
import { OrderFlowStep } from '@/constants'
import { useOrderFlowStore, useUserStore } from '@/stores'
import {
  useDetailResetForProduct,
  useDetailSetProductPromotion,
  useDetailSetSelection,
  useOrderFlowCartItemCount,
} from '@/stores/selectors'
import { useProductDetailSelectionStore } from '@/stores/product-detail-selection.store'
import { IOrderItem } from '@/types'
import { showToast } from '@/utils'

/**
 * Isolates useIsFocused() so only this tiny component re-renders on
 * focus/blur — the heavy ProductDetailPage tree stays untouched.
 */
const FocusAwareHeader = React.memo(function FocusAwareHeader({
  isDark,
  fade,
  onBack,
  onCart,
}: {
  isDark: boolean
  fade: SharedValue<number>
  onBack: () => void
  onCart: () => void
}) {
  const isFocused = useIsFocused()
  const cartCount = useOrderFlowCartItemCount()

  if (isFocused) {
    return (
      <ProductDetailHeaderAnimated
        isDark={isDark}
        fade={fade}
        onBack={onBack}
        onCart={onCart}
        cartCount={cartCount}
      />
    )
  }

  return (
    <ProductDetailHeaderSimple
      isDark={isDark}
      onBack={onBack}
      onCart={onCart}
      cartCount={cartCount}
    />
  )
})

function ProductDetailContent() {
  const router = useRouter()
  const isDark = useColorScheme() === 'dark'
  const primaryColor = usePrimaryColor()
  const { t } = useTranslation('menu')
  const { id, name, basePrice, promotionValue, imageUrl, imageUrls } =
    useLocalSearchParams<{
      id: string
      name?: string
      basePrice?: string
      promotionValue?: string
      imageUrl?: string
      imageUrls?: string
    }>()

  const shouldClearMemoryCacheOnBlurRef = useRef(false)
  const scrollY = useSharedValue(0)
  const headerFade = useSharedValue(0)
  const headerFadeDistance = 150

  // Product detail store — actions only (no data subscriptions at root)
  const resetForProduct = useDetailResetForProduct()
  const setProductPromotion = useDetailSetProductPromotion()
  const setSelection = useDetailSetSelection()

  const product = useMemo(() => {
    const basePriceRaw = Number.parseInt(basePrice ?? '', 10)
    const promotionRaw = Number.parseInt(promotionValue ?? '', 10)
    return {
      id: id ?? 'unknown',
      name: name ?? `Món ${id ?? ''}`,
      basePrice: Number.isFinite(basePriceRaw) ? Math.max(0, basePriceRaw) : 59000,
      promotionValue: Number.isFinite(promotionRaw) ? Math.max(0, promotionRaw) : 0,
    }
  }, [id, name, basePrice, promotionValue])

  const heroImageUrls = useMemo(() => {
    if (!imageUrls) return []
    try {
      const parsed = JSON.parse(imageUrls) as unknown
      if (!Array.isArray(parsed)) return []
      return parsed.filter((v): v is string => typeof v === 'string' && !!v.trim())
    } catch {
      return []
    }
  }, [imageUrls])

  // Fetch full product data for variants
  const { data: menuItemRes, refetch: refetchMenuItem } = useSpecificMenuItem(product.id)
  const menuItem = useMemo(() => menuItemRes?.result, [menuItemRes?.result])
  const variants = useMemo(() => menuItem?.product?.variants ?? [], [menuItem])
  const smallestVariant = useMemo(
    () => variants.length > 0 ? variants.reduce((p, c) => (p.price < c.price ? p : c)) : null,
    [variants],
  )
  const description = menuItem?.product?.description ?? ''
  const isLocked = menuItem?.isLocked ?? false
  const isLimit = menuItem?.product?.isLimit ?? false
  const currentStock = menuItem?.currentStock ?? 0
  const defaultStock = menuItem?.defaultStock ?? 0

  // Init store on product change
  useEffect(() => {
    resetForProduct(product.id)
  }, [product.id, resetForProduct])

  // Set promotion discount when data available
  useEffect(() => {
    if (product.promotionValue > 0) {
      setProductPromotion(product.promotionValue)
    }
  }, [product.promotionValue, setProductPromotion])

  // Initialize ordering flow — read via getState() to avoid re-render deps
  const initRequestedRef = useRef(false)
  useEffect(() => {
    if (initRequestedRef.current) return
    const id = setTimeout(() => {
      const store = useOrderFlowStore.getState()
      if (!store.isHydrated) return
      initRequestedRef.current = true
      if (store.currentStep !== OrderFlowStep.ORDERING) {
        store.setCurrentStep(OrderFlowStep.ORDERING)
      }
      if (!store.orderingData) {
        store.initializeOrdering()
        return
      }
      const userSlug = useUserStore.getState().userInfo?.slug
      if (userSlug && !store.orderingData?.owner?.trim()) {
        store.initializeOrdering()
      }
    }, 500)
    return () => clearTimeout(id)
  }, [])

  useEffect(() => {
    const subscription = AppState.addEventListener('memoryWarning', () => {
      shouldClearMemoryCacheOnBlurRef.current = true
    })
    return () => subscription.remove()
  }, [])

  const onScroll = useAnimatedScrollHandler((event) => {
    const y = event.contentOffset.y
    scrollY.value = y
    headerFade.value = Math.max(0, Math.min(1, y / headerFadeDistance))
  })

  const headerStyle = useAnimatedStyle(() => {
    const y = Math.max(-140, scrollY.value)
    return {
      transform: [
        { translateY: y * 0.45 },
        { scale: scrollY.value < 0 ? 1.1 : 1 },
      ],
    }
  })

  useFocusEffect(
    useCallback(() => {
      return () => {
        if (!shouldClearMemoryCacheOnBlurRef.current) return
        shouldClearMemoryCacheOnBlurRef.current = false
        queueMicrotask(() => Image.clearMemoryCache())
      }
    }, []),
  )

  const [isRefreshing, setIsRefreshing] = useState(false)
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true)
    refetchMenuItem().finally(() => setIsRefreshing(false))
  }, [refetchMenuItem])

  const handleBack = useCallback(() => router.back(), [router])
  const handleCart = useCallback(
    () => router.push('/(tabs)/menu/cart'),
    [router],
  )

  const handleAddToCart = useCallback(() => {
    // Read detail store at call time — zero subscriptions at root
    const detailState = useProductDetailSelectionStore.getState()
    const { selectedVariant: sv, quantity: qty, note: n } = detailState
    if (!sv) return

    // Read order-flow store at call time
    const store = useOrderFlowStore.getState()
    if (!store.isHydrated) return
    if (store.currentStep !== OrderFlowStep.ORDERING) {
      store.setCurrentStep(OrderFlowStep.ORDERING)
    }
    if (!store.orderingData) {
      store.initializeOrdering()
      return
    }
    const userSlug = useUserStore.getState().userInfo?.slug
    if (userSlug && !store.orderingData?.owner?.trim()) {
      store.initializeOrdering()
    }

    const orderItem: IOrderItem = {
      id: `item_${dayjs().valueOf()}_${Math.random().toString(36).substring(2, 11)}`,
      slug: menuItem?.product?.slug || product.id,
      image: menuItem?.product?.image || '',
      name: menuItem?.product?.name || product.name,
      quantity: qty,
      size: sv.size?.name || '',
      allVariants: variants,
      variant: sv,
      originalPrice: sv.price,
      productSlug: menuItem?.product?.slug || product.id,
      description: menuItem?.product?.description || '',
      isLimit: menuItem?.product?.isLimit || false,
      isGift: menuItem?.product?.isGift || false,
      promotion: menuItem?.promotion ? menuItem.promotion : null,
      promotionValue: menuItem?.promotion ? menuItem.promotion.value : 0,
      note: n.trim(),
    }

    try {
      store.addOrderingItem(orderItem)
      showToast(t('menu.addedToCart', { name: product.name }))
      detailState.setNote('')
      if (smallestVariant) {
        setSelection({
          variant: smallestVariant,
          size: smallestVariant.size?.name || '',
          price: smallestVariant.price,
          quantity: 1,
        })
      }
    } catch {
      // Silent fail
    }
  }, [menuItem, product, variants, smallestVariant, setSelection, t])

  const rootStyle = useMemo(
    () => [detailStyles.root, { backgroundColor: isDark ? '#000000' : '#ffffff' }],
    [isDark],
  )

  const fallbackStyle = useMemo(
    () => ({
      height: 120,
      borderRadius: 12,
      backgroundColor: isDark ? '#1f2937' : '#f3f4f6',
    }),
    [isDark],
  )

  return (
    <View style={rootStyle}>
      <Stack.Screen
        options={{
          statusBarStyle: 'light',
          contentStyle: { backgroundColor: '#e5e7eb' },
        }}
      />

      {/* Layer 1: Scrollable content — hero starts at y=0 (behind status bar) */}
      <Animated.ScrollView
        style={detailStyles.scrollView}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        contentContainerStyle={detailStyles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={primaryColor}
            colors={[primaryColor]}
          />
        }
      >
        <ProductHeroImage
          imageUrl={imageUrl ?? null}
          imageUrls={heroImageUrls}
          style={headerStyle}
        />

        <View style={detailStyles.bodySection}>
          <ProductInfoCard
            name={product.name}
            basePrice={product.basePrice}
            promotionValue={product.promotionValue}
          />

          <DeferredOptionsSection fallback={<View style={fallbackStyle} />}>
            <ProductDetailOptionsSection
              productSlug={product.id}
              variants={variants}
              description={description}
              isLimit={isLimit}
              isLocked={isLocked}
              currentStock={currentStock}
              defaultStock={defaultStock}
              inStockLabel={t('menu.stock')}
              selectSizeLabel={t('menu.selectSize')}
              selectQuantityLabel={t('menu.quantity')}
              descriptionLabel={t('menu.description')}
              noDescriptionLabel={t('menu.noDescription')}
            />
          </DeferredOptionsSection>
        </View>
      </Animated.ScrollView>

      {/* Layer 2: Header overlay */}
      <FocusAwareHeader
        isDark={isDark}
        fade={headerFade}
        onBack={handleBack}
        onCart={handleCart}
      />

      {/* Layer 3: Price footer — absolute bottom */}
      <PerfPriceFooter
        totalPriceLabel={t('menu.totalAmount')}
        chooseSizeLabel={t('menu.chooseSize')}
        addToCartLabel={t('menu.addToCart')}
        outOfStockLabel={t('menu.outOfStock')}
        isLocked={isLocked}
        onAddToCart={handleAddToCart}
      />
    </View>
  )
}

export default function ProductDetailPage() {
  const navigation = useNavigation()

  useEffect(() => {
    navigation.setOptions({
      fullScreenGestureEnabled: false,
      fullScreenGestureShadowEnabled: false,
    })
  }, [navigation])

  return <ProductDetailContent />
}

const detailStyles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  bodySection: {
    padding: 16,
    gap: 16,
  },
})
