import React, { useEffect, useRef } from 'react'
import { Text, useColorScheme } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated'

import { useOrderFlowCartItemCount } from '@/stores/selectors'

// Module-scope spring configs — stable reference, no re-allocation per effect fire.
// Bounce in: snappier (low damping → more overshoot), Settle: higher damping to rest quickly.
const BOUNCE_IN_SPRING = { damping: 8, stiffness: 300 } as const
const BOUNCE_SETTLE_SPRING = { damping: 15, stiffness: 200 } as const

/** Badge số lượng giỏ hàng — chỉ subscribe cartItemCount, tránh re-render toàn header khi add item */
export const CartBadge = React.memo(function CartBadge() {
  const cartItemCount = useOrderFlowCartItemCount()
  const isDark = useColorScheme() === 'dark'
  const prevCountRef = useRef(cartItemCount)
  const scale = useSharedValue(1)

  // Bounce khi thêm món — animation chạy trên UI thread (withSpring)
  useEffect(() => {
    if (cartItemCount > prevCountRef.current && cartItemCount > 0) {
      scale.value = withSequence(
        withSpring(1.25, BOUNCE_IN_SPRING),
        withSpring(1, BOUNCE_SETTLE_SPRING),
      )
    }
    prevCountRef.current = cartItemCount
  }, [cartItemCount, scale])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  if (cartItemCount <= 0) return null

  return (
    <Animated.View
      pointerEvents="none"
      className="absolute -right-1 -top-1 h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1"
      style={[
        {
          borderWidth: 2,
          borderColor: isDark ? '#1f2937' : '#ffffff',
        },
        animatedStyle,
      ]}
    >
      <Text className="text-[10px] font-bold text-white">
        {cartItemCount > 99 ? '99+' : cartItemCount}
      </Text>
    </Animated.View>
  )
})
