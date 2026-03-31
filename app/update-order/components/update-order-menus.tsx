import { FlashList } from '@shopify/flash-list'
import dayjs from 'dayjs'
import React, { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, useColorScheme, View } from 'react-native'

import { colors } from '@/constants'
import { useCatalog } from '@/hooks'
import { usePublicSpecificMenu, useSpecificMenu } from '@/hooks/use-menu'
import { useAuthStore, useOrderFlowStore } from '@/stores'
import { IMenuItem } from '@/types'

import ClientMenuItemForUpdateOrder from './client-menu-item-for-update-order'

interface UpdateOrderMenusProps {
  branchSlug: string
  primaryColor: string
}

export default function UpdateOrderMenus({ branchSlug, primaryColor }: UpdateOrderMenusProps) {
  const { t } = useTranslation('menu')
  const isDark = useColorScheme() === 'dark'
  const { data: catalogs, isPending: isLoadingCatalog } = useCatalog()
  const hasUpdatingData = useOrderFlowStore((s) => s.updatingData !== null)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated())

  const menuRequest = useMemo(
    () => ({ branch: branchSlug, date: dayjs().format('YYYY-MM-DD') }),
    [branchSlug],
  )

  const shouldFetchAuth = !!branchSlug && isAuthenticated
  const shouldFetchPublic = !!branchSlug && !isAuthenticated

  const { data: authMenuData, isPending: isLoadingAuthMenu } = useSpecificMenu(
    menuRequest,
    shouldFetchAuth,
  )
  const { data: publicMenuData, isPending: isLoadingPublicMenu } = usePublicSpecificMenu(
    menuRequest,
    shouldFetchPublic,
  )

  const menuData = isAuthenticated ? authMenuData : publicMenuData
  const isLoadingMenu = isAuthenticated ? isLoadingAuthMenu : isLoadingPublicMenu

  const menuItems = useMemo(() => {
    const items = menuData?.result?.menuItems
    if (!items) return undefined
    return [...items].sort((a, b) => {
      if (a.isLocked !== b.isLocked) return Number(a.isLocked) - Number(b.isLocked)
      const aInStock = (a.currentStock !== 0 && a.currentStock !== null) || !a.product.isLimit
      const bInStock = (b.currentStock !== 0 && b.currentStock !== null) || !b.product.isLimit
      return Number(bInStock) - Number(aInStock)
    })
  }, [menuData])

  const groupedItems = useMemo(() => {
    const grouped =
      catalogs?.result?.map((catalog) => ({
        catalog,
        items: menuItems?.filter((mi) => mi.product.catalog?.slug === catalog.slug) || [],
      })) || []
    grouped.sort((a, b) => b.items.length - a.items.length)
    return grouped
  }, [catalogs?.result, menuItems])

  // showImage phase gate — defer heavy decodes
  const [showImage, setShowImage] = useState(false)
  React.useEffect(() => {
    const id = requestAnimationFrame(() => setShowImage(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const renderItem = useCallback(
    ({ item, index }: { item: IMenuItem; index: number }) => (
      <ClientMenuItemForUpdateOrder
        item={item}
        listIndex={index}
        showImage={showImage}
        primaryColor={primaryColor}
      />
    ),
    [showImage, primaryColor],
  )

  const keyExtractor = useCallback((item: IMenuItem) => item.slug, [])

  if (!hasUpdatingData) return null

  if (!branchSlug) {
    return (
      <View style={s.center}>
        <Text style={[s.grayText, { color: isDark ? colors.gray[400] : colors.gray[500] }]}>
          {t('menu.noBranchForMenu', 'Không xác định được chi nhánh để tải thực đơn')}
        </Text>
      </View>
    )
  }

  if (isLoadingMenu || isLoadingCatalog) {
    return (
      <View style={s.skeletonList}>
        {Array.from({ length: 5 }).map((_, i) => (
          <View
            key={i}
            style={[
              s.skeletonItem,
              { backgroundColor: isDark ? colors.gray[700] : colors.gray[200] },
            ]}
          />
        ))}
      </View>
    )
  }

  if (!menuItems || menuItems.length === 0) {
    return (
      <View style={s.center}>
        <Text style={[s.grayText, { color: isDark ? colors.gray[400] : colors.gray[500] }]}>
          {t('menu.noData', 'Không có dữ liệu')}
        </Text>
      </View>
    )
  }

  const grayColor = isDark ? colors.gray[400] : colors.gray[500]

  return (
    <View style={s.container}>
      {groupedItems.map((group, index) => {
        if (group.items.length === 0) return null
        return (
          <View key={`catalog-${group.catalog.slug || index}`} style={s.catalogSection}>
            <Text style={[s.catalogName, { color: grayColor }]}>
              {group.catalog.name}
            </Text>
            <FlashList
              data={group.items}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              scrollEnabled={false}
            />
          </View>
        )
      })}
    </View>
  )
}

const s = StyleSheet.create({
  container: { paddingBottom: 32, paddingTop: 8 },
  catalogSection: { marginBottom: 24 },
  catalogName: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 48,
  },
  grayText: { textAlign: 'center' },
  skeletonList: { padding: 16, gap: 12 },
  skeletonItem: { height: 104, borderRadius: 16, marginHorizontal: 16 },
})
