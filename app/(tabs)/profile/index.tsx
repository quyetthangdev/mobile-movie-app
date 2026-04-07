import { LoginForm } from '@/components/auth'
import { LanguageSheet, ThemeSheet } from '@/components/profile'
import { Skeleton } from '@/components/ui'
import { colors } from '@/constants/colors.constant'
import { STATIC_TOP_INSET } from '@/constants/status-bar'
import { useLoyaltyPoints, useRunAfterTransition, useUploadAvatar } from '@/hooks'
import { useAuthStore, useUserStore } from '@/stores'
import { useLogoutSheetStore } from '@/stores/logout-sheet.store'
import { useScanSheetStore } from '@/stores/scan-sheet.store'
import { showToast } from '@/utils'
import { BlurView } from 'expo-blur'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import {
  Camera,
  ChevronRight,
  ClipboardList,
  Gift,
  Languages,
  ScanLine,
  SunMoon,
  Trophy,
  User,
} from 'lucide-react-native'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AppState,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
  useWindowDimensions,
} from 'react-native'
import { GestureDetector, ScrollView as GestureScrollView } from 'react-native-gesture-handler'
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
} from 'react-native-reanimated'
import { useProfileAnimation } from './use-profile-animation'

const AnimatedGestureScrollView = Animated.createAnimatedComponent(GestureScrollView)

const HEADER_HEIGHT = 280
const AVATAR_SIZE = 100
const AVATAR_TOP = 60
const SCROLL_RANGE = 140
// nameTravel: distance the name text slides up to dock at the header toolbar.
// Derivation: nameCenterY - headerNameY
//   = (insets.top + AVATAR_TOP + AVATAR_SIZE + 24) - (insets.top + 28)
//   = AVATAR_TOP + AVATAR_SIZE + 24 - 28 = 156 → travel = -156 (upward)
// insets.top cancels, so this is a fixed constant regardless of device safe-area.
const NAME_TRAVEL = -(AVATAR_TOP + AVATAR_SIZE + 24 - 28) // -156

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
  purple: '#8B5CF6',
  teal: '#14B8A6',
  indigo: '#6366F1',
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

const MenuItem = React.memo(function MenuItem({
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
})

// ─── Profile Header — copied 100% from CartHeader, 2 buttons changed ────────

const ProfileHeader = React.memo(function ProfileHeader({
  onEdit,
  onScan,
  isDark,
}: {
  onEdit: () => void
  onScan: () => void
  isDark: boolean
}) {
  const { t } = useTranslation('profile')
  const pageBg = isDark ? colors.background.dark : colors.background.light
  const gradientColors = useMemo(
    () => [pageBg, `${pageBg}E6`, `${pageBg}B0`, `${pageBg}50`, `${pageBg}00`] as const,
    [pageBg],
  )
  return (
    <View style={phStyles.container} pointerEvents="box-none">
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {Platform.OS !== 'ios' ? (
          <BlurView
            intensity={20}
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        <LinearGradient
          colors={gradientColors}
          locations={[0, 0.3, 0.62, 0.85, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>
      <View style={[phStyles.row, { paddingTop: STATIC_TOP_INSET + 10 }]} pointerEvents="auto">
        <Pressable
          onPress={onScan}
          hitSlop={8}
          style={[
            phStyles.circleBtn,
            { backgroundColor: isDark ? colors.gray[800] : colors.white.light },
            phStyles.shadow,
          ]}
        >
          <ScanLine size={20} color={isDark ? colors.gray[50] : colors.gray[900]} />
        </Pressable>
        <Pressable
          onPress={onEdit}
          hitSlop={8}
          style={[
            phStyles.editPill,
            { backgroundColor: isDark ? colors.gray[800] : colors.white.light },
            phStyles.shadow,
          ]}
        >
          <Text style={[phStyles.editText, { color: isDark ? colors.gray[50] : colors.gray[900] }]}>
            {t('profile.generalInfo.edit', 'Sửa')}
          </Text>
        </Pressable>
      </View>
    </View>
  )
})

const phStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    paddingBottom: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  circleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editPill: {
    height: 42,
    borderRadius: 21,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 24,
    elevation: 2,
  },
  editText: {
    fontSize: 15,
    fontWeight: '400',
  },
})

// ─── Profile Screen ───────────────────────────────────────────────────────────

const ProfileTest = () => {
  const { width: screenWidth } = useWindowDimensions()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const theme = PROFILE_THEME[isDark ? 'dark' : 'light']
  const router = useRouter()
  const scrollY = useSharedValue(0)

  const handleScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      'worklet'
      scrollY.value = e.contentOffset.y
    },
  })

  const avatarTop = STATIC_TOP_INSET + AVATAR_TOP
  const nameTop = avatarTop + AVATAR_SIZE + 12

  // Single derived progress 0→1
  const progress = useDerivedValue(() => {
    'worklet'
    const p = scrollY.value / SCROLL_RANGE
    return p < 0 ? 0 : p > 1 ? 1 : p
  })

  // Avatar + phone: fade out + translate up — same linear driver as nameStyle for sync
  const avatarPhoneStyle = useAnimatedStyle(() => {
    'worklet'
    return {
      opacity: 1 - progress.value,
      transform: [{ translateY: NAME_TRAVEL * progress.value }],
    }
  })

  // Name: slides up to dock at header toolbar position
  const nameStyle = useAnimatedStyle(() => {
    'worklet'
    return {
      transform: [{ translateY: NAME_TRAVEL * progress.value }],
    }
  })

  const { t } = useTranslation('profile')
  const handleBack = useCallback(() => router.back(), [router])
  const { animatedStyle, panGesture } =
    useProfileAnimation(handleBack)
  const needsUserInfo = useAuthStore((state) => state.needsUserInfo())
  const userInfo = useUserStore((state) => state.userInfo)
  const setUserInfo = useUserStore((state) => state.setUserInfo)
  const setLogout = useAuthStore((state) => state.setLogout)
  const removeUserInfo = useUserStore((state) => state.removeUserInfo)
  const { mutate: uploadAvatar } = useUploadAvatar()

  const [allowFetch, setAllowFetch] = React.useState(false)
  const openLogoutSheet = useLogoutSheetStore((s) => s.open)
  useRunAfterTransition(() => setAllowFetch(true), [])

  useEffect(() => {
    const sub = AppState.addEventListener('memoryWarning', () => {
      queueMicrotask(() => Image.clearMemoryCache())
    })
    return () => { sub.remove() }
  }, [])

  const initials = useMemo(() => {
    const first = userInfo?.firstName?.charAt(0) || ''
    const last = userInfo?.lastName?.charAt(0) || ''
    return `${first}${last}`.toUpperCase()
  }, [userInfo?.firstName, userInfo?.lastName])

  const { isLoading: loyaltyLoading } =
    useLoyaltyPoints(userInfo?.slug, allowFetch)

  const [isLangSheetOpen, setIsLangSheetOpen] = useState(false)
  const openLangSheet = useCallback(() => setIsLangSheetOpen(true), [])
  const closeLangSheet = useCallback(() => setIsLangSheetOpen(false), [])

  const [isThemeSheetOpen, setIsThemeSheetOpen] = useState(false)
  const openThemeSheet = useCallback(() => setIsThemeSheetOpen(true), [])
  const closeThemeSheet = useCallback(() => setIsThemeSheetOpen(false), [])

  const openScanSheet = useScanSheetStore((s) => s.open)

  const openEdit = useCallback(() => {
    router.push('/(tabs)/profile/edit')
  }, [router])

  const handleAvatarPress = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      showToast('Cần quyền truy cập thư viện ảnh')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })

    if (result.canceled) return

    const asset = result.assets[0]

    if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
      showToast('Ảnh phải nhỏ hơn 5MB')
      return
    }

    const formData = new FormData()
    formData.append('file', {
      uri: asset.uri,
      type: asset.mimeType ?? 'image/jpeg',
      name: asset.fileName ?? `avatar-${Date.now()}.jpg`,
    } as never)

    uploadAvatar(formData, {
      onSuccess: (data) => {
        if (data.result) {
          setUserInfo(data.result)
        }
        showToast('Cập nhật ảnh đại diện thành công')
      },
      onError: () => {
        showToast('Không thể tải ảnh lên, vui lòng thử lại')
      },
    })
  }, [uploadAvatar, setUserInfo])

  const openGeneralInfo = useCallback(() => {
    router.push('/(tabs)/profile/general-info')
  }, [router])

  const openPoints = useCallback(() => {
    router.push('/profile/loyalty-point-hub' as never)
  }, [router])

  const openOrdersHistory = useCallback(() => {
    router.push('/(tabs)/profile/orders-history-placeholder')
  }, [router])

  const openGiftCard = useCallback(() => {
    router.push('/profile/gift-card-hub' as never)
  }, [router])

  const { t: tToast } = useTranslation('toast')

  const handleLogoutConfirm = useCallback(() => {
    // Unregister FCM token + stop refresh scheduler (fire-and-forget)
    import('@/lib/fcm-token-manager').then((m) => m.cleanupTokenOnLogout())
    setLogout()
    removeUserInfo()
    router.replace('/(tabs)/home' as never)
    showToast(tToast('logoutSuccess', 'Đăng xuất thành công'))
  }, [removeUserInfo, setLogout, tToast, router])

  const handleLogoutPress = useCallback(() => {
    openLogoutSheet(handleLogoutConfirm)
  }, [openLogoutSheet, handleLogoutConfirm])

  if (needsUserInfo || !userInfo) {
    return <LoginForm />
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[styles.profileCard, { backgroundColor: theme.bg }, animatedStyle]}
          renderToHardwareTextureAndroid
        >
          {/* Avatar — absolutely positioned, fades + moves up on scroll */}
          <Animated.View
            style={[
              styles.avatarWrap,
              {
                width: AVATAR_SIZE,
                height: AVATAR_SIZE,
                left: (screenWidth - AVATAR_SIZE) / 2,
                top: avatarTop,
              },
              avatarPhoneStyle,
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
          {/* Tên + SĐT: overlay riêng, tên dừng ở header, SĐT mờ cùng avatar */}
          <View style={[styles.namePhoneWrap, { top: nameTop }]} pointerEvents="none">
            <Animated.Text
              style={[styles.nameText, nameStyle, { color: theme.text }]}
              numberOfLines={1}
            >
              {userInfo?.firstName} {userInfo?.lastName}
            </Animated.Text>
            <Animated.View style={avatarPhoneStyle}>
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
              { paddingTop: HEADER_HEIGHT + STATIC_TOP_INSET + 12 },
            ]}
            onScroll={handleScroll}
            scrollEventThrottle={32}
          >
            {/* Group 1: Profile customization */}
            <View style={[styles.card, { backgroundColor: theme.card }]}>
              <MenuItem
                icon={Camera}
                iconColor={ICON_COLORS.blue}
                title="Đổi ảnh đại diện"
                onPress={handleAvatarPress}
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
              <MenuItem
                icon={ClipboardList}
                iconColor={ICON_COLORS.purple}
                title={t('profile.orderHistory.title', 'Lịch sử đơn hàng')}
                onPress={openOrdersHistory}
                textColor={theme.text}
                textMuted={theme.textMuted}
              />
              <View style={[styles.menuItemDivider, { backgroundColor: theme.divider }]} />
              <MenuItem
                icon={Gift}
                iconColor={ICON_COLORS.orange}
                title={t('profile.giftCardAndCoin.title', 'Thẻ quà tặng & Xu')}
                onPress={openGiftCard}
                textColor={theme.text}
                textMuted={theme.textMuted}
              />
              {loyaltyLoading ? (
                <>
                  <View style={[styles.menuItemDivider, { backgroundColor: theme.divider }]} />
                  <View style={styles.menuItem}>
                    <Skeleton style={[styles.menuIconWrap, { marginRight: 14 }]} />
                    <View style={{ flex: 1 }}>
                      <Skeleton style={{ height: 16, width: 120, borderRadius: 4 }} />
                    </View>
                    <ChevronRight size={20} color={theme.textMuted} />
                  </View>
                </>
              ) : (
                <>
                  <View style={[styles.menuItemDivider, { backgroundColor: theme.divider }]} />
                  <MenuItem
                    icon={Trophy}
                    iconColor={ICON_COLORS.green}
                    title={t('profile.loyaltyPoint.title', 'Điểm tích lũy')}
                    onPress={openPoints}
                    textColor={theme.text}
                    textMuted={theme.textMuted}
                  />
                </>
              )}
            </View>

            {/* Group 4: Settings */}
            <View style={[styles.card, { backgroundColor: theme.card }]}>
              <MenuItem
                icon={Languages}
                iconColor={ICON_COLORS.teal}
                title={t('profile.language.title', 'Ngôn ngữ')}
                onPress={openLangSheet}
                textColor={theme.text}
                textMuted={theme.textMuted}
              />
              <View style={[styles.menuItemDivider, { backgroundColor: theme.divider }]} />
              <MenuItem
                icon={SunMoon}
                iconColor={ICON_COLORS.indigo}
                title={t('profile.theme.title', 'Giao diện')}
                onPress={openThemeSheet}
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

          {/* ProfileHeader — 100% CartHeader structure, LayoutGrid + Pencil buttons */}
          <ProfileHeader onEdit={openEdit} onScan={openScanSheet} isDark={isDark} />
        </Animated.View>
      </GestureDetector>

      <LanguageSheet
        visible={isLangSheetOpen}
        onClose={closeLangSheet}
        isDark={isDark}
        primaryColor={isDark ? colors.primary.dark : colors.primary.light}
      />
      <ThemeSheet
        visible={isThemeSheetOpen}
        onClose={closeThemeSheet}
        isDark={isDark}
        primaryColor={isDark ? colors.primary.dark : colors.primary.light}
      />

    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  profileCard: {
    flex: 1,
    overflow: 'visible',
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 120 },
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
