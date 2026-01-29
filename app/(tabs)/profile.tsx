import { Award, LogOut, Mail, MapPin, Phone, User } from 'lucide-react-native'
import React, { useState } from 'react'
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { LoginForm } from '@/components/auth'
import { LogoutDialog } from '@/components/dialog'
import { InfoCard } from '@/components/profile'
import { useAuthStore, useUserStore } from '@/stores'

const Profile = () => {
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
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-6 pt-6 pb-8 bg-gray-50 dark:bg-primary min-h-full">
          {/* Header */}
          <Text className="text-gray-900 dark:text-white text-3xl font-bold mb-6">Profile</Text>

          {/* Avatar Section */}
          <View className="items-center mb-8">
            {userInfo.image ? (
              <Image
                source={{ uri: userInfo.image }}
                className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-800"
              />
            ) : (
              <View className="w-24 h-24 rounded-full bg-red-100 dark:bg-primary items-center justify-center border-4 border-gray-300 dark:border-gray-700">
                <Text className="text-red-600 dark:text-white text-3xl font-bold">{getInitials()}</Text>
              </View>
            )}
            <Text className="text-gray-900 dark:text-white text-2xl font-bold mt-4">
              {userInfo.firstName} {userInfo.lastName}
            </Text>
            {userInfo.role && (
              <View className="bg-red-100 dark:bg-primary/20 px-4 py-1 rounded-full mt-2">
                <Text className="text-red-600 dark:text-primary text-sm font-semibold">
                  {userInfo.role.name}
                </Text>
              </View>
            )}
          </View>

          {/* Info Cards */}
          <View className="mb-6">
            <InfoCard
              icon={Phone}
              label="Số điện thoại"
              value={userInfo.phonenumber}
              iconColor="#e50914"
            />
            {userInfo.email && (
              <InfoCard
                icon={Mail}
                label="Email"
                value={userInfo.email}
                iconColor="#3b82f6"
              />
            )}
            {userInfo.address && (
              <InfoCard
                icon={MapPin}
                label="Địa chỉ"
                value={userInfo.address}
                iconColor="#10b981"
              />
            )}
            {userInfo.branch && (
              <InfoCard
                icon={Award}
                label="Chi nhánh"
                value={userInfo.branch.name}
                iconColor="#f59e0b"
              />
            )}
            {userInfo.balance && (
              <InfoCard
                icon={User}
                label="Điểm tích lũy"
                value={`${userInfo.balance.points} điểm`}
                iconColor="#8b5cf6"
              />
            )}
          </View>

          {/* Logout Button */}
          <TouchableOpacity
            className="bg-red-50 dark:bg-red-600/20 border border-red-200 dark:border-red-500/50 rounded-xl p-4 flex-row items-center justify-center mt-4"
            onPress={handleLogoutPress}
          >
            <LogOut size={20} color="#ef4444" />
            <Text className="text-red-600 dark:text-red-400 text-base font-semibold ml-2">
              Đăng xuất
            </Text>
          </TouchableOpacity>
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

