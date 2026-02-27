import {
  ArrowLeft,
  Mail,
  MapPin,
  Phone,
  Shield,
  SquarePen,
  User as UserIcon,
} from 'lucide-react-native'
import React, { useMemo } from 'react'
import { Image, ScrollView, Text, View, useColorScheme } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Button } from '@/components/ui'
import { ROUTE, colors } from '@/constants'
import { navigateNative } from '@/lib/navigation'
import { useUserStore } from '@/stores'
import { useTranslation } from 'react-i18next'

function ProfileInfoScreen() {
  const { t } = useTranslation('profile')
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
    <SafeAreaView
      className="flex-1 bg-gray-50 dark:bg-gray-900"
      edges={['top', 'bottom']}
    >
      {/* Header */}
      <View className="flex-row items-center border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
        <Button
          variant="ghost"
          className="mr-2 h-10 min-h-0 w-10 items-center justify-center rounded-full px-0"
          onPress={() => navigateNative.back()}
        >
          <ArrowLeft size={22} color={isDark ? '#9ca3af' : '#6b7280'} />
        </Button>
        <Text className="text-lg font-semibold text-gray-900 dark:text-gray-50">
          {t('profile.generalInfo.title')}
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      >
        {/* Thông tin cơ bản */}
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
                <Shield size={16} color={successColor} fill={successColor} />
              )}
            </View>
            <Text className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              {userInfo.email || t('profile.contactInfo.noEmail')}
            </Text>
          </View>

          {/* Icon chỉnh sửa */}
          <Button
            variant="ghost"
            className="h-10 min-h-0 w-10 items-center justify-center rounded-full px-0"
            onPress={() => navigateNative.push(ROUTE.CLIENT_PROFILE_EDIT)}
          >
            <SquarePen size={18} color={isDark ? '#9ca3af' : '#6b7280'} />
          </Button>
        </View>

        {/* Thông tin chi tiết */}
        <View className="mb-4 rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <Text className="mb-6 text-sm font-semibold text-gray-700 dark:text-gray-200">
            {t('profile.contactInfo.title')}
          </Text>

          <View className="gap-6">
            <View className="flex-row items-center gap-3">
              <View className="h-9 w-9 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                <UserIcon size={18} color={isDark ? '#e5e7eb' : '#4b5563'} />
              </View>
              <View className="flex-1">
                <Text className="text-xs text-gray-500 dark:text-gray-400">
                  {t('profile.contactInfo.name')}
                </Text>
                <Text className="text-sm font-medium text-gray-900 dark:text-gray-50">
                  {userInfo.firstName} {userInfo.lastName}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900/40">
              <View className="h-9 w-9 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                <Phone size={18} color={isDark ? '#e5e7eb' : '#4b5563'} />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center gap-1.5">
                  <Text className="text-xs text-gray-500 dark:text-gray-400">
                    {t('profile.contactInfo.phone')}
                  </Text>
                  {userInfo.isVerifiedPhonenumber && (
                    <Shield
                      size={12}
                      color={successColor}
                      fill={successColor}
                    />
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
                  className="h-8 rounded-md border border-muted px-2"
                  onPress={() =>
                    navigateNative.push(
                      ROUTE.CLIENT_PROFILE_VERIFY_PHONE_NUMBER,
                    )
                  }
                >
                  <Text className="text-xs font-medium text-muted-foreground">
                    {t('profile.contactInfo.verify')}
                  </Text>
                </Button>
              )}
            </View>

            <View className="flex-row items-center gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
              <View className="h-9 w-9 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
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
                  className="h-8 rounded-md border border-muted px-2"
                  onPress={() =>
                    navigateNative.push(ROUTE.CLIENT_PROFILE_VERIFY_EMAIL)
                  }
                >
                  <Text className="text-xs font-medium text-muted-foreground">
                    {t('profile.contactInfo.verify')}
                  </Text>
                </Button>
              )}
            </View>

            <View className="flex-row items-center gap-3">
              <View className="h-9 w-9 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                <MapPin size={18} color={isDark ? '#e5e7eb' : '#4b5563'} />
              </View>
              <View className="flex-1">
                <Text className="text-xs text-gray-500 dark:text-gray-400">
                  {t('profile.contactInfo.address')}
                </Text>
                <Text className="text-sm font-medium text-gray-900 dark:text-gray-50">
                  {userInfo.address || t('profile.contactInfo.notUpdated')}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Chi nhánh yêu thích */}
        {userInfo.branch && (
          <View className="mb-4 rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <Text className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">
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
