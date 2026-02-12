import { Check, ShoppingBag } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { Text, TouchableOpacity, View, useColorScheme } from 'react-native'

import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui'
import { useOrderTypeOptions } from '@/hooks'
import { cn } from '@/lib/utils'

export default function OrderTypeSelect() {
  const { t } = useTranslation('menu')
  const isDark = useColorScheme() === 'dark'
  const { orderTypes, selectedType, handleChange } = useOrderTypeOptions()

  // Get selected order type label for display
  const selectedOrderTypeLabel = selectedType?.label || null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <TouchableOpacity
          className={cn(
            'flex-row items-center gap-2 h-11 px-3 py-2 rounded-md',
            'bg-white dark:bg-gray-800',
            'border border-gray-200 dark:border-gray-700',
            'active:bg-gray-100/50 dark:active:bg-gray-700/50',
            'w-full'
          )}
        >
          <ShoppingBag size={16} color={isDark ? '#9ca3af' : '#6b7280'} />
          {selectedOrderTypeLabel ? (
            <Text
              className="text-sm font-medium text-gray-900 dark:text-gray-50 flex-1"
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {selectedOrderTypeLabel}
            </Text>
          ) : (
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              {t('menu.selectOrderType', 'Chọn loại đơn')}
            </Text>
          )}
        </TouchableOpacity>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-full" align="start" side="bottom" sideOffset={4}>
        <View className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
          <Text className="text-sm font-semibold text-gray-900 dark:text-gray-50">
            {t('menu.selectOrderType', 'Chọn loại đơn')}
          </Text>
        </View>
        <View className="max-h-[400px]">
          {orderTypes && orderTypes.length > 0 ? (
            orderTypes.map((type, index) => {
              const isSelected = selectedType?.value === type.value
              const isLast = index === orderTypes.length - 1
              return (
                <TouchableOpacity
                  key={type.value}
                  onPress={() => handleChange(type.value)}
                  className={cn(
                    'px-4 py-3 flex-row items-center gap-3',
                    !isLast && 'border-b border-gray-100 dark:border-gray-800',
                    isSelected && 'bg-gray-50 dark:bg-gray-800/50',
                    'active:bg-gray-100 dark:active:bg-gray-700'
                  )}
                >
                  <View className="mt-0.5">
                    <ShoppingBag size={18} color={isDark ? '#9ca3af' : '#6b7280'} />
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                      <Text
                        className={cn(
                          'text-sm font-medium flex-1',
                          isSelected
                            ? 'text-primary dark:text-primary'
                            : 'text-gray-900 dark:text-gray-50'
                        )}
                        numberOfLines={1}
                      >
                        {type.label}
                      </Text>
                      {isSelected && (
                        <Check size={16} color={isDark ? '#9ca3af' : '#6b7280'} />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              )
            })
          ) : (
            <View className="px-4 py-8 items-center">
              <Text className="text-sm text-gray-500 dark:text-gray-400">
                {t('menu.noOrderTypes', 'Không có loại đơn nào')}
              </Text>
            </View>
          )}
        </View>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
