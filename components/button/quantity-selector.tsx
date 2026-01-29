import { Minus, Plus } from 'lucide-react-native'
import React from 'react'
import { Text, View } from 'react-native'

import { Button } from '@/components/ui'
import { useOrderFlowStore } from '@/stores'
import { IOrderDetail, IOrderItem } from '@/types'
import { useStore } from 'zustand'

interface QuantitySelectorProps {
  cartItem: IOrderDetail | IOrderItem
}

export default function QuantitySelector({ cartItem }: QuantitySelectorProps) {
  const [quantity, setQuantity] = React.useState(cartItem.quantity)
  const updateOrderingItemQuantity = useStore(useOrderFlowStore, (state) => state.updateOrderingItemQuantity)

  const handleIncrement = () => {
    setQuantity((prev) => {
      const newQuantity = prev + 1
      updateOrderingItemQuantity(cartItem.id!, newQuantity)
      return newQuantity
    })
  }

  const handleDecrement = () => {
    setQuantity((prev) => {
      const newQuantity = Math.max(prev - 1, 1)
      updateOrderingItemQuantity(cartItem.id!, newQuantity)
      return newQuantity
    })
  }

  return (
    <View className="flex items-center gap-1.5 w-full">
      <View className="flex-row items-center gap-1.5 w-full">
        <Button variant="outline" size="sm" onPress={handleDecrement} className="p-1 rounded-full border border-gray-300 dark:border-gray-700 h-fit w-fit">
          <Minus size={12} color="#6b7280" />
        </Button>
        <Text className="w-4 text-xs text-center text-gray-900 dark:text-white">{quantity}</Text>
        <Button variant="outline" size="sm" onPress={handleIncrement} className="p-1 rounded-full border border-gray-300 dark:border-gray-700 h-fit w-fit">
          <Plus size={12} color="#6b7280" />
        </Button>
      </View>
    </View>
  )
}
