import React from 'react'
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
export function ClientMenus({ menu, isLoading }: IClientMenuProps) {
  const { t } = useTranslation('menu')
  const { t: tCommon } = useTranslation('common')
  const { data: catalogs, isPending: isLoadingCatalog } = useCatalog()

  // Sort menu items: unlocked first, then by stock availability (same logic as web)
  const menuItems = menu?.menuItems?.sort((a, b) => {
    // Đưa các mục không bị khóa lên trước
    if (a.isLocked !== b.isLocked) {
      return Number(a.isLocked) - Number(b.isLocked)
    }
    // Coi mục với currentStock = null là "còn hàng" khi isLimit = false
    const aInStock =
      (a.currentStock !== 0 && a.currentStock !== null) || !a.product.isLimit
    const bInStock =
      (b.currentStock !== 0 && b.currentStock !== null) || !b.product.isLimit
    // Đưa các mục còn hàng lên trước
    if (aInStock !== bInStock) {
      return Number(bInStock) - Number(aInStock) // Còn hàng trước hết hàng
    }
    return 0
  })

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

  // Group items by catalog (same logic as web)
  const groupedItems =
    catalogs?.result?.map((catalog) => ({
      catalog,
      items: menuItems.filter(
        (item) => item.product.catalog.slug === catalog.slug,
      ),
    })) || []

  // Sort groups by number of items (descending) - same as web
  groupedItems.sort((a, b) => b.items.length - a.items.length)

  // Calculate item width based on screen size (similar to web grid-cols-4 on lg)
  const screenWidth = Dimensions.get('window').width
  const padding = 32 // px-4 * 2 = 16 * 2 = 32
  const gap = 16
  const isMobile = screenWidth < 768
  const numColumns = isMobile ? 1 : 4
  const itemWidth = isMobile 
    ? screenWidth - padding 
    : (screenWidth - padding - (numColumns - 1) * gap) / numColumns

  const renderItem = ({ item }: { item: IMenuItem }) => (
    <View style={{ width: itemWidth, marginBottom: 16 }}>
      <ClientMenuItem item={item} />
    </View>
  )

  return (
    <View>
      {groupedItems.length > 0 ? (
        groupedItems.map((group, index) => {
          if (group.items.length === 0) return null
          return (
            <View key={`catalog-${group.catalog.slug || index}`} className="mb-12 w-full">
              {/* Catalog Header - uppercase primary-highlight */}
              <Text className="uppercase text-red-600 dark:text-primary font-bold text-lg mb-5">
                {group.catalog.name}
              </Text>

              {/* Menu Items Grid - using FlatList with numColumns */}
              <FlatList
                data={group.items}
                renderItem={renderItem}
                keyExtractor={(item) => item.slug}
                numColumns={numColumns}
                scrollEnabled={false}
                columnWrapperStyle={!isMobile ? { gap } : undefined}
                ItemSeparatorComponent={() => <View style={{ height: 0 }} />}
              />
            </View>
          )
        })
      ) : (
        <View className="mb-12 w-full">
          <Text className="uppercase text-red-600 dark:text-primary font-bold text-lg">
            {tCommon('common.noData', 'Không có dữ liệu')}
          </Text>
        </View>
      )}
    </View>
  )
}

