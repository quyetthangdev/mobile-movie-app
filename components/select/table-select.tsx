import { ChevronDown } from 'lucide-react-native'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Text, TouchableOpacity, useColorScheme } from 'react-native'

import { useTables } from '@/hooks'
import { cn } from '@/lib/utils'
import { useBranchStore, useOrderFlowStore, useUserStore } from '@/stores'
import { OrderTypeEnum } from '@/types'
import TableSelectSheet from './table-select-sheet'

export default function TableSelect() {
  const { t } = useTranslation('table')
  const isDark = useColorScheme() === 'dark'

  const { getCartItems } = useOrderFlowStore()
  const cartItems = getCartItems()
  const cartType = cartItems?.type
  const selectedTableId = cartItems?.table

  const { branch } = useBranchStore()
  const { userInfo } = useUserStore()

  const branchSlug = useMemo(
    () => branch?.slug || userInfo?.branch?.slug || '',
    [branch?.slug, userInfo?.branch?.slug]
  )

  // Get tables to find selected table name
  const { data: tables } = useTables(branchSlug)
  const selectedTable = useMemo(() => {
    if (!selectedTableId || !tables?.result) return null
    return tables.result.find((t) => t.slug === selectedTableId)
  }, [selectedTableId, tables])

  // Format display text: "Tên bàn - Trạng thái"
  const displayText = useMemo(() => {
    if (!selectedTable) return t('table.title')
    const statusLabel = selectedTable.status ? t(`table.${selectedTable.status}`) : ''
    return `${selectedTable.name} - ${statusLabel}`
  }, [selectedTable, t])

  // TAKE OUT không chọn bàn
  if (cartType === OrderTypeEnum.TAKE_OUT) return null

  return (
    <TouchableOpacity
      onPress={() => TableSelectSheet.open()}
      className={cn(
        'flex-row items-center gap-2 h-11 px-3 py-2 rounded-md w-full',
        'bg-white dark:bg-gray-800',
        'border border-gray-200 dark:border-gray-700',
        !selectedTableId && 'border-red-300 dark:border-red-700',
        'active:bg-gray-100/50 dark:active:bg-gray-700/50'
      )}
    >
      <Text
        numberOfLines={1}
        className={cn(
          'flex-1 text-sm',
          selectedTableId
            ? 'font-medium text-gray-900 dark:text-gray-50'
            : 'text-gray-500 dark:text-gray-400'
        )}
      >
        {displayText}
      </Text>

      <ChevronDown size={16} color={isDark ? '#9ca3af' : '#6b7280'} />
    </TouchableOpacity>
  )
}
