import { ChevronDown } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Text, View, useColorScheme } from 'react-native'
import { Dropdown } from 'react-native-element-dropdown'

import { TableStatus } from '@/constants'
import { useTables } from '@/hooks'
import { useBranchStore, useOrderFlowStore, useUserStore } from '@/stores'
import { ITable, OrderTypeEnum } from '@/types'
import { SelectReservedTableDialog } from '../dialog'

interface ITableDropdownProps {
  tableOrder?: ITable | null
  onTableSelect?: (table: ITable) => void
}

interface TableOption {
  label: string
  value: string
  status: string
}

export default function TableDropdown({
  tableOrder,
  onTableSelect,
}: ITableDropdownProps) {
  const { t } = useTranslation('table')
  const { getCartItems, addTable } = useOrderFlowStore()
  const { branch } = useBranchStore()
  const { userInfo } = useUserStore()
  const { data: tables } = useTables(
    branch?.slug || userInfo?.branch?.slug || '',
  )

  const [isFocus, setIsFocus] = useState(false)
  const [selectedTable, setSelectedTable] = useState<ITable | null>(null)
  const [userSelectedTableId, setUserSelectedTableId] = useState<
    string | undefined
  >()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'

  const cartItems = getCartItems()

  // Derive selectedTableId from props/cart, with user selection taking precedence
  const selectedTableId = useMemo(() => {
    if (userSelectedTableId) return userSelectedTableId
    if (tableOrder?.slug) return tableOrder.slug
    if (cartItems?.table) return cartItems.table
    return undefined
  }, [userSelectedTableId, tableOrder?.slug, cartItems?.table])

  // Sync selectedTable when tableOrder changes
  const currentSelectedTable = useMemo(() => {
    if (selectedTable) return selectedTable
    if (tableOrder) return tableOrder
    const result = tables?.result
    if (selectedTableId && result) {
      return result.find((t) => t.slug === selectedTableId) || null
    }
    return null
  }, [selectedTable, tableOrder, selectedTableId, tables])

  // Map tables to dropdown options
  const tableOptions = useMemo<TableOption[]>(() => {
    const result = tables?.result
    if (!result) return []
    return result.map((table) => ({
      value: table.slug,
      label: `${table.name} - ${t(`table.${table.status}`)}`,
      status: table.status,
    }))
  }, [tables?.result, t])

  // Get selected value for dropdown
  const selectedValue = useMemo(() => {
    return selectedTableId || null
  }, [selectedTableId])

  // Nếu không phải đơn tại bàn thì không render
  if (getCartItems()?.type === OrderTypeEnum.TAKE_OUT) {
    return null
  }

  const handleChange = (item: TableOption) => {
    const table = tables?.result?.find((t) => t.slug === item.value)
    if (!table) return

    if (table.status === TableStatus.RESERVED) {
      setSelectedTable(table)
    } else {
      addTable(table)
      setUserSelectedTableId(item.value)
      onTableSelect?.(table)
    }
    setIsFocus(false)
  }

  const handleConfirmTable = (table: ITable) => {
    addTable(table)
    onTableSelect?.(table)
    setUserSelectedTableId(table.slug)
    setSelectedTable(null) // Đóng dialog
  }

  const renderLabel = () => {
    if (selectedTableId || isFocus) {
      return (
        <Text
          className={`absolute left-3 top-2 z-10 px-2 text-xs ${
            isFocus ? 'text-blue-500' : 'text-gray-600 dark:text-gray-400'
          }`}
          style={{ backgroundColor: isDark ? '#111827' : '#ffffff' }}
        >
          {t('table.title')}
        </Text>
      )
    }
    return null
  }

  return (
    <>
      <View className="bg-white p-4 dark:bg-gray-800">
        {renderLabel()}
        <Dropdown
          style={{
            height: 50,
            borderColor: isFocus ? '#3b82f6' : isDark ? '#374151' : '#d1d5db',
            borderWidth: 0.5,
            borderRadius: 8,
            paddingHorizontal: 8,
            backgroundColor: isDark ? '#1f2937' : '#ffffff',
          }}
          placeholderStyle={{
            fontSize: 16,
            color: isDark ? '#9ca3af' : '#6b7280',
          }}
          selectedTextStyle={{
            fontSize: 16,
            color: isDark ? '#ffffff' : '#111827',
          }}
          iconStyle={{
            width: 20,
            height: 20,
          }}
          data={tableOptions}
          search={false}
          maxHeight={300}
          labelField="label"
          valueField="value"
          placeholder={t('table.title')}
          value={selectedValue}
          onFocus={() => setIsFocus(true)}
          onBlur={() => setIsFocus(false)}
          onChange={handleChange}
          renderLeftIcon={() => (
            <View className="mr-2">
              <ChevronDown
                size={20}
                color={isFocus ? '#3b82f6' : isDark ? '#9ca3af' : '#6b7280'}
              />
            </View>
          )}
          containerStyle={{
            backgroundColor: isDark ? '#1f2937' : '#ffffff',
          }}
          itemTextStyle={{
            color: isDark ? '#ffffff' : '#111827',
          }}
          activeColor={isDark ? '#374151' : '#f3f4f6'}
        />
      </View>

      {/* Dialog hiển thị khi chọn bàn đã đặt */}
      {currentSelectedTable &&
        currentSelectedTable.status === TableStatus.RESERVED &&
        currentSelectedTable.slug !== tableOrder?.slug && (
          <SelectReservedTableDialog
            table={currentSelectedTable}
            onConfirm={handleConfirmTable}
            onCancel={() => setSelectedTable(null)}
          />
        )}
    </>
  )
}
