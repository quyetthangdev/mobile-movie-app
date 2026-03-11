import { ChevronRight } from 'lucide-react-native'
import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Dimensions, FlatList, Text, TouchableOpacity, View } from 'react-native'
import Animated, { FadeInRight } from 'react-native-reanimated'

import { ClientMenuItem } from '@/components/menu/client-menu-item'
import { ROUTE } from '@/constants'
import { navigateNative } from '@/lib/navigation'
import { usePublicSpecificMenu, useSpecificMenu } from '@/hooks'
import {
  useBranchSlug,
  useMenuFilterForRequest,
  useUserSlug,
} from '@/stores/selectors'
import type { ISpecificMenuRequest } from '@/types'

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
  const menuItems = specificMenu?.result?.menuItems?.filter(
    (item) => item.slug !== currentProduct && item.product.catalog.slug === catalog
  ) || []

  const screenWidth = Dimensions.get('window').width
  const itemWidth = screenWidth < 640 ? 180 : 200
  const itemSpacing = 12

  const renderItem = useCallback(
    ({ item, index }: { item: (typeof menuItems)[0]; index: number }) => (
      <Animated.View
        entering={FadeInRight.delay(index * 100).springify().damping(50)}
        style={{ width: itemWidth, marginRight: itemSpacing }}
      >
        <ClientMenuItem item={item} />
      </Animated.View>
    ),
    [itemWidth, itemSpacing],
  )

  const keyExtractor = useCallback((item: (typeof menuItems)[0]) => item.slug, [])

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
          <ChevronRight size={16} color="#6b7280" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={menuItems}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 16 }}
      />
    </View>
  )
}

