import { ArrowLeft, Mail, MapPin, Phone, Shield, SquarePen, User as UserIcon } from 'lucide-react-native'
import React, { useMemo } from 'react'
import { Image, ScrollView, Text, View, useColorScheme } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Button } from '@/components/ui'
import { ROUTE, colors } from '@/constants'
import { navigateNative } from '@/lib/navigation'
import { useUserStore } from '@/stores'
import { useTranslation } from 'react-i18next'

function ProfileInfoScreen() {
  const {t} = useTranslation('profile' )
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'

  const userInfo = useUserStore((state) => state.userInfo)

  const initials = useMemo(() => {
    if (!userInfo) return ''
    const first = userInfo.firstName?.charAt(0) || ''
    const last = userInfo.lastName?.charAt(0) || ''
    return `${first}${last}`.toUpperCase()
  }, [userInfo])

  if (!userInfo) {
    // Nếu chưa có thông tin user (chưa đăng nhập) thì quay lại màn Profile chính
    navigateNative.back()
    return null
  }

  const isVerified = userInfo.isVerifiedEmail || userInfo.isVerifiedPhonenumber
  const successColor = isDark ? colors.success.dark : colors.success.light

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={['top', 'bottom']}>
      {/* Header */}
      <View className="bg-white dark:bg-gray-800 px-4 py-3 flex-row items-center border-b border-gray-200 dark:border-gray-700">
        <Button
          variant="ghost"
          className="mr-2 px-0 min-h-0 h-10 w-10 rounded-full justify-center items-center"
          onPress={() => navigateNative.back()}
        >
          <ArrowLeft size={22} color={isDark ? '#9ca3af' : '#6b7280'} />
        </Button>
        <Text className="text-lg font-semibold text-gray-900 dark:text-gray-50">
          {t('profile.info.title')}
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      >
        {/* Thông tin cơ bản */}
        <View className="flex-row items-center mb-6 rounded-xl p-4 border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
          {/* Avatar */}
          {userInfo.image ? (
            <Image
              source={{ uri: userInfo.image }}
              className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 mr-3"
            />
          ) : (
            <View className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 items-center justify-center mr-3">
              <Text className="text-red-600 dark:text-red-400 text-2xl font-bold">
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
              {isVerified && <Shield size={16} color={successColor} fill={successColor} />}
            </View>
            <Text className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {userInfo.email || t('profile.contactInfo.noEmail')}
            </Text>
          </View>

          {/* Icon chỉnh sửa */}
          <Button
            variant="ghost"
            className="px-0 min-h-0 h-10 w-10 rounded-full justify-center items-center"
            onPress={() => navigateNative.push(ROUTE.CLIENT_PROFILE_EDIT)}
          >
            <SquarePen size={18} color={isDark ? '#9ca3af' : '#6b7280'} />
          </Button>
        </View>

        {/* Thông tin chi tiết */}
        <View className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4 border border-gray-100 dark:border-gray-700">
          <Text className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-6">
            {t('profile.contactInfo.title')}
          </Text>

          <View className="gap-6">
            <View className="flex-row items-center gap-3">
              <View className="w-9 h-9 rounded-full items-center justify-center bg-gray-100 dark:bg-gray-700">
                <UserIcon size={18} color={isDark ? '#e5e7eb' : '#4b5563'} />
              </View>
              <View className="flex-1">
                <Text className="text-xs text-gray-500 dark:text-gray-400">{t('profile.contactInfo.name')}</Text>
                <Text className="text-sm font-medium text-gray-900 dark:text-gray-50">
                  {userInfo.firstName} {userInfo.lastName}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40">
              <View className="w-9 h-9 rounded-full items-center justify-center bg-gray-100 dark:bg-gray-700">
                <Phone size={18} color={isDark ? '#e5e7eb' : '#4b5563'} />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center gap-1.5">
                  <Text className="text-xs text-gray-500 dark:text-gray-400">{t('profile.contactInfo.phone')}</Text>
                  {userInfo.isVerifiedPhonenumber && (
                    <Shield size={12} color={successColor} fill={successColor} />
                  )}
                  {!userInfo.isVerifiedPhonenumber && (
                    <Text className="text-xs text-yellow-600 dark:text-yellow-400">
                      • {t('profile.contactInfo.notVerified')}
                    </Text>
                  )}
                </View>
                <Text className="text-sm font-medium text-gray-900 dark:text-gray-50">
                  {userInfo.phonenumber}
                </Text>
              </View>
              {!userInfo.isVerifiedPhonenumber && (
                <Button
                  variant="outline"
                  className="px-2 h-8 rounded-md border border-muted"
                  onPress={() => navigateNative.push(ROUTE.CLIENT_PROFILE_VERIFY_PHONE_NUMBER)}
                >
                  <Text className="text-xs font-medium text-muted-foreground">
                    {t('profile.contactInfo.verify')}
                  </Text>
                </Button>
              )}
            </View>

            <View className="flex-row items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                <View className="w-9 h-9 rounded-full items-center justify-center bg-gray-100 dark:bg-gray-700">
                    <Mail size={18} color={isDark ? '#e5e7eb' : '#4b5563'} />
                </View>

                <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                    <Text className="text-xs text-gray-500 dark:text-gray-400">
                        {t('profile.contactInfo.email')}
                    </Text>

                    {!userInfo.isVerifiedEmail && (
                        <Text className="text-xs text-yellow-600 dark:text-yellow-400">
                        • {t('profile.contactInfo.notVerified')}
                        </Text>
                    )}
                    </View>

                    <Text className="text-sm font-medium text-gray-900 dark:text-gray-50">
                    {userInfo.email || t('profile.contactInfo.notUpdated')}
                    </Text>
                </View>

                {!userInfo.isVerifiedEmail && (
                    <Button
                    variant="outline"
                    className="px-2 h-8 rounded-md border border-muted"
                    onPress={() => navigateNative.push(ROUTE.CLIENT_PROFILE_VERIFY_EMAIL)}
                    >
                    <Text className="text-xs font-medium text-muted-foreground">
                        {t('profile.contactInfo.verify')}
                    </Text>
                    </Button>
                )}
            </View>


            <View className="flex-row items-center gap-3">
              <View className="w-9 h-9 rounded-full items-center justify-center bg-gray-100 dark:bg-gray-700">
                <MapPin size={18} color={isDark ? '#e5e7eb' : '#4b5563'} />
              </View>
              <View className="flex-1">
                <Text className="text-xs text-gray-500 dark:text-gray-400">{t('profile.contactInfo.address')}</Text>
                <Text className="text-sm font-medium text-gray-900 dark:text-gray-50">
                  {userInfo.address || t('profile.contactInfo.notUpdated')}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Chi nhánh yêu thích */}
        {userInfo.branch && (
          <View className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4 border border-gray-100 dark:border-gray-700">
            <Text className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
              {t('profile.contactInfo.branch')}
            </Text>
            <Text className="text-sm font-medium text-gray-900 dark:text-gray-50">
              {userInfo.branch.name}
            </Text>
            <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {userInfo.branch.address}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

ProfileInfoScreen.displayName = 'ProfileInfoScreen'
export default React.memo(ProfileInfoScreen)


