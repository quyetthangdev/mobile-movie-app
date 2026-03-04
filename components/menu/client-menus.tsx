import { FlashList } from '@shopify/flash-list'
import React, { useCallback, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Dimensions, Text, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'

import { useCatalog } from '@/hooks'
import { OrderFlowStep } from '@/constants'
import { useOrderFlowStore, useUserStore } from '@/stores'
import { IMenuItem, ISpecificMenu } from '@/types'
import { ClientMenuItem } from './client-menu-item'

interface IClientMenuProps {
  menu: ISpecificMenu | undefined
  isLoading: boolean
}

const ITEM_MARGIN_BOTTOM = 16

const MenuItemRow = React.memo(function MenuItemRow({
  item,
  index,
  itemWidth,
  marginRight,
}: {
  item: IMenuItem
  index: number
  itemWidth: number
  marginRight?: number
}) {
  const style = React.useMemo(
    () => ({
      width: itemWidth,
      marginBottom: ITEM_MARGIN_BOTTOM,
      ...(marginRight !== undefined && { marginRight }),
    }),
    [itemWidth, marginRight],
  )
  return (
    <Animated.View
      style={style}
      entering={FadeInDown.delay(index * 50).springify().damping(50)}
    >
      <ClientMenuItem item={item} />
    </Animated.View>
  )
})

const EMPTY_SEPARATOR = () => null

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

  // Init ordering khi menu mount — chạy 1 lần, không cần mỗi ClientMenuItem
  const hasOrderingData = useOrderFlowStore((s) => !!s.orderingData)
  const orderingOwner = useOrderFlowStore((s) => s.orderingData?.owner ?? '')
  const isHydrated = useOrderFlowStore((s) => s.isHydrated)
  const currentStep = useOrderFlowStore((s) => s.currentStep)
  const setCurrentStep = useOrderFlowStore((s) => s.setCurrentStep)
  const initializeOrdering = useOrderFlowStore((s) => s.initializeOrdering)
  const userSlug = useUserStore((s) => s.userInfo?.slug)

  useEffect(() => {
    if (!isHydrated) return
    const run = () => {
      if (currentStep !== OrderFlowStep.ORDERING) setCurrentStep(OrderFlowStep.ORDERING)
      if (!hasOrderingData) {
        initializeOrdering()
        return
      }
      if (userSlug && !orderingOwner.trim()) initializeOrdering()
    }
    const id = setTimeout(run, 0)
    return () => clearTimeout(id)
  }, [isHydrated, currentStep, hasOrderingData, orderingOwner, userSlug, setCurrentStep, initializeOrdering])

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

    // Group items by catalog — single pass O(n) thay vì O(catalogs × items)
    const groupsBySlug: Record<string, IMenuItem[]> = {}
    if (menuItems) {
      for (const item of menuItems) {
        const slug = item.product?.catalog?.slug
        if (slug) {
          (groupsBySlug[slug] ??= []).push(item)
        }
      }
    }
    const grouped =
      catalogs?.result?.map((catalog) => ({
        catalog,
        items: groupsBySlug[catalog.slug] ?? [],
      })) ?? []

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

  const renderItem = useCallback(
    ({ item, index }: { item: IMenuItem; index: number }) => (
      <MenuItemRow
        item={item}
        index={index}
        itemWidth={itemWidth}
        marginRight={
          !isMobile && index % numColumns !== numColumns - 1 ? gap : undefined
        }
      />
    ),
    [itemWidth, isMobile, numColumns, gap],
  )

  const keyExtractor = useCallback((item: IMenuItem) => item.slug ?? `item-${item.product?.slug ?? 'unknown'}`, [])

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

              {/* Menu Items Grid - FlashList thay FlatList cho hiệu năng tốt hơn */}
              <FlashList
                data={group.items}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                numColumns={numColumns}
                scrollEnabled={false}
                ItemSeparatorComponent={EMPTY_SEPARATOR}
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

