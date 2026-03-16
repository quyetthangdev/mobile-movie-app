/**
 * Điều khiển số lượng cho từng món trong giỏ hàng (ordering phase).
 * Dùng TouchableOpacity thay vì Button/PressableWithFeedback — giảm ~28ms render (Profiler).
 */
import { Minus, Plus } from 'lucide-react-native'
import { scheduleStoreUpdate } from '@/lib/navigation'
import { useOrderFlowStore } from '@/stores'
import { IOrderItem } from '@/types'
import { Text, TouchableOpacity, View } from 'react-native'

interface CartItemQuantityControlProps {
  orderItem: IOrderItem
}

export default function CartItemQuantityControl({
  orderItem,
}: CartItemQuantityControlProps) {
  const updateOrderingItemQuantity = useOrderFlowStore(
    (s) => s.updateOrderingItemQuantity,
  )

  const handleChange = (newQuantity: number) => {
    scheduleStoreUpdate(() =>
      updateOrderingItemQuantity(orderItem.id, newQuantity),
    )
  }

  const min = 1
  const canDecrement = orderItem.quantity > min

  return (
    <View className="flex-row items-center gap-1.5">
      <TouchableOpacity
        onPress={() => handleChange(Math.max(orderItem.quantity - 1, min))}
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
        onPress={() => handleChange(orderItem.quantity + 1)}
        activeOpacity={0.7}
        className="h-9 w-9 items-center justify-center rounded-full border border-gray-300 dark:border-gray-700"
      >
        <Plus size={12} color="#6b7280" />
      </TouchableOpacity>
    </View>
  )
}
