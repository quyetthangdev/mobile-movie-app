import { MapPin, X } from 'lucide-react-native'
import moment from 'moment'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Images } from '@/assets/images'
import { SelectBranchDropdown } from '@/components/branch'
import { LogoutDialog, SettingsDropdown, UserAvatarDropdown } from '@/components/dialog'
import {
  ClientCatalogSelect,
  ClientMenus,
  PriceRangeFilter,
  ProductNameSearch,
} from '@/components/menu'
import { FILTER_VALUE } from '@/constants'
import { usePublicSpecificMenu, useSpecificMenu } from '@/hooks'
import { useAuthStore, useBranchStore, useMenuFilterStore, useUserStore } from '@/stores'
import { IMenuFilter, ISpecificMenuRequest } from '@/types'
import { formatCurrency } from '@/utils'

export default function ClientMenuPage() {
  const { t } = useTranslation(['menu'])
  const userInfo = useUserStore((state) => state.userInfo)
  const setLogout = useAuthStore((state) => state.setLogout)
  const removeUserInfo = useUserStore((state) => state.removeUserInfo)
  const { menuFilter, setMenuFilter } = useMenuFilterStore()
  const { branch } = useBranchStore()
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false)

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

  const handleLogout = () => {
    setLogout()
    removeUserInfo()
  }

  const handleLogoutPress = () => {
    setIsLogoutDialogOpen(true)
  }

  return (
    <SafeAreaView className="flex-1" edges={['top']}>
      {/* Header */}
      <View className="bg-transparent px-5 py-3 flex-row items-center justify-between z-10">
        {/* Left side: Logo */}
        <View className="flex-row items-center">
          <Image
            source={Images.Brand.Logo as unknown as number}
            className="h-8 w-28"
            resizeMode="contain"
          />
        </View>
        {/* Right side: Branch Select, Settings and Avatar with Dropdown */}
        <View className="flex-row items-center gap-3">
          <SelectBranchDropdown />
          <SettingsDropdown />
          <UserAvatarDropdown userInfo={userInfo} onLogoutPress={handleLogoutPress} />
        </View>
      </View>

      {/* Content */}
      <View className="flex-1">
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
                  <Text className="text-xs text-gray-600">
                    {branch
                      ? `${branch.name} (${branch.address})`
                      : t('menu.noData', 'Chưa chọn chi nhánh')}
                  </Text>
                </View>

                {/* Product name search */}
                <ProductNameSearch />

                {/* Catalog and Price filter - Same row */}
                <View className="flex-row gap-2">
                  <View className="flex-1">
                    <ClientCatalogSelect />
                  </View>
                  <PriceRangeFilter />
                </View>

                {/* Price range display with clear button */}
                {(menuFilter.minPrice > FILTER_VALUE.MIN_PRICE ||
                  menuFilter.maxPrice < FILTER_VALUE.MAX_PRICE) && (
                  <View className="flex-row items-center justify-center gap-2 rounded-xl border border-primary bg-primary/5 px-2 py-2">
                    <Text className="text-sm text-primary">
                      {formatCurrency(menuFilter.minPrice)} -{' '}
                      {formatCurrency(menuFilter.maxPrice)}
                    </Text>
                    <TouchableOpacity onPress={handleClear}>
                      <X size={20} color="#6b7280" />
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
                  <ActivityIndicator size="large" color="#6b7280" />
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
      </View>

      {/* Logout Dialog */}
      <LogoutDialog
        isOpen={isLogoutDialogOpen}
        onOpenChange={setIsLogoutDialogOpen}
        onLogout={handleLogout}
      />
    </SafeAreaView>
  )
}
