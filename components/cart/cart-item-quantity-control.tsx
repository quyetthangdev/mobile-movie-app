/**
 * Điều khiển số lượng cho từng món trong giỏ hàng (ordering phase).
 * Dùng TouchableOpacity thay vì Button/PressableWithFeedback — giảm ~28ms render (Profiler).
 * Pure Component: handleDecrease/handleIncrease useCallback — không tạo hàm mới mỗi render.
 */
import { Minus, Plus } from 'lucide-react-native'
import React, { useCallback } from 'react'
import { scheduleStoreUpdate } from '@/lib/navigation'
import { useOrderFlowStore } from '@/stores'
import { IOrderItem } from '@/types'
import { Text, TouchableOpacity, View } from 'react-native'

const MIN_QUANTITY = 1

interface CartItemQuantityControlProps {
  orderItem: IOrderItem
}

function cartItemQuantityControlPropsAreEqual(
  prev: CartItemQuantityControlProps,
  next: CartItemQuantityControlProps,
): boolean {
  return (
    prev.orderItem.id === next.orderItem.id &&
    prev.orderItem.quantity === next.orderItem.quantity
  )
}

const CartItemQuantityControl = React.memo(function CartItemQuantityControl({
  orderItem,
}: CartItemQuantityControlProps) {
  const updateOrderingItemQuantity = useOrderFlowStore(
    (s) => s.updateOrderingItemQuantity,
  )

  const handleDecrease = useCallback(() => {
    const newQty = Math.max(orderItem.quantity - 1, MIN_QUANTITY)
    scheduleStoreUpdate(() =>
      updateOrderingItemQuantity(orderItem.id, newQty),
    )
  }, [orderItem.id, orderItem.quantity, updateOrderingItemQuantity])

  const handleIncrease = useCallback(() => {
    scheduleStoreUpdate(() =>
      updateOrderingItemQuantity(orderItem.id, orderItem.quantity + 1),
    )
  }, [orderItem.id, orderItem.quantity, updateOrderingItemQuantity])

  const canDecrement = orderItem.quantity > MIN_QUANTITY

  return (
    <View className="flex-row items-center gap-1.5">
      <TouchableOpacity
        onPress={handleDecrease}
        disabled={!canDecrement}
        activeOpacity={0.7}
        className="h-9 w-9 items-center justify-center rounded-full border border-gray-300 dark:border-gray-700"
      >
        <Minus size={12} color="#6b7280" />
      </TouchableOpacity>
      <Text className="w-4 text-center text-sm text-gray-900 dark:text-white">
        {orderItem.quantity}
      </Text>
      <TouchableOpacity
        onPress={handleIncrease}
        activeOpacity={0.7}
        className="h-9 w-9 items-center justify-center rounded-full border border-gray-300 dark:border-gray-700"
      >
        <Plus size={12} color="#6b7280" />
      </TouchableOpacity>
    </View>
  )
}, cartItemQuantityControlPropsAreEqual)

export default CartItemQuantityControl
