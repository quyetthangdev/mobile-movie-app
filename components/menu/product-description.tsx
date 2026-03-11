import React from 'react'
import { Text } from 'react-native'

interface ProductDescriptionProps {
  description: string
}

/** Mô tả sản phẩm — memo + custom compare để tránh re-render khi parent scroll */
export const ProductDescription = React.memo(
  function ProductDescription({ description }: ProductDescriptionProps) {
    return (
      <Text className="text-base text-gray-600 dark:text-gray-400">
        {description}
      </Text>
    )
  },
  (prev, next) => prev.description === next.description,
)
