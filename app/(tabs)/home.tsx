import { useRouter } from 'expo-router'
import { LogOut } from 'lucide-react-native'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { getBanners } from '@/api/banner'
import { Images } from '@/assets/images'
import { SelectBranchDropdown } from '@/components/branch'
import { LogoutDialog } from '@/components/dialog'
import {
    HighlightMenuCarousel,
    NewsCarousel,
    StoreCarousel,
    SwiperBanner,
    YouTubeVideoSection,
} from '@/components/home'
import { Button, Dropdown } from '@/components/ui'
import { BannerPage, ROUTE, youtubeVideoId } from '@/constants'
import { useAuthStore, useUserStore } from '@/stores'
import { useQuery } from '@tanstack/react-query'

export default function Home() {
  const { t } = useTranslation('home')
  const router = useRouter()
  const userInfo = useUserStore((state) => state.userInfo)
  const setLogout = useAuthStore((state) => state.setLogout)
  const removeUserInfo = useUserStore((state) => state.removeUserInfo)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false)

  // Fetch banners for home page
  const { data: bannersData } = useQuery({
    queryKey: ['banners', BannerPage.HOME],
    queryFn: () => getBanners({ page: BannerPage.HOME, isActive: true }),
  })

  const banners = bannersData?.result || []

  const handleLogout = () => {
    setLogout()
    removeUserInfo()
    setIsDropdownOpen(false)
  }

  const handleLogoutPress = () => {
    setIsLogoutDialogOpen(true)
    setIsDropdownOpen(false)
  }

  const getInitials = () => {
    if (!userInfo) return 'U'
    const first = userInfo.firstName?.charAt(0) || ''
    const last = userInfo.lastName?.charAt(0) || ''
    return `${first}${last}`.toUpperCase() || 'U'
  }

  const getUserFullName = () => {
    if (!userInfo) return 'User'
    return `${userInfo.firstName || ''} ${userInfo.lastName || ''}`.trim() || 'User'
  }

  return (
    <SafeAreaView className="flex-1" edges={['top']}>
      {/* Header */}
      <View className="bg-transparent px-5 py-3 flex-row items-center justify-between z-10">
        {/* Left side: Logo and Branch Select */}
        <View className="flex-row items-center gap-3">
          <Image
            source={Images.Brand.Logo as unknown as number}
            className="h-8 w-28"
            resizeMode="contain"
          />
          <SelectBranchDropdown />
        </View>
        {/* Right side: Avatar with Dropdown */}
        {userInfo ? (
          <Dropdown open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
            <Dropdown.Trigger asChild>
              <TouchableOpacity
                className="w-10 h-10 rounded-full overflow-hidden bg-gray-300 dark:bg-gray-600 items-center justify-center"
              >
                {userInfo.image ? (
                  <Image
                    source={{ uri: userInfo.image }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                ) : (
                  <Text className="text-gray-700 dark:text-gray-200 font-semibold text-base">
                    {getInitials()}
                  </Text>
                )}
              </TouchableOpacity>
            </Dropdown.Trigger>
            <Dropdown.Content align="end" sideOffset={4}>
              <Dropdown.Label>{getUserFullName()}</Dropdown.Label>
              <Dropdown.Item onSelect={handleLogoutPress}>
                <LogOut size={20} color="#ef4444" />
                <Text className="text-red-600 dark:text-red-400 font-medium ml-3">
                  Đăng xuất
                </Text>
              </Dropdown.Item>
            </Dropdown.Content>
          </Dropdown>
        ) : (
          <View className="w-10" />
        )}
      </View>

      {/* Content */}
      <View className="flex-1">
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          {/* Section 1: Hero - Full width Banner */}
          {banners.length > 0 && (
            <View className="mb-6">
              <SwiperBanner bannerData={banners} />
            </View>
          )}

          {/* Section Info: TREND Coffee description + Store Carousel */}
          <View className="px-4 sm:px-5 mb-6">
            <View className="flex-row flex-col sm:flex-row gap-4 py-4">
              {/* Left: Text Content */}
              <View className="flex-1 sm:flex-[2] justify-center items-center sm:items-start">
                <View className="flex-col gap-6 items-center sm:items-start w-full">
                  <View className="flex-col gap-2 items-center sm:items-start">
                    <Text className="w-full text-center text-3xl font-extrabold text-red-600 dark:text-primary">
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
                <View className="absolute top-0 left-0 w-12 h-12 border-2 border-red-600 dark:border-primary rounded-tl-3xl border-r-0 border-b-0" style={{ zIndex: 10 }} />
                <View className="absolute top-0 right-0 w-12 h-12 border-2 border-red-600 dark:border-primary rounded-tr-3xl border-l-0 border-b-0" style={{ zIndex: 10 }} />
                <View className="absolute bottom-0 left-0 w-12 h-12 border-2 border-red-600 dark:border-primary rounded-bl-3xl border-r-0 border-t-0" style={{ zIndex: 10 }} />
                <View className="absolute bottom-0 right-0 w-12 h-12 border-2 border-red-600 dark:border-primary rounded-br-3xl border-l-0 border-t-0" style={{ zIndex: 10 }} />

                <View className="p-3 w-full">
                  <StoreCarousel />
                </View>
              </View>
            </View>
          </View>

          {/* Section Menu Highlight */}
          <View className="px-4 sm:px-5 mb-6">
            <View className="flex-col gap-4">
              <View className="flex-row justify-between items-center">
                <Text className="text-lg sm:text-2xl font-bold uppercase text-red-600 dark:text-primary">
                  {t('exploreMenu')}
                </Text>
                <Button
                  variant="destructive"
                  size="sm"
                  onPress={() => router.push(ROUTE.CLIENT_MENU)}
                >
                  {t('viewMenu')}
                </Button>
              </View>
              <View className="h-[21rem] sm:h-[25rem]">
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
          <View className="px-4 sm:px-5 py-4 mb-6">
            <Text className="w-full text-center text-lg sm:text-2xl uppercase font-extrabold text-red-600 dark:text-primary mb-4">
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

