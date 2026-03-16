import { Image as ExpoImage } from 'expo-image'
import { useLocalSearchParams } from 'expo-router'
import { ChevronLeft, ShoppingCart } from 'lucide-react-native'
import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  InteractionManager,
  ScrollView,
  Text,
  View,
  useColorScheme,
} from 'react-native'

import { Images } from '@/assets/images'
import { MenuItemQuantityControl } from '@/components/menu'
import { CartBadge } from '@/components/navigation/cart-badge'
import { NativeGesturePressable } from '@/components/navigation/native-gesture-pressable'
import { Skeleton } from '@/components/ui'
import { publicFileURL } from '@/constants'
import { TAB_ROUTES } from '@/constants/navigation.config'
import { useRunAfterTransition, useSpecificMenuItem } from '@/hooks'
import { useMasterTransitionOptional } from '@/lib/navigation/master-transition-provider'
import { getThemeColor } from '@/lib/utils'
import type { IMenuItem } from '@/types'
import { formatCurrency } from '@/utils'

export default function MenuItemDetailPlaceholder() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const { t } = useTranslation('product')
  const isDark = useColorScheme() === 'dark'
  const primaryColor = getThemeColor(isDark).primary
  const masterTransition = useMasterTransitionOptional()

  const [allowFetch, setAllowFetch] = useState(false)
  const [isContentReady, setIsContentReady] = useState(false)

  useRunAfterTransition(() => setAllowFetch(true), [])

  // Defer query + content 100ms sau transition (Native Stack) — tránh FPS drop, đồng bộ với app/menu/[slug]
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    const task = InteractionManager.runAfterInteractions(() => {
      timeoutId = setTimeout(() => setIsContentReady(true), 100)
    })
    return () => {
      task.cancel()
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [])

  const enabled = allowFetch && isContentReady && !!slug
  const { data, isLoading } = useSpecificMenuItem(slug || '', enabled)

  useEffect(() => {
    if (!isLoading && masterTransition?.hideLoadingOverlay) {
      masterTransition.hideLoadingOverlay()
    }
  }, [isLoading, masterTransition])

  const productDetail = data?.result

  const minPrice = useMemo(() => {
    const variants = productDetail?.product.variants ?? []
    if (!variants.length) return 0
    return Math.min(...variants.map((v) => v.price))
  }, [productDetail?.product.variants])

  const imageUrl = useMemo(() => {
    const img = productDetail?.product.image
    if (!img) return ''
    const base = (publicFileURL ?? '').replace(/\/$/, '')
    return `${base}/${img.replace(/^\//, '')}`
  }, [productDetail?.product.image])

  const hasStock = useMemo(() => {
    const currentStock = productDetail?.currentStock ?? 0
    const isLimit = productDetail?.product.isLimit
    return currentStock > 0 || !isLimit
  }, [productDetail?.currentStock, productDetail?.product.isLimit])

  const showSkeleton =
    !allowFetch || !isContentReady || isLoading || !productDetail

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      {/* Header: back - logo - cart */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 8,
        }}
      >
        <NativeGesturePressable navigation={{ type: 'back' }} hapticStyle="light">
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: '#e5e7eb',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#ffffff',
            }}
          >
            <ChevronLeft size={18} color="#111827" />
          </View>
        </NativeGesturePressable>
        <ExpoImage
          source={Images.Brand.Logo as unknown as number}
          style={{ height: 32, width: 112 }}
          contentFit="contain"
        />
        <NativeGesturePressable
          navigation={{
            type: 'push',
            href: TAB_ROUTES.CART,
          }}
          hapticStyle="light"
        >
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: '#e5e7eb',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#ffffff',
            }}
          >
            <ShoppingCart size={18} color="#111827" />
            <CartBadge />
          </View>
        </NativeGesturePressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          {showSkeleton ? (
            <View>
              <Skeleton
                style={{
                  width: '100%',
                  height: 260,
                  borderRadius: 16,
                  marginBottom: 16,
                }}
              />
              <Skeleton
                style={{
                  width: '70%',
                  height: 22,
                  borderRadius: 6,
                  marginBottom: 8,
                }}
              />
              <Skeleton
                style={{
                  width: 120,
                  height: 20,
                  borderRadius: 6,
                  marginBottom: 16,
                }}
              />
              <Skeleton
                style={{
                  width: '90%',
                  height: 14,
                  borderRadius: 4,
                  marginBottom: 8,
                }}
              />
              <Skeleton
                style={{
                  width: '80%',
                  height: 14,
                  borderRadius: 4,
                  marginBottom: 24,
                }}
              />
              <View style={{ alignItems: 'flex-end' }}>
                <Skeleton
                  style={{ width: 40, height: 40, borderRadius: 20 }}
                />
              </View>
            </View>
          ) : (
            <View>
              {/* Ảnh */}
              <View
                style={{
                  width: '100%',
                  height: 260,
                  borderRadius: 16,
                  overflow: 'hidden',
                  backgroundColor: '#f3f4f6',
                  marginBottom: 16,
                }}
              >
                {imageUrl ? (
                  <ExpoImage
                    source={{ uri: imageUrl }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                  />
                ) : (
                  <View style={{ flex: 1, backgroundColor: '#e5e7eb' }} />
                )}
              </View>

              {/* Tên & giá */}
              <View style={{ marginBottom: 16 }}>
                <Text
                  style={{ fontSize: 20, fontWeight: '700', marginBottom: 4 }}
                  numberOfLines={2}
                >
                  {productDetail.product.name}
                </Text>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: '700',
                    color: primaryColor,
                  }}
                >
                  {minPrice > 0
                    ? formatCurrency(minPrice)
                    : t('product.contact', 'Liên hệ')}
                </Text>
              </View>

              {/* Mô tả ngắn */}
              {productDetail.product.description ? (
                <View>
                  <Text
                    style={{
                      fontSize: 14,
                      color: '#4b5563',
                      lineHeight: 20,
                      marginBottom: 24,
                    }}
                    numberOfLines={4}
                  >
                    {productDetail.product.description}
                  </Text>
                </View>
              ) : null}

              {/* Nút Add to cart */}
              <View style={{ alignItems: 'flex-end' }}>
                <MenuItemQuantityControl
                  item={productDetail as unknown as IMenuItem}
                  hasStock={hasStock}
                  isMobile={true}
                />
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

