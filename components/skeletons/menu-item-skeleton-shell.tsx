/**
 * Skeleton shell cho màn Menu Item Detail.
 * Dùng chung cho: Ghost Mount (pre-render) và màn thật (initial state).
 */
import React from 'react'
import { View } from 'react-native'

import { ScreenContainer } from '@/components/layout'
import { Skeleton } from '@/components/ui'

export function MenuItemSkeletonShell() {
  return (
    <ScreenContainer edges={['top']} className="flex-1 bg-white dark:bg-gray-900">
      <View className="flex-row items-center px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <Skeleton className="w-8 h-8 rounded-full mr-3" />
        <Skeleton className="h-5 w-48 rounded-md" />
      </View>
      <View className="flex-1 px-4 py-4 gap-6">
        <Skeleton className="w-full h-56 rounded-2xl" />
        <View className="gap-3">
          <Skeleton className="h-5 w-3/4 rounded-md" />
          <Skeleton className="h-4 w-1/2 rounded-md" />
          <Skeleton className="h-4 w-1/3 rounded-md" />
        </View>
        <View className="flex-row items-center justify-between gap-4 mt-4">
          <Skeleton className="h-10 w-28 rounded-full" />
          <Skeleton className="h-11 flex-1 rounded-full" />
        </View>
      </View>
    </ScreenContainer>
  )
}
