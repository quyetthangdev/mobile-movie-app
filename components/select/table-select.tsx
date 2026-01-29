import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Select } from '@/components/ui'
import { TableStatus } from '@/constants'
import { useTables } from '@/hooks'
import { useBranchStore, useOrderFlowStore, useUserStore } from '@/stores'
import { ITable, OrderTypeEnum } from '@/types'
import { SelectReservedTableDialog } from '../dialog'

interface ITableSelectProps {
  tableOrder?: ITable | null
  onTableSelect?: (table: ITable) => void
}

export default function TableSelect({
  tableOrder,
  onTableSelect,
}: ITableSelectProps) {
  const { t } = useTranslation('table')
  const { getCartItems, addTable } = useOrderFlowStore()
  const { branch } = useBranchStore()
  const { userInfo } = useUserStore()
  const { data: tables } = useTables(
    branch?.slug || userInfo?.branch?.slug || '',
  )

  const [selectedTable, setSelectedTable] = useState<ITable | null>(null)
  const [userSelectedTableId, setUserSelectedTableId] = useState<
    string | undefined
  >()

  const cartItems = getCartItems()

  // Derive selectedTableId from props/cart, with user selection taking precedence
  const selectedTableId = useMemo(() => {
    if (userSelectedTableId) return userSelectedTableId
    if (tableOrder?.slug) return tableOrder.slug
    if (cartItems?.table) return cartItems.table
    return undefined
  }, [userSelectedTableId, tableOrder?.slug, cartItems?.table])

  // Derive selectedTable from tableOrder or tables
  const currentSelectedTable = useMemo(() => {
    if (selectedTable) return selectedTable
    if (tableOrder) return tableOrder
    if (selectedTableId && tables?.result) {
      return tables.result.find((t) => t.slug === selectedTableId) || null
    }
    return null
  }, [selectedTable, tableOrder, selectedTableId, tables])

  if (getCartItems()?.type === OrderTypeEnum.TAKE_OUT) {
    return null
  }

  const handleTableSelect = (tableId: string) => {
    const table = tables?.result?.find((t) => t.slug === tableId)
    if (!table) return
    if (table.status === TableStatus.RESERVED) {
      setSelectedTable(table)
    } else {
      addTable(table)
      setUserSelectedTableId(tableId)
      onTableSelect?.(table)
    }
  }

  const handleConfirmTable = (table: ITable) => {
    addTable(table)
    onTableSelect?.(table)
    setUserSelectedTableId(table.slug)
    setSelectedTable(null) // Đóng dialog
  }

  return (
    <>
      <Select onValueChange={handleTableSelect} value={selectedTableId}>
        <Select.Trigger
          className={`w-full bg-white dark:bg-transparent ${!selectedTableId ? 'highlight-blink-border' : ''}`}
        >
          <Select.Value placeholder={t('table.title')} />
        </Select.Trigger>
        <Select.Content>
          <Select.Group>
            <Select.Label>{t('table.title')}</Select.Label>
            {tables?.result?.map((table) => (
              <Select.Item
                key={table.slug}
                value={table.slug}
                className={
                  table.status === TableStatus.RESERVED ? 'text-red-400' : ''
                }
              >
                {`${table.name} - ${t(`table.${table.status}`)}`}
              </Select.Item>
            ))}
          </Select.Group>
        </Select.Content>
      </Select>

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
