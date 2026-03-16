import BottomSheet, { BottomSheetBackdrop, BottomSheetBackdropProps, BottomSheetFlatList } from '@gorhom/bottom-sheet'
import { Check, Circle } from 'lucide-react-native'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Text, TouchableOpacity, useColorScheme, View } from 'react-native'

import { TableStatus } from '@/constants'
import { colors } from '@/constants/colors.constant'
import { useTables } from '@/hooks'
import { cn } from '@/lib/utils'
import { useOrderFlowStore } from '@/stores'
import { ITable } from '@/types'

let sheetRef: BottomSheet | null = null
let openCallback: (() => void) | null = null
let isComponentMounted = false
let pendingOpen = false

interface TableSelectSheetProps {
  branchSlug: string
}

const TABLE_PAGE_SIZE = 12

function TableSelectSheet({ branchSlug }: TableSelectSheetProps) {
  const { t } = useTranslation('table')
  const isDark = useColorScheme() === 'dark'
  const bottomSheetRef = useRef<BottomSheet>(null)
  const [shouldOpen, setShouldOpen] = useState(false)
  const [_isOpen, setIsOpen] = useState(false)
  const [visibleCount, setVisibleCount] = useState(TABLE_PAGE_SIZE)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  // Copy đúng pattern ref + openCallback từ VoucherListDrawer
  useEffect(() => {
    isComponentMounted = true

    const checkAndSetRef = () => {
      const currentRef = bottomSheetRef.current
      if (currentRef && isComponentMounted) {
        sheetRef = currentRef
        openCallback = () => {
          setShouldOpen(true)
        }
        if (pendingOpen) {
          pendingOpen = false
          setTimeout(() => setShouldOpen(true), 0)
        }
        return currentRef
      }
      return null
    }

    // Check immediately
    checkAndSetRef()

    // Retry 2 lần nếu BottomSheet mount bất đồng bộ
    const timeoutId1 = setTimeout(() => {
      if (isComponentMounted) checkAndSetRef()
    }, 100)
    const timeoutId2 = setTimeout(() => {
      if (isComponentMounted) checkAndSetRef()
    }, 300)

    return () => {
      clearTimeout(timeoutId1)
      clearTimeout(timeoutId2)
    }
  }, [])

  // Liên tục đồng bộ ref khi bottomSheetRef thay đổi (giống VoucherListDrawer)
  useEffect(() => {
    if (bottomSheetRef.current && isComponentMounted) {
      sheetRef = bottomSheetRef.current
      openCallback = () => {
        setShouldOpen(true)
      }
      if (pendingOpen) {
        pendingOpen = false
        setTimeout(() => setShouldOpen(true), 0)
      }
    }
  }, [])

  const snapPoints = useMemo(() => ['50%'], [])

  // Handle sheet index changes (để reset shouldOpen giống VoucherListDrawer)
  const handleSheetChanges = useCallback(
    (index: number) => {
      setIsOpen(index >= 0)

      if (index < 0) {
        setShouldOpen(false)
      } else if (index >= 0 && shouldOpen) {
        setShouldOpen(false)
      }
    },
    [shouldOpen],
  )

  // Handle shouldOpen state change — mở sheet với retry giống VoucherListDrawer
  useEffect(() => {
    if (!shouldOpen) return

    const openSheet = () => {
      if (!bottomSheetRef.current) {
        return false
      }

      try {
        bottomSheetRef.current.snapToIndex(0)
        return true
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[TableSelectSheet] Error calling snapToIndex:', error)
        return false
      }
    }

    // Thử mở ngay
    if (openSheet()) {
      return
    }

    const timeout1 = setTimeout(() => {
      if (shouldOpen && openSheet()) return
    }, 50)

    const timeout2 = setTimeout(() => {
      if (shouldOpen && openSheet()) return
    }, 100)

    const timeout3 = setTimeout(() => {
      if (shouldOpen && openSheet()) return
    }, 200)

    return () => {
      clearTimeout(timeout1)
      clearTimeout(timeout2)
      clearTimeout(timeout3)
    }
  }, [shouldOpen])

  const { data, isLoading } = useTables(branchSlug)
  const tables = useMemo(() => data?.result || [], [data])
  const visibleTables = useMemo(
    () => tables.slice(0, visibleCount),
    [tables, visibleCount],
  )
  const hasMoreTables = visibleCount < tables.length

  const getCartItems = useOrderFlowStore((s) => s.getCartItems)
  const addTable = useOrderFlowStore((s) => s.addTable)
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

  const resetPagination = useCallback(() => {
    setVisibleCount(TABLE_PAGE_SIZE)
    setIsLoadingMore(false)
  }, [])

  // Reset phân trang khi chi nhánh hoặc số lượng bàn thay đổi
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      resetPagination()
    }, 0)

    return () => clearTimeout(timeoutId)
  }, [branchSlug, tables.length, resetPagination])

  // Reset phân trang mỗi lần sheet được mở
  useEffect(() => {
    if (!shouldOpen) return

    const timeoutId = setTimeout(() => {
      resetPagination()
    }, 0)

    return () => clearTimeout(timeoutId)
  }, [shouldOpen, resetPagination])

  const handleLoadMore = useCallback(() => {
    if (isLoading || isLoadingMore || !hasMoreTables) return
    setIsLoadingMore(true)
    requestAnimationFrame(() => {
      setVisibleCount((prev) => Math.min(prev + TABLE_PAGE_SIZE, tables.length))
      setIsLoadingMore(false)
    })
  }, [hasMoreTables, isLoading, isLoadingMore, tables.length])

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

  const renderItem = useCallback(
    ({ item }: { item: ITable }) => {
      const statusLabel = statusLabelMap[item.status]
      const isSelected = selectedTableId === item.slug
      const isReserved = item.status === TableStatus.RESERVED
      const isAvailable = item.status === TableStatus.AVAILABLE

      return (
        <TouchableOpacity
          onPress={() => {
            addTable(item)
            bottomSheetRef.current?.close()
          }}
          className={cn(
            'mx-3 my-2 flex-row items-center gap-3 rounded-xl p-4',
            isSelected
              ? 'border border-primary/60 bg-primary/5'
              : 'border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900',
          )}
        >
          <View
            className={cn(
              'h-6 w-6 items-center justify-center rounded-full',
              isSelected ? 'bg-primary/10' : 'bg-gray-100 dark:bg-gray-800',
            )}
          >
            <Circle
              size={10}
              color={
                isReserved
                  ? '#ef4444'
                  : isAvailable
                    ? '#22c55e'
                    : colors.mutedForeground.light
              }
              fill={
                isReserved
                  ? '#ef4444'
                  : isAvailable
                    ? '#22c55e'
                    : 'transparent'
              }
            />
          </View>

          <View className="flex-1 flex-row items-center gap-2">
            <Text
              numberOfLines={1}
              className={cn(
                'flex-shrink text-base font-semibold',
                'text-gray-900 dark:text-gray-50',
              )}
            >
              {item.name}
            </Text>
            <Text className="text-sm text-gray-400 dark:text-gray-500">-</Text>
            <Text
              numberOfLines={1}
              className={cn(
                'flex-1 text-sm font-medium',
                isReserved
                  ? 'text-red-600 dark:text-red-400'
                  : isAvailable
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-gray-500 dark:text-gray-400',
              )}
            >
              {statusLabel || item.status}
            </Text>
          </View>

          {isSelected && (
            <View className="ml-2 h-6 items-center justify-center rounded-full bg-primary/10 px-3">
              <Check size={14} color={colors.primary.light} />
            </View>
          )}
        </TouchableOpacity>
      )
    },
    [addTable, selectedTableId, statusLabelMap],
  )

  const renderFooter = useCallback(() => {
    if (isLoadingMore) {
      return (
        <View className="items-center py-3">
          <ActivityIndicator size="small" color={isDark ? '#9ca3af' : '#6b7280'} />
        </View>
      )
    }

    if (!hasMoreTables) return <View className="h-2" />

    return (
      <View className="items-center px-4 pb-4 pt-2">
        <TouchableOpacity
          onPress={handleLoadMore}
          className="rounded-full border border-gray-200 bg-white px-4 py-2 dark:border-gray-700 dark:bg-gray-900"
          activeOpacity={0.85}
        >
          <Text className="text-xs font-medium text-gray-700 dark:text-gray-300">
            {t('table.loadMore', 'Xem thêm bàn')}
          </Text>
        </TouchableOpacity>
      </View>
    )
  }, [handleLoadMore, hasMoreTables, isDark, isLoadingMore, t])

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
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
          data={visibleTables}
          keyExtractor={(item: ITable) => item.slug}
          initialNumToRender={8}
          windowSize={5}
          maxToRenderPerBatch={8}
          removeClippedSubviews
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.35}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            <View className="px-4 py-8 items-center">
              <Text className="text-sm text-gray-500 dark:text-gray-400">
                {t('table.noTables', 'Không có bàn nào')}
              </Text>
            </View>
          }
          renderItem={renderItem}
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

// Expose static method to open sheet — copy pattern từ VoucherListDrawer (B3: pendingOpen khi chưa mount)
TableSelectSheet.open = () => {
  if (openCallback) {
    openCallback()
  } else if (sheetRef) {
    try {
      sheetRef.snapToIndex(0)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[TableSelectSheet.open] Error:', error)
    }
  } else {
    pendingOpen = true
    // eslint-disable-next-line no-console
    console.warn(
      '[TableSelectSheet.open] Both sheetRef and openCallback are null, retrying with multiple attempts...',
    )

    const attempts = [100, 200, 300, 500, 1000]
    attempts.forEach((delay, index) => {
      setTimeout(() => {
        if (openCallback) {
          openCallback()
        } else if (sheetRef) {
          try {
            sheetRef.snapToIndex(0)
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error(
              `[TableSelectSheet.open] Retry ${index + 1} error:`,
              error,
            )
          }
        } else if (index === attempts.length - 1) {
          // eslint-disable-next-line no-console
          console.error(
            '[TableSelectSheet.open] All retry attempts failed. Component may not be mounted.',
          )
        }
      }, delay)
    })
  }
}

export default TableSelectSheet
