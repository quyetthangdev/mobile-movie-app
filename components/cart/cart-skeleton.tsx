/**
 * Skeleton placeholder khi Cart defer mount (Product Detail → Cart transition).
 * Nhẹ: chỉ View, không Animated, không FlatList.
 */
import React from 'react'
import { View } from 'react-native'

import { cn } from '@/utils/cn'

interface CartSkeletonProps {
  isDark?: boolean
}

const SKELETON_ROWS = 4

export default function CartSkeleton({ isDark }: CartSkeletonProps) {
  const bgClass = isDark ? 'bg-gray-700' : 'bg-gray-200'

  return (
    <View className="flex-1 px-4 pt-2">
      {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
        <View key={i} className="mb-2">
          <View className="flex-row gap-3 rounded-xl bg-white p-3 dark:bg-gray-900">
            {/* Ảnh placeholder */}
            <View
              className={cn('h-24 w-24 rounded-lg', bgClass)}
            />
            {/* Nội dung placeholder */}
            <View className="flex-1 gap-2">
              <View className={cn('h-4 w-32 rounded', bgClass)} />
              <View className={cn('h-3 w-20 rounded-full', bgClass)} />
              <View className="mt-2 flex-row justify-between">
                <View className={cn('h-4 w-16 rounded', bgClass)} />
                <View className={cn('h-8 w-24 rounded', bgClass)} />
              </View>
            </View>
          </View>
          {/* Ghi chú placeholder */}
          <View
            className={cn(
              'mx-3 mt-1 h-8 rounded',
              bgClass,
            )}
          />
        </View>
      ))}
    </View>
  )
}
