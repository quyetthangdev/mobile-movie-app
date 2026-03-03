import { Minus, Plus } from 'lucide-react-native'
import React from 'react'
import { Pressable, Text, View } from 'react-native'

import { HIT_SLOP_SMALL } from '@/lib/navigation/constants'


interface NonPropQuantitySelectorProps {
  quantity: number
  onChange: (quantity: number) => void
  isLimit?: boolean
  disabled?: boolean
  currentQuantity?: number
  maxQuantity?: number
}

export default function NonPropQuantitySelector({
  quantity,
  onChange,
  isLimit = false,
  disabled = false,
  currentQuantity,
  maxQuantity,
}: NonPropQuantitySelectorProps) {
  const handleIncrement = () => {
    if (disabled) return
    const newQuantity = quantity + 1
    // Check stock limit if isLimit is true
    if (isLimit && currentQuantity !== undefined && newQuantity > currentQuantity) {
      return
    }
    // Check max quantity if provided
    if (maxQuantity !== undefined && newQuantity > maxQuantity) {
      return
    }
    onChange(newQuantity)
  }

  const handleDecrement = () => {
    if (disabled) return
    const newQuantity = Math.max(1, quantity - 1)
    onChange(newQuantity)
  }

  return (
    <View className="flex-row items-center gap-2">
      <Pressable
        onPress={handleDecrement}
        disabled={disabled || quantity <= 1}
        hitSlop={HIT_SLOP_SMALL}
        className={`p-2 rounded-full border active:opacity-80 ${
          disabled || quantity <= 1
            ? 'border-gray-300 dark:border-gray-700 opacity-50'
            : 'border-gray-500 dark:border-gray-400'
        }`}
        {...({ unstable_pressDelay: 0 } as object)}
      >
        <Minus size={16} color={disabled || quantity <= 1 ? '#9ca3af' : '#374151'} />
      </Pressable>
      <Text className="w-8 text-center text-base font-semibold text-gray-900 dark:text-white">
        {quantity}
      </Text>
      <Pressable
        onPress={handleIncrement}
        disabled={
          disabled ||
          (isLimit && currentQuantity !== undefined && quantity >= currentQuantity) ||
          (maxQuantity !== undefined && quantity >= maxQuantity)
        }
        hitSlop={HIT_SLOP_SMALL}
        className={`p-2 rounded-full border active:opacity-80 ${
          disabled ||
          (isLimit && currentQuantity !== undefined && quantity >= currentQuantity) ||
          (maxQuantity !== undefined && quantity >= maxQuantity)
            ? 'border-gray-300 dark:border-gray-700 opacity-50'
            : 'border-gray-500 dark:border-gray-400'
        }`}
        {...({ unstable_pressDelay: 0 } as object)}
      >
        <Plus size={16} color={
          disabled ||
          (isLimit && currentQuantity !== undefined && quantity >= currentQuantity) ||
          (maxQuantity !== undefined && quantity >= maxQuantity)
            ? '#9ca3af'
            : '#374151'
        } />
      </Pressable>
    </View>
  )
}

