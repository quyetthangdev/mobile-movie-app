import { useRouter } from 'expo-router'
import { MapPin, X } from 'lucide-react-native'
import moment from 'moment'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Image, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Images } from '@/assets/images'
import { SelectBranchDropdown } from '@/components/branch'
import { LogoutDialog, SettingsDropdown, UserAvatarDropdown } from '@/components/dialog'
import { ClientCatalogSelect, ClientMenus, PriceRangeFilter, ProductNameSearch } from '@/components/menu'
import { Skeleton } from '@/components/ui'
import { FILTER_VALUE, ROUTE } from '@/constants'
import { usePublicSpecificMenu, useRunAfterTransition, useSpecificMenu } from '@/hooks'
import { useAuthStore, useBranchStore, useMenuFilterStore, useUserStore } from '@/stores'
import { IMenuFilter, ISpecificMenuRequest } from '@/types'
import { formatCurrency } from '@/utils'

/** Shell cực nhẹ: không store, không query. Chỉ dùng cho frame đầu khi chuyển tab → commit <16ms. */
function MenuListSkeleton() {
  return (
    <View>
      {[1, 2, 3, 4, 5, 6].map((key) => (
        <View
          key={key}
          className="rounded-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4 flex-row"
          style={{ marginBottom: key < 6 ? 16 : 0, gap: 12 }}
        >
          <Skeleton className="w-20 h-20 rounded-md" />
          <View className="flex-1" style={{ gap: 8 }}>
            <Skeleton className="h-4 rounded-md" style={{ width: '80%' }} />
            <Skeleton className="h-3 rounded-md" style={{ width: '50%' }} />
            <Skeleton className="h-3 rounded-md" style={{ width: '35%' }} />
          </View>
        </View>
      ))}
    </View>
  )
}

/** Shell cực nhẹ: có header + filter + list để giữ layout ổn định khi loading. */
function MenuSkeletonShell() {
  return (
    <SafeAreaView className="flex-1 pb-12" edges={['top']}>
      <View className="bg-transparent px-5 py-3 flex-row items-center justify-between z-10">
        <Skeleton className="h-8 w-28 rounded-md" />
        <View className="flex-row items-center" style={{ gap: 12 }}>
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </View>
      </View>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
      >
        <View style={{ marginBottom: 20 }}>
          <View className="items-center py-2" style={{ marginBottom: 8 }}>
            <Skeleton className="h-4 rounded-md" style={{ width: '72%' }} />
          </View>
          <Skeleton className="h-10 w-full rounded-lg" style={{ marginBottom: 8 }} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Skeleton className="h-10 flex-1 rounded-lg" />
            <Skeleton className="h-10 w-12 rounded-lg" />
          </View>
        </View>
        <MenuListSkeleton />
      </ScrollView>
    </SafeAreaView>
  )
}

function ClientMenuContent() {
  const router = useRouter()
  const { t } = useTranslation(['menu'])
  // Optimize Zustand selectors - subscribe the necessary
  const userInfo = useUserStore((state) => state.userInfo)
  const userSlug = useUserStore((state) => state.userInfo?.slug) // Only subscribe slug
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated())
  const setLogout = useAuthStore((state) => state.setLogout)
  const removeUserInfo = useUserStore((state) => state.removeUserInfo)
  const { menuFilter, setMenuFilter } = useMenuFilterStore()
  const branch = useBranchStore((state) => state.branch) // Only subscribe branch
  const branchSlug = useBranchStore((state) => state.branch?.slug) // Only subscribe slug
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false)

  // Fetch sau khi transition tab xong → trang chuyển ngay (skeleton), không khựng
  const [allowFetch, setAllowFetch] = useState(false)
  useRunAfterTransition(() => setAllowFetch(true), [])

  // Memoize expensive calculation
  const mapMenuFilterToRequest = useCallback((
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
  }, [])

  // Memoize request object to avoid re-create
  const menuRequest = useMemo(() => mapMenuFilterToRequest(menuFilter), [menuFilter, mapMenuFilterToRequest])

  // Kiểm tra user đã đăng nhập: cần cả authentication và userInfo
  // Memoize để tránh re-compute không cần thiết
  const hasUser = useMemo(() => isAuthenticated && !!userSlug, [isAuthenticated, userSlug])
  const hasBranch = !!menuFilter.branch

  // Chỉ bật query sau khi transition xong → chuyển tab mượt như Insta/Tele
  const shouldFetchSpecific = allowFetch && hasUser && hasBranch
  const shouldFetchPublic = allowFetch && !hasUser && hasBranch

  const {
    data: specificMenuData,
    isPending: specificMenuPending,
    refetch: refetchSpecificMenu,
  } = useSpecificMenu(menuRequest, shouldFetchSpecific)

  const {
    data: publicSpecificMenuData,
    isPending: publicSpecificMenuPending,
    refetch: refetchPublicSpecificMenu,
  } = usePublicSpecificMenu(menuRequest, shouldFetchPublic)

  // Memoize computed values - chọn data từ hook phù hợp
  const specificMenu = useMemo(() => 
    hasUser ? specificMenuData : publicSpecificMenuData,
    [hasUser, specificMenuData, publicSpecificMenuData]
  )
  const isPending = useMemo(() => 
    hasUser ? specificMenuPending : publicSpecificMenuPending,
    [hasUser, specificMenuPending, publicSpecificMenuPending]
  )
  const refetchMenu = useMemo(() => 
    hasUser ? refetchSpecificMenu : refetchPublicSpecificMenu,
    [hasUser, refetchSpecificMenu, refetchPublicSpecificMenu]
  )

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
      if (branchSlug && prev.branch !== branchSlug) {
        next.branch = branchSlug
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
  }, [branchSlug, setMenuFilter])

  // Memoize callbacks
  const handleClear = useCallback(() => {
    setMenuFilter((prev) => ({
      ...prev,
      minPrice: FILTER_VALUE.MIN_PRICE,
      maxPrice: FILTER_VALUE.MAX_PRICE,
      branch: branchSlug,
    }))
  }, [setMenuFilter, branchSlug])

  const handleLogout = useCallback(() => {
    setLogout()
    removeUserInfo()
  }, [setLogout, removeUserInfo])

  const handleLogoutPress = useCallback(() => {
    setIsLogoutDialogOpen(true)
  }, [])

  const handleLoginPress = useCallback(() => {
    router.push(ROUTE.LOGIN)
  }, [router])

  return (
    <SafeAreaView className="flex-1 pb-12" edges={['top']}>
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
          <UserAvatarDropdown 
            userInfo={userInfo} 
            onLogoutPress={handleLogoutPress}
            onLoginPress={handleLoginPress}
          />
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
              ) : !allowFetch || isPending ? (
                <MenuListSkeleton />
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

ClientMenuContent.displayName = 'ClientMenuContent'

/**
 * Wrapper: frame đầu chỉ mount shell (0 store, 0 query) → commit <16ms, tab chuyển ngay.
 * Sau runAfterInteractions mới mount ClientMenuContent (fetch + store).
 */
function MenuScreen() {
  const [ready, setReady] = useState(false)
  useRunAfterTransition(() => setReady(true), [])
  if (!ready) return <MenuSkeletonShell />
  return <ClientMenuContent />
}

MenuScreen.displayName = 'MenuScreen'

export default React.memo(MenuScreen)
