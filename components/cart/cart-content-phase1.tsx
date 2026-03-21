/**
 * CartContentPhase1 — Frame đầu tiên cực nhẹ (<5ms JS).
 * Chỉ: CartHeader + CartSkeleton (hoặc empty state).
 * Selector: useOrderItemsLength (primitive) — không lấy array.
 */
import { ScreenContainer } from '@/components/layout'
import { colors } from '@/constants'
import { useOrderItemsLength } from '@/stores/selectors'
import { ShoppingCart } from 'lucide-react-native'
import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Text, TouchableOpacity, useColorScheme, View } from 'react-native'

import { CartHeaderBlur, CartSkeleton } from '@/components/cart'
import { cn } from '@/utils/cn'

type CartContentPhase1Props = {
  onBack: () => void
  onBackToMenu: () => void
}

export function CartContentPhase1({ onBack, onBackToMenu }: CartContentPhase1Props) {
  const { t } = useTranslation('menu')
  const isDark = useColorScheme() === 'dark'

  const orderItemsLength = useOrderItemsLength()
  const hasOrder = orderItemsLength > 0

  const primaryColor = useMemo(
    () => (isDark ? colors.primary.dark : colors.primary.light),
    [isDark],
  )

  const containerClassName = cn(
    'flex-1',
    isDark ? 'bg-gray-900' : colors.background.light,
  )

  if (!hasOrder) {
    return (
      <ScreenContainer edges={['bottom']} className={containerClassName}>
        <CartHeaderBlur
          onBack={onBack}
          orderCount={orderItemsLength}
          isDark={isDark}
        />
        <View className="flex-1 items-center justify-center px-6">
          <View
            className="mb-6 h-28 w-28 items-center justify-center rounded-full"
            style={{ backgroundColor: 'rgba(247, 167, 55, 0.12)' }}
          >
            <ShoppingCart size={56} color={primaryColor} />
          </View>
          <Text className="mb-2 text-center text-lg font-semibold text-gray-900 dark:text-white">
            {t('cart.emptyTitle', 'Giỏ hàng trống')}
          </Text>
          <Text className="mb-8 text-center text-sm text-gray-500 dark:text-gray-400">
            {t('cart.emptyDescription', 'Thêm món từ thực đơn để đặt hàng')}
          </Text>
          <TouchableOpacity
            onPress={onBackToMenu}
            className="rounded-xl px-8 py-4"
            style={{ backgroundColor: primaryColor }}
          >
            <Text className="font-semibold text-white">
              {t('cart.viewMenu', 'Xem thực đơn')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    )
  }

  return (
    <ScreenContainer edges={['bottom']} className={containerClassName}>
      <CartHeaderBlur
        onBack={onBack}
        orderCount={orderItemsLength}
        isDark={isDark}
      />
      <CartSkeleton isDark={isDark} />
    </ScreenContainer>
  )
}
