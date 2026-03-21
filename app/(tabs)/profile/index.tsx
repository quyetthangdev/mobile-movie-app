import { LoginForm } from '@/components/auth'
import { useLogoutSheetStore } from '@/stores/logout-sheet.store'
import { Skeleton } from '@/components/ui'
import { useLoyaltyPoints, useRunAfterTransition } from '@/hooks'
import { useAuthStore, useUserStore } from '@/stores'
import { BlurView } from 'expo-blur'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import {
  Bell,
  Camera,
  ChevronRight,
  Coins,
  Folder,
  Gift,
  LayoutGrid,
  Settings,
  Trophy,
  User,
} from 'lucide-react-native'
import React, { useCallback, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
  useWindowDimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { GestureDetector, ScrollView as GestureScrollView } from 'react-native-gesture-handler'
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated'
import { colors } from '@/constants/colors.constant'
import { showToast } from '@/utils'

import { useProfileAnimation } from './use-profile-animation'

const AnimatedGestureScrollView = Animated.createAnimatedComponent(GestureScrollView)

const HEADER_HEIGHT = 280
const TOOLBAR_HEIGHT = 56
const AVATAR_SIZE = 100
const AVATAR_TOP = 60
const SCROLL_RANGE = 140

const PROFILE_THEME = {
  light: {
    bg: colors.background.light,
    card: '#ffffff',
    text: colors.foreground.light,
    textMuted: colors.mutedForeground.light,
    editBtn: colors.border.light,
    divider: 'rgba(0,0,0,0.06)',
    avatarFallback: colors.border.light,
    logoutBg: 'rgba(239, 68, 68, 0.12)',
    logoutText: colors.destructive.light,
  },
  dark: {
    bg: '#1F2B3E',
    card: '#2B3B4C',
    text: colors.foreground.dark,
    textMuted: '#8B9BB2',
    editBtn: '#3D4F66',
    divider: 'rgba(255,255,255,0.08)',
    avatarFallback: '#2B3B4C',
    logoutBg: 'rgba(232, 93, 93, 0.2)',
    logoutText: '#E85D5D',
  },
} as const

const ICON_COLORS = {
  blue: '#5DA8E8',
  red: '#E85D5D',
  green: '#4CAF50',
  orange: '#F5A623',
}

interface MenuItemProps {
  icon: React.ElementType
  iconColor: string
  title: string
  value?: string
  onPress?: () => void
  textColor: string
  textMuted: string
  variant?: 'primary' | 'default'
  primaryColor?: string
}

function MenuItem({
  icon: Icon,
  iconColor,
  title,
  value,
  onPress,
  textColor,
  textMuted,
  variant = 'default',
  primaryColor,
}: MenuItemProps) {
  const isPrimary = variant === 'primary'
  const titleColor = isPrimary ? primaryColor ?? textColor : textColor
  const iconColorFinal = isPrimary ? primaryColor ?? iconColor : iconColor

  return (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {isPrimary ? (
        <View style={styles.menuIconBare}>
          <Icon size={24} color={iconColorFinal} />
        </View>
      ) : (
        <View style={[styles.menuIconWrap, { backgroundColor: iconColor }]}>
          <Icon size={18} color="#ffffff" />
        </View>
      )}
      <Text
        style={[
          styles.menuTitle,
          styles.menuTitleThin,
          { color: titleColor },
        ]}
      >
        {title}
      </Text>
      {value ? (
        <Text style={[styles.menuValue, { color: textMuted }]}>{value}</Text>
      ) : null}
      {!isPrimary && <ChevronRight size={20} color={textMuted} />}
    </TouchableOpacity>
  )
}

const ProfileTest = () => {
  const { width: screenWidth } = useWindowDimensions()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const theme = PROFILE_THEME[isDark ? 'dark' : 'light']
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const scrollY = useSharedValue(0)
  const insetsTop = useSharedValue(insets.top)

  useEffect(() => {
    insetsTop.value = insets.top
  }, [insets.top, insetsTop])

  const handleScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      'worklet'
      scrollY.value = e.contentOffset.y
    },
  })

  const avatarTop = insets.top + AVATAR_TOP
  const nameTop = avatarTop + AVATAR_SIZE + 12
  const headerNameY = insets.top + 28

  const avatarStyle = useAnimatedStyle(() => {
    'worklet'
    const y = scrollY.value
    const opacity = interpolate(y, [0, SCROLL_RANGE], [1, 0], Extrapolation.CLAMP)
    const translateY = interpolate(y, [0, SCROLL_RANGE], [0, -y], Extrapolation.CLAMP)
    return {
      opacity,
      transform: [{ translateY }],
    }
  })

  const phoneStyle = useAnimatedStyle(() => {
    'worklet'
    const y = scrollY.value
    const opacity = interpolate(y, [0, SCROLL_RANGE], [1, 0], Extrapolation.CLAMP)
    return {
      opacity,
      transform: [{ translateY: -y }],
    }
  })

  const nameCenterY = nameTop + 12
  const nameStyle = useAnimatedStyle(() => {
    'worklet'
    const y = scrollY.value
    const translateY = interpolate(
      y,
      [0, SCROLL_RANGE],
      [0, -(nameCenterY - headerNameY)],
      Extrapolation.CLAMP,
    )
    return {
      transform: [{ translateY }],
    }
  })

  const headerHeightStyle = useAnimatedStyle(() => {
    'worklet'
    const y = scrollY.value
    const top = insetsTop.value
    const height = interpolate(
      y,
      [0, SCROLL_RANGE],
      [HEADER_HEIGHT + top, top + TOOLBAR_HEIGHT],
      Extrapolation.CLAMP,
    )
    return { height }
  })

  const toolbarBlurStyle = useAnimatedStyle(() => {
    'worklet'
    const opacity = interpolate(
      scrollY.value,
      [SCROLL_RANGE * 0.5, SCROLL_RANGE],
      [0, 1],
      Extrapolation.CLAMP,
    )
    return { opacity }
  })

  const headerBgStyle = useAnimatedStyle(() => {
    'worklet'
    const opacity = interpolate(
      scrollY.value,
      [SCROLL_RANGE * 0.5, SCROLL_RANGE],
      [1, 0],
      Extrapolation.CLAMP,
    )
    return { opacity }
  })

  const { t } = useTranslation('profile')
  const handleBack = useCallback(() => router.back(), [router])
  const { animatedStyle, closeProfile, panGesture } =
    useProfileAnimation(handleBack)
  const needsUserInfo = useAuthStore((state) => state.needsUserInfo())
  const userInfo = useUserStore((state) => state.userInfo)
  const setLogout = useAuthStore((state) => state.setLogout)
  const removeUserInfo = useUserStore((state) => state.removeUserInfo)

  const [allowFetch, setAllowFetch] = React.useState(false)
  const openLogoutSheet = useLogoutSheetStore((s) => s.open)
  useRunAfterTransition(() => setAllowFetch(true), [])

  useEffect(() => {
    return () => {
      Image.clearMemoryCache()
    }
  }, [])

  const initials = useMemo(() => {
    if (!userInfo) return ''
    const first = userInfo.firstName?.charAt(0) || ''
    const last = userInfo.lastName?.charAt(0) || ''
    return `${first}${last}`.toUpperCase()
  }, [userInfo])

  const { totalPoints: loyaltyPoints, isLoading: loyaltyLoading } =
    useLoyaltyPoints(userInfo?.slug, allowFetch)

  const openEdit = useCallback(() => {
    router.push('/(tabs)/profile/edit')
  }, [router])

  const openGeneralInfo = useCallback(() => {
    router.push('/(tabs)/profile/general-info-placeholder')
  }, [router])

  const openPoints = useCallback(() => {
    router.push('/(tabs)/profile/points-placeholder')
  }, [router])

  const openCoins = useCallback(() => {
    router.push('/(tabs)/profile/coins-placeholder')
  }, [router])

  const openOrdersHistory = useCallback(() => {
    router.push('/(tabs)/profile/orders-history-placeholder')
  }, [router])

  const openAccountSettings = useCallback(() => {
    router.push('/(tabs)/profile/account-settings-placeholder')
  }, [router])

  const openGiftCard = useCallback(() => {
    router.push('/(tabs)/gift-card' as never)
  }, [router])

  const { t: tToast } = useTranslation('toast')

  const handleLogoutConfirm = useCallback(() => {
    setLogout()
    removeUserInfo()
    router.replace('/(tabs)/home' as never)
    showToast(tToast('logoutSuccess', 'Đăng xuất thành công'))
  }, [removeUserInfo, router, setLogout, tToast])

  const handleLogoutPress = useCallback(() => {
    openLogoutSheet(handleLogoutConfirm)
  }, [openLogoutSheet, handleLogoutConfirm])

  if (needsUserInfo || !userInfo) {
    return <LoginForm />
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor="transparent"
          translucent
        />
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[styles.profileCard, { backgroundColor: theme.bg }, animatedStyle]}
          renderToHardwareTextureAndroid
        >
          {/* Header: overlay, collapse khi cuộn. Avatar+SĐT mờ, tên dừng ở header. Khi cuộn xong: header blur, khoảng avatar thành không gian hiển thị. */}
          <Animated.View
            style={[
              styles.headerSection,
              { paddingTop: insets.top },
              headerHeightStyle,
            ]}
          >
            <Animated.View
              style={[StyleSheet.absoluteFill, { backgroundColor: theme.bg }, headerBgStyle]}
              pointerEvents="none"
            />
            <Animated.View
              style={[StyleSheet.absoluteFill, styles.toolbarBlurWrap, toolbarBlurStyle]}
              pointerEvents="none"
            >
              <BlurView
                intensity={80}
                tint={isDark ? 'dark' : 'light'}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
            <View style={[styles.topNav, { paddingTop: 8 }]}>
              <View style={styles.topNavContent}>
                <TouchableOpacity
                  style={[styles.headerBtn, { backgroundColor: theme.editBtn }]}
                  onPress={() => closeProfile()}
                >
                  <LayoutGrid size={22} color={theme.text} />
                </TouchableOpacity>
                <View style={styles.headerCenter} />
                <TouchableOpacity
                  style={[styles.editBtn, { backgroundColor: theme.editBtn }]}
                  onPress={openEdit}
                >
                  <Text style={[styles.editBtnText, { color: theme.text }]}>Sửa</Text>
                </TouchableOpacity>
              </View>
            </View>
            {/* Avatar tròn giữa - mờ và di chuyển lên khi cuộn */}
            <Animated.View
              style={[
                styles.avatarWrap,
                {
                  width: AVATAR_SIZE,
                  height: AVATAR_SIZE,
                  left: (screenWidth - AVATAR_SIZE) / 2,
                  top: avatarTop,
                },
                avatarStyle,
              ]}
            >
              {userInfo?.image ? (
                <Image
                  source={{ uri: userInfo.image, width: AVATAR_SIZE * 2, height: AVATAR_SIZE * 2 }}
                  style={styles.avatarImage}
                  contentFit="cover"
                  cachePolicy="disk"
                />
              ) : (
                <View style={[styles.avatarFallback, { backgroundColor: theme.avatarFallback }]}>
                  <Text style={[styles.avatarFallbackText, { color: theme.textMuted }]}>
                    {initials || 'U'}
                  </Text>
                </View>
              )}
            </Animated.View>
          </Animated.View>
          {/* Tên: overlay riêng, di chuyển lên và dừng ở header (không bị clip khi header collapse) */}
          <View style={[styles.namePhoneWrap, { top: nameTop }]} pointerEvents="none">
            <Animated.Text
              style={[styles.nameText, nameStyle, { color: theme.text }]}
              numberOfLines={1}
            >
              {userInfo?.firstName} {userInfo?.lastName}
            </Animated.Text>
            <Animated.View style={phoneStyle}>
              <Text
                style={[styles.phoneText, { color: theme.textMuted }]}
                numberOfLines={1}
              >
                {userInfo?.phonenumber ||
                  t('profile.contactInfo.noPhone', 'Chưa cập nhật số điện thoại')}
              </Text>
            </Animated.View>
          </View>

          <AnimatedGestureScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingTop: HEADER_HEIGHT + insets.top + 12 },
            ]}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            {/* Group 1: Profile customization */}
            <View style={[styles.card, { backgroundColor: theme.card }]}>
              <MenuItem
                icon={Camera}
                iconColor={ICON_COLORS.blue}
                title="Đổi ảnh đại diện"
                onPress={openEdit}
                textColor={theme.text}
                textMuted={theme.textMuted}
                variant="primary"
                primaryColor={isDark ? colors.primary.dark : colors.primary.light}
              />
            </View>

            {/* Group 2: Personal page */}
            <View style={[styles.card, { backgroundColor: theme.card }]}>
              <MenuItem
                icon={User}
                iconColor={ICON_COLORS.red}
                title={t('profile.generalInfo.title', 'Thông tin cá nhân')}
                onPress={openGeneralInfo}
                textColor={theme.text}
                textMuted={theme.textMuted}
              />
            </View>

            {/* Group 3: General features */}
            <View style={[styles.card, { backgroundColor: theme.card }]}>
              {loyaltyLoading ? (
                <View style={styles.menuItem}>
                  <Skeleton style={[styles.menuIconWrap, { marginRight: 14 }]} />
                  <View style={{ flex: 1 }}>
                    <Skeleton style={{ height: 16, width: 120, borderRadius: 4 }} />
                  </View>
                  <ChevronRight size={20} color={theme.textMuted} />
                </View>
              ) : (
                <>
                  <MenuItem
                    icon={Trophy}
                    iconColor={ICON_COLORS.green}
                    title={t('profile.loyaltyPoint.title', 'Điểm tích lũy')}
                    value={`${loyaltyPoints} ${t('profile.points.point', 'điểm')}`}
                    onPress={openPoints}
                    textColor={theme.text}
                    textMuted={theme.textMuted}
                  />
                  <View style={[styles.menuItemDivider, { backgroundColor: theme.divider }]} />
                </>
              )}
              <MenuItem
                icon={Coins}
                iconColor={ICON_COLORS.orange}
                title={t('profile.coin.title', 'Quản lý xu')}
                onPress={openCoins}
                textColor={theme.text}
                textMuted={theme.textMuted}
              />
              <View style={[styles.menuItemDivider, { backgroundColor: theme.divider }]} />
              <MenuItem
                icon={Folder}
                iconColor={ICON_COLORS.blue}
                title={t('profile.orderHistory.title', 'Lịch sử đơn hàng')}
                onPress={openOrdersHistory}
                textColor={theme.text}
                textMuted={theme.textMuted}
              />
              <View style={[styles.menuItemDivider, { backgroundColor: theme.divider }]} />
              <MenuItem
                icon={Gift}
                iconColor={ICON_COLORS.orange}
                title="Thẻ quà tặng"
                onPress={openGiftCard}
                textColor={theme.text}
                textMuted={theme.textMuted}
              />
            </View>

            {/* Group 4: Settings */}
            <View style={[styles.card, { backgroundColor: theme.card }]}>
              <MenuItem
                icon={Bell}
                iconColor={ICON_COLORS.red}
                title={t('profile.notification', 'Thông báo và Âm báo')}
                onPress={openAccountSettings}
                textColor={theme.text}
                textMuted={theme.textMuted}
              />
              <View style={[styles.menuItemDivider, { backgroundColor: theme.divider }]} />
              <MenuItem
                icon={Settings}
                iconColor={ICON_COLORS.blue}
                title="Cài đặt tài khoản"
                onPress={openAccountSettings}
                textColor={theme.text}
                textMuted={theme.textMuted}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.logoutButton,
                { backgroundColor: colors.destructive[isDark ? 'dark' : 'light'] },
              ]}
              onPress={handleLogoutPress}
            >
              <Text style={[styles.logoutText, { color: '#ffffff' }]}>
                {t('profile.logout.title', 'Đăng xuất')}
              </Text>
            </TouchableOpacity>
          </AnimatedGestureScrollView>
        </Animated.View>
      </GestureDetector>

    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  profileCard: {
    flex: 1,
    overflow: 'visible',
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    minHeight: 56,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 120 },
  headerSection: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    overflow: 'hidden',
  },
  toolbarBlurWrap: {
    overflow: 'hidden',
  },
  topNavContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    flex: 1,
    zIndex: 1,
  },
  headerCenter: {
    flex: 1,
    minWidth: 0,
  },
  avatarWrap: {
    position: 'absolute',
    borderRadius: 999,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    fontSize: 36,
    fontWeight: '700',
  },
  namePhoneWrap: {
    position: 'absolute',
    left: 24,
    right: 24,
    alignItems: 'center',
    zIndex: 15,
  },
  nameText: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  phoneText: {
    fontSize: 15,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 18,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuItemDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 46,
  },
  menuIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuIconBare: {
    width: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuTitle: {
    flex: 1,
    fontSize: 16,
  },
  menuTitleThin: {
    fontWeight: '400',
  },
  menuValue: {
    fontSize: 15,
    marginRight: 8,
  },
  logoutButton: {
    marginTop: 24,
    marginHorizontal: 16,
    marginBottom: 16,
    alignSelf: 'stretch',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
  },
})

export default ProfileTest
