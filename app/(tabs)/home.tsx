import React, { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Image, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { getBanners } from '@/api/banner'
import { Images } from '@/assets/images'
import { SelectBranchDropdown } from '@/components/branch'
import { LogoutDialog, SettingsDropdown, UserAvatarDropdown } from '@/components/dialog'
import {
  HighlightMenuCarousel,
  NewsCarousel,
  StoreCarousel,
  SwiperBanner,
  YouTubeVideoSection,
} from '@/components/home'
import { Button, Skeleton } from '@/components/ui'
import { useRunAfterTransition } from '@/hooks'
import { useGpuWarmup } from '@/lib/navigation'
import { usePhase4MountLog } from '@/lib/phase4-diagnostic'
import { BannerPage, ROUTE, youtubeVideoId } from '@/constants'
import { navigateNative } from '@/lib/navigation'
import { useAuthStore, useUserStore } from '@/stores'
import { useQuery } from '@tanstack/react-query'

/** Shell cực nhẹ cho frame đầu khi chuyển tab Home — 0 store, 0 query. */
function HomeSkeletonShell() {
  return (
    <SafeAreaView className="flex-1" edges={['top']}>
      <View className="bg-transparent px-5 py-3 flex-row items-center justify-between z-10">
        <Skeleton className="h-8 w-28 rounded-md" />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </View>
      </View>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
        <View className="px-4 mb-6">
          <Skeleton className="w-full h-48 rounded-2xl mb-3" />
          <View className="flex-row justify-center gap-2 mt-2">
            <Skeleton className="h-2 w-8 rounded-full" />
            <Skeleton className="h-2 w-4 rounded-full" />
            <Skeleton className="h-2 w-4 rounded-full" />
          </View>
        </View>
        <View className="px-4 mb-6">
          <Skeleton className="h-4 w-48 rounded-md mb-2" />
          <Skeleton className="h-3 w-full rounded-md mb-4" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </View>
        <View className="px-4">
          <Skeleton className="h-6 w-40 rounded-md mb-4" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function HomeFallbackBanner() {
  return (
    <View className="px-4">
      <Image
        source={Images.Landing.Desktop as unknown as number}
        className="w-full h-48 rounded-2xl"
        resizeMode="cover"
      />
    </View>
  )
}

function HomeContent() {
  const { t } = useTranslation('home')
  const userInfo = useUserStore((state) => state.userInfo)
  const setLogout = useAuthStore((state) => state.setLogout)
  const removeUserInfo = useUserStore((state) => state.removeUserInfo)
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false)

  const [allowFetch, setAllowFetch] = useState(false)
  useRunAfterTransition(() => setAllowFetch(true), [])

  const { data: bannersData, isPending: isBannersPending, isError: isBannersError } = useQuery({
    queryKey: ['banners', BannerPage.HOME],
    queryFn: () => getBanners({ page: BannerPage.HOME, isActive: true }),
    enabled: allowFetch,
  })

  // Memoize banners to avoid re-calculate
  const banners = useMemo(() => bannersData?.result || [], [bannersData?.result])

  // Memoize callbacks to avoid re-create
  const handleLogout = useCallback(() => {
    setLogout()
    removeUserInfo()
  }, [setLogout, removeUserInfo])

  const handleLogoutPress = useCallback(() => {
    setIsLogoutDialogOpen(true)
  }, [])

  const handleLoginPress = useCallback(() => {
    navigateNative.push(ROUTE.LOGIN)
  }, [])

  const handleViewMenuPress = useCallback(() => {
    navigateNative.push(ROUTE.CLIENT_MENU)
  }, [])

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
        >
          {/* Section 1: Hero - Full width Banner */}
          <View className="mb-6">
            {isBannersPending ? (
              <View className="px-4">
                <Skeleton className="w-full h-48 rounded-2xl mb-3" />
                <View className="flex-row justify-center gap-2 mt-2">
                  <Skeleton className="h-2 w-8 rounded-full" />
                  <Skeleton className="h-2 w-4 rounded-full" />
                  <Skeleton className="h-2 w-4 rounded-full" />
                </View>
              </View>
            ) : banners.length > 0 && !isBannersError ? (
              <SwiperBanner bannerData={banners} />
            ) : (
              <HomeFallbackBanner />
            )}
          </View>

          {/* Section Info: TREND Coffee description + Store Carousel */}
          <View className="px-4 sm:px-5 mb-6">
            <View className="flex-row flex-col sm:flex-row gap-4 py-4">
              {/* Left: Text Content */}
              <View className="flex-1 sm:flex-[2] justify-center items-center sm:items-start">
                <View className="flex-col gap-6 items-center sm:items-start w-full">
                  <View className="flex-col gap-2 items-center sm:items-start">
                    <Text className="w-full text-center text-3xl font-extrabold text-primary">
                      TREND Coffee
                    </Text>
                    <Text className="text-base sm:text-xl text-gray-600 dark:text-gray-400 text-center sm:text-left">
                      {t('homeDescription')}
                    </Text>
                  </View>
                  <View className="space-y-1">
                    <Text className="text-base sm:text-xl text-gray-600 dark:text-gray-400 text-center sm:text-left">
                      {t('homeDescription2')}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Right: Store Carousel with border decorations */}
              <View className="flex-1 sm:flex-[3] relative justify-center items-center">
                {/* Border decorations */}
                <View className="absolute top-0 left-0 w-12 h-12 border-2 border-primary rounded-tl-3xl border-r-0 border-b-0" style={{ zIndex: 10 }} />
                <View className="absolute top-0 right-0 w-12 h-12 border-2 border-primary rounded-tr-3xl border-l-0 border-b-0" style={{ zIndex: 10 }} />
                <View className="absolute bottom-0 left-0 w-12 h-12 border-2 border-primary rounded-bl-3xl border-r-0 border-t-0" style={{ zIndex: 10 }} />
                <View className="absolute bottom-0 right-0 w-12 h-12 border-2 border-primary rounded-br-3xl border-l-0 border-t-0" style={{ zIndex: 10 }} />

                <View className="p-2 w-full">
                  <StoreCarousel />
                </View>
              </View>
            </View>
          </View>

          {/* Section Menu Highlight */}
          <View className="px-4 sm:px-5">
            <View className="flex-col gap-4">
              <View className="flex-row justify-between items-center">
                <Text className="text-lg sm:text-2xl font-bold uppercase text-primary">
                  {t('exploreMenu')}
                </Text>
                <Button
                  className="bg-primary text-white"
                  size="sm"
                  onPress={handleViewMenuPress}
                >
                  {t('viewMenu')}
                </Button>
              </View>
              <View className="h-[16rem] sm:h-[25rem]">
                <HighlightMenuCarousel />
              </View>
            </View>
          </View>

          {/* Section Video YouTube */}
          {youtubeVideoId && (
            <View className="mb-6">
              <YouTubeVideoSection
                videoId={youtubeVideoId}
                title={t('videoSection.title')}
              />
            </View>
          )}

          {/* Section News */}
          <View className="px-4 sm:px-5 py-8 mb-6">
            <Text className="w-full text-center text-lg sm:text-2xl uppercase font-extrabold text-primary mb-4">
              {t('newsSection.title')}
            </Text>
            <View className="mt-4">
              <NewsCarousel />
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

HomeContent.displayName = 'HomeContent'

function HomeScreen() {
  useGpuWarmup()
  usePhase4MountLog('home')
  const [ready, setReady] = useState(false)
  useRunAfterTransition(() => setReady(true), [])
  if (!ready) return <HomeSkeletonShell />
  return <HomeContent />
}

HomeScreen.displayName = 'HomeScreen'

export default React.memo(HomeScreen)

