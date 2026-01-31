import { useLocalSearchParams } from 'expo-router'
import { Check, MapPin } from 'lucide-react-native'
import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Text, TouchableOpacity, View, useColorScheme } from 'react-native'

import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui'
import { useBranch } from '@/hooks'
import { cn } from '@/lib/utils'
import { useBranchStore } from '@/stores'

/**
 * SelectBranchDropdown Component
 * 
 * Displays a branch selector dropdown with improved mobile UI/UX.
 * Shows branch name in trigger button and list of branches in dropdown.
 * 
 * @example
 * ```tsx
 * <SelectBranchDropdown />
 * ```
 */
export default function SelectBranchDropdown() {
  const { t } = useTranslation('branch')
  const { data: branchRes } = useBranch()
  const { branch, setBranch } = useBranchStore()
  const isDark = useColorScheme() === 'dark'
  
  // Get branch from URL params
  const searchParams = useLocalSearchParams<{ branch?: string }>()
  const branchSlug = searchParams.branch

  useEffect(() => {
    if (branchSlug && branchRes?.result) {
      const b = branchRes.result.find((item) => item.slug === branchSlug)
      if (b) {
        setBranch(b)
      }
    }
  }, [branchSlug, branchRes, setBranch])

  const handleSelectChange = (selectedSlug: string) => {
    const b = branchRes?.result?.find((item) => item.slug === selectedSlug)
    if (b) {
      setBranch(b)
    }
  }

  // Get selected branch name for display
  const selectedBranchName = branch?.name || null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <TouchableOpacity
          className={cn(
            'flex-row items-center gap-2 px-3 py-2 rounded-md',
            'bg-transparent',
            'active:bg-gray-100/50 dark:active:bg-gray-800/50',
            'min-w-[120px] max-w-[180px]'
          )}
        >
          <MapPin size={16} color={isDark ? '#9ca3af' : '#6b7280'} />
          {selectedBranchName ? (
            <Text
              className="text-sm font-medium text-gray-900 dark:text-gray-50 flex-1"
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {selectedBranchName}
            </Text>
          ) : (
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              {t('branch.chooseBranch', 'Chọn chi nhánh')}
            </Text>
          )}
        </TouchableOpacity>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end" sideOffset={8}>
        <View className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
          <Text className="text-sm font-semibold text-gray-900 dark:text-gray-50">
            {t('branch.chooseBranch', 'Chọn chi nhánh')}
          </Text>
        </View>
        <View className="max-h-[400px]">
          {branchRes?.result && branchRes.result.length > 0 ? (
            branchRes.result.map((item, index) => {
              const isSelected = branch?.slug === item.slug
              const isLast = index === branchRes.result.length - 1
              return (
                <TouchableOpacity
                  key={item.slug}
                  onPress={() => handleSelectChange(item.slug)}
                  className={cn(
                    'px-4 py-3 flex-row items-start gap-3',
                    !isLast && 'border-b border-gray-100 dark:border-gray-800',
                    isSelected && 'bg-gray-50 dark:bg-gray-800/50',
                    'active:bg-gray-100 dark:active:bg-gray-700'
                  )}
                >
                  <View className="mt-0.5">
                    <MapPin size={18} color={isDark ? '#9ca3af' : '#6b7280'} />
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2 mb-1">
                      <Text
                        className={cn(
                          'text-sm font-medium flex-1',
                          isSelected
                            ? 'text-primary dark:text-primary'
                            : 'text-gray-900 dark:text-gray-50'
                        )}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                      {isSelected && (
                        <Check size={16} color={isDark ? '#9ca3af' : '#6b7280'} />
                      )}
                    </View>
                    <Text
                      className="text-xs text-gray-600 dark:text-gray-400"
                      numberOfLines={2}
                    >
                      {item.address}
                    </Text>
                  </View>
                </TouchableOpacity>
              )
            })
          ) : (
            <View className="px-4 py-8 items-center">
              <Text className="text-sm text-gray-500 dark:text-gray-400">
                {t('branch.noBranches', 'Không có chi nhánh nào')}
              </Text>
            </View>
          )}
        </View>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

