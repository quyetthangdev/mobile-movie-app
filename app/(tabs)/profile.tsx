import { useRouter } from 'expo-router'
import {
  Award,
  Gift,
  LogOut,
  Package,
  User,
  Wallet,
} from 'lucide-react-native'
import React, { useState } from 'react'
import { Image, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { LoginForm } from '@/components/auth'
import { LogoutDialog } from '@/components/dialog'
import { SettingsItem, SettingsSection } from '@/components/profile/settings-item'
import { ROUTE } from '@/constants'
import { useAuthStore, useUserStore } from '@/stores'

const Profile = () => {
  const router = useRouter()
  const needsUserInfo = useAuthStore((state) => state.needsUserInfo())
  const userInfo = useUserStore((state) => state.userInfo)
  const setLogout = useAuthStore((state) => state.setLogout)
  const removeUserInfo = useUserStore((state) => state.removeUserInfo)
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false)

  // Nếu chưa có userInfo, hiển thị form đăng nhập
  if (needsUserInfo || !userInfo) {
    return (
      <SafeAreaView className="flex-1" edges={['top']}>
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <LoginForm />
        </ScrollView>
      </SafeAreaView>
    )
  }

  const handleLogout = () => {
    setLogout()
    removeUserInfo()
    // Có thể thêm các clear store khác ở đây nếu cần
  }

  const handleLogoutPress = () => {
    setIsLogoutDialogOpen(true)
  }

  const getInitials = () => {
    const first = userInfo.firstName?.charAt(0) || ''
    const last = userInfo.lastName?.charAt(0) || ''
    return `${first}${last}`.toUpperCase()
  }



  // Nếu đã đăng nhập, hiển thị profile
  return (
    <SafeAreaView className="flex-1" edges={['top']}>
      <ScrollView 
        className="flex-1" 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <View className="bg-gray-50 dark:bg-gray-900 min-h-full">
          {/* Header với Avatar */}
          <View className="bg-white dark:bg-gray-800 px-4 pt-6 pb-8 items-center">
            {userInfo.image ? (
              <Image
                source={{ uri: userInfo.image }}
                className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 mb-3"
              />
            ) : (
              <View className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 items-center justify-center mb-3">
                <Text className="text-red-600 dark:text-red-400 text-2xl font-bold">
                  {getInitials()}
                </Text>
              </View>
            )}
            <Text className="text-gray-900 dark:text-white text-xl font-semibold">
              {userInfo.firstName} {userInfo.lastName}
            </Text>
            {userInfo.role && (
              <Text className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                {userInfo.role.name}
              </Text>
            )}
          </View>

          {/* Settings Sections */}
          <View className="px-4 pt-6">
            {/* Thông tin chung */}
            <SettingsSection header="Thông tin">
              <SettingsItem
                icon={User}
                title="Thông tin cá nhân"
                subtitle={userInfo.phonenumber}
                onPress={() => router.push(ROUTE.CLIENT_PROFILE_INFO as Parameters<typeof router.push>[0])}
              />
            </SettingsSection>

            {/* Đơn hàng & Dịch vụ */}
            <SettingsSection header="Đơn hàng & Dịch vụ">
              <SettingsItem
                icon={Package}
                title="Lịch sử đơn hàng"
                onPress={() => router.push(ROUTE.CLIENT_PROFILE_HISTORY as Parameters<typeof router.push>[0])}
              />
            </SettingsSection>

            {/* Tài chính */}
            <SettingsSection header="Tài chính">
              <SettingsItem
                icon={Gift}
                title="Thẻ quà tặng"
                value={userInfo.balance?.points ? `${userInfo.balance.points}` : undefined}
                onPress={() => router.push(ROUTE.CLIENT_PROFILE_GIFT_CARD as Parameters<typeof router.push>[0])}
              />
              <SettingsItem
                icon={Award}
                title="Điểm tích lũy"
                value={userInfo.balance?.points ? `${userInfo.balance.points} điểm` : undefined}
                onPress={() => router.push(ROUTE.CLIENT_PROFILE_LOYALTY_POINT as Parameters<typeof router.push>[0])}
              />
              <SettingsItem
                icon={Wallet}
                title="Quản lý xu"
                onPress={() => router.push(ROUTE.CLIENT_PROFILE_COIN as Parameters<typeof router.push>[0])}
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

export default Profile

