/**
 * Skeleton placeholder khi Cart defer mount (Product Detail → Cart transition).
 * Layout khớp 100% với CartItemRow — tránh jump khi chuyển skeleton → UI thật.
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
    <View className="flex-1 pt-2">
      {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
        <View key={i} className="px-4 py-2">
          <View className="overflow-hidden rounded-xl bg-white dark:bg-gray-900">
            {/* Main content — khớp CartItemRow flex-row gap-3 p-3 */}
            <View className="flex-row gap-3 p-3">
              {/* Ảnh — h-20 w-20 overflow-hidden rounded-lg bg-gray-200 */}
              <View
                className={cn(
                  'h-20 w-20 overflow-hidden rounded-lg',
                  bgClass,
                )}
              />
              {/* Nội dung — flex-1, mt-1 mt-2 khớp CartItemRow */}
              <View className="flex-1 min-w-0">
                {/* Title — text-sm 2 lines ≈ h-7 */}
                <View className={cn('h-7 w-32 rounded', bgClass)} />
                {/* Size button — mt-1, rounded-full px-3 py-1 ≈ h-6 */}
                <View
                  className={cn('mt-1 h-6 w-20 self-start rounded-full', bgClass)}
                />
                {/* Price + quantity — mt-2 flex-row items-end justify-between */}
                <View className="mt-2 flex-row items-end justify-between">
                  <View className={cn('h-4 w-16 rounded', bgClass)} />
                  {/* Quantity control — h-9 w-24 khớp CartItemQuantityControl */}
                  <View className={cn('h-9 w-24 rounded-full', bgClass)} />
                </View>
              </View>
            </View>
            {/* Ghi chú — border-t border-gray-100 px-3 pb-3 pt-2, NotepadText 20 + Text py-2 */}
            <View
              className={cn(
                'flex-row items-center gap-2.5 border-t border-gray-100 px-3 pb-3 pt-2 dark:border-gray-700',
              )}
            >
              {/* Icon placeholder 20x20 — khớp NotepadText size={20} */}
              <View className={cn('h-5 w-5 shrink-0 rounded', bgClass)} />
              {/* Text py-2 text-sm — min h-10 cho 1-2 dòng */}
              <View className={cn('h-10 min-w-0 flex-1 rounded', bgClass)} />
            </View>
          </View>
        </View>
      ))}
    </View>
  )
}
