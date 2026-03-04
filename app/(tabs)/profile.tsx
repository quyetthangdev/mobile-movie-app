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
import {
  Animated,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native'
import Reanimated, { FadeInDown } from 'react-native-reanimated'
import { ScreenContainer } from '@/components/layout'

import { LoginForm } from '@/components/auth'
import { LogoutDialog } from '@/components/dialog'
import {
  SettingsItem,
  SettingsSection,
} from '@/components/profile/settings-item'
import { Skeleton } from '@/components/ui'
import { colors, ROUTE } from '@/constants'
import { useRunAfterTransition } from '@/hooks'
import { type HrefLike, navigateNative, useGpuWarmup } from '@/lib/navigation'
import { usePhase4MountLog } from '@/lib/phase4-diagnostic'
import { useAuthStore, useUserStore } from '@/stores'
import { useTranslation } from 'react-i18next'

const PROFILE_HEADER_HEIGHT = 80

/** Skeleton khớp layout Profile thật: paddingTop HEADER_HEIGHT, avatar rounded-3xl p-6, SettingsSection [1,1,3,3,1]. */
function ProfileSkeletonShell() {
  return (
    <ScreenContainer edges={['top']} className="flex-1">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: PROFILE_HEADER_HEIGHT, paddingBottom: 100 }}
      >
        <View className="min-h-full bg-gray-60 px-4 pt-6 dark:bg-gray-950">
          {/* Avatar card - khớp rounded-3xl p-6 items-center */}
          <View className="mb-6 items-center rounded-3xl p-6">
            <Skeleton className="h-20 w-20 rounded-full" />
            <View className="mt-4 h-7" />
            <Skeleton className="mt-1 h-4 w-40 rounded-md" />
          </View>

          {/* Settings sections - khớp thật: generalInfo(1), orderHistory(1), financial(3), security(3), logout(1, no header) */}
          {[
            { header: true, items: 1 },
            { header: true, items: 1 },
            { header: true, items: 3 },
            { header: true, items: 3 },
            { header: false, items: 1 },
          ].map((section, si) => (
            <View key={si} className="mb-8">
              {section.header && (
                <View className="px-4 py-2">
                  <Skeleton className="h-3 w-24 rounded-md" />
                </View>
              )}
              <View className="overflow-hidden rounded-2xl bg-white dark:bg-gray-800">
                {Array.from({ length: section.items }).map((_, i) => (
                  <View
                    key={i}
                    className="min-h-[44px] flex-row items-center px-4 py-3"
                  >
                    <Skeleton className="mr-3 h-10 w-10 rounded-full" />
                    <Skeleton className="h-4 flex-1 rounded-md" />
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </ScreenContainer>
  )
}

function Profile() {
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

  // Scroll-linked: cụm avatar cuộn lên, tên cuộn lên theo rồi dừng lại ở header (sticky)
  const scrollY = useMemo(() => new Animated.Value(0), [])

  // Khoảng cách từ top content đến tên (~pt-6 + p-6 + avatar + mt-4)
  // Đồng bộ chặt hơn với ngưỡng avatar/phone (0 → 80)
  const NAME_TOP_OFFSET = 144
  const HEADER_HEIGHT = 80
  // Vị trí Y mục tiêu của tên trong header (dịch xuống tránh notch)
  const NAME_STICK_TOP = HEADER_HEIGHT / 2

  // Vị trí tên: cuộn lên theo scroll rồi dừng lại bên trong header
  const NAME_INITIAL_TOP = HEADER_HEIGHT + NAME_TOP_OFFSET
  const nameTop = scrollY.interpolate({
    inputRange: [0, NAME_TOP_OFFSET * 0.85],
    outputRange: [NAME_INITIAL_TOP, NAME_STICK_TOP],
    extrapolate: 'clamp',
  })

  // Thu nhỏ tên dần khi tiến vào header – hoàn tất hơi sớm hơn để cảm giác quay về không trễ
  const nameScale = scrollY.interpolate({
    inputRange: [0, NAME_TOP_OFFSET * 0.85],
    // Sau khi cuộn, tên thu nhỏ rõ hơn về cỡ ~text-xl
    outputRange: [1, 0.7],
    extrapolate: 'clamp',
  })

  // Avatar thu nhỏ và mờ dần – hoàn tất trong cùng range với tên
  const avatarScale = scrollY.interpolate({
    inputRange: [0, NAME_TOP_OFFSET],
    outputRange: [1, 0.5],
    extrapolate: 'clamp',
  })
  const avatarOpacity = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  })

  // SĐT thu nhỏ và mờ dần – hoàn tất trong cùng range với tên
  const phoneScale = scrollY.interpolate({
    inputRange: [0, NAME_TOP_OFFSET],
    outputRange: [1, 0.8],
    extrapolate: 'clamp',
  })
  const phoneOpacity = scrollY.interpolate({
    inputRange: [20, 80],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  })

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
    navigateNative.push(ROUTE.CLIENT_PROFILE_INFO)
  }, [])

  const handleNavigateToHistory = useCallback(() => {
    navigateNative.push(ROUTE.CLIENT_PROFILE_HISTORY)
  }, [])

  const handleNavigateToGiftCard = useCallback(() => {
    navigateNative.push(ROUTE.CLIENT_PROFILE_GIFT_CARD as HrefLike)
  }, [])

  const handleNavigateToLoyaltyPoint = useCallback(() => {
    navigateNative.push(ROUTE.CLIENT_PROFILE_LOYALTY_POINT)
  }, [])

  const handleNavigateToCoin = useCallback(() => {
    navigateNative.push(ROUTE.CLIENT_PROFILE_COIN as HrefLike)
  }, [])

  const handleNavigateToVerifyEmail = useCallback(() => {
    navigateNative.push(ROUTE.CLIENT_PROFILE_VERIFY_EMAIL)
  }, [])

  const handleNavigateToVerifyPhone = useCallback(() => {
    navigateNative.push(ROUTE.CLIENT_PROFILE_VERIFY_PHONE_NUMBER)
  }, [])

  const handleNavigateToChangePassword = useCallback(() => {
    navigateNative.push(ROUTE.CLIENT_PROFILE_CHANGE_PASSWORD)
  }, [])

  // If there is no userInfo, display the login form
  if (needsUserInfo || !userInfo) {
    return (
      <ScreenContainer edges={['top']} className="flex-1">
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <LoginForm />
        </ScrollView>
      </ScreenContainer>
    )
  }

  // Nếu đã đăng nhập, hiển thị profile
  return (
    <ScreenContainer edges={['top']} className="flex-1">
      {/* Header blur - overlay bán trong suốt */}
      <View
        className="absolute left-0 right-0 top-0 z-10"
        style={[
          { height: HEADER_HEIGHT },
          isDark ? styles.headerBlurDark : styles.headerBlurLight,
        ]}
      />

      {/* Tên: một phần tử, cuộn lên theo scroll rồi dừng ở header */}
      <Animated.View
        pointerEvents="none"
        className="absolute left-0 right-0 z-10 items-center"
        style={{
          top: 0,
          transform: [{ translateY: nameTop }],
        }}
      >
        <Animated.Text
          className="text-3xl font-semibold text-gray-900 dark:text-white"
          style={{ transform: [{ scale: nameScale }] }}
        >
          {userInfo.firstName} {userInfo.lastName}
        </Animated.Text>
      </Animated.View>

      <Animated.ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        contentContainerStyle={{
          paddingTop: HEADER_HEIGHT,
          paddingBottom: 100,
        }}
      >
        <View className="bg-gray-60 min-h-full dark:bg-gray-950">
          {/* Cụm avatar cuộn lên theo nội dung (không transform, scroll tự nhiên) */}
          <View className="px-4 pt-6">
            <View className="mb-6 items-center rounded-3xl p-6">
              {/* Avatar tròn to - thu nhỏ và mờ dần khi cuộn */}
              <Animated.View
                className="relative"
                style={{
                  transform: [{ scale: avatarScale }],
                  opacity: avatarOpacity,
                }}
              >
                {userInfo.image ? (
                  <Image
                    source={{ uri: userInfo.image }}
                    className="h-20 w-20 rounded-full bg-gray-200 dark:bg-gray-700"
                  />
                ) : (
                  <View className="h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                    <Text className="text-3xl font-bold text-red-600 dark:text-red-400">
                      {initials || 'U'}
                    </Text>
                  </View>
                )}
                {isVerified && (
                  <View className="absolute -right-1 -top-1 h-6 w-6 items-center justify-center rounded-full bg-white dark:bg-gray-900">
                    <ShieldCheck size={14} color={successColor} />
                  </View>
                )}
              </Animated.View>

              {/* Placeholder giữ layout (tên thật nằm ở overlay, cuộn lên rồi dừng) */}
              <View className="mt-4 h-7 items-center justify-center" />

              {/* Số điện thoại - thu nhỏ và mờ dần khi cuộn */}
              <Animated.Text
                className="mt-1 text-sm text-gray-500 dark:text-gray-400"
                style={{
                  transform: [{ scale: phoneScale }],
                  opacity: phoneOpacity,
                }}
              >
                {userInfo.phonenumber || t('profile.contactInfo.noPhone')}
              </Animated.Text>
            </View>
          </View>

          {/* Settings Sections — staggered FadeInDown */}
          <View className="px-4">
            <Reanimated.View entering={FadeInDown.delay(0).duration(250)}>
              <SettingsSection header={t('profile.generalInfo.title')}>
                <SettingsItem
                  icon={User}
                  title={t('profile.generalInfo.title')}
                  iconBackgroundColor={isDark ? '#1d4ed8' : '#60a5fa'}
                  onPress={handleNavigateToInfo}
                />
              </SettingsSection>
            </Reanimated.View>

            <Reanimated.View entering={FadeInDown.delay(60).duration(250)}>
              <SettingsSection header={t('profile.orderHistory.title')}>
                <SettingsItem
                  icon={Package}
                  title={t('profile.orderHistory.title')}
                  iconBackgroundColor={isDark ? '#7c2d12' : '#fb923c'}
                  onPress={handleNavigateToHistory}
                />
              </SettingsSection>
            </Reanimated.View>

            <Reanimated.View entering={FadeInDown.delay(120).duration(250)}>
              <SettingsSection header={t('profile.financial.title')}>
                <SettingsItem
                  icon={Gift}
                  title={t('profile.giftCard.title')}
                  iconBackgroundColor={isDark ? '#7e22ce' : '#c4b5fd'}
                  value={
                    userInfo.balance?.points
                      ? `${userInfo.balance.points} ${t('profile.points')}`
                      : undefined
                  }
                  onPress={handleNavigateToGiftCard}
                />
                <SettingsItem
                  icon={Award}
                  title={t('profile.loyaltyPoint.title')}
                  iconBackgroundColor={isDark ? '#047857' : '#4ade80'}
                  value={
                    userInfo.balance?.points
                      ? `${userInfo.balance.points} ${t('profile.points')}`
                      : undefined
                  }
                  onPress={handleNavigateToLoyaltyPoint}
                />
                <SettingsItem
                  icon={Wallet}
                  title={t('profile.coin.title')}
                  iconBackgroundColor={isDark ? '#b45309' : '#facc15'}
                  onPress={handleNavigateToCoin}
                />
              </SettingsSection>
            </Reanimated.View>

            <Reanimated.View entering={FadeInDown.delay(180).duration(250)}>
              <SettingsSection header={t('profile.security.title')}>
                <SettingsItem
                  icon={Mail}
                  title={t('profile.verifyEmail.title')}
                  iconBackgroundColor={isDark ? '#0369a1' : '#38bdf8'}
                  subtitle={
                    userInfo.isVerifiedEmail
                      ? t('profile.verified')
                      : t('profile.notVerified')
                  }
                  subtitleColor={
                    userInfo.isVerifiedEmail ? successColor : undefined
                  }
                  onPress={handleNavigateToVerifyEmail}
                />
                <SettingsItem
                  icon={Phone}
                  title={t('profile.verifyPhone.title')}
                  iconBackgroundColor={isDark ? '#16a34a' : '#22c55e'}
                  subtitle={
                    userInfo.isVerifiedPhonenumber
                      ? t('profile.verified')
                      : t('profile.notVerified')
                  }
                  subtitleColor={
                    userInfo.isVerifiedPhonenumber ? successColor : undefined
                  }
                  onPress={handleNavigateToVerifyPhone}
                />
                <SettingsItem
                  icon={KeyRound}
                  title={t('profile.changePassword.title')}
                  iconBackgroundColor={isDark ? '#854d0e' : '#eab308'}
                  onPress={handleNavigateToChangePassword}
                />
              </SettingsSection>
            </Reanimated.View>

            <Reanimated.View entering={FadeInDown.delay(240).duration(250)}>
              <SettingsSection>
                <SettingsItem
                  icon={LogOut}
                  title={t('profile.logout.title')}
                  onPress={handleLogoutPress}
                  destructive
                />
              </SettingsSection>
            </Reanimated.View>
          </View>
        </View>
      </Animated.ScrollView>

      {/* Logout Dialog */}
      <LogoutDialog
        isOpen={isLogoutDialogOpen}
        onOpenChange={setIsLogoutDialogOpen}
        onLogout={handleLogout}
      />
    </ScreenContainer>
  )
}

const styles = StyleSheet.create({
  headerBlurLight: {
    backgroundColor: 'rgba(245, 245, 245, 1)',
  },
  headerBlurDark: {
    backgroundColor: 'rgba(10, 10, 10, 1)',
  },
})

function ProfileScreen() {
  useGpuWarmup()
  usePhase4MountLog('profile')
  const [ready, setReady] = useState(false)
  useRunAfterTransition(() => setReady(true), [], { androidDelayMs: 150 })
  if (!ready) return <ProfileSkeletonShell />
  return <Profile />
}

ProfileScreen.displayName = 'ProfileScreen'

export default React.memo(ProfileScreen)
