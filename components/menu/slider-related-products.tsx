import { useRouter } from 'expo-router'
import { ChevronRight } from 'lucide-react-native'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Dimensions, FlatList, Text, TouchableOpacity, View } from 'react-native'

import { ROUTE } from '@/constants'
import { usePublicSpecificMenu, useSpecificMenu } from '@/hooks'
import { useBranchStore, useMenuFilterStore, useUserStore } from '@/stores'
import { ISpecificMenuRequest } from '@/types'
import { ClientMenuItem } from './client-menu-item'

interface SliderRelatedProductsProps {
  currentProduct: string
  catalog: string
}

export default function SliderRelatedProducts({
  currentProduct,
  catalog,
}: SliderRelatedProductsProps) {
  const { t } = useTranslation('product')
  const router = useRouter()
  const { userInfo } = useUserStore()
  const { menuFilter } = useMenuFilterStore()
  const { branch } = useBranchStore()

  const mapMenuFilterToRequest = (filter: typeof menuFilter): ISpecificMenuRequest => {
    return {
      date: filter.date,
      branch: filter.branch || branch?.slug,
      catalog: catalog,
      productName: filter.productName,
      minPrice: filter.minPrice,
      maxPrice: filter.maxPrice,
      slug: filter.menu,
    }
  }

  const hasUser = !!userInfo?.slug
  const hasBranch = !!menuFilter.branch || !!branch?.slug

  const { data: specificMenuData } = useSpecificMenu(
    mapMenuFilterToRequest(menuFilter),
    hasUser && hasBranch
  )

  const { data: publicSpecificMenuData } = usePublicSpecificMenu(
    mapMenuFilterToRequest(menuFilter),
    !hasUser && hasBranch
  )

  const specificMenu = userInfo?.slug ? specificMenuData : publicSpecificMenuData
  const menuItems = specificMenu?.result?.menuItems?.filter(
    (item) => item.slug !== currentProduct && item.product.catalog.slug === catalog
  ) || []

  if (menuItems.length === 0) {
    return null
  }

  const screenWidth = Dimensions.get('window').width
  const itemWidth = screenWidth < 640 ? 180 : 200
  const itemSpacing = 12

  return (
    <View className="w-full mt-4">
      <View className="flex-row justify-between items-center mb-4 px-2">
        <Text className="text-lg font-bold text-red-600 dark:text-primary">
          {t('product.relatedProducts', 'Sản phẩm liên quan')}
        </Text>
        <TouchableOpacity
          onPress={() => router.push(ROUTE.CLIENT_MENU)}
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
        keyExtractor={(item) => item.slug}
        renderItem={({ item }) => (
          <View style={{ width: itemWidth, marginRight: itemSpacing }}>
            <ClientMenuItem item={item} />
          </View>
        )}
        contentContainerStyle={{ paddingHorizontal: 16 }}
      />
    </View>
  )
}

