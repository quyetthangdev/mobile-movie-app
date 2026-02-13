import { useRouter } from 'expo-router'
import {
  Award,
  Gift,
  KeyRound,
  LogOut,
  Mail,
  Package,
  Phone,
  ShieldCheck,
  User,
  Wallet,
} from 'lucide-react-native'
import React, { useCallback, useMemo, useState } from 'react'
import { Image, ScrollView, Text, useColorScheme, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { LoginForm } from '@/components/auth'
import { LogoutDialog } from '@/components/dialog'
import {
  SettingsItem,
  SettingsSection,
} from '@/components/profile/settings-item'
import { colors, ROUTE } from '@/constants'
import { useAuthStore, useUserStore } from '@/stores'
import { useTranslation } from 'react-i18next'

function Profile() {
  const router = useRouter()
  const { t } = useTranslation('profile')
  // Optimize Zustand selectors: only subscribe the necessary parts
  const needsUserInfo = useAuthStore((state) => state.needsUserInfo())
  const userInfo = useUserStore((state) => state.userInfo)
  const setLogout = useAuthStore((state) => state.setLogout)
  const removeUserInfo = useUserStore((state) => state.removeUserInfo)
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false)
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'

  const isVerified =
    userInfo?.isVerifiedEmail || userInfo?.isVerifiedPhonenumber
  const successColor = isDark ? colors.success.dark : colors.success.light

  // All hooks must be called before any early return
  // Memoize callbacks
  const handleLogout = useCallback(() => {
    setLogout()
    removeUserInfo()
    // Can add other clear store here if needed
  }, [setLogout, removeUserInfo])

  const handleLogoutPress = useCallback(() => {
    setIsLogoutDialogOpen(true)
  }, [])

  // Memoize expensive calculation
  const initials = useMemo(() => {
    if (!userInfo) return ''
    const first = userInfo.firstName?.charAt(0) || ''
    const last = userInfo.lastName?.charAt(0) || ''
    return `${first}${last}`.toUpperCase()
  }, [userInfo])

  // Memoize navigation handlers
  const handleNavigateToInfo = useCallback(() => {
    router.push(ROUTE.CLIENT_PROFILE_INFO as Parameters<typeof router.push>[0])
  }, [router])

  const handleNavigateToHistory = useCallback(() => {
    // Push ngay → màn trượt tức thì; màn history sẽ fetch + skeleton sau khi transition xong
    router.push(
      ROUTE.CLIENT_PROFILE_HISTORY as Parameters<typeof router.push>[0],
    )
  }, [router])

  const handleNavigateToGiftCard = useCallback(() => {
    router.push(
      ROUTE.CLIENT_PROFILE_GIFT_CARD as Parameters<typeof router.push>[0],
    )
  }, [router])

  const handleNavigateToLoyaltyPoint = useCallback(() => {
    router.push(
      ROUTE.CLIENT_PROFILE_LOYALTY_POINT as Parameters<typeof router.push>[0],
    )
  }, [router])

  const handleNavigateToCoin = useCallback(() => {
    router.push(ROUTE.CLIENT_PROFILE_COIN as Parameters<typeof router.push>[0])
  }, [router])

  const handleNavigateToVerifyEmail = useCallback(() => {
    router.push(
      ROUTE.CLIENT_PROFILE_VERIFY_EMAIL as Parameters<typeof router.push>[0],
    )
  }, [router])

  const handleNavigateToVerifyPhone = useCallback(() => {
    router.push(
      ROUTE.CLIENT_PROFILE_VERIFY_PHONE_NUMBER as Parameters<
        typeof router.push
      >[0],
    )
  }, [router])

  const handleNavigateToChangePassword = useCallback(() => {
    router.push(
      ROUTE.CLIENT_PROFILE_CHANGE_PASSWORD as Parameters<typeof router.push>[0],
    )
  }, [router])

  // If there is no userInfo, display the login form
  if (needsUserInfo || !userInfo) {
    return (
      <SafeAreaView className="flex-1" edges={['top']}>
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <LoginForm />
        </ScrollView>
      </SafeAreaView>
    )
  }

  // Nếu đã đăng nhập, hiển thị profile
  return (
    <SafeAreaView className="flex-1" edges={['top']}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <View className="min-h-full bg-gray-50 dark:bg-gray-900">
          {/* Header với Avatar */}
          <View className="px-4 pt-6">
            <View className="mb-6 flex-row items-center rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              {/* Avatar */}
              {userInfo.image ? (
                <Image
                  source={{ uri: userInfo.image }}
                  className="mr-3 h-16 w-16 rounded-full bg-gray-200 dark:bg-gray-700"
                />
              ) : (
                <View className="mr-3 h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                  <Text className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {initials || 'U'}
                  </Text>
                </View>
              )}

              {/* Tên và Email */}
              <View className="flex-1">
                <View className="flex-row items-center gap-2">
                  <Text className="text-base font-semibold text-gray-900 dark:text-white">
                    {userInfo.firstName} {userInfo.lastName}
                  </Text>
                  {isVerified && (
                    <View className="flex-row items-center gap-0.5">
                      <ShieldCheck size={16} color={successColor} />
                      {/* <Text className="text-xs" style={{ color: successColor }}>
                        {t('profile.contactInfo.verified')}
                      </Text> */}
                    </View>
                  )}
                </View>
                <Text className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                  {userInfo.email || t('profile.contactInfo.noEmail')}
                </Text>
              </View>
            </View>
          </View>

          {/* Settings Sections */}
          <View className="px-4">
            {/* Thông tin chung */}
            <SettingsSection header="Thông tin">
              <SettingsItem
                icon={User}
                title="Thông tin cá nhân"
                subtitle={userInfo.phonenumber}
                onPress={handleNavigateToInfo}
              />
            </SettingsSection>

            {/* Đơn hàng & Dịch vụ */}
            <SettingsSection header="Đơn hàng & Dịch vụ">
              <SettingsItem
                icon={Package}
                title="Lịch sử đơn hàng"
                onPress={handleNavigateToHistory}
              />
            </SettingsSection>

            {/* Tài chính */}
            <SettingsSection header="Tài chính">
              <SettingsItem
                icon={Gift}
                title="Thẻ quà tặng"
                value={
                  userInfo.balance?.points
                    ? `${userInfo.balance.points}`
                    : undefined
                }
                onPress={handleNavigateToGiftCard}
              />
              <SettingsItem
                icon={Award}
                title="Điểm tích lũy"
                value={
                  userInfo.balance?.points
                    ? `${userInfo.balance.points} điểm`
                    : undefined
                }
                onPress={handleNavigateToLoyaltyPoint}
              />
              <SettingsItem
                icon={Wallet}
                title="Quản lý xu"
                onPress={handleNavigateToCoin}
              />
            </SettingsSection>

            {/* Bảo mật */}
            <SettingsSection header="Bảo mật">
              <SettingsItem
                icon={Mail}
                title="Xác minh email"
                subtitle={
                  userInfo.isVerifiedEmail ? 'Đã xác minh' : 'Chưa xác minh'
                }
                subtitleColor={
                  userInfo.isVerifiedEmail ? successColor : undefined
                }
                onPress={handleNavigateToVerifyEmail}
              />
              <SettingsItem
                icon={Phone}
                title="Xác minh số điện thoại"
                subtitle={
                  userInfo.isVerifiedPhonenumber
                    ? 'Đã xác minh'
                    : 'Chưa xác minh'
                }
                subtitleColor={
                  userInfo.isVerifiedPhonenumber ? successColor : undefined
                }
                onPress={handleNavigateToVerifyPhone}
              />
              <SettingsItem
                icon={KeyRound}
                title="Đổi mật khẩu"
                onPress={handleNavigateToChangePassword}
              />
            </SettingsSection>

            {/* Đăng xuất */}
            <SettingsSection>
              <SettingsItem
                icon={LogOut}
                title="Đăng xuất"
                onPress={handleLogoutPress}
                destructive
              />
            </SettingsSection>
          </View>
        </View>
      </ScrollView>

      {/* Logout Dialog */}
      <LogoutDialog
        isOpen={isLogoutDialogOpen}
        onOpenChange={setIsLogoutDialogOpen}
        onLogout={handleLogout}
      />
    </SafeAreaView>
  )
}

// Memoize screen component to avoid unnecessary re-render
export default React.memo(Profile)
