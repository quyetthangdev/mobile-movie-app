import React from 'react'
import { Text, useColorScheme, View } from 'react-native'

import { useOrderFlowCartItemCount } from '@/stores/selectors'

/** Badge số lượng giỏ hàng — chỉ subscribe cartItemCount, tránh re-render toàn header khi add item */
export const CartBadge = React.memo(function CartBadge() {
  const cartItemCount = useOrderFlowCartItemCount()
  const isDark = useColorScheme() === 'dark'

  if (cartItemCount <= 0) return null

  return (
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
  )
})
