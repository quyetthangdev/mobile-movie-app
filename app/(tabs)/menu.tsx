import { MapPin, X } from 'lucide-react-native'
import moment from 'moment'
import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import {
  ClientCatalogSelect,
  ClientMenus,
  PriceRangeFilter,
  ProductNameSearch,
} from '@/components/menu'
import { FILTER_VALUE } from '@/constants'
import { usePublicSpecificMenu, useSpecificMenu } from '@/hooks'
import { useBranchStore, useMenuFilterStore, useUserStore } from '@/stores'
import { IMenuFilter, ISpecificMenuRequest } from '@/types'
import { formatCurrency } from '@/utils'

export default function ClientMenuPage() {
  const { t } = useTranslation(['menu'])
  const { userInfo } = useUserStore()
  const { menuFilter, setMenuFilter } = useMenuFilterStore()
  const { branch } = useBranchStore()

  const mapMenuFilterToRequest = (
    filter: IMenuFilter,
  ): ISpecificMenuRequest => {
    return {
      date: filter.date,
      branch: filter.branch,
      catalog: filter.catalog,
      productName: filter.productName,
      minPrice: filter.minPrice,
      maxPrice: filter.maxPrice,
      slug: filter.menu,
    }
  }

  const hasUser = !!userInfo?.slug
  const hasBranch = !!menuFilter.branch

  const {
    data: specificMenuData,
    isPending: specificMenuPending,
    refetch: refetchSpecificMenu,
  } = useSpecificMenu(mapMenuFilterToRequest(menuFilter), hasUser && hasBranch)

  const {
    data: publicSpecificMenuData,
    isPending: publicSpecificMenuPending,
    refetch: refetchPublicSpecificMenu,
  } = usePublicSpecificMenu(
    mapMenuFilterToRequest(menuFilter),
    !hasUser && hasBranch,
  )

  const specificMenu = userInfo?.slug
    ? specificMenuData
    : publicSpecificMenuData
  const isPending = userInfo?.slug
    ? specificMenuPending
    : publicSpecificMenuPending
  const refetchMenu = userInfo?.slug
    ? refetchSpecificMenu
    : refetchPublicSpecificMenu

  const [refreshing, setRefreshing] = React.useState(false)

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true)
    try {
      await refetchMenu()
    } finally {
      setRefreshing(false)
    }
  }, [refetchMenu])

  useEffect(() => {
    setMenuFilter((prev) => {
      const next = { ...prev }
      let changed = false

      // sync branch
      if (branch?.slug && prev.branch !== branch.slug) {
        next.branch = branch.slug
        changed = true
      }

      // sync date
      const today = moment().format('YYYY-MM-DD')
      if (prev.date !== today) {
        next.date = today
        changed = true
      }

      return changed ? next : prev
    })
  }, [branch?.slug, setMenuFilter])

  const handleClear = () => {
    setMenuFilter((prev) => ({
      ...prev,
      minPrice: FILTER_VALUE.MIN_PRICE,
      maxPrice: FILTER_VALUE.MAX_PRICE,
      branch: branch?.slug,
    }))
  }

  return (
    <SafeAreaView className="flex-1" edges={['top']}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#e50914"
            colors={['#e50914']}
          />
        }
      >
        {/* Container */}
        <View className="px-4 py-4">
          {/* Main Layout - Column on mobile, Row on larger screens */}
          <View className="flex-col gap-5">
            {/* Left - Sidebar/Filters */}
            <View className="w-full">
              <View className="flex-col gap-2">
                {/* Branch info */}
                <View className="flex-row items-center justify-center gap-1 py-2">
                  <MapPin size={16} color="#e50914" />
                  <Text className="text-xs text-red-600 dark:text-primary">
                    {branch
                      ? `${branch.name} (${branch.address})`
                      : t('menu.noData', 'Chưa chọn chi nhánh')}
                  </Text>
                </View>

                {/* Product name search */}
                <ProductNameSearch />

                {/* Catalog filter - Desktop */}
                <ClientCatalogSelect />

                {/* Price filter - TODO: Implement PriceRangeFilter */}
                <View className="rounded-lg bg-gray-100 p-3 dark:bg-gray-800">
                  <PriceRangeFilter />
                </View>

                {/* Price range display with clear button */}
                {(menuFilter.minPrice > FILTER_VALUE.MIN_PRICE ||
                  menuFilter.maxPrice < FILTER_VALUE.MAX_PRICE) && (
                  <View className="flex-row items-center justify-center gap-2 rounded-xl border border-red-600 bg-red-600/5 px-2 py-2 dark:border-primary dark:bg-primary/5">
                    <Text className="text-sm text-red-600 dark:text-primary">
                      {formatCurrency(menuFilter.minPrice)} -{' '}
                      {formatCurrency(menuFilter.maxPrice)}
                    </Text>
                    <TouchableOpacity onPress={handleClear}>
                      <X size={20} color="#e50914" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>

            {/* Right - Menu Items */}
            <View className="w-full">
              {!hasBranch ? (
                <View className="items-center justify-center py-10">
                  <Text className="text-center text-base text-gray-600 dark:text-gray-400">
                    Vui lòng chọn chi nhánh để xem menu
                  </Text>
                </View>
              ) : isPending ? (
                <View className="items-center justify-center py-10">
                  <ActivityIndicator size="large" color="#e50914" />
                  <Text className="mt-4 text-gray-600 dark:text-gray-400">
                    Đang tải menu...
                  </Text>
                </View>
              ) : (
                <ClientMenus menu={specificMenu?.result} isLoading={false} />
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
