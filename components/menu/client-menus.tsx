import { FlashList } from '@shopify/flash-list'
import React, { useCallback, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Text, useWindowDimensions, View } from 'react-native'

import { useCatalog, useOrderFlowAddToCart } from '@/hooks'
import { OrderFlowStep } from '@/constants'
import { useUserStore } from '@/stores'
import { useOrderFlowMenuItemControl } from '@/stores/selectors'
import { IMenuItem, ISpecificMenu } from '@/types'
import { ClientMenuItem } from './client-menu-item'

interface IClientMenuProps {
  menu: ISpecificMenu | undefined
  isLoading: boolean
}

const ITEM_MARGIN_BOTTOM = 16

/** Chunk món theo số cột — một hàng list = một hàng lưới (tránh nhiều FlashList scrollEnabled={false} trong ScrollView). */
function chunkItems<T>(arr: T[], size: number): T[][] {
  if (size <= 0) return []
  const rows: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    rows.push(arr.slice(i, i + size))
  }
  return rows
}

type FlatRow =
  | { type: 'header'; id: string; name: string; sectionIndex: number }
  | { type: 'items'; id: string; items: IMenuItem[] }

const MenuItemCell = React.memo(function MenuItemCell({
  item,
  itemWidth,
  marginRight,
  onAddToCart,
}: {
  item: IMenuItem
  itemWidth: number
  marginRight?: number
  onAddToCart?: (item: IMenuItem) => void
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
    <View style={style}>
      <ClientMenuItem item={item} onAddToCart={onAddToCart} />
    </View>
  )
})

/**
 * ClientMenus Component
 *
 * Displays menu items grouped by catalog.
 * Sorts items by locked status and stock availability.
 *
 * Một FlashList dọc (header catalog + hàng grid đã chunk) — virtualize toàn bộ menu,
 * không lồng nhiều FlashList tắt scroll trong ScrollView cha.
 *
 * @example
 * ```tsx
 * <View style={{ flex: 1 }}>
 *   <ClientMenus menu={menuData} isLoading={false} />
 * </View>
 * ```
 */
export const ClientMenus = React.memo(function ClientMenus({
  menu,
  isLoading,
}: IClientMenuProps) {
  const { t } = useTranslation('menu')
  const { t: tCommon } = useTranslation('common')

  const { width: windowWidth } = useWindowDimensions()
  const { data: catalogs, isPending: isLoadingCatalog } = useCatalog()

  const menuItems = useMemo(() => {
    if (!menu?.menuItems) return undefined

    return [...menu.menuItems].sort((a, b) => {
      if (a.isLocked !== b.isLocked) {
        return Number(a.isLocked) - Number(b.isLocked)
      }
      const aInStock =
        (a.currentStock !== 0 && a.currentStock !== null) || !a.product.isLimit
      const bInStock =
        (b.currentStock !== 0 && b.currentStock !== null) || !b.product.isLimit
      if (aInStock !== bInStock) {
        return Number(bInStock) - Number(aInStock)
      }
      return 0
    })
  }, [menu])

  const {
    hasOrderingData,
    orderingOwner,
    isHydrated,
    currentStep,
    setCurrentStep,
    initializeOrdering,
  } = useOrderFlowMenuItemControl()
  const userSlug = useUserStore((s) => s.userInfo?.slug)

  useEffect(() => {
    if (!isHydrated) return
    const run = () => {
      if (currentStep !== OrderFlowStep.ORDERING)
        setCurrentStep(OrderFlowStep.ORDERING)
      if (!hasOrderingData) {
        initializeOrdering()
        return
      }
      if (userSlug && !orderingOwner.trim()) initializeOrdering()
    }
    const id = setTimeout(run, 0)
    return () => clearTimeout(id)
  }, [
    isHydrated,
    currentStep,
    hasOrderingData,
    orderingOwner,
    userSlug,
    setCurrentStep,
    initializeOrdering,
  ])

  const { itemWidth, numColumns, isMobile, gap, flatData } = useMemo(() => {
      const padding = 32
      const gapValue = 16
      const mobile = windowWidth < 768
      const columns = mobile ? 1 : 4
      const width = mobile
        ? windowWidth - padding
        : (windowWidth - padding - (columns - 1) * gapValue) / columns

      const groupsBySlug: Record<string, IMenuItem[]> = {}
      if (menuItems) {
        for (const item of menuItems) {
          const slug = item.product?.catalog?.slug
          if (slug) {
            ;(groupsBySlug[slug] ??= []).push(item)
          }
        }
      }
      const grouped =
        catalogs?.result?.map((catalog) => ({
          catalog,
          items: groupsBySlug[catalog.slug] ?? [],
        })) ?? []

      grouped.sort((a, b) => b.items.length - a.items.length)

      const flat: FlatRow[] = []
      let sectionIndex = 0
      for (const group of grouped) {
        if (group.items.length === 0) continue
        flat.push({
          type: 'header',
          id: `h-${group.catalog.slug}-${sectionIndex}`,
          name: group.catalog.name,
          sectionIndex,
        })
        const rows = chunkItems(group.items, columns)
        rows.forEach((rowItems, rowIdx) => {
          flat.push({
            type: 'items',
            id: `r-${group.catalog.slug}-${sectionIndex}-${rowIdx}`,
            items: rowItems,
          })
        })
        sectionIndex += 1
      }

      return {
        itemWidth: width,
        numColumns: columns,
        isMobile: mobile,
        gap: gapValue,
        flatData: flat,
      }
    }, [catalogs?.result, menuItems, windowWidth])

  const onAddToCart = useOrderFlowAddToCart()

  const getItemType = useCallback((item: FlatRow) => item.type, [])

  const renderItem = useCallback(
    ({ item }: { item: FlatRow }) => {
      if (item.type === 'header') {
        return (
          <View style={item.sectionIndex > 0 ? { marginTop: 48 } : undefined}>
            <Text className="mb-5 text-lg font-bold uppercase text-primary">
              {item.name}
            </Text>
          </View>
        )
      }
      return (
        <View className="w-full flex-row" style={{ flexWrap: 'nowrap' }}>
          {item.items.map((menuItem, colIndex) => (
            <MenuItemCell
              key={
                menuItem.slug ??
                menuItem.product?.slug ??
                `${item.id}-${colIndex}`
              }
              item={menuItem}
              itemWidth={itemWidth}
              marginRight={
                !isMobile && colIndex < item.items.length - 1
                  ? gap
                  : undefined
              }
              onAddToCart={onAddToCart}
            />
          ))}
        </View>
      )
    },
    [itemWidth, isMobile, gap, onAddToCart],
  )

  const keyExtractor = useCallback((item: FlatRow) => item.id, [])

  if (isLoading || isLoadingCatalog) {
    return (
      <View className="flex-row flex-wrap gap-3">
        {Array.from({ length: 8 }).map((_, index) => (
          <View
            key={index}
            className="h-48 w-full rounded-xl bg-gray-200 dark:bg-gray-700 sm:w-[calc(25%-0.75rem)]"
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

  if (flatData.length === 0) {
    return (
      <View className="mb-12 w-full">
        <Text className="text-lg font-bold uppercase text-primary">
          {tCommon('common.noData', 'Không có dữ liệu')}
        </Text>
      </View>
    )
  }

  return (
    <FlashList
      data={flatData}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      getItemType={getItemType}
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 48 }}
      showsVerticalScrollIndicator={false}
      drawDistance={numColumns === 1 ? 420 : 520}
      overrideProps={{ initialDrawBatchSize: 8 }}
    />
  )
})
