/**
 * Product Detail Price Footer — Atomic subscribe.
 * Chỉ price, quantity, toppingExtraPrice thay đổi → chỉ component này re-render.
 * Image Header, Options không subscribe → không re-render khi tăng/giảm số lượng.
 */
import { Button } from '@/components/ui'
import { ShoppingBag } from 'lucide-react-native'
import React from 'react'
import { Platform, Text, useColorScheme, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  useDetailComputedTotalPrice,
  useDetailPrice,
} from '@/stores/selectors'
import { formatCurrency } from '@/utils'

export interface ProductDetailPriceFooterProps {
  totalPriceLabel: string
  chooseSizeLabel: string
  addToCartLabel: string
  outOfStockLabel: string
  isDisabled: boolean
  onAddToCart: () => void
}

export const ProductDetailPriceFooter = React.memo(
  function ProductDetailPriceFooter({
    totalPriceLabel,
    chooseSizeLabel,
    addToCartLabel,
    outOfStockLabel,
    isDisabled,
    onAddToCart,
  }: ProductDetailPriceFooterProps) {
    const insets = useSafeAreaInsets()
    const isDark = useColorScheme() === 'dark'
    const price = useDetailPrice()
    const computedTotalPrice = useDetailComputedTotalPrice()

    return (
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
                }}
              >
                {totalPriceLabel}
              </Text>
              <Text
                numberOfLines={1}
                style={{
                  fontSize: price != null ? 18 : 14,
                  fontWeight: '700',
                  color:
                    price != null
                      ? isDark
                        ? '#f59e0b'
                        : '#d97706'
                      : isDark
                        ? '#9ca3af'
                        : '#6b7280',
                }}
              >
                {computedTotalPrice != null
                  ? formatCurrency(computedTotalPrice)
                  : chooseSizeLabel}
              </Text>
            </View>
            <Button
              onPress={onAddToCart}
              disabled={isDisabled}
              variant="default"
              size="md"
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                borderRadius: 9999,
              }}
            >
              <ShoppingBag
                size={20}
                color={isDisabled ? '#e5e7eb' : '#ffffff'}
              />
              <Text style={{ fontWeight: '600', color: '#ffffff' }}>
                {isDisabled ? outOfStockLabel : addToCartLabel}
              </Text>
            </Button>
          </View>
        </View>
      </View>
    )
  },
)
