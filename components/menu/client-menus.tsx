import React, { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Dimensions, FlatList, Text, View } from 'react-native'

import { useCatalog } from '@/hooks'
import { IMenuItem, ISpecificMenu } from '@/types'
import { ClientMenuItem } from './client-menu-item'

interface IClientMenuProps {
  menu: ISpecificMenu | undefined
  isLoading: boolean
}

/**
 * ClientMenus Component
 * 
 * Displays menu items grouped by catalog.
 * Sorts items by locked status and stock availability.
 * 
 * @example
 * ```tsx
 * <ClientMenus menu={menuData} isLoading={false} />
 * ```
 */
export const ClientMenus = React.memo(function ClientMenus({ menu, isLoading }: IClientMenuProps) {
  const { t } = useTranslation('menu')
  const { t: tCommon } = useTranslation('common')
  const { data: catalogs, isPending: isLoadingCatalog } = useCatalog()

  // Memoize sorted menu items to avoid sorting each render
  const menuItems = useMemo(() => {
    if (!menu?.menuItems) return undefined
    
    return [...menu.menuItems].sort((a, b) => {
      // Bring items that are not locked first
      if (a.isLocked !== b.isLocked) {
        return Number(a.isLocked) - Number(b.isLocked)
      }
      // Consider items with currentStock = null as "in stock" when isLimit = false
      const aInStock =
        (a.currentStock !== 0 && a.currentStock !== null) || !a.product.isLimit
      const bInStock =
        (b.currentStock !== 0 && b.currentStock !== null) || !b.product.isLimit
      // Bring items in stock first
      if (aInStock !== bInStock) {
        return Number(bInStock) - Number(aInStock) // In stock first
      }
      return 0
    })
  }, [menu])

  // Memoize grouped items and dimensions to avoid re-calculating
  const { groupedItems, itemWidth, numColumns, isMobile, gap } = useMemo(() => {
    const screenWidth = Dimensions.get('window').width
    const padding = 32 // px-4 * 2 = 16 * 2 = 32
    const gapValue = 16
    const mobile = screenWidth < 768
    const columns = mobile ? 1 : 4
    const width = mobile 
      ? screenWidth - padding 
      : (screenWidth - padding - (columns - 1) * gapValue) / columns

    // Group items by catalog (same logic as web)
    const grouped = catalogs?.result?.map((catalog) => ({
      catalog,
      items: menuItems?.filter(
        (item) => item.product.catalog.slug === catalog.slug,
      ) || [],
    })) || []

    // Sort groups by number of items (descending) - same as web
    grouped.sort((a, b) => b.items.length - a.items.length)

    return {
      groupedItems: grouped,
      itemWidth: width,
      numColumns: columns,
      isMobile: mobile,
      gap: gapValue,
    }
  }, [catalogs?.result, menuItems])

  // Memoize renderItem to avoid re-rendering items that are not needed
  const renderItem = useCallback(({ item }: { item: IMenuItem }) => (
    <View style={{ width: itemWidth, marginBottom: 16 }}>
      <ClientMenuItem item={item} />
    </View>
  ), [itemWidth])

  // Memoize keyExtractor
  const keyExtractor = useCallback((item: IMenuItem) => item.slug, [])

  if (isLoading || isLoadingCatalog) {
    return (
      <View className="flex-row flex-wrap gap-3">
        {Array.from({ length: 8 }).map((_, index) => (
          <View
            key={index}
            className="w-full sm:w-[calc(25%-0.75rem)] h-48 bg-gray-200 dark:bg-gray-700 rounded-xl"
          />
        ))}
      </View>
    )
  }

  if (!menuItems || menuItems.length === 0) {
    return (
      <Text className="text-center text-gray-600 dark:text-gray-400">
        {t('menu.noData', 'Không có dữ liệu')}
      </Text>
    )
  }

  return (
    <View>
      {groupedItems.length > 0 ? (
        groupedItems.map((group, index) => {
          if (group.items.length === 0) return null
          return (
            <View key={`catalog-${group.catalog.slug || index}`} className="mb-12 w-full">
              {/* Catalog Header - uppercase primary-highlight */}
              <Text className="uppercase text-primary font-bold text-lg mb-5">
                {group.catalog.name}
              </Text>

              {/* Menu Items Grid - using FlatList with numColumns */}
              <FlatList
                data={group.items}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                numColumns={numColumns}
                scrollEnabled={false}
                columnWrapperStyle={!isMobile ? { gap } : undefined}
                ItemSeparatorComponent={() => <View style={{ height: 0 }} />}
                // Performance optimizations for POS/Kiosk
                removeClippedSubviews={true}
                initialNumToRender={8}
                maxToRenderPerBatch={8}
                windowSize={5}
                updateCellsBatchingPeriod={50}
                getItemLayout={isMobile ? undefined : (_, index) => ({
                  length: itemWidth + 16, // itemWidth + marginBottom
                  offset: (itemWidth + 16) * Math.floor(index / numColumns),
                  index,
                })}
              />
            </View>
          )
        })
      ) : (
        <View className="mb-12 w-full">
          <Text className="uppercase text-primary font-bold text-lg">
            {tCommon('common.noData', 'Không có dữ liệu')}
          </Text>
        </View>
      )}
    </View>
  )
})

