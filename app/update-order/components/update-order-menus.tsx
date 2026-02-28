import React, { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Dimensions, FlatList, Text, View } from 'react-native'

import { useCatalog } from '@/hooks'
import { useAuthStore, useOrderFlowStore } from '@/stores'
import { usePublicSpecificMenu, useSpecificMenu } from '@/hooks/use-menu'
import { IMenuItem } from '@/types'
import moment from 'moment'

import ClientMenuItemForUpdateOrder from './client-menu-item-for-update-order'

interface UpdateOrderMenusProps {
  branchSlug: string
}

/**
 * Menu list cho Update Order - thêm món vào draft.
 * Dùng branch từ order, fetch menu theo branch + date hôm nay.
 */
export default function UpdateOrderMenus({ branchSlug }: UpdateOrderMenusProps) {
  const { t } = useTranslation('menu')
  const { data: catalogs, isPending: isLoadingCatalog } = useCatalog()
  const { updatingData } = useOrderFlowStore()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated())

  const menuRequest = useMemo(
    () => ({
      branch: branchSlug,
      date: moment().format('YYYY-MM-DD'),
    }),
    [branchSlug],
  )

  const shouldFetchAuth = !!branchSlug && isAuthenticated
  const shouldFetchPublic = !!branchSlug && !isAuthenticated

  const { data: authMenuData, isPending: isLoadingAuthMenu } = useSpecificMenu(
    menuRequest,
    shouldFetchAuth,
  )
  const { data: publicMenuData, isPending: isLoadingPublicMenu } =
    usePublicSpecificMenu(menuRequest, shouldFetchPublic)

  const menuData = isAuthenticated ? authMenuData : publicMenuData
  const isLoadingMenu = isAuthenticated ? isLoadingAuthMenu : isLoadingPublicMenu

  const menuItems = useMemo(() => {
    const items = menuData?.result?.menuItems
    if (!items) return undefined
    return [...items].sort((a, b) => {
      if (a.isLocked !== b.isLocked) {
        return Number(a.isLocked) - Number(b.isLocked)
      }
      const aInStock =
        (a.currentStock !== 0 && a.currentStock !== null) || !a.product.isLimit
      const bInStock =
        (b.currentStock !== 0 && b.currentStock !== null) || !b.product.isLimit
      return Number(bInStock) - Number(aInStock)
    })
  }, [menuData])

  const { groupedItems, itemWidth, numColumns, gap } = useMemo(() => {
    const screenWidth = Dimensions.get('window').width
    const padding = 32
    const gapValue = 16
    const columns = 2
    const width = (screenWidth - padding - (columns - 1) * gapValue) / columns

    const grouped =
      catalogs?.result?.map((catalog) => ({
        catalog,
        items:
          menuItems?.filter(
            (mi) => mi.product.catalog?.slug === catalog.slug,
          ) || [],
      })) || []
    grouped.sort((a, b) => b.items.length - a.items.length)

    return {
      groupedItems: grouped,
      itemWidth: width,
      numColumns: columns,
      gap: gapValue,
    }
  }, [catalogs?.result, menuItems])

  const renderItem = useCallback(
    ({ item }: { item: IMenuItem }) => (
      <View style={{ width: itemWidth, marginBottom: 16 }}>
        <ClientMenuItemForUpdateOrder item={item} />
      </View>
    ),
    [itemWidth],
  )

  const keyExtractor = useCallback((item: IMenuItem) => item.slug, [])

  if (!updatingData) return null

  if (!branchSlug) {
    return (
      <View className="items-center justify-center py-12 px-4">
        <Text className="text-center text-gray-600 dark:text-gray-400">
          {t('menu.noBranchForMenu', 'Không xác định được chi nhánh để tải thực đơn')}
        </Text>
      </View>
    )
  }

  if (isLoadingMenu || isLoadingCatalog) {
    return (
      <View className="flex-row flex-wrap gap-3 p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <View
            key={i}
            className="h-48 w-[47%] rounded-xl bg-gray-200 dark:bg-gray-700"
          />
        ))}
      </View>
    )
  }

  if (!menuItems || menuItems.length === 0) {
    return (
      <View className="items-center justify-center py-12">
        <Text className="text-center text-gray-600 dark:text-gray-400">
          {t('menu.noData', 'Không có dữ liệu')}
        </Text>
      </View>
    )
  }

  return (
    <View className="px-4 pb-8">
      <View className="mb-4 flex-row items-center gap-2">
        <View className="h-1 w-8 rounded-full bg-primary" />
        <Text className="text-lg font-bold uppercase text-primary">
          {t('menu.addMoreItems', 'Thêm món')}
        </Text>
      </View>
      {groupedItems.map((group, index) => {
        if (group.items.length === 0) return null
        return (
          <View
            key={`catalog-${group.catalog.slug || index}`}
            className="mb-8"
          >
            <Text className="mb-4 text-lg font-bold uppercase text-primary">
              {group.catalog.name}
            </Text>
            <FlatList
              data={group.items}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              numColumns={numColumns}
              scrollEnabled={false}
              columnWrapperStyle={{ gap }}
              key={`flat-${group.catalog.slug}`}
            />
          </View>
        )
      })}
    </View>
  )
}
