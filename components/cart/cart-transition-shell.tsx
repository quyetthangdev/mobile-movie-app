/**
 * Shell nhẹ trong lúc transition Product Detail → Cart.
 * Header blur + skeleton — đồng bộ với CartContentFull.
 */
import { colors } from '@/constants'
import React from 'react'
import { View } from 'react-native'
import { CartHeaderBlur, CartSkeleton } from '@/components/cart'
import { cn } from '@/utils/cn'

type CartTransitionShellProps = {
  onBack: () => void
  isDark?: boolean
  insets?: { top: number; bottom: number }
  title?: string
}

export function CartTransitionShell({
  onBack,
  isDark = false,
  insets = { top: 0, bottom: 0 },
}: CartTransitionShellProps) {
  const bgClass = isDark ? 'bg-gray-900' : colors.background.light

  return (
    <View
      style={{ flex: 1, paddingBottom: insets.bottom }}
      className={cn('flex-1', bgClass)}
    >
      <CartHeaderBlur onBack={onBack} orderCount={0} isDark={isDark} />
      <CartSkeleton isDark={isDark} />
    </View>
  )
}
