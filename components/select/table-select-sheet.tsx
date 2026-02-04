import BottomSheet, { BottomSheetBackdrop, BottomSheetBackdropProps, BottomSheetFlatList } from '@gorhom/bottom-sheet'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Text, useColorScheme, View } from 'react-native'

import { TableStatus } from '@/constants'
import { useTables } from '@/hooks'
import { useOrderFlowStore } from '@/stores'
import { ITable } from '@/types'
import TableRow from './table-row'

let sheetRef: BottomSheet | null = null

interface TableSelectSheetProps {
  branchSlug: string
}

function TableSelectSheet({ branchSlug }: TableSelectSheetProps) {
  const { t } = useTranslation('table')
  const isDark = useColorScheme() === 'dark'
  const bottomSheetRef = useRef<BottomSheet>(null)

  // Update global ref when component mounts/updates
  useEffect(() => {
    const currentRef = bottomSheetRef.current
    if (currentRef) {
      // After null check, currentRef is guaranteed to be BottomSheet
      sheetRef = currentRef
    }
    return () => {
      if (sheetRef === currentRef) {
        sheetRef = null
      }
    }
  }, [])

  const snapPoints = useMemo(() => ['50%'], [])

  const { data, isLoading } = useTables(branchSlug)
  const tables = data?.result || []

  const { getCartItems, addTable } = useOrderFlowStore()
  const cartItems = getCartItems()
  const selectedTableId = cartItems?.table

  // Pre-compute status label (tránh t() trong list)
  const statusLabelMap = useMemo(() => {
    const map: Record<string, string> = {}
    Object.values(TableStatus).forEach((status) => {
      map[status] = t(`table.${status}`)
    })
    return map
  }, [t])

  // Backdrop component để đóng khi chạm vào backdrop
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    []
  )

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      enableContentPanningGesture={false}
      backdropComponent={renderBackdrop}
      backgroundStyle={{
        backgroundColor: isDark ? '#111827' : '#ffffff',
      }}
      containerStyle={{
        zIndex: 9999,
        elevation: 9999,
      }}
    >
      <View className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <Text className="text-base font-semibold text-gray-900 dark:text-gray-50">
          {t('table.title')}
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center py-12">
          <ActivityIndicator size="small" color={isDark ? '#9ca3af' : '#6b7280'} />
          <Text className="text-sm text-gray-500 dark:text-gray-400 mt-3">
            {t('table.loading', 'Đang tải...')}
          </Text>
        </View>
      ) : tables.length > 0 ? (
        <BottomSheetFlatList
          data={tables}
          keyExtractor={(item: ITable) => item.slug}
          initialNumToRender={8}
          windowSize={5}
          maxToRenderPerBatch={8}
          removeClippedSubviews
          ListEmptyComponent={
            <View className="px-4 py-8 items-center">
              <Text className="text-sm text-gray-500 dark:text-gray-400">
                {t('table.noTables', 'Không có bàn nào')}
              </Text>
            </View>
          }
          renderItem={({ item }: { item: ITable }) => (
            <TableRow
              table={item}
              isSelected={selectedTableId === item.slug}
              statusLabel={statusLabelMap[item.status] || item.status}
              onPress={() => {
                addTable(item)
                const currentRef = bottomSheetRef.current
                if (currentRef) {
                  currentRef.close()
                }
              }}
            />
          )}
        />
      ) : (
        <View className="flex-1 items-center justify-center py-12">
          <Text className="text-sm text-gray-500 dark:text-gray-400">
            {t('table.noTables', 'Không có bàn nào')}
          </Text>
        </View>
      )}
    </BottomSheet>
  )
}

// Expose static method to open sheet
TableSelectSheet.open = () => {
  sheetRef?.snapToIndex(0)
}

export default TableSelectSheet
