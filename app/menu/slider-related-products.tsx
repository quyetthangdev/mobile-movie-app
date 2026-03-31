import { ChevronRight } from 'lucide-react-native'
import React, { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Dimensions, FlatList, Text, TouchableOpacity, View } from 'react-native'
import Animated, { FadeInRight } from 'react-native-reanimated'

import { ClientMenuItem } from '@/components/menu/client-menu-item'
import { ROUTE, colors } from '@/constants'
import { navigateNative } from '@/lib/navigation'
import { usePublicSpecificMenu, useSpecificMenu } from '@/hooks'
import {
  useBranchSlug,
  useMenuFilterForRequest,
  useUserSlug,
} from '@/stores/selectors'
import type { ISpecificMenuRequest } from '@/types'

// Module-level constants — computed once, never cause re-renders
const _SCREEN_WIDTH = Dimensions.get('window').width
const ITEM_WIDTH = _SCREEN_WIDTH < 640 ? 180 : 200
const ITEM_SPACING = 12
const ITEM_TOTAL_WIDTH = ITEM_WIDTH + ITEM_SPACING

interface SliderRelatedProductsProps {
  currentProduct: string
  catalog: string
}

export default function SliderRelatedProducts({
  currentProduct,
  catalog,
}: SliderRelatedProductsProps) {
  const { t } = useTranslation('product')
  const userSlug = useUserSlug()
  const menuFilterFields = useMenuFilterForRequest(catalog)
  const branchSlug = useBranchSlug()

  const menuRequest: ISpecificMenuRequest = {
    ...menuFilterFields,
    branch: menuFilterFields.branch || branchSlug,
    catalog,
  }

  const hasUser = !!userSlug
  const hasBranch = !!menuFilterFields.branch || !!branchSlug

  const { data: specificMenuData } = useSpecificMenu(
    menuRequest,
    hasUser && hasBranch
  )

  const { data: publicSpecificMenuData } = usePublicSpecificMenu(
    menuRequest,
    !hasUser && hasBranch
  )

  const specificMenu = userSlug ? specificMenuData : publicSpecificMenuData
  const menuItems = useMemo(
    () =>
      specificMenu?.result?.menuItems?.filter(
        (item) => item.slug !== currentProduct && item.product.catalog.slug === catalog,
      ) ?? [],
    [specificMenu, currentProduct, catalog],
  )

  // renderItem has no deps — uses module-level constants, animations don't restart on data refetch
  const renderItem = useCallback(
    ({ item, index }: { item: (typeof menuItems)[0]; index: number }) => (
      <Animated.View
        entering={FadeInRight.delay(index * 30).springify().damping(50)}
        style={{ width: ITEM_WIDTH, marginRight: ITEM_SPACING }}
      >
        <ClientMenuItem item={item} />
      </Animated.View>
    ),
    [],
  )

  const keyExtractor = useCallback((item: (typeof menuItems)[0]) => item.slug, [])

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: ITEM_TOTAL_WIDTH,
      offset: ITEM_TOTAL_WIDTH * index,
      index,
    }),
    [],
  )

  if (menuItems.length === 0) {
    return null
  }

  return (
    <View className="w-full mt-4">
      <View className="flex-row justify-between items-center mb-4 px-2">
        <Text className="text-lg font-bold text-red-600 dark:text-primary">
          {t('product.relatedProducts', 'Sản phẩm liên quan')}
        </Text>
        <TouchableOpacity
          onPress={() => navigateNative.replace(ROUTE.CLIENT_MENU)}
          className="flex-row items-center gap-1"
        >
          <Text className="text-sm text-gray-600 dark:text-gray-400">
            {t('product.goToMenu', 'Xem tất cả')}
          </Text>
          <ChevronRight size={16} color={colors.gray[500]} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={menuItems}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        contentContainerStyle={{ paddingHorizontal: 16 }}
      />
    </View>
  )
}

