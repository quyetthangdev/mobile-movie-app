import { LoginForm } from '@/components/auth'
import { Skeleton } from '@/components/ui'
import { useLoyaltyPoints, useRunAfterTransition } from '@/hooks'
import { useAuthStore, useUserStore } from '@/stores'
import { useRouter } from 'expo-router'
import React, { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated from 'react-native-reanimated'
import { useProfileAnimation } from './use-profile-animation'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

const ProfileTest = () => {
  const router = useRouter()
  const { t } = useTranslation('profile')
  const { animatedStyle, openProfile, closeProfile, translateX } =
    useProfileAnimation()
  const needsUserInfo = useAuthStore((state) => state.needsUserInfo())
  const userInfo = useUserStore((state) => state.userInfo)
  const setLogout = useAuthStore((state) => state.setLogout)
  const removeUserInfo = useUserStore((state) => state.removeUserInfo)

  const [allowFetch, setAllowFetch] = React.useState(false)
  useRunAfterTransition(() => setAllowFetch(true), [])

  const initials = useMemo(() => {
    if (!userInfo) return ''
    const first = userInfo.firstName?.charAt(0) || ''
    const last = userInfo.lastName?.charAt(0) || ''
    return `${first}${last}`.toUpperCase()
  }, [userInfo])

  const { totalPoints: loyaltyPoints, isLoading: loyaltyLoading } =
    useLoyaltyPoints(userInfo?.slug, allowFetch)

  const openGeneralInfo = useCallback(() => {
    router.push({
      pathname: '/(tabs)/profile/general-info-placeholder',
    })
  }, [router])

  const openPoints = useCallback(() => {
    router.push({
      pathname: '/(tabs)/profile/points-placeholder',
    })
  }, [router])

  const openCoins = useCallback(() => {
    router.push({
      pathname: '/(tabs)/profile/coins-placeholder',
    })
  }, [router])

  const openOrdersHistory = useCallback(() => {
    router.push({
      pathname: '/(tabs)/profile/orders-history-placeholder',
    })
  }, [router])

  const openAccountSettings = useCallback(() => {
    router.push({
      pathname: '/(tabs)/profile/account-settings-placeholder',
    })
  }, [router])

  const applyResistance = (value: number, max: number) => {
    'worklet'

    if (value < 0) {
      return value * 0.35
    }

    if (value > max) {
      const excess = value - max
      return max + excess * 0.35
    }

    return value
  }

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-10, 10])

    .onUpdate((event) => {
      if (translateX.value === 0 && event.absoluteX > 32) {
        return
      }

      const nextX = translateX.value + event.translationX

      const resistedX = applyResistance(nextX, SCREEN_WIDTH)

      translateX.value = Math.min(SCREEN_WIDTH, Math.max(0, resistedX))
    })

    .onEnd((event) => {
      const predictedX = translateX.value + event.velocityX * 0.18

      if (predictedX > SCREEN_WIDTH * 0.45) {
        closeProfile(event.velocityX, () => {
          router.back()
        })
      } else {
        openProfile()
      }
    })


  const renderItem = (
    icon: string,
    title: string,
    value: string,
    color: string,
    onPress?: () => void,
  ) => (
    <TouchableOpacity style={styles.itemRow} onPress={onPress}>
      <View style={[styles.iconContainer, { backgroundColor: color }]}>
        {/* <Icon size={20} color="#fff" /> */}
      </View>
      <View style={styles.itemTextContainer}>
        <Text style={styles.itemTitle}>{title}</Text>
        <Text style={styles.itemValue}>{value}</Text>
      </View>
    </TouchableOpacity>
  )

  const handleLogout = useCallback(() => {
    setLogout()
    removeUserInfo()
    router.replace('/(tabs)/home' as never)
  }, [removeUserInfo, router, setLogout])

  if (needsUserInfo || !userInfo) {
    return <LoginForm />
  }

  return (
    <View style={styles.container}>
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[styles.profileCard, animatedStyle]}
          renderToHardwareTextureAndroid
        >
          {/* Header Action */}
          <View style={styles.topNav}>
            <TouchableOpacity onPress={() => closeProfile()}></TouchableOpacity>
            {/* <Icon name="ellipsis-vertical" size={24} color="#000" /> */}
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Avatar & Name Section – hiển thị dữ liệu tài khoản thật */}
            <View style={styles.headerSection}>
              {userInfo?.image ? (
                <Image source={{ uri: userInfo.image }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarFallbackText}>
                    {initials || 'U'}
                  </Text>
                </View>
              )}
              <Text style={styles.userName}>
                {userInfo?.firstName} {userInfo?.lastName}
              </Text>
              <Text style={styles.userStatus}>
                {userInfo?.phonenumber ||
                  t(
                    'profile.contactInfo.noPhone',
                    'Chưa cập nhật số điện thoại',
                  )}
              </Text>
            </View>

            {/* Info Section */}
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>Account</Text>
              {renderItem(
                'call-outline',
                userInfo?.phonenumber ||
                  t(
                    'profile.contactInfo.noPhone',
                    'Chưa cập nhật số điện thoại',
                  ),
                'Mobile',
                '#4CAF50',
              )}
              {renderItem(
                'at-outline',
                userInfo?.email ||
                  t('profile.contactInfo.noEmail', 'Chưa cập nhật email'),
                'Username',
                '#2196F3',
              )}
            </View>

            {/* Settings Section */}
            {/* <View style={styles.section}>
              <Text style={styles.sectionHeader}>Settings</Text>
              {renderItem(
                'notifications-outline',
                'Notifications and Sounds',
                'On',
                '#FF9800',
              )}
              {renderItem(
                'lock-closed-outline',
                'Privacy and Security',
                'High',
                '#F44336',
              )}
              {renderItem(
                'folder-outline',
                'Chat Folders',
                '5 folders',
                '#00BCD4',
              )}
            </View> */}

            {/* Loyalty / Coins preview — useLoyaltyPoints (defer + prefetch) */}
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>
                {t('profile.financial.title', 'Tài chính')}
              </Text>
              {loyaltyLoading ? (
                <View style={styles.skeletonRow}>
                  <Skeleton style={styles.skeletonIcon} />
                  <View style={styles.skeletonText}>
                    <Skeleton style={styles.skeletonTitle} />
                    <Skeleton style={styles.skeletonValue} />
                  </View>
                </View>
              ) : (
                renderItem(
                  'trophy-outline',
                  t('profile.loyaltyPoint.title', 'Điểm tích lũy'),
                  `${loyaltyPoints} ${t('profile.points', 'điểm')}`,
                  '#22c55e',
                )
              )}
              {renderItem(
                'cash-outline',
                t('profile.coin.title', 'Xu của tôi'),
                t('profile.coinBalance', 'Xem chi tiết trong mục Xu'),
                '#eab308',
              )}
            </View>

            {/* Placeholder routes – dùng để test transition hãm phanh Native Stack */}
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>Placeholder routes</Text>
              {renderItem(
                'information-circle-outline',
                'Thông tin chung (placeholder)',
                '',
                '#3b82f6',
                openGeneralInfo,
              )}
              {renderItem(
                'trophy-outline',
                'Điểm tích lũy (placeholder)',
                '',
                '#22c55e',
                openPoints,
              )}
              {renderItem(
                'cash-outline',
                'Xu của tôi (placeholder)',
                '',
                '#eab308',
                openCoins,
              )}
              {renderItem(
                'time-outline',
                'Lịch sử đơn hàng (placeholder)',
                '',
                '#f97316',
                openOrdersHistory,
              )}
              {renderItem(
                'settings-outline',
                'Cài đặt tài khoản (placeholder)',
                '',
                '#6366f1',
                openAccountSettings,
              )}
            </View>

            {/* Debug userInfo block – dùng tạm để kiểm tra dữ liệu lưu trong store */}
            {/* <View style={styles.debugBox}>
              <Text style={styles.debugTitle}>userInfo snapshot</Text>
              <Text style={styles.debugText}>
                {JSON.stringify(userInfo, null, 2)}
              </Text>
            </View> */}

            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <Text style={styles.logoutText}>Đăng xuất</Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </GestureDetector>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  profileCard: {
    flex: 1,
    backgroundColor: '#f0f2f5',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: '#fff',
  },
  scrollContent: { paddingBottom: 120 },
  headerSection: {
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingBottom: 20,
    marginBottom: 10,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
  },
  avatarFallback: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fee2e2',
  },
  avatarFallbackText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#b91c1c',
  },
  userName: { fontSize: 22, fontWeight: 'bold', color: '#000' },
  userStatus: { fontSize: 14, color: '#2196F3' },
  section: {
    backgroundColor: '#fff',
    marginTop: 10,
    paddingVertical: 5,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2196F3',
    marginLeft: 15,
    marginTop: 10,
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  itemRow: {
    flexDirection: 'row',
    padding: 15,
    alignItems: 'center',
  },
  skeletonRow: {
    flexDirection: 'row',
    padding: 15,
    alignItems: 'center',
  },
  skeletonIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    marginRight: 15,
  },
  skeletonText: { flex: 1 },
  skeletonTitle: {
    height: 16,
    width: '60%',
    borderRadius: 4,
  },
  skeletonValue: {
    height: 13,
    width: 80,
    borderRadius: 4,
    marginTop: 8,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  itemTextContainer: { flex: 1 },
  itemTitle: { fontSize: 16, color: '#000' },
  itemValue: { fontSize: 13, color: '#888', marginTop: 2 },
  logoutButton: {
    marginTop: 16,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#fee2e2',
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#b91c1c',
  },
})

export default ProfileTest
