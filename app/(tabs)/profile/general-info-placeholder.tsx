/**
 * Thông tin cá nhân — UI giống Profile: avatar, 2 nút header, các trường thông tin bên dưới.
 */
import { LogoutConfirmBottomSheet } from '@/components/profile'
import { useAuthStore, useUserStore } from '@/stores'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import {
  ChevronLeft,
  Mail,
  MapPin,
  Phone,
  Shield,
  User as UserIcon,
} from 'lucide-react-native'
import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
  useWindowDimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors } from '@/constants/colors.constant'
import { showToast } from '@/utils'

const AVATAR_SIZE = 100
const HEADER_HEIGHT = 240

const PROFILE_THEME = {
  light: {
    bg: colors.background.light,
    card: '#ffffff',
    text: colors.foreground.light,
    textMuted: colors.mutedForeground.light,
    editBtn: colors.border.light,
    divider: 'rgba(0,0,0,0.06)',
    avatarFallback: colors.border.light,
  },
  dark: {
    bg: '#1F2B3E',
    card: '#2B3B4C',
    text: colors.foreground.dark,
    textMuted: '#8B9BB2',
    editBtn: '#3D4F66',
    divider: 'rgba(255,255,255,0.08)',
    avatarFallback: '#2B3B4C',
  },
} as const

const ICON_COLORS = {
  blue: '#5DA8E8',
  red: '#E85D5D',
  green: '#4CAF50',
}

function InfoRow({
  icon: Icon,
  iconColor,
  label,
  value,
  theme,
}: {
  icon: React.ElementType
  iconColor: string
  label: string
  value: string
  theme: (typeof PROFILE_THEME)[keyof typeof PROFILE_THEME]
}) {
  return (
    <View style={styles.infoRow}>
      <View style={[styles.infoIconWrap, { backgroundColor: iconColor }]}>
        <Icon size={18} color="#ffffff" />
      </View>
      <View style={styles.infoContent}>
        <Text style={[styles.infoLabel, { color: theme.textMuted }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: theme.text }]} numberOfLines={2}>
          {value}
        </Text>
      </View>
    </View>
  )
}

export default function GeneralInfoPlaceholder() {
  const router = useRouter()
  const { width: screenWidth } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const theme = PROFILE_THEME[isDark ? 'dark' : 'light']
  const { t } = useTranslation('profile')
  const { t: tToast } = useTranslation('toast')

  const userInfo = useUserStore((state) => state.userInfo)
  const setLogout = useAuthStore((state) => state.setLogout)
  const removeUserInfo = useUserStore((state) => state.removeUserInfo)
  const handleBack = useCallback(() => router.back(), [router])
  const handleEdit = useCallback(() => router.push('/(tabs)/profile/edit'), [router])
  const handleLogoutPress = useCallback(() => {
    ;(LogoutConfirmBottomSheet as { open: () => void }).open()
  }, [])
  const isLoggingOutRef = useRef(false)

  const handleLogoutConfirm = useCallback(() => {
    isLoggingOutRef.current = true
    setLogout()
    removeUserInfo()
    router.replace('/(tabs)/home' as never)
    showToast(tToast('logoutSuccess', 'Đăng xuất thành công'))
  }, [removeUserInfo, router, setLogout, tToast])

  const initials = useMemo(() => {
    if (!userInfo) return ''
    const first = userInfo.firstName?.charAt(0) || ''
    const last = userInfo.lastName?.charAt(0) || ''
    return `${first}${last}`.toUpperCase()
  }, [userInfo])

  useEffect(() => {
    // Khi đăng xuất, handleLogoutConfirm đã gọi router.replace — không gọi back() để tránh lỗi "GO_BACK was not handled"
    if (!userInfo && !isLoggingOutRef.current) {
      router.back()
    }
  }, [userInfo, router])

  if (!userInfo) {
    return null
  }

  const successColor = isDark ? colors.success.dark : colors.success.light

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />

      {/* Header: 2 nút giống Profile */}
      <View
        style={[
          styles.headerSection,
          {
            height: HEADER_HEIGHT + insets.top,
            paddingTop: insets.top,
          },
        ]}
      >
        <View style={[styles.topNav, { paddingTop: 8 }]}>
          <View style={styles.topNavContent}>
            <TouchableOpacity
              style={[styles.headerBtn, { backgroundColor: theme.editBtn }]}
              onPress={handleBack}
            >
              <ChevronLeft size={22} color={theme.text} />
            </TouchableOpacity>
            <View style={styles.headerCenter} pointerEvents="none">
              <Text
                style={[styles.headerTitle, { color: theme.text }]}
                numberOfLines={1}
              >
                {t('profile.generalInfo.title', 'Thông tin cá nhân')}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.editBtn, { backgroundColor: theme.editBtn }]}
              onPress={handleEdit}
            >
              <Text style={[styles.editBtnText, { color: theme.text }]}>Sửa</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Avatar tròn giữa */}
        <View
          style={[
            styles.avatarWrap,
            {
              width: AVATAR_SIZE,
              height: AVATAR_SIZE,
              left: (screenWidth - AVATAR_SIZE) / 2,
              top: insets.top + 60,
            }]}
        >
          {userInfo.image ? (
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
        </View>

        {/* Tên và SĐT dưới avatar */}
        <View style={[styles.namePhoneWrap, { top: insets.top + 60 + AVATAR_SIZE + 12 }]}>
          <View style={styles.nameRow}>
            <Text style={[styles.nameText, { color: theme.text }]} numberOfLines={1}>
              {userInfo.firstName} {userInfo.lastName}
            </Text>
            {(userInfo.isVerifiedEmail || userInfo.isVerifiedPhonenumber) && (
              <Shield size={16} color={successColor} fill={successColor} />
            )}
          </View>
          <Text style={[styles.phoneText, { color: theme.textMuted }]} numberOfLines={1}>
            {userInfo.phonenumber ||
              t('profile.contactInfo.noPhone', 'Chưa cập nhật số điện thoại')}
          </Text>
        </View>
      </View>

      {/* Các trường thông tin cá nhân */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: 12, paddingBottom: 40 },
        ]}
      >
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>
            {t('profile.contactInfo.title', 'Thông tin liên hệ')}
          </Text>

          <InfoRow
            icon={UserIcon}
            iconColor={ICON_COLORS.blue}
            label={t('profile.contactInfo.name', 'Họ và tên')}
            value={`${userInfo.firstName || ''} ${userInfo.lastName || ''}`.trim() || t('profile.contactInfo.notUpdated', 'Chưa cập nhật')}
            theme={theme}
          />
          <View style={[styles.divider, { backgroundColor: theme.divider }]} />

          <InfoRow
            icon={Phone}
            iconColor={ICON_COLORS.green}
            label={t('profile.contactInfo.phone', 'Số điện thoại')}
            value={userInfo.phonenumber || t('profile.contactInfo.notUpdated', 'Chưa cập nhật')}
            theme={theme}
          />
          <View style={[styles.divider, { backgroundColor: theme.divider }]} />

          <InfoRow
            icon={Mail}
            iconColor={ICON_COLORS.red}
            label={t('profile.contactInfo.email', 'Email')}
            value={userInfo.email || t('profile.contactInfo.notUpdated', 'Chưa cập nhật')}
            theme={theme}
          />
          <View style={[styles.divider, { backgroundColor: theme.divider }]} />

          <InfoRow
            icon={MapPin}
            iconColor={ICON_COLORS.blue}
            label={t('profile.contactInfo.address', 'Địa chỉ')}
            value={userInfo.address || t('profile.contactInfo.notUpdated', 'Chưa cập nhật')}
            theme={theme}
          />
        </View>

        {userInfo.branch && (
          <View style={[styles.card, { backgroundColor: theme.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>
              {t('profile.contactInfo.branch', 'Chi nhánh đang phục vụ')}
            </Text>
            <Text style={[styles.branchName, { color: theme.text }]}>
              {userInfo.branch.name}
            </Text>
            <Text style={[styles.branchAddress, { color: theme.textMuted }]}>
              {userInfo.branch.address}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.logoutButton,
            {
              backgroundColor: colors.destructive[isDark ? 'dark' : 'light'],
            },
          ]}
          onPress={handleLogoutPress}
        >
          <Text style={styles.logoutText}>
            {t('profile.logout.title', 'Đăng xuất')}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <LogoutConfirmBottomSheet onConfirm={handleLogoutConfirm} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerSection: {
    backgroundColor: 'transparent',
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
  },
  topNavContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    flex: 1,
    position: 'relative',
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
  headerCenter: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
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
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  nameText: {
    fontSize: 22,
    fontWeight: '700',
  },
  phoneText: {
    fontSize: 15,
  },
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
  },
  card: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  infoIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '400',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 46,
  },
  branchName: {
    fontSize: 15,
    fontWeight: '500',
  },
  logoutButton: {
    marginTop: 24,
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  branchAddress: {
    fontSize: 13,
    marginTop: 4,
  },
})
